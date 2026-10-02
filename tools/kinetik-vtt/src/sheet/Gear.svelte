<script lang="ts">
  import { rules } from '../rules';
  import { uid, type Character, type Weapon } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';

  let { char }: { char: Character } = $props();
  let tpl = $state('');

  function addTemplate() {
    const w = rules.waffen.waffen.find((x) => x.id === tpl);
    if (!w) return;
    char.weapons.push({
      id: uid(), name: w.name, klasse: w.klasse as Weapon['klasse'], ep: w.ep, profilText: w.profilText, durchschlag: w.durchschlag, templateId: w.id,
    });
    tpl = '';
  }
  const addCustom = () => char.weapons.push({ id: uid(), name: 'Eigene Waffe', klasse: 'frei', ep: 1, profilText: '', durchschlag: 1 });
  const addItem = () => char.inventory.push({ id: uid(), name: '', qty: 1 });
  const hasKampfkunst = $derived(char.titles.some((t) => t.level >= rules.waffen.waffenlos.abLevel));
</script>

<div class="stack">
  <section class="panel">
    <div class="row"><h2>Waffen</h2><span class="spacer"></span>
      <select bind:value={tpl} aria-label="Waffenvorlage"><option value="">Vorlage aus 2.5 …</option>{#each rules.waffen.waffen as w}<option value={w.id}>{w.name} ({w.klasse})</option>{/each}</select>
      <button class="btn sm" onclick={addTemplate} disabled={!tpl}>Hinzufügen</button>
      <button class="btn sm primary" onclick={addCustom}>+ Eigene Waffe</button>
    </div>
    <p class="dim hint">Die Waffe bestimmt das Profil (Gratis-Effekt, 1 EP leicht, 2 EP schwer), der Titel das Können. Jede Waffe hat Durchschlag 1 (Schutz −1 für den Clash). Profil und Durchschlag gelten zusätzlich zu einem Move.</p>
    {#each char.weapons as w, i (w.id)}
      <div class="item">
        <div class="row">
          <label class="field grow">Name<input bind:value={w.name} /></label>
          <label class="field">Klasse
            <select bind:value={w.klasse}><option value="leicht">leicht</option><option value="schwer">schwer</option><option value="frei">frei</option></select>
          </label>
          <label class="field">EP<Stepper bind:value={w.ep} min={0} max={8} label="EP" /></label>
          <label class="field">Durchschlag<Stepper bind:value={w.durchschlag} min={0} max={5} label="Durchschlag" /></label>
          <button class="btn sm icon danger" onclick={() => char.weapons.splice(i, 1)} aria-label="Waffe entfernen">✕</button>
        </div>
        <label class="field">Profil<input bind:value={w.profilText} placeholder="z.B. Zone wählen" /></label>
        <label class="field">Zustand / Notizen<input bind:value={w.note} placeholder="z.B. Ladehemmung, Munition, Verschmutzt" /></label>
      </div>
    {:else}
      <p class="dim">Keine Waffen.</p>
    {/each}
    {#if hasKampfkunst}<p class="chip accent hands">Tödliche Hände: waffenloser Kampfkunst-Titel ab Level 4 gibt Hände und Füße Durchschlag 1 (kein Profil).</p>{/if}
  </section>

  <section class="panel">
    <h2>Deckung (Schutzart gegen Schüsse)</h2>
    <div class="row">
      {#each rules.tabellen.deckung as d}<span class="chip">{d.name} <b>{d.schutz}</b></span>{/each}
    </div>
    <p class="dim hint">Deckung nutzt sich ab wie Schutz, wirkt nicht im Nahkampf und addiert sich nicht mit Rüstung: es zählt der höhere Wert.</p>
  </section>

  <section class="panel">
    <div class="row"><h2>Ausrüstung</h2><span class="spacer"></span><button class="btn sm primary" onclick={addItem}>+ Gegenstand</button></div>
    {#each char.inventory as it, i (it.id)}
      <div class="row inv">
        <input class="n" bind:value={it.name} placeholder="Gegenstand" aria-label="Gegenstand" />
        <Stepper bind:value={it.qty} min={0} max={999} label="Anzahl" />
        <input class="note" bind:value={it.note} placeholder="Notiz" aria-label="Notiz" />
        <button class="btn sm icon danger" onclick={() => char.inventory.splice(i, 1)} aria-label="Entfernen">✕</button>
      </div>
    {:else}
      <p class="dim">Nichts eingetragen.</p>
    {/each}
  </section>
</div>

<style>
  .hint { font-size: 0.85rem; margin: 0.6rem 0; }
  .item { display: grid; gap: 0.5rem; padding: 0.7rem; margin-top: 0.6rem; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent-2); }
  .grow { flex: 1; min-width: 180px; }
  .inv { flex-wrap: nowrap; margin-top: 0.4rem; }
  .inv .n { flex: 2; }
  .inv .note { flex: 3; }
  .hands { margin-top: 0.7rem; }
  select { width: auto; }
</style>
