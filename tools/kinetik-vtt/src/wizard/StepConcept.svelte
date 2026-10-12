<script lang="ts">
  import type { Character } from '../model/character';
  import { imageToDataUrl } from '../lib/image';
  import { portraitPlaceholder } from '../lib/art';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();

  async function onPortrait(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    try { char.portrait = await imageToDataUrl(f); } catch { alert(t('wizard.concept.imageError')); }
  }
</script>

<div class="grid2">
  <div class="stack">
    <p class="dim intro">{t('wizard.concept.intro')}</p>
    <label class="field">{t('wizard.concept.name')}<input bind:value={char.name} placeholder={t('wizard.concept.namePh')} /></label>
    <div class="row">
      <label class="field grow">{t('wizard.concept.alias')}<input bind:value={char.alias} placeholder={t('wizard.concept.aliasPh')} /></label>
      <label class="field grow">{t('wizard.concept.player')}<input bind:value={char.player} /></label>
    </div>
    <label class="field">{t('wizard.concept.concept')}<textarea rows="3" bind:value={char.concept} placeholder={t('wizard.concept.conceptPh')}></textarea></label>
    <label class="field">{t('wizard.concept.setting')}<input bind:value={char.setting} placeholder={t('wizard.concept.settingPh')} /></label>
    <small class="dim">{t('wizard.concept.scaleNote')}</small>
  </div>
  <label class="portrait" title={t('wizard.concept.pickImage')}>
    {#if char.portrait}<img src={char.portrait} alt={t('wizard.concept.portraitAlt')} />{:else}<img class="ph" src={portraitPlaceholder()} alt="" /><span>{t('wizard.concept.pickPortrait')}</span>{/if}
    <input type="file" accept="image/*" onchange={onPortrait} class="sr-only" />
  </label>
</div>

<style>
  .grid2 { display: grid; grid-template-columns: 1fr 200px; gap: 1.2rem; align-items: start; }
  .intro { margin: 0; }
  .grow { flex: 1; min-width: 150px; }
  .portrait { position: relative; width: 200px; height: 250px; border: 1px dashed var(--line-strong); display: grid; place-items: end center; cursor: pointer; overflow: hidden; background: var(--field-bg); font: 600 0.78rem var(--font-head); letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
  .portrait:hover { border-color: var(--accent); }
  .portrait img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .portrait img.ph { opacity: 0.45; filter: saturate(0.6); }
  .portrait span { position: relative; padding: 0.5rem; text-shadow: 0 1px 4px #000; }
  @media (max-width: 700px) { .grid2 { grid-template-columns: 1fr; } .portrait { width: 140px; height: 175px; } }
</style>
