<script lang="ts">
  import { rules, ATTR_KEYS, attributeAffects, titleBonusRow, type AttrKey } from '../rules';
  import type { Character } from '../model/character';
  import { creationReport, computeSheet } from '../model/sheet';
  import Stepper from '../ui/Stepper.svelte';

  let { char }: { char: Character } = $props();
  const report = $derived(creationReport(char));
  const sheet = $derived(computeSheet(char));
  const defs = rules.tabellen.attribute;
  const remaining = $derived(report.attributesBudget - report.attributesSpent);
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const growthTitles = $derived(char.titles.filter((t) => (t.startedAtLevel ?? t.level) >= 4));
  const effect = { energie: 'Energie', wk: 'Willenskraft' };
</script>

<div class="stack">
  <p class="dim intro">Attribute sind das Talent deiner Figur, von <b>−1</b> bis <b>+3</b>. Alle starten bei 0. Du verteilst dein Budget, das Startmaximum ist +{report.startMax}. Ein Attribut auf −1 gibt einen Punkt zurück (bei höchstens zwei Attributen). Über Fluss und Gewalt bestimmst du die Energie, über Instinkt und Fokus die Willenskraft.</p>

  <div class="budget" class:over={remaining < 0}>
    <span>Attributspunkte</span><b>{report.attributesSpent} / {report.attributesBudget}</b>
    <small class="dim">{remaining >= 0 ? `${remaining} übrig` : `${-remaining} zu viel`}{report.growthPoints ? ` · inkl. ${report.growthPoints} aus Titel-Wachstum` : ''}</small>
    <span class="spacer"></span>
    <label class="check"><input type="checkbox" bind:checked={char.naturtalent} /> Naturtalent (+3 auf einem Attribut)</label>
  </div>

  {#if growthTitles.length}
    <p class="note">Titel ab Level 4 geben ihr Wachstum gleich mit: {growthTitles.map((t) => t.name).join(', ')}. Dieses +1 liegt auf einem Leitattribut des Titels und zählt zusätzlich zum Budget. Es darf das Startmaximum von +2 auf +3 heben.</p>
  {/if}

  <div class="attrs">
    {#each defs as d (d.key)}
      {@const k = d.key as AttrKey}
      <div class="attr" class:warn={char.attributes[k] > report.startMax || char.attributes[k] < -1}>
        <div class="head"><b>{d.name}</b><span class="kurz">{d.kurz}</span></div>
        <div class="val">{fmt(char.attributes[k])}</div>
        <Stepper bind:value={char.attributes[k]} min={-1} max={4} warn={char.attributes[k] > report.startMax || char.attributes[k] < -1} label={d.name} />
        <small class="dim">{d.text}</small>
        <div class="chips">{#each attributeAffects(k) as r}<span class="chip">{effect[r]}</span>{/each}
          {#each char.titles.filter((t) => t.leadAttrs.includes(k)) as t}<span class="chip accent" title="Leitattribut von {t.name}">★ {t.name}</span>{/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="derived">
    <div><span class="lbl">Energie (6 + Fluss + Gewalt)</span><b>{sheet.energieMax.value}</b></div>
    <div><span class="lbl">Willenskraft (6 + Instinkt + Fokus)</span><b>{sheet.wkMax.value}</b></div>
    <div><span class="lbl">Passive Wahrnehmung</span><b>{sheet.passiv.value}</b></div>
  </div>

  {#if char.titles.length}
    <div class="tablewrap">
      <table>
        <thead><tr><th>Bonus in der Domäne</th>{#each defs as d}<th>{d.kurz}</th>{/each}</tr></thead>
        <tbody>
          {#each char.titles as t}
            {@const row = titleBonusRow(char.attributes, t)}
            <tr><td>{t.name} <small class="dim">L{t.level}</small></td>{#each ATTR_KEYS as k}<td class:lead={t.leadAttrs.includes(k)}>{fmt(row[k])}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
    <small class="dim">Hervorgehoben: Leitattribut mit voller Meisterschaft. Ein Kino-Charakter hat in seiner Domäne meist +3.</small>
  {/if}
</div>

<style>
  .intro { margin: 0; }
  .budget { display: flex; gap: 0.8rem; align-items: baseline; flex-wrap: wrap; padding: 0.6rem 0.8rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .budget b { font: 400 1.9rem/1 var(--font-display); color: var(--accent); }
  .budget.over { border-left-color: var(--danger); }
  .budget.over b { color: var(--danger); }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.9rem; }
  .note { margin: 0; color: var(--accent-2); font-size: 0.9rem; }
  .attrs { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.7rem; }
  .attr { display: grid; justify-items: center; gap: 0.35rem; padding: 0.8rem 0.6rem; background: var(--raised); border: 1px solid var(--line); text-align: center; }
  .attr.warn { border-color: var(--warn); }
  .head { display: flex; gap: 0.5rem; align-items: baseline; }
  .head b { font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .kurz { font: 500 0.7rem var(--font-mono); color: var(--accent-2); }
  .val { font: 400 3rem/1 var(--font-display); color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .derived { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 0.7rem; }
  .derived div { padding: 0.6rem 0.8rem; background: var(--raised); border: 1px solid var(--line); display: grid; }
  .derived b { font: 400 2.2rem/1 var(--font-display); color: var(--accent-2); }
  .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  .tablewrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-family: var(--font-mono); font-size: 0.92rem; }
  th { font: 600 0.78rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); text-align: center; padding: 0.4em 0.6em; border-bottom: 1px solid var(--accent-line); }
  th:first-child, td:first-child { text-align: left; font-family: var(--font-body); }
  td { text-align: center; padding: 0.45em 0.6em; border-bottom: 1px solid var(--line); }
  td.lead { color: var(--accent-2); font-weight: 700; }
</style>
