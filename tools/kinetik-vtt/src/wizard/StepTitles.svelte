<script lang="ts">
  import { rules, meisterschaft, type AttrKey } from '../rules';
  import { newTitle, type Character } from '../model/character';
  import { creationReport } from '../model/sheet';
  import { TITLE_TEMPLATES, DOMAIN_SUGGESTIONS } from './templates';
  import Stepper from '../ui/Stepper.svelte';
  import TagInput from '../ui/TagInput.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
  const report = $derived(creationReport(char));
  const attrs = rules.tabellen.attribute;
  const startMax = $derived(report.stufe.startLevelMax);

  function addTemplate(i: number) {
    const tpl = TITLE_TEMPLATES[i];
    char.titles.push(newTitle({ name: tpl.name, level: 1, startedAtLevel: 1, domains: [...tpl.domains], leadAttrs: [...tpl.lead] as [AttrKey, AttrKey] }));
  }
  const addBlank = () => char.titles.push(newTitle({ startedAtLevel: 1, level: 1 }));
  function remove(id: string) {
    char.titles = char.titles.filter((ti) => ti.id !== id);
    for (const m of char.moves) if (m.titleId === id) m.titleId = undefined;
  }
  function toggleDomain(ti: (typeof char.titles)[number], d: string) {
    ti.domains = ti.domains.includes(d) ? ti.domains.filter((x) => x !== d) : [...ti.domains, d];
  }
  const remaining = $derived(report.titleBudget - report.titleLevels);
</script>

<div class="stack">
  <p class="dim intro">{t('wizard.titles.intro1')}<em>Ex-Hitman</em>, <em>SWAT-Operator</em>{t('wizard.titles.intro2')}<b>{t('wizard.titles.introLevel')}</b>{t('wizard.titles.intro3')}<b>{t('wizard.titles.introDomain')}</b>{t('wizard.titles.intro4')}<b>{t('wizard.titles.introLead')}</b>{t('wizard.titles.intro5')}</p>

  <div class="budget" class:over={remaining < 0}>
    <span>{t('wizard.titles.budget')}</span><b>{report.titleLevels} / {report.titleBudget}</b>
    <small class="dim">{remaining >= 0 ? t('wizard.common.left', { n: remaining }) : t('wizard.common.tooMany', { n: -remaining })} · {t('wizard.titles.maxLevel', { max: startMax })}</small>
  </div>

  <div>
    <h3>{t('wizard.titles.templates')}</h3>
    <div class="tpl">
      {#each TITLE_TEMPLATES as tpl, i}<button class="chip" onclick={() => addTemplate(i)} title={`${tpl.text}: ${tpl.domains.join(', ')}`}>+ {tpl.name}</button>{/each}
      <button class="chip amber" onclick={addBlank}>+ {t('wizard.titles.custom')}</button>
    </div>
    <small class="dim">{t('wizard.titles.templatesNote')}</small>
  </div>

  {#each char.titles as ti (ti.id)}
    {@const m = meisterschaft(ti.level)}
    {@const domWarn = ti.domains.length < 3 || ti.domains.length > 5}
    <section class="panel flat title">
      <div class="row">
        <label class="field grow">{t('wizard.titles.title')}<input bind:value={ti.name} /></label>
        <label class="field">{t('wizard.titles.level')}<Stepper value={ti.level} min={1} max={10} warn={ti.level > startMax} label={t('wizard.titles.level')} onchange={(v) => { ti.level = v; ti.startedAtLevel = v; }} /></label>
        <div class="m"><span class="lbl">{t('wizard.titles.mastery')}</span><b>{m}</b></div>
        <button class="btn sm icon danger" onclick={() => remove(ti.id)} aria-label={t('wizard.titles.remove')}>🗑</button>
      </div>
      {#if ti.level >= 4}<p class="note">{t('wizard.titles.growth', { level: ti.level })}</p>{/if}
      <label class="field">{t('wizard.titles.domainLabel', { n: ti.domains.length })}<TagInput bind:values={ti.domains} label={t('wizard.titles.domain')} /></label>
      {#if domWarn}<p class="warn">{t('wizard.titles.domainWarn')}</p>{/if}
      <div class="sug">
        {#each DOMAIN_SUGGESTIONS.filter((d) => !ti.domains.includes(d)).slice(0, 14) as d}<button class="chip" onclick={() => toggleDomain(ti, d)}>+ {d}</button>{/each}
      </div>
      <div class="row">
        <label class="field">{t('wizard.titles.lead1')}
          <select bind:value={ti.leadAttrs[0]}>{#each attrs as a}<option value={a.key}>{a.name}</option>{/each}</select>
        </label>
        <label class="field">{t('wizard.titles.lead2')}
          <select bind:value={ti.leadAttrs[1]}>{#each attrs as a}<option value={a.key}>{a.name}</option>{/each}</select>
        </label>
        {#if ti.leadAttrs[0] === ti.leadAttrs[1]}<span class="warn">{t('wizard.titles.sameLead')}</span>{/if}
      </div>
    </section>
  {:else}
    <p class="dim">{t('wizard.titles.empty')}</p>
  {/each}
</div>

<style>
  .intro { margin: 0; }
  .budget { display: flex; gap: 0.8rem; align-items: baseline; flex-wrap: wrap; padding: 0.6rem 0.8rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .budget b { font: 400 1.9rem/1 var(--font-display); color: var(--accent); }
  .budget.over { border-left-color: var(--danger); }
  .budget.over b { color: var(--danger); }
  .tpl, .sug { display: flex; flex-wrap: wrap; gap: 5px; margin: 0.4rem 0; }
  .tpl .chip, .sug .chip { cursor: pointer; }
  .tpl .chip:hover, .sug .chip:hover { border-color: var(--accent); color: var(--accent); }
  .title { border-left: 3px solid var(--accent); display: grid; gap: 0.6rem; }
  .grow { flex: 1; min-width: 180px; }
  .m { display: grid; justify-items: center; }
  .m b { font: 400 2rem/1 var(--font-display); color: var(--accent-2); }
  .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .note { margin: 0; color: var(--accent-2); font-size: 0.9rem; }
  .warn { color: var(--warn); margin: 0; font-size: 0.88rem; }
</style>
