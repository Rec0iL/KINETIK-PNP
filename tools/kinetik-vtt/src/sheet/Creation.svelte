<script lang="ts">
  import { rules } from '../rules';
  import type { Character } from '../model/character';
  import { creationReport } from '../model/sheet';
  import { openRulebook } from '../rulebook/rulebook.svelte';
  import { navigate } from '../lib/router.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import { t, tn } from '../i18n';

  let { char }: { char: Character } = $props();
  const report = $derived(creationReport(char));
  const stufen = rules.tabellen.kampagnenstufen;
</script>

<section class="panel creation">
  <h2>{t('sheet.creation.title', { tier: report.stufe.name })} <span class="chip" class:danger={report.hints.length > 0} class:accent={report.hints.length === 0}>{report.hints.length ? tn('sheet.creation.hints', report.hints.length) : t('sheet.creation.inBudget')}</span>{#if char.draft}<span class="chip amber">{t('sheet.creation.draft')}</span>{/if}</h2>

    <div class="cstufe">
      <label class="field">{t('sheet.creation.startTier')}
        <select bind:value={char.stufe}>
          {#each stufen as s}<option value={s.key}>{s.name}{'standard' in s ? t('sheet.creation.standardSuffix') : ''}</option>{/each}
          <option value="custom">{t('sheet.creation.custom')}</option>
        </select>
      </label>
      {#if char.stufe === 'custom'}
        <label class="field">{t('sheet.creation.attrBudget')}<Stepper bind:value={char.customStufe.attributBudget} min={0} max={20} label={t('sheet.creation.attrBudget')} /></label>
        <label class="field">{t('sheet.creation.titleBudget')}<Stepper bind:value={char.customStufe.titelBudget} min={0} max={40} label={t('sheet.creation.titleBudget')} /></label>
        <label class="field">{t('sheet.creation.maxStartLevel')}<Stepper bind:value={char.customStufe.startLevelMax} min={1} max={10} label={t('sheet.creation.maxStartLevelAria')} /></label>
      {/if}
      <label class="check nat"><input type="checkbox" bind:checked={char.naturtalent} /> {t('sheet.creation.prodigy')}</label>
    </div>
    <div class="cgrid">
      <div><span class="lbl">{t('sheet.creation.attrPoints')}</span><b class:over={report.attributesOver}>{report.attributesSpent} / {report.attributesBudget}</b><small class="dim">{t('sheet.creation.refund', { growth: report.growthPoints ? t('sheet.creation.growth', { n: report.growthPoints }) : '' })}</small></div>
      <div><span class="lbl">{t('sheet.creation.titleLevels')}</span><b class:over={report.titleLevels > report.titleBudget}>{report.titleLevels} / {report.titleBudget}</b><small class="dim">{t('sheet.creation.perTitleMax', { n: report.stufe.startLevelMax })}</small></div>
      <div><span class="lbl">{t('sheet.creation.startMax')}</span><b>+{report.startMax}</b></div>
    </div>
    {#if report.hints.length}<ul class="hints">{#each report.hints as h}<li>{h}</li>{/each}</ul>{/if}
    <div class="row cact">
      <button class="btn sm" onclick={() => navigate(`/wizard/${char.id}/1`)}>{t('sheet.creation.openWizard')}</button>
      <button class="btn sm" onclick={() => openRulebook('sec-2-4-charaktererschaffung')}>{t('sheet.creation.readRules')}</button>
      {#if char.draft}<button class="btn sm primary" onclick={() => (char.draft = false)}>{t('sheet.creation.finish')}</button>{/if}
    </div>
    <p class="hint dim">{t('sheet.creation.hint')}</p>
</section>

<style>
  .cstufe { display: flex; gap: 1rem; flex-wrap: wrap; align-items: end; margin-top: 0.9rem; }
  .cstufe .nat { flex: 1 1 100%; color: var(--ink-dim); }
  .cact { margin-top: 0.8rem; }
  .cgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 1rem; margin-top: 0.9rem; }
  .cgrid b { display: block; font: 400 1.8rem var(--font-display); color: var(--accent); }
  .cgrid b.over { color: var(--danger); }
  .hints { margin: 0.7rem 0 0; padding-left: 1.2em; color: var(--warn); }
  .creation h2 { display: flex; gap: 0.7rem; align-items: center; flex-wrap: wrap; }
  .lbl { display: block; font: 600 0.8rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .check { display: flex; gap: 0.5em; align-items: center; color: var(--ink-dim); font-size: 0.92rem; }
  .hint { font-size: 0.82rem; margin: 0.7rem 0 0; }
</style>
