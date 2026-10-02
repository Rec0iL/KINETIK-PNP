<script lang="ts">
  import { rules } from '../rules';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';

  let { char }: { char: Character } = $props();
  const sheet = $derived(computeSheet(char));
  let custom = $state('');
  let size = $state<'klein' | 'gross'>('klein');

  function add(name: string, sz: 'klein' | 'gross', permanent = false) {
    const n = name.trim();
    if (!n) return;
    char.tags.push({ id: uid(), name: n, size: sz, permanent });
  }
  function addCustom() { add(custom, size); custom = ''; }
  function flip(id: string) {
    const i = char.tags.findIndex((t) => t.id === id);
    if (i < 0) return;
    if (char.tags[i].size === 'gross') { alert('Große Tags lassen sich nicht umdrehen. Sie brauchen einen passenden Move.'); return; }
    if (confirm('Kinetik-Regel: Tag durch eine kreative Beschreibung umdrehen? Er verschwindet, der Gegner erhält einen passenden kleinen Tag.')) char.tags.splice(i, 1);
  }
  const t = rules.tags;
</script>

<div class="stack">
  <section class="panel">
    <div class="row"><h2>Tags gegen mich</h2><span class="spacer"></span>
      <span class="chip" class:danger={sheet.tagBonus >= 3} class:accent={sheet.tagBonus < 3}>Gegner-Bonus +{sheet.tagBonus} (max. +{rules.tabellen.tags.stapelMax})</span>
    </div>
    <p class="dim hint">Kleiner Tag: Gegner +1, großer Tag: +2 oder Aktion verwehrt. Tags enden mit einer passenden Aktion oder mit der Szene. Heimspiel: Deckt ein Titel die Lage ab, gibt ein kleiner Tag dem Gegner kein +1.</p>
    <div class="row add">
      <input bind:value={custom} placeholder="Eigener Tag (z.B. Am Boden)" onkeydown={(e) => e.key === 'Enter' && addCustom()} aria-label="Tag-Name" />
      <select bind:value={size} aria-label="Größe"><option value="klein">klein (+1)</option><option value="gross">groß (+2)</option></select>
      <button class="btn sm primary" onclick={addCustom}>+ Tag</button>
    </div>
    <div class="quick">
      {#each t.klein as n}<button class="chip" onclick={() => add(n, 'klein')}>+ {n}</button>{/each}
      {#each t.gross as n}<button class="chip amber" onclick={() => add(n, 'gross')}>+ {n}</button>{/each}
    </div>
    <div class="list">
      {#each char.tags as tg, i (tg.id)}
        <div class="tag" class:big={tg.size === 'gross'}>
          <span class="chip" class:amber={tg.size === 'gross'}>{tg.size === 'gross' ? 'groß +2' : 'klein +1'}</span>
          <input class="nm" bind:value={tg.name} aria-label="Name" />
          <input class="nt" bind:value={tg.note} placeholder="Notiz" aria-label="Notiz" />
          <label class="check" title="Bleibt bei kurzer Rast bestehen"><input type="checkbox" bind:checked={tg.permanent} /> dauerhaft</label>
          <button class="btn sm" onclick={() => flip(tg.id)} title="Kinetik-Regel: eigenen kleinen Tag umdrehen">Umdrehen</button>
          <button class="btn sm icon danger" onclick={() => char.tags.splice(i, 1)} aria-label="Entfernen">✕</button>
        </div>
      {:else}
        <p class="dim">Keine Tags aktiv.</p>
      {/each}
    </div>
  </section>

  <section class="panel">
    <div class="row"><h2>Nachteile</h2><span class="spacer"></span><button class="btn sm" onclick={() => char.disadvantages.push({ id: uid(), text: '' })}>+ Nachteil</button></div>
    {#each char.disadvantages as d, i (d.id)}
      <div class="row inj"><input bind:value={d.text} placeholder="z.B. Schuldet der Triade einen Gefallen" /><button class="btn sm icon danger" onclick={() => char.disadvantages.splice(i, 1)} aria-label="Entfernen">✕</button></div>
    {:else}
      <p class="dim">Keine Nachteile eingetragen.</p>
    {/each}
  </section>
</div>

<style>
  .hint { font-size: 0.85rem; margin: 0.6rem 0; }
  .add { margin-bottom: 0.6rem; flex-wrap: nowrap; }
  .add select { width: auto; }
  .quick { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 0.9rem; }
  .quick .chip { cursor: pointer; }
  .quick .chip:hover { border-color: var(--accent); color: var(--accent); }
  .list { display: grid; gap: 0.4rem; }
  .tag { display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0.6rem; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent); flex-wrap: wrap; }
  .tag.big { border-left-color: var(--accent-2); }
  .nm { flex: 1 1 140px; font-weight: 600; }
  .nt { flex: 2 1 160px; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.85rem; color: var(--ink-dim); }
  .inj { flex-wrap: nowrap; margin-top: 0.4rem; }
</style>
