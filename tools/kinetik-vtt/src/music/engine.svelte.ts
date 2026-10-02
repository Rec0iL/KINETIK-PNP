// Musik-Wiedergabe: folgt einem MusicState (vom SL), gleicht Position über die Uhr ab, blendet beim Titelwechsel über.
import { assetUrl, requestAsset } from '../net/assets.svelte';
import { expectedPosition, trackKey, type MusicState, type TrackRef } from './clock';

const LS = 'kinetik.music';

function loadLocal() {
  try { return { volume: 0.8, muted: false, ...JSON.parse(localStorage.getItem(LS) ?? '{}') } as { volume: number; muted: boolean }; } catch { return { volume: 0.8, muted: false }; }
}

export const music = $state({
  /** Der Browser verlangt eine Nutzeraktion, bevor Ton laufen darf. */
  blocked: false,
  loading: false,
  error: '',
  current: null as TrackRef | null,
  playing: false,
  pos: 0,
  dur: 0,
  ...loadLocal(),
});

const a = new Audio();
a.preload = 'auto';
let state: MusicState | null = null;
let offset: () => number = () => 0;
let loadedKey = '';
let gain = 1;
let token = 0;
let fadeTimer: ReturnType<typeof setInterval> | undefined;
let endedHandler: (() => void) | null = null;

export const onTrackEnded = (fn: (() => void) | null) => { endedHandler = fn; };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function updateVolume() {
  a.volume = clamp01((state?.volume ?? 0.7) * music.volume * (music.muted ? 0 : 1) * gain);
}

export function setLocalVolume(v: number) {
  music.volume = clamp01(v);
  persist();
  updateVolume();
}
export function setMuted(m: boolean) {
  music.muted = m;
  persist();
  updateVolume();
}
function persist() {
  try { localStorage.setItem(LS, JSON.stringify({ volume: music.volume, muted: music.muted })); } catch { /* ignorieren */ }
}

function fade(to: number, ms: number): Promise<void> {
  clearInterval(fadeTimer);
  if (ms <= 0 || Math.abs(gain - to) < 0.01) { gain = to; updateVolume(); return Promise.resolve(); }
  const from = gain;
  const t0 = performance.now();
  return new Promise((resolve) => {
    fadeTimer = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      gain = from + (to - from) * k;
      updateVolume();
      if (k >= 1) { clearInterval(fadeTimer); resolve(); }
    }, 40);
  });
}

function waitMetadata(): Promise<void> {
  if (a.readyState >= 1) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const ok = () => { cleanup(); resolve(); };
    const bad = () => { cleanup(); reject(new Error('Audiodatei konnte nicht geladen werden.')); };
    const cleanup = () => { a.removeEventListener('loadedmetadata', ok); a.removeEventListener('error', bad); };
    a.addEventListener('loadedmetadata', ok);
    a.addEventListener('error', bad);
  });
}

function tryPlay() {
  a.play().then(() => { music.blocked = false; }).catch((err: DOMException) => {
    if (err.name === 'NotAllowedError') music.blocked = true;
  });
}

function sync(force: boolean) {
  if (!state?.track || loadedKey !== trackKey(state.track)) return;
  const exp = expectedPosition(state, Date.now() + offset(), a.duration);
  if (state.playing) {
    if (a.paused && !a.ended) tryPlay();
    if (force || Math.abs(a.currentTime - exp) > 0.4) {
      if (exp < (a.duration || Infinity) - 0.05) a.currentTime = exp;
    }
  } else {
    if (!a.paused) a.pause();
    if (Math.abs(a.currentTime - exp) > 0.2) a.currentTime = exp;
  }
  music.playing = state.playing && !a.paused;
}

/** Zustand des SL übernehmen. `clockOffset` = SL-Zeit minus lokale Zeit in ms. */
export async function applyMusic(st: MusicState | null, clockOffset: () => number) {
  state = st;
  offset = clockOffset;
  const my = ++token;
  if (!st?.track) {
    music.current = null;
    music.playing = false;
    music.loading = false;
    if (loadedKey) { await fade(0, 600); if (my !== token) return; a.pause(); loadedKey = ''; a.removeAttribute('src'); a.load(); }
    return;
  }
  const key = trackKey(st.track);
  if (key !== loadedKey) {
    music.current = st.track;
    if (loadedKey) { await fade(0, 700); if (my !== token) return; }
    a.pause();
    music.loading = true;
    music.error = '';
    try {
      let url: string | undefined;
      if (st.track.file) url = new URL(st.track.file, document.baseURI).href;
      else if (st.track.hash) { await requestAsset(st.track.hash); url = await assetUrl(st.track.hash); }
      if (my !== token) return;
      if (!url) throw new Error('Titel nicht verfügbar.');
      a.src = url;
      loadedKey = key;
      await waitMetadata();
      if (my !== token) return;
    } catch (e) {
      music.error = (e as Error).message;
      music.loading = false;
      loadedKey = '';
      return;
    }
    music.loading = false;
    gain = 0;
    updateVolume();
    a.loop = st.loop;
    sync(true);
    void fade(1, 1200);
    return;
  }
  music.current = st.track;
  a.loop = st.loop;
  updateVolume();
  sync(false);
  if (gain < 1) void fade(1, 400);
}

/** Muss aus einem Klick heraus aufgerufen werden (Autoplay-Sperre). */
export function unlockAudio() {
  a.play().then(() => { music.blocked = false; sync(true); }).catch(() => { music.blocked = true; });
  if (!state?.playing) a.pause();
}

a.addEventListener('timeupdate', () => { music.pos = a.currentTime; music.dur = Number.isFinite(a.duration) ? a.duration : 0; });
a.addEventListener('ended', () => { music.playing = false; endedHandler?.(); });
a.addEventListener('play', () => { music.playing = true; });
a.addEventListener('pause', () => { music.playing = false; });
setInterval(() => { if (state?.playing) sync(false); }, 3000);

/** Aktuelle Wiedergabeposition (für den SL beim Pausieren/Springen). */
export const currentTime = () => a.currentTime;
