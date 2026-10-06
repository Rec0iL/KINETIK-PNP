<script lang="ts">
  import { rules } from '../rules';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';

  let { char, ontab }: { char: Character; ontab?: (tab: string) => void } = $props();
  const sheet = $derived(computeSheet(char));
  let name = $state('');
  let size = $state<'klein' | 'gross'>('klein');

  function add(n: string, sz: 'klein' | 'gross' = size) {
    const t = n.trim();
    if (!t) return;
    char.tags.push({ id: uid(), name: t, size: sz });
    name = '';
  }
  const quick = ['Am Boden', 'Geblendet', 'Entwaffnet', 'Benommen'];
</script>

<section class="panel tags">
  <div class="row head">
    <h2>Tags</h2><span class="spacer"></span>
    <span class="chip" class:danger={sheet.tagBonus >= 3} class:accent={sheet.tagBonus < 3} title="Summe aller Tags gegen dich, höchstens +{rules.tabellen.tags.stapelMax}">Gegner +{sheet.tagBonus}</span>
  </div>

  <div class="list">
    {#each char.tags as t, i (t.id)}
      <div class="tag" class:big={t.size === 'gross'}>
        <button class="sz" onclick={() => (t.size = t.size === 'klein' ? 'gross' : 'klein')} title="Größe wechseln: klein +1, groß +2">{t.size === 'gross' ? '+2' : '+1'}</button>
        <input bind:value={t.name} aria-label="Tag-Name" />
        <button class="btn sm icon ghost danger" onclick={() => char.tags.splice(i, 1)} aria-label="Tag entfernen">✕</button>
      </div>
    {:else}
      <p class="dim none">Keine Tags aktiv.</p>
    {/each}
  </div>

  <div class="add">
    <input bind:value={name} placeholder="Tag hinzufügen" aria-label="Neuer Tag" onkeydown={(e) => e.key === 'Enter' && add(name)} />
    <select bind:value={size} aria-label="Größe"><option value="klein">klein</option><option value="gross">groß</option></select>
    <button class="btn sm primary" onclick={() => add(name)} disabled={!name.trim()}>+</button>
  </div>
  <div class="quick">{#each quick as q}<button class="chip" onclick={() => add(q, 'klein')}>+ {q}</button>{/each}</div>
  {#if ontab}<button class="more" onclick={() => ontab('tags')}>Alle Tags und Nachteile →</button>{/if}
</section>

<style>
  .head { margin-bottom: 0.5rem; }
  .list { display: grid; gap: 4px; }
  .tag { display: flex; gap: 4px; align-items: center; padding: 3px 4px; background: var(--raised); border-left: 3px solid var(--accent); }
  .tag.big { border-left-color: var(--accent-2); }
  .tag input { flex: 1; min-width: 0; min-height: 28px; padding: 0.15em 0.4em; border-color: transparent; background: transparent; font-weight: 600; }
  .tag input:focus { background: var(--field-bg); }
  .sz { min-width: 2.2em; background: var(--accent-soft); border: 1px solid var(--accent-line); color: var(--accent); font: 700 0.8rem var(--font-mono); cursor: pointer; padding: 0.25em 0.3em; }
  .big .sz { background: var(--accent-2-soft); border-color: var(--accent-2); color: var(--accent-2); }
  .none { margin: 0.2rem 0; font-size: 0.9rem; }
  .add { display: flex; gap: 4px; margin-top: 0.6rem; }
  .add input { flex: 1; min-width: 0; min-height: 32px; padding: 0.2em 0.5em; }
  .add select { width: auto; min-height: 32px; padding: 0.2em 0.4em; }
  .quick { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.5rem; }
  .quick .chip { cursor: pointer; }
  .quick .chip:hover { border-color: var(--accent); color: var(--accent); }
  .more { background: none; border: 0; color: var(--accent); cursor: pointer; font: inherit; font-size: 0.85rem; padding: 0.6rem 0 0; text-align: left; }
  .more:hover { text-decoration: underline; }
</style>
