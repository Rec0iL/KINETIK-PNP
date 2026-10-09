<script lang="ts">
  import { rules, newAmmo, fireShot, reload } from '../rules';
  import { uid, type Character, type Weapon } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';

  let { char }: { char: Character } = $props();
  let tpl = $state('');

  function addTemplate() {
    const w = rules.waffen.waffen.find((x) => x.id === tpl);
    if (!w) return;
    const mag = newAmmo(w, !!char.munition?.vorrat);
    char.weapons.push({
      id: uid(), name: w.name, klasse: w.klasse as Weapon['klasse'], ep: w.ep, profilText: w.profilText, durchschlag: w.durchschlag, templateId: w.id,
      ...(mag ? { mag } : {}),
    });
    tpl = '';
  }
  const tracking = $derived(!!char.munition?.track);
  function setTracking(on: boolean) {
    char.munition = { track: on, vorrat: char.munition?.vorrat ?? false };
    if (on) for (const w of char.weapons) if (!w.mag) {
      const t = rules.waffen.waffen.find((x) => x.id === w.templateId);
      const m = newAmmo(t, !!char.munition.vorrat);
      if (m) w.mag = m;
    }
  }
  function setVorrat(on: boolean) {
    char.munition = { track: char.munition?.track ?? false, vorrat: on };
    for (const w of char.weapons) if (w.mag) {
      if (on) { const max = w.mag.heavy ? rules.waffen.munition.vorratSchwer : rules.waffen.munition.vorrat; w.mag.reserveMax = max; w.mag.reserve = max; }
      else { w.mag.reserve = undefined; w.mag.reserveMax = undefined; }
    }
  }
  const addMag = (w: Weapon) => { w.mag = { cap: rules.waffen.munition.magazin, cur: rules.waffen.munition.magazin, heavy: false }; if (char.munition?.vorrat) { w.mag.reserveMax = rules.waffen.munition.vorrat; w.mag.reserve = rules.waffen.munition.vorrat; } };
  const shoot = (w: Weapon) => { if (w.mag) w.mag = fireShot(w.mag); };
  let notice = $state('');
  function doReload(w: Weapon, inClash: boolean, viaMove = false) {
    if (!w.mag) return;
    const r = reload(w.mag, { inClash, viaMove });
    if (!r.ok) { notice = `${w.name}: ${r.reason}`; return; }
    w.mag = r.ammo;
    notice = '';
    if (r.tag && !char.tags.some((t) => t.name === r.tag)) char.tags.push({ id: uid(), name: r.tag, size: 'klein' });
    if (r.action) notice = `${w.name}: Nachladen kostet bei schweren Waffen eine ganze Aktion.`;
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
    <div class="row ammo-set">
      <label class="check"><input type="checkbox" checked={tracking} onchange={(e) => setTracking(e.currentTarget.checked)} /> Munitionstracking (optional, 2.5)</label>
      {#if tracking}<label class="check"><input type="checkbox" checked={!!char.munition?.vorrat} onchange={(e) => setVorrat(e.currentTarget.checked)} /> Magazin-Vorrat mitzählen</label>{/if}
    </div>
    {#if notice}<p class="chip accent">{notice}</p>{/if}
    <p class="dim hint">Die Waffe bestimmt das Profil (Gratis-Effekt, 1 EP leicht, 2 EP schwer), der Titel das Können. Jede Waffe hat Durchschlag 1 (Schutz −1 für den Clash). Profil und Durchschlag gelten zusätzlich zu einem Move.</p>
    {#each char.weapons as w, i (w.id)}
      <div class="item">
        <div class="row">
          <label class="field grow">Name<input bind:value={w.name} /></label>
          <label class="field">Klasse
            <select bind:value={w.klasse}><option value="leicht">leicht</option><option value="schwer">schwer</option><option value="explosiv">explosiv</option><option value="frei">frei</option></select>
          </label>
          <label class="field">EP<Stepper bind:value={w.ep} min={0} max={8} label="EP" /></label>
          <label class="field">Durchschlag<Stepper bind:value={w.durchschlag} min={0} max={5} label="Durchschlag" /></label>
          <button class="btn sm icon danger" onclick={() => char.weapons.splice(i, 1)} aria-label="Waffe entfernen">✕</button>
        </div>
        <label class="field">Profil<input bind:value={w.profilText} placeholder="z.B. Zone wählen" /></label>
        {#if tracking}
          {#if w.mag}
            <div class="row mag">
              <span class="lbl">Magazin</span>
              <Stepper bind:value={w.mag.cur} min={0} max={w.mag.cap} label="Angriffe im Magazin" warn={w.mag.cur === 0} />
              <span class="dim">von</span>
              <Stepper bind:value={w.mag.cap} min={1} max={12} label="Magazingröße" />
              {#if w.mag.reserve !== undefined}<span class="dim">Vorrat</span><Stepper bind:value={w.mag.reserve} min={0} max={9} label="Magazine im Vorrat" />{/if}
              <button class="btn sm" onclick={() => shoot(w)} disabled={w.mag.cur === 0}>Schuss</button>
              <button class="btn sm" onclick={() => doReload(w, true)} title="Im Clash: kleiner Tag Nachladen (Gegner +1)">Nachladen im Clash</button>
              <button class="btn sm" onclick={() => doReload(w, false)} title="Ruhiger Moment: gratis">Nachladen ruhig</button>
              <button class="btn sm" onclick={() => doReload(w, true, true)} title="Per Move (z.B. Wick Flick): ohne Tag">per Move</button>
              {#if w.mag.cur === 0}<span class="chip danger">Magazin leer</span>{/if}
            </div>
          {:else if w.klasse !== 'frei' || !w.templateId}
            <button class="btn sm" onclick={() => addMag(w)}>Magazin anlegen</button>
          {/if}
        {/if}
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
  .ammo-set { gap: 1rem; margin: 0.4rem 0; }
  .mag { flex-wrap: wrap; gap: 0.4rem; align-items: center; }
  .mag .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  select { width: auto; max-width: 100%; }
</style>
