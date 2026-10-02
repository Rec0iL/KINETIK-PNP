// Rein: Wiedergabeposition aus einem verankerten Zustand berechnen (für SL und Spieler identisch).

export interface TrackRef {
  id: string;
  title: string;
  artist?: string;
  /** Mitgelieferter Titel: Pfad relativ zur App. */
  file?: string;
  /** Hochgeladener Titel: Asset-Hash. */
  hash?: string;
  mime?: string;
  loop?: boolean;
  duration?: number;
  license?: string;
}

export interface MusicState {
  track: TrackRef | null;
  playing: boolean;
  /** Zeit des SL (Date.now()) zum Zeitpunkt des Ankers. */
  anchorGm: number;
  /** Position in Sekunden zum Zeitpunkt des Ankers. */
  anchorPos: number;
  volume: number;
  loop: boolean;
}

export const defaultMusic = (): MusicState => ({ track: null, playing: false, anchorGm: 0, anchorPos: 0, volume: 0.7, loop: false });

/**
 * Soll-Position jetzt. `gmNow` ist die aktuelle Zeit auf der Uhr des SL (lokale Zeit + Versatz).
 * Bei Schleife wird um die Dauer gefaltet, ohne Schleife bei der Dauer gedeckelt.
 */
export function expectedPosition(st: MusicState, gmNow: number, duration?: number): number {
  let pos = st.anchorPos + (st.playing ? Math.max(0, gmNow - st.anchorGm) / 1000 : 0);
  if (duration && Number.isFinite(duration) && duration > 0) {
    pos = st.loop ? pos % duration : Math.min(pos, duration);
  }
  return Math.max(0, pos);
}

export const trackKey = (t: TrackRef) => t.hash ?? t.file ?? t.id;

/**
 * Schätzt den Uhrenversatz (SL minus lokal) aus Ping-Antworten.
 * Nimmt die Probe mit der kleinsten Laufzeit, die ist am genauesten.
 */
export function bestClockOffset(samples: { rtt: number; gm: number; localAtRecv: number }[]): number {
  if (!samples.length) return 0;
  const best = samples.reduce((a, b) => (b.rtt < a.rtt ? b : a));
  return best.gm + best.rtt / 2 - best.localAtRecv;
}
