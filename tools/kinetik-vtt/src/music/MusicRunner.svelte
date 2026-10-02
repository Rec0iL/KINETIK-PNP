<script lang="ts">
  // Unsichtbar: verbindet den Musikzustand (SL-eigener oder vom SL empfangener) mit der Wiedergabe.
  import { gm, musicPlay } from '../net/gm.svelte';
  import { player } from '../net/player.svelte';
  import { applyMusic, onTrackEnded } from './engine.svelte';
  import { catalog } from './catalog.svelte';
  import { settings } from '../lib/settings.svelte';
  import type { MusicState } from './clock';

  const source = $derived<{ st: MusicState | null; offset: () => number }>(
    gm.status === 'open' && gm.session
      ? { st: gm.session.state.music, offset: () => 0 }
      : player.status === 'connected' && player.state?.music
        ? { st: player.state.music, offset: () => player.clockOffset }
        : { st: null, offset: () => 0 },
  );

  $effect(() => {
    const st = source.st ? ($state.snapshot(source.st) as MusicState) : null;
    void applyMusic(st, source.offset);
  });

  $effect(() => {
    if (gm.status !== 'open' || !settings.musicAutoNext) { onTrackEnded(null); return; }
    onTrackEnded(() => {
      const s = gm.session;
      const cur = s?.state.music.track;
      if (!s || !cur || s.state.music.loop) return;
      const all = [...catalog.tracks, ...s.tracks];
      const i = all.findIndex((t) => t.id === cur.id);
      const next = all[(i + 1) % all.length];
      if (next) musicPlay(next);
    });
    return () => onTrackEnded(null);
  });
</script>
