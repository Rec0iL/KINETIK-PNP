<script lang="ts">
  import { catalog } from '../music/catalog.svelte';
  import Copyright from '../ui/Copyright.svelte';
  import { t } from '../i18n';
</script>

<section class="stack wrap">
  <span class="kicker">KINETIK</span>
  <h1>{t('legal.credits.title')}</h1>

  <section class="panel">
    <h2>{t('legal.credits.music')}</h2>
    <p class="dim">{t('legal.credits.musicNote')}</p>
    <ul class="list">
      {#each catalog.tracks as tr}
        <li>
          „{tr.title}“ {tr.artist} (<a href="https://incompetech.com" target="_blank" rel="noreferrer">incompetech.com</a>)<br />
          <small class="dim">{t('legal.credits.musicLicense', { link: 'creativecommons.org/licenses/by/4.0' })}</small>
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel">
    <h2>{t('legal.credits.graphics')}</h2>
    <p class="dim">{t('legal.credits.graphicsText', { script: 'scripts/gen_web_assets.py' })}</p>
  </section>

  <section class="panel">
    <h2>{t('legal.credits.fonts')}</h2>
    <p class="dim">{t('legal.credits.fontsText')}</p>
  </section>

  <section class="panel">
    <h2>{t('legal.credits.license')}</h2>
    <p class="dim">{t('legal.credits.licenseBefore')} <a href={t('legal.credits.licenseUrl')} target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> {t('legal.credits.licenseAfter')} <a href="https://github.com/Rec0iL/KINETIK-PNP" target="_blank" rel="noreferrer">github.com/Rec0iL/KINETIK-PNP</a>.</p>
  </section>

  <section class="panel">
    <h2>{t('legal.credits.software')}</h2>
    <p class="dim">{t('legal.credits.softwareText')}</p>
  </section>

  <p class="dim"><a href="#/impressum">{t('nav.impressum')}</a> · <a href="#/datenschutz">{t('nav.privacy')}</a></p>
  <Copyright />
</section>

<style>
  .wrap { max-width: 760px; }
  .list { padding-left: 1.1em; display: grid; gap: 0.6rem; }
</style>
