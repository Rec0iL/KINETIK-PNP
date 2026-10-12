<script lang="ts">
  import { rules, ATTR_KEYS, attributeMax, attributeAffects, meisterschaft, type AttrKey } from '../rules';
  import { newTitle, uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import { imageToDataUrl } from '../lib/image';
  import { portraitPlaceholder } from '../lib/art';
  import Stepper from '../ui/Stepper.svelte';
  import Meter from '../ui/Meter.svelte';
  import Pips from '../ui/Pips.svelte';
  import TagInput from '../ui/TagInput.svelte';
  import OverrideValue from '../ui/OverrideValue.svelte';
  import ShieldGauge from '../ui/ShieldGauge.svelte';
  import TagsMini from './TagsMini.svelte';
  import Poisons from './Poisons.svelte';
  import MovesOverview from './MovesOverview.svelte';
  import { t, tn } from '../i18n';

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
    try { char.portrait = await imageToDataUrl(file); } catch { alert(t('sheet.overview.imageError')); }
  }

  const gain = (key: 'energie' | 'wk', n: number) => {
    const max = key === 'energie' ? sheet.energieMax.value : sheet.wkMax.value;
    char.resources[key] = Math.max(0, Math.min(max, char.resources[key] + n));
  };
  const addMomentum = (n: number) => {
    char.resources.momentum = Math.max(0, Math.min(sheet.momentumCap.value, char.resources.momentum + n));
  };

  function addTempTag(name: string) {
    if (!char.tags.some((tg) => tg.name === name && !tg.permanent)) char.tags.push({ id: uid(), name, size: 'klein', note: t('sheet.overview.untilNextAction') });
  }
  const breathe = () => { gain('energie', 2); addTempTag(t('sheet.overview.vulnBreath')); };
  const focusUp = () => { gain('wk', 2); addTempTag(t('sheet.overview.vulnCompose')); };
  const dominance = () => { addMomentum(1); gain('energie', 1); };
  const perfectCounter = () => { addMomentum(1); gain('wk', 1); };
  const combatEnd = () => { char.resources.momentum = 0; };
  function shortRest() {
    char.resources.energie = sheet.energieMax.value;
    char.resources.wk = sheet.wkMax.value;
    char.resources.schutz.current = char.resources.schutz.max;
    char.tags = char.tags.filter((tg) => tg.permanent);
    char.resources.momentum = 0;
    // Nicht-tödliches Gift endet spätestens mit der Rast (3.11).
    char.poisons = (char.poisons ?? []).filter((p) => p.level === 'toedlich');
  }

  function addTitle() {
    char.titles.push(newTitle({ startedAtLevel: 1 }));
  }
  function removeTitle(id: string) {
    if (!confirm(t('sheet.overview.confirmRemoveTitle'))) return;
    char.titles = char.titles.filter((ti) => ti.id !== id);
    for (const m of char.moves) if (m.titleId === id) m.titleId = undefined;
  }

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const shortName = (k: AttrKey) => attrDefs.find((a) => a.key === k)!.kurz;
  let helpOpen = $state(false);
</script>

