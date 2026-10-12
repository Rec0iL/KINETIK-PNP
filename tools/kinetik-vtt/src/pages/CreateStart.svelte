<script lang="ts">
  import { rules } from '../rules';
  import { newCharacter, type CustomStufe, type Stufe } from '../model/character';
  import { addCharacter } from '../store/characters.svelte';
  import { navigate } from '../lib/router.svelte';
  import { openRulebook } from '../rulebook/rulebook.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';

  let step = $state<1 | 2>(1);
  let stufe = $state<Stufe>('kino');
  let custom = $state<CustomStufe>({ attributBudget: 4, titelBudget: 4, startLevelMax: 3 });

  const options = $derived([
    ...rules.tabellen.kampagnenstufen.map((s) => ({
      key: s.key as Stufe, name: s.name, standard: 'standard' in s, attr: s.attributBudget, titel: s.titelBudget, max: s.startLevelMax,
      text: ({ strasse: t('pages.createStart.textStrasse'), kino: t('pages.createStart.textKino'), legende: t('pages.createStart.textLegende') } as Record<string, string>)[s.key] ?? '',
    })),
    { key: 'custom' as Stufe, name: t('pages.createStart.custom'), standard: false, attr: custom.attributBudget, titel: custom.titelBudget, max: custom.startLevelMax, text: t('pages.createStart.customText') },
  ]);

  function create(mode: 'wizard' | 'manual') {
    const c = addCharacter(newCharacter({ stufe, customStufe: { ...custom }, draft: true }));
    navigate(mode === 'wizard' ? `/wizard/${c.id}/1` : `/charakter/${c.id}`);
  }
</script>

<section class="wrap">
  <span class="kicker">{t('pages.createStart.kicker', { step })}</span>
  <h1>{step === 1 ? t('pages.createStart.title1') : t('pages.createStart.title2')}</h1>

  {#if step === 1}
    <p class="dim lead">{t('pages.createStart.lead1')}</p>
    <div class="opts">
      {#each options as o (o.key)}
        <button class="opt panel" class:on={stufe === o.key} onclick={() => (stufe = o.key)} aria-pressed={stufe === o.key}>
          <h2>{o.name}{#if o.standard}<span class="chip accent">{t('pages.createStart.standard')}</span>{/if}</h2>
          <p class="dim">{o.text}</p>
          <dl>
            <div><dt>{t('pages.common.attributes')}</dt><dd>{o.attr}</dd></div>
            <div><dt>{t('pages.common.titleLevels')}</dt><dd>{o.titel}</dd></div>
            <div><dt>{t('pages.createStart.maxPerTitle')}</dt><dd>{o.max}</dd></div>
          </dl>
        </button>
      {/each}
    </div>

    {#if stufe === 'custom'}
      <section class="panel custom">
        <h3>{t('pages.createStart.customBudgets')}</h3>
        <div class="row">
          <label class="field">{t('pages.createStart.attrBudget')}<Stepper bind:value={custom.attributBudget} min={0} max={20} label={t('pages.createStart.attrBudget')} /></label>
          <label class="field">{t('pages.createStart.titleBudget')}<Stepper bind:value={custom.titelBudget} min={0} max={40} label={t('pages.createStart.titleBudget')} /></label>
          <label class="field">{t('pages.createStart.maxStartPerTitle')}<Stepper bind:value={custom.startLevelMax} min={1} max={10} label={t('pages.common.maxStartLevel')} /></label>
        </div>
        <small class="dim">{t('pages.createStart.customNote')}</small>
      </section>
    {/if}

    <div class="row">
      <a class="btn ghost" href="#/charaktere">{t('pages.common.cancel')}</a>
      <button class="btn sm" onclick={() => openRulebook('sec-2-4-charaktererschaffung')}>{t('pages.createStart.readRules')}</button>
      <span class="spacer"></span>
      <button class="btn primary" onclick={() => (step = 2)}>{t('pages.common.next')}</button>
    </div>
  {:else}
    <p class="dim lead">{t('pages.createStart.lead2')}</p>
    <div class="opts two">
      <button class="opt panel big" onclick={() => create('wizard')}>
        <h2>{t('pages.createStart.wizard')} <span class="chip accent">{t('pages.createStart.recommended')}</span></h2>
        <p class="dim">{t('pages.createStart.wizardText')}</p>
        <ol class="dim"><li>{t('pages.createStart.stepConcept')}</li><li>{t('pages.createStart.stepTitles')}</li><li>{t('pages.createStart.stepAttributes')}</li><li>{t('pages.createStart.stepMoves')}</li><li>{t('pages.createStart.stepGear')}</li><li>{t('pages.createStart.stepFinish')}</li></ol>
      </button>
      <button class="opt panel big" onclick={() => create('manual')}>
        <h2>{t('pages.createStart.manual')}</h2>
        <p class="dim">{t('pages.createStart.manualText')}</p>
      </button>
    </div>
    <div class="row">
      <button class="btn ghost" onclick={() => (step = 1)}>{t('pages.common.back')}</button>
      <span class="chip">{t('pages.createStart.tier', { name: options.find((o) => o.key === stufe)?.name ?? '' })}</span>
    </div>
  {/if}
</section>

<style>
  .wrap { display: grid; gap: 1.1rem; max-width: 1000px; }
  .lead { max-width: 70ch; margin: 0; }
  .opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 0.9rem; }
  .opts.two { grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr)); }
  .opt { text-align: left; cursor: pointer; display: grid; gap: 0.5rem; align-content: start; color: var(--ink); font: inherit; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s; }
  .opt:hover { transform: translateY(-3px); border-color: var(--accent); }
  .opt.on { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--glow); }
  .opt h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.1rem; letter-spacing: 0.06em; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .opt p { margin: 0; }
  dl { display: grid; gap: 4px; margin: 0.3rem 0 0; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding: 2px 0; }
  dt { font: 600 0.75rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  dd { margin: 0; font: 400 1.4rem/1 var(--font-display); color: var(--accent-2); }
  .big { min-height: 230px; padding: 1.3rem; }
  ol { margin: 0; padding-left: 1.2em; columns: 2; }
  .custom { display: grid; gap: 0.6rem; }
</style>
