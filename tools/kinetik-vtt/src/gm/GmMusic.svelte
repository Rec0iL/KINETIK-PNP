<script lang="ts">
  import { gm, musicPlay, musicPause, musicResume, musicStop, musicSeek, musicVolume, musicLoop, addTrack, removeTrack } from '../net/gm.svelte';
  import { catalog, type CatalogTrack } from '../music/catalog.svelte';
  import { music } from '../music/engine.svelte';
  import type { TrackRef } from '../music/clock';
  import { putAsset, removeAsset } from '../net/assets.svelte';
  import { settings } from '../lib/settings.svelte';
  import { pushToast } from '../ui/toasts.svelte';
  import { uid } from '../model/character';

  let fileInput = $state<HTMLInputElement>();
  let uploading = $state(false);
  let cat = $state('alle');

  const m = $derived(gm.session!.state.music);
  const categories = $derived(['alle', ...new Set(catalog.tracks.map((t) => t.category))]);
  const shown = $derived(catalog.tracks.filter((t) => cat === 'alle' || t.category === cat));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const isCurrent = (t: TrackRef) => m.track?.id === t.id;

  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    input.value = '';
    uploading = true;
    for (const f of files) {
      if (f.size > 40 * 1024 * 1024) { pushToast(`${f.name}: größer als 40 MB, bitte komprimieren.`, 'warn'); continue; }
      try {
        const meta = await putAsset(await f.arrayBuffer(), f.name, f.type || 'audio/mpeg');
        addTrack({ id: uid(), title: f.name.replace(/\.[^.]+$/, ''), hash: meta.hash, mime: meta.mime, license: 'eigene Datei' });
        pushToast(`„${f.name}“ hinzugefügt.`, 'good');
      } catch (err) {
        pushToast(`${f.name}: ${(err as Error).message}`, 'danger');
      }
    }
    uploading = false;
  }
  async function del(t: TrackRef) {
    if (!confirm(`„${t.title}“ aus der Bibliothek löschen?`)) return;
    removeTrack(t.id);
    if (t.hash && !gm.session!.tracks.some((x) => x.hash === t.hash)) await removeAsset(t.hash);
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
    <h2>Jetzt</h2>
    {#if m.track}
      <div class="row">
        <div class="titles"><b class="t">{m.track.title}</b><small class="dim">{m.track.artist ?? ''} {m.track.license ? `· ${m.track.license}` : ''}</small></div>
        <span class="spacer"></span>
        {#if m.playing}<button class="btn primary" onclick={musicPause}>Pause</button>{:else}<button class="btn primary" onclick={musicResume}>Weiter</button>{/if}
        <button class="btn" onclick={musicStop}>Stopp</button>
      </div>
      <div class="seek" onclick={seek} role="slider" tabindex="0" aria-label="Position" aria-valuenow={Math.round(music.pos)} aria-valuemin="0" aria-valuemax={Math.round(music.dur)} onkeydown={(e) => { if (e.key === 'ArrowRight') musicSeek(music.pos + 10); if (e.key === 'ArrowLeft') musicSeek(Math.max(0, music.pos - 10)); }}>
        <i style:width="{progress}%"></i>
      </div>
      <small class="dim mono">{fmt(music.pos)} / {music.dur ? fmt(music.dur) : '–:––'}{music.loading ? ' · lädt …' : ''}</small>
    {:else}
      <p class="dim">Es läuft nichts. Wähle unten einen Titel, alle Spieler hören ihn synchron.</p>
    {/if}
    <div class="row opts">
      <label class="field vol">Lautstärke für alle<input type="range" min="0" max="1" step="0.02" value={m.volume} oninput={(e) => musicVolume(Number(e.currentTarget.value))} /></label>
      <label class="check"><input type="checkbox" checked={m.loop} onchange={(e) => musicLoop(e.currentTarget.checked)} /> Schleife</label>
      <label class="check"><input type="checkbox" bind:checked={settings.musicAutoNext} /> Danach nächsten Titel</label>
    </div>
    <small class="dim">Spieler stellen ihre eigene Lautstärke ein oder schalten stumm. Der Browser verlangt einmal einen Klick auf „Audio aktivieren“.</small>
  </section>

  <section class="panel">
    <div class="row"><h2>Eigene Titel</h2><span class="spacer"></span>
      <button class="btn sm primary" onclick={() => fileInput?.click()} disabled={uploading}>{uploading ? 'Lade …' : '+ Audiodatei'}</button>
      <input bind:this={fileInput} type="file" accept="audio/*" multiple class="sr-only" onchange={onFiles} />
    </div>
    <p class="dim hint">Hochgeladene Titel werden beim ersten Abspielen an die Spieler übertragen und dort zwischengespeichert. Nur Musik hochladen, für die du die Rechte hast.</p>
    {#each gm.session!.tracks as t (t.id)}
      <div class="trk" class:cur={isCurrent(t)}>
        <button class="btn sm icon" onclick={() => musicPlay(t)} aria-label={`${t.title} abspielen`}>▶</button>
        <span class="n">{t.title}</span>
        <button class="btn sm icon ghost danger" onclick={() => del(t)} aria-label="Löschen">✕</button>
      </div>
    {:else}
      <p class="dim">Noch keine eigenen Titel.</p>
    {/each}
  </section>

  <section class="panel">
    <div class="row"><h2>Mitgelieferte Titel</h2><span class="spacer"></span>
      <select bind:value={cat} aria-label="Kategorie">{#each categories as c}<option value={c}>{c === 'alle' ? 'Alle Kategorien' : c}</option>{/each}</select>
    </div>
    <p class="dim hint">Kevin MacLeod, <a href="#/credits">CC BY 4.0</a>. Sie liegen auf der Webseite, Spieler laden sie direkt von dort.</p>
    {#each shown as t (t.id)}
      <div class="trk" class:cur={isCurrent(t)}>
        <button class="btn sm icon" onclick={() => musicPlay(t)} aria-label={`${t.title} abspielen`}>▶</button>
        <span class="n">{t.title}</span>
        <span class="chip">{t.category}</span>
        <small class="dim mono">{fmt(t.duration ?? 0)}</small>
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
