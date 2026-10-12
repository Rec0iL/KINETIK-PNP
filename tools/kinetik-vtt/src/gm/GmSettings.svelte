<script lang="ts">
  import { gm, setVisibility, setGmName, addLocalPlayer, endSession, stopHost, exportSession } from '../net/gm.svelte';
  import { downloadJson } from '../model/io';
  import { library } from '../store/characters.svelte';
  import { parseImport, ImportError } from '../model/io';
  import { newCharacter } from '../model/character';
  import { pushToast } from '../ui/toasts.svelte';
  import { navigate } from '../lib/router.svelte';
  import type { Visibility } from '../net/protocol';
  import { settings } from '../lib/settings.svelte';
  import { pnp } from '../net/pnp.svelte';
  import { t } from '../i18n';

  let fileInput = $state<HTMLInputElement>();
  let pick = $state('');
  let withAssets = $state(true);
  let exporting = $state(false);

  async function doExport() {
    exporting = true;
    try {
      const f = await exportSession(withAssets);
      if (f) downloadJson(f, t('gm.settings.exportFile', { date: new Date().toISOString().slice(0, 10) }));
    } finally { exporting = false; }
  }

  const modes: { key: Visibility; title: string; text: string }[] = [
    { key: 'party', title: t('gm.visibility.party'), text: t('gm.visibility.partyText') },
    { key: 'private', title: t('gm.visibility.private'), text: t('gm.visibility.privateText') },
    { key: 'open', title: t('gm.visibility.open'), text: t('gm.visibility.openText') },
  ];

  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    for (const f of [...(input.files ?? [])]) {
      try {
        for (const c of parseImport(await f.text(), { newIds: true })) { addLocalPlayer(c); pushToast(t('gm.settings.addedLocal', { name: c.name }), 'good'); }
      } catch (err) {
        pushToast(`${f.name}: ${err instanceof ImportError ? err.message : t('gm.settings.readError')}`, 'danger');
      }
    }
    input.value = '';
  }
  function addFromLibrary() {
    const c = library.characters.find((x) => x.id === pick);
    if (!c) return;
    addLocalPlayer(parseImport(JSON.stringify($state.snapshot(c)), { newIds: true })[0]);
    pick = '';
  }
  const addBlank = () => addLocalPlayer(newCharacter({ name: t('gm.settings.newPlayer') }));
</script>

{#if gm.session}
  <div class="stack">
    <section class="panel">
      <h2>{t('gm.settings.visibility')}</h2>
      <div class="modes">
        {#each modes as m}
          <button class="mode" class:on={gm.session.state.visibility === m.key} onclick={() => setVisibility(m.key)}>
            <b>{m.title}</b><small>{m.text}</small>
          </button>
        {/each}
      </div>
      <p class="dim">{t('gm.settings.visibilityHint')}</p>
    </section>

    <section class="panel">
      <h2>{t('gm.settings.round')}</h2>
      <div class="row">
        <label class="field">{t('gm.settings.gmName')}<input value={gm.session.state.gmName} onchange={(e) => setGmName(e.currentTarget.value)} /></label>
        <label class="field">{t('gm.settings.password')}<input bind:value={gm.session.password} autocomplete="off" /></label>
      </div>
      <div class="row">
        <button class="btn" onclick={() => { stopHost(); }}>{t('gm.settings.pause')}</button>
        <button class="btn danger" onclick={async () => { if (confirm(t('gm.settings.confirmEnd'))) { await endSession(); navigate('/sl'); } }}>{t('gm.settings.end')}</button>
      </div>
      <p class="dim">{t('gm.settings.pauseHint')}</p>
    </section>

    <section class="panel">
      <h2>{t('gm.settings.pnp')}</h2>
      <p class="dim">{t('gm.settings.pnpText')}</p>
      <label class="check"><input type="checkbox" bind:checked={settings.pnpEnabled} /> {t('gm.settings.pnpKeep')}</label>
      <div class="row">
        <label class="field">{t('gm.settings.pnpUrl')}<input bind:value={settings.pnpUrl} placeholder="ws://127.0.0.1:4317/bridge" spellcheck="false" /></label>
        <label class="field">{t('gm.settings.pnpToken')}<input type="password" bind:value={settings.pnpToken} placeholder={t('gm.settings.pnpTokenPlaceholder')} autocomplete="off" /></label>
      </div>
      <div class="row">
        {#if pnp.status === 'connected'}<span class="chip accent">{t('gm.settings.pnpConnected', { campaign: pnp.campaign ?? '' })}</span>
        {:else if pnp.status === 'connecting'}<span class="chip amber">{t('gm.settings.pnpConnecting')}</span>
        {:else if pnp.status === 'error'}<span class="chip danger">{pnp.error}</span>
        {:else}<span class="chip">{settings.pnpEnabled ? t('gm.settings.pnpWaiting') : t('gm.settings.pnpOff')}</span>{/if}
      </div>
    </section>

    <section class="panel">
      <h2>{t('gm.settings.backup')}</h2>
      <p class="dim">{t('gm.settings.backupText')}</p>
      <div class="row">
        <label class="check"><input type="checkbox" bind:checked={withAssets} /> {t('gm.settings.withAssets')}</label>
        <button class="btn" onclick={doExport} disabled={exporting}>{exporting ? t('gm.settings.packing') : t('gm.settings.export')}</button>
      </div>
    </section>

    <section class="panel">
      <h2>{t('gm.settings.local')}</h2>
      <p class="dim">{t('gm.settings.localText')}</p>
      <div class="row">
        <button class="btn" onclick={() => fileInput?.click()}>{t('gm.settings.loadJson')}</button>
        <input bind:this={fileInput} type="file" accept="application/json,.json" multiple class="sr-only" onchange={onFiles} />
        <select bind:value={pick} aria-label={t('gm.settings.fromLibrary')}><option value="">{t('gm.settings.fromLibraryOption')}</option>{#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}</select>
        <button class="btn" onclick={addFromLibrary} disabled={!pick}>{t('gm.settings.add')}</button>
        <button class="btn" onclick={addBlank}>{t('gm.settings.blank')}</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr)); gap: 0.6rem; margin: 0.6rem 0; }
  .mode { display: grid; gap: 0.3rem; text-align: left; padding: 0.8rem; background: var(--raised); border: 1px solid var(--line); color: var(--ink); cursor: pointer; font: inherit; }
  .mode b { font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .mode small { color: var(--ink-dim); }
  .mode:hover { border-color: var(--accent); }
  .mode.on { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--glow); }
  .mode.on b { color: var(--accent); }
  .row { margin-bottom: 0.5rem; }
  .check { display: flex; gap: 0.4em; align-items: center; }
  .row :global(.field) { flex: 1; min-width: 200px; }
  select { width: auto; }
</style>
