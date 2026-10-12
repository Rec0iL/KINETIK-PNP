<script lang="ts">
  import { gm, musicPlay, musicPause, musicResume, musicStop, musicSeek, musicVolume, musicLoop, addTrack, removeTrack } from '../net/gm.svelte';
  import { catalog, ALL_CATEGORIES, categoryLabel, categoryFilterLabel, type CatalogTrack } from '../music/catalog.svelte';
  import { music } from '../music/engine.svelte';
  import type { TrackRef } from '../music/clock';
  import { putAsset, removeAsset } from '../net/assets.svelte';
  import { settings } from '../lib/settings.svelte';
  import { pushToast } from '../ui/toasts.svelte';
  import { uid } from '../model/character';
  import { t } from '../i18n';

  let fileInput = $state<HTMLInputElement>();
  let uploading = $state(false);
  let cat = $state(ALL_CATEGORIES);

  const m = $derived(gm.session!.state.music);
  const categories = $derived([ALL_CATEGORIES, ...new Set(catalog.tracks.map((tr) => tr.tag ?? tr.category))]);
  const shown = $derived(catalog.tracks.filter((tr) => cat === ALL_CATEGORIES || (tr.tag ?? tr.category) === cat));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const isCurrent = (tr: TrackRef) => m.track?.id === tr.id;

  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    uploading = true;
    for (const f of files) {
      if (f.size > 40 * 1024 * 1024) { pushToast(t('gm.music.tooBig', { name: f.name }), 'warn'); continue; }
      try {
        const meta = await putAsset(await f.arrayBuffer(), f.name, f.type || 'audio/mpeg');
        addTrack({ id: uid(), title: f.name.replace(/\.[^.]+$/, ''), hash: meta.hash, mime: meta.mime, license: t('gm.music.ownFile') });
        pushToast(t('gm.music.added', { name: f.name }), 'good');
      } catch (err) {
        pushToast(`${f.name}: ${(err as Error).message}`, 'danger');
      }
    }
    uploading = false;
  }
  async function del(tr: TrackRef) {
    if (!confirm(t('gm.music.confirmDelete', { title: tr.title }))) return;
    removeTrack(tr.id);
    if (tr.hash && !gm.session!.tracks.some((x) => x.hash === tr.hash)) await removeAsset(tr.hash);
  }
  const progress = $derived(music.dur ? (music.pos / music.dur) * 100 : 0);
  function seek(e: MouseEvent) {
    const el = e.currentTarget as HTMLElement;
    const r = el.getBoundingClientRect();
    if (music.dur) musicSeek(((e.clientX - r.left) / r.width) * music.dur);
  }
</script>

<div class="stack">
  <section class="panel now">
    <h2>{t('gm.music.now')}</h2>
    {#if m.track}
      <div class="row">
        <div class="titles"><b class="t">{m.track.title}</b><small class="dim">{m.track.artist ?? ''} {m.track.license ? `· ${m.track.license}` : ''}</small></div>
        <span class="spacer"></span>
        {#if m.playing}<button class="btn primary" onclick={musicPause}>{t('gm.music.pause')}</button>{:else}<button class="btn primary" onclick={musicResume}>{t('gm.music.resume')}</button>{/if}
        <button class="btn" onclick={musicStop}>{t('gm.music.stop')}</button>
      </div>
      <div class="seek" onclick={seek} role="slider" tabindex="0" aria-label={t('gm.music.position')} aria-valuenow={Math.round(music.pos)} aria-valuemin="0" aria-valuemax={Math.round(music.dur)} onkeydown={(e) => { if (e.key === 'ArrowRight') musicSeek(music.pos + 10); if (e.key === 'ArrowLeft') musicSeek(Math.max(0, music.pos - 10)); }}>
        <i style:width="{progress}%"></i>
      </div>
      <small class="dim mono">{fmt(music.pos)} / {music.dur ? fmt(music.dur) : '–:––'}{music.loading ? t('gm.music.loadingSuffix') : ''}</small>
    {:else}
      <p class="dim">{t('gm.music.nothing')}</p>
    {/if}
    <div class="row opts">
      <label class="field vol">{t('gm.music.volume')}<input type="range" min="0" max="1" step="0.02" value={m.volume} oninput={(e) => musicVolume(Number(e.currentTarget.value))} /></label>
      <label class="check"><input type="checkbox" checked={m.loop} onchange={(e) => musicLoop(e.currentTarget.checked)} /> {t('gm.music.loop')}</label>
      <label class="check"><input type="checkbox" bind:checked={settings.musicAutoNext} /> {t('gm.music.autoNext')}</label>
    </div>
    <small class="dim">{t('gm.music.playerHint')}</small>
  </section>

  <section class="panel">
    <div class="row"><h2>{t('gm.music.own')}</h2><span class="spacer"></span>
      <button class="btn sm primary" onclick={() => fileInput?.click()} disabled={uploading}>{uploading ? t('gm.common.loading') : t('gm.music.addAudio')}</button>
      <input bind:this={fileInput} type="file" accept="audio/*" multiple class="sr-only" onchange={onFiles} />
    </div>
    <p class="dim hint">{t('gm.music.ownHint')}</p>
    {#each gm.session!.tracks as tr (tr.id)}
      <div class="trk" class:cur={isCurrent(tr)}>
        <button class="btn sm icon" onclick={() => musicPlay(tr)} aria-label={t('gm.music.play', { title: tr.title })}>▶</button>
        <span class="n">{tr.title}</span>
        <button class="btn sm icon ghost danger" onclick={() => del(tr)} aria-label={t('gm.common.delete')}>✕</button>
      </div>
    {:else}
      <p class="dim">{t('gm.music.noOwn')}</p>
    {/each}
  </section>

  <section class="panel">
    <div class="row"><h2>{t('gm.music.bundled')}</h2><span class="spacer"></span>
      <select bind:value={cat} aria-label={t('gm.music.category')}>{#each categories as c}<option value={c}>{categoryFilterLabel(c)}</option>{/each}</select>
    </div>
    <p class="dim hint">Kevin MacLeod, <a href="#/credits">CC BY 4.0</a>. {t('gm.music.bundledHint')}</p>
    {#each shown as tr (tr.id)}
      <div class="trk" class:cur={isCurrent(tr)}>
        <button class="btn sm icon" onclick={() => musicPlay(tr)} aria-label={t('gm.music.play', { title: tr.title })}>▶</button>
        <span class="n">{tr.title}</span>
        <span class="chip">{categoryLabel(tr)}</span>
        <small class="dim mono">{fmt(tr.duration ?? 0)}</small>
      </div>
    {/each}
  </section>
</div>

<style>
  .titles { display: grid; }
  .t { font: 400 1.8rem/1 var(--font-display); letter-spacing: 0.05em; color: var(--accent); }
  .seek { height: 12px; background: var(--track-bg); border: 1px solid var(--line-strong); cursor: pointer; margin: 0.6rem 0 0.3rem; }
  .seek i { display: block; height: 100%; background: var(--accent); box-shadow: 0 0 10px var(--accent); }
  .opts { margin-top: 0.8rem; align-items: end; }
  .vol { min-width: 200px; flex: 1; }
  input[type='range'] { padding: 0; min-height: 26px; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.92rem; }
  .hint { font-size: 0.85rem; margin: 0.5rem 0; }
  .trk { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0.4rem; border-bottom: 1px solid var(--line); }
  .trk.cur { background: var(--accent-soft); border-left: 2px solid var(--accent); }
  .trk .n { flex: 1; font-weight: 600; }
  .mono { font-family: var(--font-mono); }
  select { width: auto; }
</style>
