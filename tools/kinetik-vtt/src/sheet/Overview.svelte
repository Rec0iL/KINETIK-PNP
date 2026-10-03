<script lang="ts">
  import { rules, ATTR_KEYS, attributeMax, attributeAffects, meisterschaft, type AttrKey } from '../rules';
  import { newTitle, uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import { imageToDataUrl } from '../lib/image';
  import { PORTRAIT_PLACEHOLDER } from '../lib/art';
  import Stepper from '../ui/Stepper.svelte';
  import Meter from '../ui/Meter.svelte';
  import Pips from '../ui/Pips.svelte';
  import TagInput from '../ui/TagInput.svelte';
  import OverrideValue from '../ui/OverrideValue.svelte';
  import ShieldGauge from '../ui/ShieldGauge.svelte';
  import TagsMini from './TagsMini.svelte';
  import Poisons from './Poisons.svelte';
  import MovesOverview from './MovesOverview.svelte';

  let { char, ontab }: { char: Character; ontab?: (tab: string) => void } = $props();

  const sheet = $derived(computeSheet(char));
  const attrDefs = rules.tabellen.attribute;

  // Energie und Willenskraft steigen nie über ihr Maximum.
  $effect(() => {
    if (char.resources.energie > sheet.energieMax.value) char.resources.energie = sheet.energieMax.value;
    if (char.resources.wk > sheet.wkMax.value) char.resources.wk = sheet.wkMax.value;
  });

  async function onPortrait(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    try { char.portrait = await imageToDataUrl(file); } catch { alert('Das Bild konnte nicht gelesen werden.'); }
  }

  const gain = (key: 'energie' | 'wk', n: number) => {
    const max = key === 'energie' ? sheet.energieMax.value : sheet.wkMax.value;
    char.resources[key] = Math.max(0, Math.min(max, char.resources[key] + n));
  };
  const addMomentum = (n: number) => {
    char.resources.momentum = Math.max(0, Math.min(sheet.momentumCap.value, char.resources.momentum + n));
  };

  function addTempTag(name: string) {
    if (!char.tags.some((t) => t.name === name && !t.permanent)) char.tags.push({ id: uid(), name, size: 'klein', note: 'bis zur nächsten Aktion' });
  }
  const breathe = () => { gain('energie', 2); addTempTag('Verwundbar (Durchatmen)'); };
  const focusUp = () => { gain('wk', 2); addTempTag('Verwundbar (Sammeln)'); };
  const dominance = () => { addMomentum(1); gain('energie', 1); };
  const perfectCounter = () => { addMomentum(1); gain('wk', 1); };
  const combatEnd = () => { char.resources.momentum = 0; };
  function shortRest() {
    char.resources.energie = sheet.energieMax.value;
    char.resources.wk = sheet.wkMax.value;
    char.resources.schutz.current = char.resources.schutz.max;
    char.tags = char.tags.filter((t) => t.permanent);
    char.resources.momentum = 0;
    // Nicht-tödliches Gift endet spätestens mit der Rast (3.11).
    char.poisons = (char.poisons ?? []).filter((p) => p.level === 'toedlich');
  }

  function addTitle() {
    char.titles.push(newTitle({ startedAtLevel: 1 }));
  }
  function removeTitle(id: string) {
    if (!confirm('Titel entfernen? Moves, die ihn nutzen, behalten ihren Namen, verlieren aber die Zuordnung.')) return;
    char.titles = char.titles.filter((t) => t.id !== id);
    for (const m of char.moves) if (m.titleId === id) m.titleId = undefined;
  }

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const shortName = (k: AttrKey) => attrDefs.find((a) => a.key === k)!.kurz;
  let helpOpen = $state(false);
</script>

<div class="stack">
  <!-- Identität -->
  <section class="panel ident">
    <label class="portrait" title="Bild wählen">
      {#if char.portrait}<img src={char.portrait} alt="Porträt" />{:else}<img class="ph" src={PORTRAIT_PLACEHOLDER} alt="" /><span class="hintlbl">Bild wählen</span>{/if}
      <input type="file" accept="image/*" onchange={onPortrait} class="sr-only" />
      {#if char.portrait}
        <button type="button" class="btn sm icon x" onclick={(e) => { e.preventDefault(); char.portrait = undefined; }} aria-label="Bild entfernen">✕</button>
      {/if}
    </label>
    <div class="fields">
      <label class="field">Name<input bind:value={char.name} /></label>
      <label class="field">Alias / Spitzname<input bind:value={char.alias} placeholder="z.B. Ghost" /></label>
      <label class="field">Spieler<input bind:value={char.player} /></label>
      <label class="field wide">Konzept<textarea rows="2" bind:value={char.concept} placeholder="Ein Satz zur Figur"></textarea></label>
      <label class="field wide">Setting / Power-Scale<input bind:value={char.setting} placeholder="z.B. John-Wick-Welt: Level 10 = Wick" /></label>
    </div>
  </section>

  <!-- Attribute -->
  <section class="panel">
    <h2>Attribute</h2>
    <div class="attrs">
      {#each attrDefs as a}
        {@const v = char.attributes[a.key as AttrKey]}
        {@const mx = attributeMax(a.key as AttrKey, char.titles)}
        <div class="attr" class:warn={v > mx || v < rules.tabellen.attribut.min}>
          <span class="kurz">{a.kurz}</span>
          <h3>{a.name}</h3>
          <div class="big">{fmt(v)}</div>
          <Stepper bind:value={char.attributes[a.key as AttrKey]} min={-5} max={9} label={a.name} warn={v > mx || v < rules.tabellen.attribut.min} />
          <small class="dim" title={a.text}>
            {#each attributeAffects(a.key as AttrKey) as r}<span class="chip">{r === 'energie' ? 'Energie' : 'WK'}</span>{/each}
            <span class="bonus">Probe {fmt(sheet.basicBonus[a.key as AttrKey])}</span>
          </small>
        </div>
      {/each}
    </div>
    <p class="hint dim">Bereich −1 bis +3, +4 für ein Leitattribut auf Level 10. Werte außerhalb sind erlaubt und werden markiert. „Probe“ ist Attribut + Meisterschaft des besten Titels.</p>
  </section>

  <!-- Ressourcen und Tags -->
  <div class="resrow">
  <section class="panel">
    <h2>Ressourcen</h2>
    <div class="states">
      {#if sheet.states.ohnmaechtig}<span class="chip danger" title="Energie unter 0: ohnmächtig bis zum Szenenende. Je volle 3 Punkte unter 0 ist 1 Verletzung (Kopf bei Würgen und Ersticken, Torso bei Gift).">Ohnmächtig · Überlauf {sheet.overflow} Verletzung(en) fällig</span>
      {:else if sheet.states.ausgepumpt}<span class="chip danger">Ausgepumpt</span>{/if}
      {#if sheet.states.gebrochen}<span class="chip danger">Gebrochen</span>{/if}
      {#if sheet.states.sterbend}<span class="chip danger">Sterbend</span>{/if}
      {#if (char.poisons ?? []).length}<span class="chip danger" title="Gift wirkt am Rundenende (3.11)">Vergiftet</span>{/if}
      {#each sheet.states.unbrauchbar as z}<span class="chip amber">{rules.tabellen.zonen.find((x) => x.key === z)?.kurz} unbrauchbar</span>{/each}
    </div>
    <div class="res">
      <Meter label="Energie" bind:value={char.resources.energie} max={sheet.energieMax.value} min={-12} quick={[-3, -2, -1, 1, 2, 3]}>
        {#snippet maxSlot()}<OverrideValue derived={sheet.energieMax} label="Energie-Maximum" formula="6 + Fluss + Gewalt" onset={(v) => (v === undefined ? delete char.overrides.energieMax : (char.overrides.energieMax = v))} />{/snippet}
      </Meter>
      <Meter label="Willenskraft" tone="amber" bind:value={char.resources.wk} max={sheet.wkMax.value} quick={[-3, -2, -1, 1, 2, 3]}>
        {#snippet maxSlot()}<OverrideValue derived={sheet.wkMax} label="WK-Maximum" formula="6 + Instinkt + Fokus" onset={(v) => (v === undefined ? delete char.overrides.wkMax : (char.overrides.wkMax = v))} />{/snippet}
      </Meter>
      <div class="mom">
        <Pips label="Momentum" bind:value={char.resources.momentum} cap={sheet.momentumCap.value} />
        <small class="dim">Deckel
          <OverrideValue derived={sheet.momentumCap} label="Momentum-Deckel" formula="3, +1 ab Level 5, +1 ab Level 10 (höchster Titel)" onset={(v) => (v === undefined ? delete char.overrides.momentumCap : (char.overrides.momentumCap = v))} />
        </small>
      </div>
      <div class="schutz">
        <span class="lbl">Schutz</span>
        <div class="shieldrow">
          <ShieldGauge bind:current={char.resources.schutz.current} bind:max={char.resources.schutz.max} />
          <label class="field">Art / Kontext<textarea rows="3" bind:value={char.resources.schutz.type} placeholder="z.B. Kevlar, gegen Kugeln und Schnitte"></textarea></label>
        </div>
      </div>
      <div class="passiv">
        <span class="lbl">Passive Wahrnehmung</span>
        <span class="big"><OverrideValue derived={sheet.passiv} label="Passive Wahrnehmung" formula="5 + Instinkt-Bonus" onset={(v) => (v === undefined ? delete char.overrides.passiv : (char.overrides.passiv = v))} /></span>
      </div>
    </div>
    <div class="row actions">
      <button class="btn sm" onclick={breathe} title="+2 Energie, nächster Clash gegen dich +1">Durchatmen</button>
      <button class="btn sm" onclick={focusUp} title="+2 Willenskraft, nächster Clash gegen dich +1">Sammeln</button>
      <button class="btn sm" onclick={dominance} title="+1 Momentum, +1 Energie (nur gegen Gegner ab Level 1, 1× pro Runde)">Dominanz</button>
      <button class="btn sm" onclick={perfectCounter} title="+1 Momentum, +1 Willenskraft">Perfekter Konter</button>
      <button class="btn sm" onclick={combatEnd} title="Momentum verfällt auf 0">Kampfende</button>
      {#if sheet.states.ohnmaechtig}<button class="btn sm" onclick={() => (char.resources.energie = 1)} title="Wecken: Energie auf 1, Verletzungen bleiben">Wecken</button>{/if}
      <button class="btn sm amber" onclick={shortRest} title="Energie und WK voll, Schutz voll, Momentum 0, Szenen-Tags weg">Kurze Rast</button>
    </div>
  </section>
  <TagsMini {char} {ontab} />
  <Poisons {char} />
  </div>

  <!-- Titel -->
  <section class="panel">
    <div class="row"><h2>Titel</h2><span class="spacer"></span><button class="btn sm primary" onclick={addTitle}>+ Titel</button></div>
    {#if !char.titles.length}<p class="dim">Noch kein Titel. Ein Titel (Level, Domäne, zwei Leitattribute) bringt die Meisterschaft auf Würfe in seiner Domäne.</p>{/if}
    <div class="titles">
      {#each char.titles as t (t.id)}
        {@const m = t.masteryOverride ?? meisterschaft(t.level)}
        <div class="title">
          <div class="row">
            <label class="field grow">Name<input bind:value={t.name} /></label>
            <label class="field">Level<Stepper bind:value={t.level} min={0} max={10} label="Level" /></label>
            <div class="mastery" title="Meisterschaft = Level ÷ 2, abgerundet">
              <span class="lbl">Meisterschaft</span>
              <span class="big">{m}</span>
              <label class="check small"><input type="checkbox" checked={t.masteryOverride !== undefined} onchange={(e) => (t.masteryOverride = e.currentTarget.checked ? m : undefined)} /> manuell</label>
              {#if t.masteryOverride !== undefined}<Stepper bind:value={t.masteryOverride} min={0} max={9} label="Meisterschaft" />{/if}
            </div>
            <button class="btn sm icon danger" onclick={() => removeTitle(t.id)} aria-label="Titel entfernen">🗑</button>
          </div>
          <div class="row">
            <label class="field grow">Domäne (3 bis 5 Bereiche)<TagInput bind:values={t.domains} label="Domäne" /></label>
          </div>
          <div class="row">
            <label class="field">Leitattribut 1
              <select bind:value={t.leadAttrs[0]}>{#each attrDefs as a}<option value={a.key}>{a.name}</option>{/each}</select>
            </label>
            <label class="field">Leitattribut 2
              <select bind:value={t.leadAttrs[1]}>{#each attrDefs as a}<option value={a.key}>{a.name}</option>{/each}</select>
            </label>
            <label class="field">Gestartet auf Level<Stepper value={t.startedAtLevel ?? t.level} min={0} max={10} onchange={(v) => (t.startedAtLevel = v)} label="Gestartet auf Level" /></label>
            <span class="growth dim">
              {#each rules.tabellen.wachstumLevels as g}
                <span class="chip" class:accent={t.level >= g} title={`Level ${g}: +1 auf ein Leitattribut`}>L{g}</span>
              {/each}
              {#if t.level >= 5}<span class="chip accent" title="Momentum-Deckel +1">Mom +1</span>{/if}
              {#if t.level >= 8}<span class="chip amber" title="Meister-Moves bis 7 EP">Meister</span>{/if}
              {#if t.level >= 10}<span class="chip amber" title="Legendäre Moves, keine Mindestkosten">Legende</span>{/if}
            </span>
          </div>
        </div>
      {/each}
    </div>

    {#if char.titles.length}
      <h3 class="mt">Bonus je Titel und Attribut</h3>
      <div class="tablewrap">
        <table>
          <thead><tr><th>Titel</th>{#each ATTR_KEYS as k}<th>{shortName(k)}</th>{/each}</tr></thead>
          <tbody>
            {#each sheet.titleRows as r}
              <tr>
                <td>{r.title.name} <small class="dim">L{r.title.level}, M{r.mastery}</small></td>
                {#each ATTR_KEYS as k}<td class:lead={r.title.leadAttrs.includes(k)}>{fmt(r.row[k])}</td>{/each}
              </tr>
            {/each}
            <tr class="base"><td>Ohne Titel</td>{#each ATTR_KEYS as k}<td>{fmt(char.attributes[k])}</td>{/each}</tr>
          </tbody>
        </table>
      </div>
      <p class="hint dim">Hervorgehoben: Leitattribut (volle Meisterschaft). Sonst halbe Meisterschaft, abgerundet. Es zählt nur der beste passende Titel.</p>
    {/if}
  </section>

  <!-- Moves (nur lesen und würfeln, Anlegen im Reiter Moves) -->
  <MovesOverview {char} {ontab} />
</div>

<style>
  .resrow { display: grid; grid-template-columns: minmax(0, 2fr) minmax(250px, 1fr); gap: 1rem; align-items: start; }
  @media (max-width: 1050px) { .resrow { grid-template-columns: 1fr; } }
  .ident { display: grid; grid-template-columns: 150px 1fr; gap: 1.1rem; }
  .portrait { position: relative; width: 150px; height: 190px; border: 1px dashed var(--line-strong); display: grid; place-items: center; color: var(--ink-dim); cursor: pointer; overflow: hidden; background: rgba(0, 0, 0, 0.35); font: 600 0.8rem var(--font-head); letter-spacing: 0.15em; text-transform: uppercase; }
  .portrait:hover { border-color: var(--accent); }
  .portrait img { width: 100%; height: 100%; object-fit: cover; }
  .portrait img.ph { opacity: 0.45; filter: saturate(0.6); }
  .portrait .hintlbl { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; text-shadow: 0 1px 4px #000; color: var(--ink); }
  .portrait .x { position: absolute; top: 4px; right: 4px; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.7rem; align-content: start; }
  .wide { grid-column: 1 / -1; }
  .check { display: flex; gap: 0.5em; align-items: center; color: var(--ink-dim); font-size: 0.92rem; grid-column: 1 / -1; }
  .check.small { font-size: 0.8rem; }

  .attrs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.7rem; }
  .attr { display: grid; justify-items: center; gap: 0.3rem; padding: 0.8rem 0.5rem; background: var(--raised); border: 1px solid var(--line); position: relative; }
  .attr.warn { border-color: var(--warn); }
  .kurz { position: absolute; top: 6px; left: 8px; font: 500 0.68rem var(--font-mono); color: var(--accent-2); letter-spacing: 0.15em; }
  .attr h3 { color: var(--ink); font-size: 0.95rem; }
  .big { font: 400 2.6rem/1 var(--font-display); color: var(--accent); text-shadow: 0 0 14px var(--accent-soft); }
  .attr small { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; justify-content: center; }
  .bonus { font: 500 0.75rem var(--font-mono); }
  .hint { font-size: 0.82rem; margin: 0.7rem 0 0; }

  .states { display: flex; gap: 6px; flex-wrap: wrap; min-height: 0; margin-bottom: 0.4rem; }
  .states:empty { display: none; }
  .res { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.2rem 1.6rem; align-items: start; }
  .lbl { display: block; font: 600 0.8rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .schutz, .passiv, .mom { display: grid; gap: 0.5rem; }
  .shieldrow { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .shieldrow .field { flex: 1; min-width: 160px; }
  .passiv .big { font-size: 2.2rem; color: var(--ink-strong); }
  .actions { margin-top: 1rem; padding-top: 0.9rem; border-top: 1px solid var(--line); }

  .titles { display: grid; gap: 0.8rem; }
  .title { display: grid; gap: 0.6rem; padding: 0.8rem; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent); }
  .grow { flex: 1; min-width: 200px; }
  .mastery { display: grid; justify-items: center; gap: 2px; }
  .mastery .big { font-size: 2rem; color: var(--accent-2); }
  .growth { display: flex; gap: 4px; flex-wrap: wrap; align-self: end; }
  .mt { margin-top: 1.2rem; margin-bottom: 0.5rem; }
  .tablewrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.92rem; }
  th { font: 600 0.78rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); text-align: center; padding: 0.4em 0.6em; border-bottom: 1px solid var(--accent-line); }
  th:first-child, td:first-child { text-align: left; font-family: var(--font-body); }
  td { text-align: center; padding: 0.45em 0.6em; border-bottom: 1px solid var(--line); }
  tr:nth-child(even) td { background: rgba(255, 255, 255, 0.025); }
  td.lead { color: var(--accent-2); font-weight: 700; }
  tr.base td { color: var(--ink-dim); }

  @media (max-width: 640px) { .ident { grid-template-columns: 1fr; } .portrait { width: 120px; height: 150px; } }
</style>
