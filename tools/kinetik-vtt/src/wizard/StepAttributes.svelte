<script lang="ts">
  import { rules, ATTR_KEYS, attributeAffects, titleBonusRow, type AttrKey } from '../rules';
  import type { Character } from '../model/character';
  import { creationReport, computeSheet } from '../model/sheet';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
  const report = $derived(creationReport(char));
  const sheet = $derived(computeSheet(char));
  const defs = rules.tabellen.attribute;
  const remaining = $derived(report.attributesBudget - report.attributesSpent);
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const growthTitles = $derived(char.titles.filter((ti) => (ti.startedAtLevel ?? ti.level) >= 4));
  const effect = { energie: t('wizard.common.energie'), wk: t('wizard.common.wk') };
</script>

<div class="stack">
  <p class="dim intro">{t('wizard.attributes.intro1')}<b>−1</b>{t('wizard.attributes.intro2')}<b>+3</b>{t('wizard.attributes.intro3', { max: report.startMax })}</p>

  <div class="budget" class:over={remaining < 0}>
    <span>{t('wizard.attributes.points')}</span><b>{report.attributesSpent} / {report.attributesBudget}</b>
    <small class="dim">{remaining >= 0 ? t('wizard.common.left', { n: remaining }) : t('wizard.common.tooMany', { n: -remaining })}{report.growthPoints ? ` · ${t('wizard.attributes.fromGrowth', { n: report.growthPoints })}` : ''}</small>
    <span class="spacer"></span>
    <label class="check"><input type="checkbox" bind:checked={char.naturtalent} /> {t('wizard.attributes.prodigy')}</label>
  </div>

  {#if growthTitles.length}
    <p class="note">{t('wizard.attributes.growthNote', { titles: growthTitles.map((g) => g.name).join(', ') })}</p>
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
          {#each char.titles.filter((x) => x.leadAttrs.includes(k)) as ti}<span class="chip accent" title={t('wizard.attributes.leadOf', { name: ti.name })}>★ {ti.name}</span>{/each}
        </div>
      </div>
    {/each}
  </div>

  <div class="derived">
    <div><span class="lbl">{t('wizard.attributes.energieFormula')}</span><b>{sheet.energieMax.value}</b></div>
    <div><span class="lbl">{t('wizard.attributes.wkFormula')}</span><b>{sheet.wkMax.value}</b></div>
    <div><span class="lbl">{t('wizard.attributes.passive')}</span><b>{sheet.passiv.value}</b></div>
  </div>

  {#if char.titles.length}
    <div class="tablewrap">
      <table>
        <thead><tr><th>{t('wizard.attributes.bonusInDomain')}</th>{#each defs as d}<th>{d.kurz}</th>{/each}</tr></thead>
        <tbody>
          {#each char.titles as ti}
            {@const row = titleBonusRow(char.attributes, ti)}
            <tr><td>{ti.name} <small class="dim">L{ti.level}</small></td>{#each ATTR_KEYS as k}<td class:lead={ti.leadAttrs.includes(k)}>{fmt(row[k])}</td>{/each}</tr>
          {/each}
        </tbody>
      </table>
    </div>
    <small class="dim">{t('wizard.attributes.legend')}</small>
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
  .attrs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(170px, 100%), 1fr)); gap: 0.7rem; }
  .attr { display: grid; justify-items: center; gap: 0.35rem; padding: 0.8rem 0.6rem; background: var(--raised); border: 1px solid var(--line); text-align: center; }
  .attr.warn { border-color: var(--warn); }
  .head { display: flex; gap: 0.5rem; align-items: baseline; }
  .head b { font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .kurz { font: 500 0.7rem var(--font-mono); color: var(--accent-2); }
  .val { font: 400 3rem/1 var(--font-display); color: var(--accent); }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; }
  .derived { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)); gap: 0.7rem; }
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
