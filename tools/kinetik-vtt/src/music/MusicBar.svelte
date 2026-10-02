<script lang="ts">
  import { music, setLocalVolume, setMuted, unlockAudio } from './engine.svelte';
  import { gm } from '../net/gm.svelte';
  import { player } from '../net/player.svelte';

  const active = $derived(gm.status === 'open' || player.status === 'connected');
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
</script>

{#if active && music.current}
  <div class="bar panel flat" role="region" aria-label="Musik">
    <span class="note" aria-hidden="true">♪</span>
    <div class="info">
      <b>{music.current.title}</b>
      <small class="dim">{music.current.artist ?? ''}{music.loading ? ' · lädt …' : ''}{music.error ? ` · ${music.error}` : ''}</small>
      <div class="track"><i style:width="{music.dur ? (music.pos / music.dur) * 100 : 0}%"></i></div>
      <small class="dim mono">{fmt(music.pos)} / {music.dur ? fmt(music.dur) : '–:––'}</small>
    </div>
    <div class="ctl">
      {#if music.blocked}
        <button class="btn sm amber" onclick={unlockAudio}>Audio aktivieren</button>
      {/if}
      <button class="btn sm icon" onclick={() => setMuted(!music.muted)} aria-label={music.muted ? 'Ton an' : 'Stumm'} title={music.muted ? 'Ton an' : 'Stumm'}>{music.muted ? '🔇' : '🔊'}</button>
      <input type="range" min="0" max="1" step="0.02" value={music.volume} oninput={(e) => setLocalVolume(Number(e.currentTarget.value))} aria-label="Lautstärke" />
      <a href="#/credits" class="dim cr" title="Lizenz und Namensnennung">©</a>
    </div>
  </div>
{/if}

<style>
  .bar { position: fixed; left: 16px; bottom: 16px; z-index: 180; display: flex; gap: 0.8rem; align-items: center; padding: 0.55rem 0.9rem; max-width: min(520px, calc(100vw - 32px)); background: var(--panel-solid); border-color: var(--accent-line); box-shadow: var(--glow); }
  .note { font-size: 1.6rem; color: var(--accent); }
  .info { display: grid; gap: 2px; min-width: 130px; }
  .info b { font: 600 0.95rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
  .track { height: 3px; background: rgba(255, 255, 255, 0.12); }
  .track i { display: block; height: 100%; background: var(--accent); }
  .ctl { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
  .ctl input[type='range'] { width: 90px; padding: 0; min-height: 24px; }
  .mono { font-family: var(--font-mono); }
  .cr { font-size: 1rem; padding: 0 0.2rem; }
  @media (max-width: 640px) {
    .bar { left: 8px; right: 8px; bottom: 8px; max-width: none; padding: 0.35rem 0.6rem; gap: 0.5rem; }
    .info { min-width: 0; flex: 1; }
    .ctl input[type='range'] { width: 64px; }
    .info small:last-child { display: none; }
  }
</style>