<div class="stack">
  <!-- Identität -->
  <section class="panel ident">
    <label class="portrait" title={t('sheet.overview.pickImage')}>
      {#if char.portrait}<img src={char.portrait} alt={t('sheet.overview.portrait')} />{:else}<img class="ph" src={portraitPlaceholder()} alt="" /><span class="hintlbl">{t('sheet.overview.pickImage')}</span>{/if}
      <input type="file" accept="image/*" onchange={onPortrait} class="sr-only" />
      {#if char.portrait}
        <button type="button" class="btn sm icon x" onclick={(e) => { e.preventDefault(); char.portrait = undefined; }} aria-label={t('sheet.overview.removeImage')}>✕</button>
      {/if}
    </label>
    <div class="fields">
      <label class="field">{t('sheet.common.name')}<input bind:value={char.name} /></label>
      <label class="field">{t('sheet.overview.alias')}<input bind:value={char.alias} placeholder={t('sheet.overview.aliasPlaceholder')} /></label>
      <label class="field">{t('sheet.overview.player')}<input bind:value={char.player} /></label>
      <label class="field wide">{t('sheet.overview.concept')}<textarea rows="2" bind:value={char.concept} placeholder={t('sheet.overview.conceptPlaceholder')}></textarea></label>
      <label class="field wide">{t('sheet.overview.setting')}<input bind:value={char.setting} placeholder={t('sheet.overview.settingPlaceholder')} /></label>
    </div>
  </section>

  <!-- Attribute -->
  <section class="panel">
    <h2>{t('sheet.overview.attributes')}</h2>
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
            {#each attributeAffects(a.key as AttrKey) as r}<span class="chip">{r === 'energie' ? t('sheet.common.energy') : t('sheet.common.wp')}</span>{/each}
            <span class="bonus">{t('sheet.overview.check', { b: fmt(sheet.basicBonus[a.key as AttrKey]) })}</span>
          </small>
        </div>
      {/each}
    </div>
    <p class="hint dim">{t('sheet.overview.attrHint')}</p>
  </section>

  <!-- Ressourcen und Tags -->
  <div class="resrow">
  <section class="panel">
    <h2>{t('sheet.overview.resources')}</h2>
    <div class="states">
      {#if sheet.states.ohnmaechtig}<span class="chip danger" title={t('sheet.overview.unconsciousTitle')}>{tn('sheet.overview.unconscious', sheet.overflow)}</span>
      {:else if sheet.states.ausgepumpt}<span class="chip danger">{t('sheet.overview.winded')}</span>{/if}
      {#if sheet.states.gebrochen}<span class="chip danger">{t('sheet.overview.broken')}</span>{/if}
      {#if sheet.states.sterbend}<span class="chip danger">{t('sheet.overview.dying')}</span>{/if}
      {#if (char.poisons ?? []).length}<span class="chip danger" title={t('sheet.overview.poisonedTitle')}>{t('sheet.overview.poisoned')}</span>{/if}
      {#each sheet.states.unbrauchbar as z}<span class="chip amber">{t('sheet.overview.zoneUseless', { zone: rules.tabellen.zonen.find((x) => x.key === z)?.kurz ?? z })}</span>{/each}
    </div>
    <div class="res">
      <Meter label={t('sheet.common.energy')} bind:value={char.resources.energie} max={sheet.energieMax.value} min={-12} quick={[-3, -2, -1, 1, 2, 3]}>
        {#snippet maxSlot()}<OverrideValue derived={sheet.energieMax} label={t('sheet.overview.energyMax')} formula={t('sheet.overview.energyFormula')} onset={(v) => (v === undefined ? delete char.overrides.energieMax : (char.overrides.energieMax = v))} />{/snippet}
      </Meter>
      <Meter label={t('sheet.common.willpower')} tone="amber" bind:value={char.resources.wk} max={sheet.wkMax.value} quick={[-3, -2, -1, 1, 2, 3]}>
        {#snippet maxSlot()}<OverrideValue derived={sheet.wkMax} label={t('sheet.overview.wpMax')} formula={t('sheet.overview.wpFormula')} onset={(v) => (v === undefined ? delete char.overrides.wkMax : (char.overrides.wkMax = v))} />{/snippet}
      </Meter>
      <div class="mom">
        <Pips label="Momentum" bind:value={char.resources.momentum} cap={sheet.momentumCap.value} />
        <small class="dim">{t('sheet.overview.cap')}
          <OverrideValue derived={sheet.momentumCap} label={t('sheet.overview.momentumCap')} formula={t('sheet.overview.capFormula')} onset={(v) => (v === undefined ? delete char.overrides.momentumCap : (char.overrides.momentumCap = v))} />
        </small>
      </div>
      <div class="schutz">
        <span class="lbl">{t('sheet.overview.protection')}</span>
        <div class="shieldrow">
          <ShieldGauge bind:current={char.resources.schutz.current} bind:max={char.resources.schutz.max} />
          <label class="field">{t('sheet.overview.protType')}<textarea rows="3" bind:value={char.resources.schutz.type} placeholder={t('sheet.overview.protPlaceholder')}></textarea></label>
        </div>
      </div>
      <div class="passiv">
        <span class="lbl">{t('sheet.overview.passive')}</span>
        <span class="big"><OverrideValue derived={sheet.passiv} label={t('sheet.overview.passive')} formula={t('sheet.overview.passiveFormula')} onset={(v) => (v === undefined ? delete char.overrides.passiv : (char.overrides.passiv = v))} /></span>
      </div>
    </div>
    <div class="row actions">
      <button class="btn sm" onclick={breathe} title={t('sheet.overview.breatheTitle')}>{t('sheet.overview.breathe')}</button>
      <button class="btn sm" onclick={focusUp} title={t('sheet.overview.composeTitle')}>{t('sheet.overview.compose')}</button>
      <button class="btn sm" onclick={dominance} title={t('sheet.overview.dominanceTitle')}>{t('sheet.overview.dominance')}</button>
      <button class="btn sm" onclick={perfectCounter} title={t('sheet.overview.perfectCounterTitle')}>{t('sheet.overview.perfectCounter')}</button>
      <button class="btn sm" onclick={combatEnd} title={t('sheet.overview.combatEndTitle')}>{t('sheet.overview.combatEnd')}</button>
      {#if sheet.states.ohnmaechtig}<button class="btn sm" onclick={() => (char.resources.energie = 1)} title={t('sheet.overview.reviveTitle')}>{t('sheet.overview.revive')}</button>{/if}
      <button class="btn sm amber" onclick={shortRest} title={t('sheet.overview.shortRestTitle')}>{t('sheet.overview.shortRest')}</button>
    </div>
  </section>
  <TagsMini {char} {ontab} />
  <Poisons {char} />
  </div>

  <!-- Titel -->
  <section class="panel">
    <div class="row"><h2>{t('sheet.common.title')}</h2><span class="spacer"></span><button class="btn sm primary" onclick={addTitle}>{t('sheet.overview.addTitle')}</button></div>
    {#if !char.titles.length}<p class="dim">{t('sheet.overview.noTitle')}</p>{/if}
    <div class="titles">
      {#each char.titles as ti (ti.id)}
        {@const m = ti.masteryOverride ?? meisterschaft(ti.level)}
        <div class="title">
          <div class="row">
            <label class="field grow">{t('sheet.common.name')}<input bind:value={ti.name} /></label>
            <label class="field">Level<Stepper bind:value={ti.level} min={0} max={10} label="Level" /></label>
            <div class="mastery" title={t('sheet.overview.masteryTitle')}>
              <span class="lbl">{t('sheet.overview.mastery')}</span>
              <span class="big">{m}</span>
              <label class="check small"><input type="checkbox" checked={ti.masteryOverride !== undefined} onchange={(e) => (ti.masteryOverride = e.currentTarget.checked ? m : undefined)} /> {t('sheet.overview.manual')}</label>
              {#if ti.masteryOverride !== undefined}<Stepper bind:value={ti.masteryOverride} min={0} max={9} label={t('sheet.overview.mastery')} />{/if}
            </div>
            <button class="btn sm icon danger" onclick={() => removeTitle(ti.id)} aria-label={t('sheet.overview.removeTitle')}>🗑</button>
          </div>
          <div class="row">
            <label class="field grow">{t('sheet.overview.domain')}<TagInput bind:values={ti.domains} label={t('sheet.overview.domainAria')} /></label>
          </div>
          <div class="row">
            <label class="field">{t('sheet.overview.lead1')}
              <select bind:value={ti.leadAttrs[0]}>{#each attrDefs as a}<option value={a.key}>{a.name}</option>{/each}</select>
            </label>
            <label class="field">{t('sheet.overview.lead2')}
              <select bind:value={ti.leadAttrs[1]}>{#each attrDefs as a}<option value={a.key}>{a.name}</option>{/each}</select>
            </label>
            <label class="field">{t('sheet.overview.startedAt')}<Stepper value={ti.startedAtLevel ?? ti.level} min={0} max={10} onchange={(v) => (ti.startedAtLevel = v)} label={t('sheet.overview.startedAt')} /></label>
            <span class="growth dim">
              {#each rules.tabellen.wachstumLevels as g}
                <span class="chip" class:accent={ti.level >= g} title={t('sheet.overview.growthTitle', { n: g })}>L{g}</span>
              {/each}
              {#if ti.level >= 5}<span class="chip accent" title={t('sheet.overview.momTitle')}>Mom +1</span>{/if}
              {#if ti.level >= 8}<span class="chip amber" title={t('sheet.overview.masterTitle')}>{t('sheet.overview.master')}</span>{/if}
              {#if ti.level >= 10}<span class="chip amber" title={t('sheet.overview.legendTitle')}>{t('sheet.overview.legend')}</span>{/if}
            </span>
          </div>
        </div>
      {/each}
    </div>

    {#if char.titles.length}
      <h3 class="mt">{t('sheet.overview.bonusTable')}</h3>
      <div class="tablewrap">
        <table>
          <thead><tr><th>{t('sheet.common.title')}</th>{#each ATTR_KEYS as k}<th>{shortName(k)}</th>{/each}</tr></thead>
          <tbody>
            {#each sheet.titleRows as r}
              <tr>
                <td>{r.title.name} <small class="dim">L{r.title.level}, M{r.mastery}</small></td>
                {#each ATTR_KEYS as k}<td class:lead={r.title.leadAttrs.includes(k)}>{fmt(r.row[k])}</td>{/each}
              </tr>
            {/each}
            <tr class="base"><td>{t('sheet.overview.noTitleRow')}</td>{#each ATTR_KEYS as k}<td>{fmt(char.attributes[k])}</td>{/each}</tr>
          </tbody>
        </table>
      </div>
      <p class="hint dim">{t('sheet.overview.tableHint')}</p>
    {/if}
  </section>

  <!-- Moves (nur lesen und würfeln, Anlegen im Reiter Moves) -->
  <MovesOverview {char} {ontab} />
</div>

<style>
  .resrow { display: grid; grid-template-columns: minmax(0, 2fr) minmax(min(250px, 100%), 1fr); gap: 1rem; align-items: start; }
  @media (max-width: 1050px) { .resrow { grid-template-columns: 1fr; } }
  .ident { display: grid; grid-template-columns: 150px 1fr; gap: 1.1rem; }
  .portrait { position: relative; width: 150px; height: 190px; border: 1px dashed var(--line-strong); display: grid; place-items: center; color: var(--ink-dim); cursor: pointer; overflow: hidden; background: var(--field-bg); font: 600 0.8rem var(--font-head); letter-spacing: 0.15em; text-transform: uppercase; }
  .portrait:hover { border-color: var(--accent); }
  .portrait img { width: 100%; height: 100%; object-fit: cover; }
  .portrait img.ph { opacity: 0.45; filter: saturate(0.6); }
  .portrait .hintlbl { position: absolute; bottom: 8px; left: 0; right: 0; text-align: center; text-shadow: 0 1px 4px #000; color: var(--ink); }
  .portrait .x { position: absolute; top: 4px; right: 4px; }
  .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)); gap: 0.7rem; align-content: start; }
  .wide { grid-column: 1 / -1; }
  .check { display: flex; gap: 0.5em; align-items: center; color: var(--ink-dim); font-size: 0.92rem; grid-column: 1 / -1; }
  .check.small { font-size: 0.8rem; }

  .attrs { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(150px, 100%), 1fr)); gap: 0.7rem; }
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
  .res { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 1.2rem 1.6rem; align-items: start; }
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
  tr:nth-child(even) td { background: var(--stripe); }
  td.lead { color: var(--accent-2); font-weight: 700; }
  tr.base td { color: var(--ink-dim); }

  @media (max-width: 640px) { .ident { grid-template-columns: 1fr; } .portrait { width: 120px; height: 150px; } }
</style>
