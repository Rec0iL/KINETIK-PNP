<script lang="ts">
  import { settings } from '../lib/settings.svelte';
  import { testIce } from '../net/icetest';
  import type { IceReport, Verdict } from '../net/ice';
  import { t } from '../i18n';

  let testing = $state(false);
  let result = $state<{ report: IceReport; verdict: Verdict } | null>(null);
  let failure = $state('');

  async function run() {
    testing = true;
    result = null;
    failure = '';
    try { result = await testIce(); } catch (e) { failure = (e as Error).message || t('ui.netSettings.testFailed'); }
    testing = false;
  }
  const mark = (ok: boolean) => (ok ? '✓' : '✗');
</script>

<details>
  <summary>{t('ui.netSettings.summary')}</summary>
  <div class="stack adv">
    <section class="box">
      <h3>{t('ui.netSettings.testTitle')}</h3>
      <p class="dim">{t('ui.netSettings.testIntro')}</p>
      <div class="row"><button class="btn sm primary" onclick={run} disabled={testing}>{testing ? t('ui.netSettings.testing') : t('ui.netSettings.test')}</button></div>
      {#if failure}<p class="bad">{failure}</p>{/if}
      {#if result}
        <ul class="res">
          <li class:okc={result.report.host}><b>{mark(result.report.host)}</b> {t('ui.netSettings.host')}</li>
          <li class:okc={result.report.srflx}><b>{mark(result.report.srflx)}</b> {t('ui.netSettings.srflx')}</li>
          <li class:okc={result.report.relay}><b>{mark(result.report.relay)}</b> {t('ui.netSettings.relay')}{result.report.relayTcp ? t('ui.netSettings.relayTcp') : ''}</li>
        </ul>
        <p class="verdict" class:bad={!result.verdict.ok}><b>{result.verdict.title}.</b> {result.verdict.text}</p>
        {#if result.report.errors.length}<details><summary>{t('ui.netSettings.serverErrors')}</summary><pre>{result.report.errors.join('\n')}</pre></details>{/if}
      {/if}
    </section>

    <section class="box">
      <h3>{t('ui.netSettings.turnTitle')}</h3>
      <p class="dim">{t('ui.netSettings.turnIntroPre')} <code>turns:</code>{t('ui.netSettings.turnIntroPost')}</p>
      <label class="field"><span>{t('ui.netSettings.turnUrls')}</span><textarea rows="2" bind:value={settings.turnUrl} placeholder={'turn:turn.example.org:3478\nturns:turn.example.org:443'}></textarea></label>
      <div class="row">
        <label class="field"><span>{t('ui.netSettings.turnUser')}</span><input bind:value={settings.turnUser} autocomplete="off" /></label>
        <label class="field"><span>{t('ui.netSettings.turnPass')}</span><input type="password" bind:value={settings.turnPass} autocomplete="off" /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={settings.relayOnly} /> {t('ui.netSettings.relayOnly')}</label>
    </section>

    <section class="box">
      <h3>{t('ui.netSettings.peerTitle')}</h3>
      <p class="dim">{t('ui.netSettings.peerIntro')}</p>
      <div class="row">
        <label class="field"><span>{t('ui.netSettings.peerHost')}</span><input bind:value={settings.peerHost} placeholder={t('ui.netSettings.peerHostPlaceholder')} /></label>
        <label class="field"><span>{t('ui.netSettings.peerPort')}</span><input type="number" bind:value={settings.peerPort} /></label>
        <label class="field"><span>{t('ui.netSettings.peerPath')}</span><input bind:value={settings.peerPath} /></label>
        <label class="check"><input type="checkbox" bind:checked={settings.peerSecure} /> TLS</label>
      </div>
      <label class="field"><span>{t('ui.netSettings.iceJson')}</span><textarea rows="3" bind:value={settings.iceJson} placeholder={'[{"urls":"turn:example.org:3478","username":"u","credential":"p"}]'}></textarea></label>
    </section>
  </div>
</details>

<style>
  summary { cursor: pointer; color: var(--ink-dim); }
  .adv { margin-top: 0.7rem; }
  .box { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; gap: 0.6rem; padding: 0.8rem; background: var(--raised); border-left: 3px solid var(--line-strong); }
  .box h3 { margin: 0; }
  .check { display: flex; gap: 0.4em; align-items: center; }
  .row :global(.field) { flex: 1; min-width: 100px; }
  .res { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .res li { color: var(--danger); }
  .res li.okc { color: var(--ink); }
  .res li b { display: inline-block; width: 1.4em; }
  .res li.okc b { color: var(--accent); }
  .verdict { margin: 0; padding: 0.5rem 0.7rem; border-left: 3px solid var(--accent); background: var(--accent-soft); }
  .verdict.bad, .bad { border-left-color: var(--danger); color: var(--danger); background: transparent; }
  .verdict.bad { background: rgba(255, 77, 109, 0.08); color: var(--ink); }
  pre { white-space: pre-wrap; font-size: 0.8rem; color: var(--ink-dim); }
  code { font-family: var(--font-mono); }
</style>
