// Karten-Zustand (Szene) und seine Änderungen. Rein, ohne DOM. Der SL hält den Zustand, Spieler wenden dieselben Operationen an.

export interface GridConfig {
  show: boolean;
  /** Kantenlänge eines Feldes in Bildpixeln. */
  size: number;
  ox: number;
  oy: number;
  color: string;
  opacity: number;
  /** z.B. "m" oder "Felder", für das Messwerkzeug. */
  unit: string;
  unitsPerCell: number;
}

export interface Token {
  id: string;
  name: string;
  /** Mittelpunkt in Bildpixeln. */
  x: number;
  y: number;
  /** Größe in Feldern. */
  size: number;
  color: string;
  kind: 'pc' | 'npc' | 'item';
  /** Zugeordneter Spieler: darf diesen Token selbst bewegen. */
  playerId?: string;
  /** Kleines Bild (Data-URL). */
  img?: string;
  /** Nur der SL sieht diesen Token. */
  hidden?: boolean;
  /** Zusatztext unter dem Token (z.B. Zustand). */
  note?: string;
  /** Verknüpfter Kampf-NPC (Goon-Gruppen: alle Token der Gruppe tragen dieselbe ID). */
  npcId?: string;
  /** Der Gegner ist ausgeschaltet. */
  out?: boolean;
}

export type FogShape =
  | { t: 'rect'; x: number; y: number; w: number; h: number }
  | { t: 'circle'; x: number; y: number; r: number }
  | { t: 'poly'; pts: [number, number][] }
  /** Pinselstrich: Linienzug mit Radius. */
  | { t: 'stroke'; pts: [number, number][]; r: number };

export interface FogOp {
  /** reveal = aufdecken, hide = wieder verdunkeln */
  m: 'reveal' | 'hide';
  s: FogShape;
}

export interface MapState {
  id: string;
  name: string;
  /** Hash des Kartenbildes im Asset-Speicher. */
  asset: string | null;
  width: number;
  height: number;
  grid: GridConfig;
  tokens: Token[];
  fog: { enabled: boolean; ops: FogOp[] };
  /** Zähler, den jede Änderung erhöht (für das Neuzeichnen). */
  rev: number;
}

export type MapOp =
  | { op: 'full'; map: MapState | null }
  | { op: 'tok'; token: Token }
  | { op: 'tokmove'; id: string; x: number; y: number }
  | { op: 'tokdel'; id: string }
  | { op: 'grid'; grid: GridConfig }
  | { op: 'fog+'; fog: FogOp }
  | { op: 'fog='; enabled: boolean; ops: FogOp[] }
  | { op: 'ping'; x: number; y: number; who: string; color: string };

export const MAX_FOG_OPS = 600;

export function newScene(id: string, name: string, asset: string | null, width: number, height: number): MapState {
  return {
    id, name, asset, width, height, tokens: [], rev: 1,
    grid: {
      show: true, size: Math.max(24, Math.round(Math.min(width, height) / 20)), ox: 0, oy: 0,
      color: '#00e5ff', opacity: 0.35, unit: 'm', unitsPerCell: 1.5,
    },
    fog: { enabled: false, ops: [] },
  };
}

/** Kopie für Spieler: ohne versteckte Tokens. */
export function forPlayers(map: MapState | null): MapState | null {
  if (!map) return null;
  return { ...map, tokens: map.tokens.filter((t) => !t.hidden) };
}

/** Wendet eine Änderung an. Liefert `true`, wenn sich etwas geändert hat (außer Pings). */
export function applyMapOp(map: MapState, op: MapOp): boolean {
  switch (op.op) {
    case 'tok': {
      const i = map.tokens.findIndex((t) => t.id === op.token.id);
      if (i >= 0) map.tokens[i] = op.token;
      else map.tokens.push(op.token);
      break;
    }
    case 'tokmove': {
      const t = map.tokens.find((x) => x.id === op.id);
      if (!t) return false;
      t.x = op.x;
      t.y = op.y;
      break;
    }
    case 'tokdel':
      map.tokens = map.tokens.filter((t) => t.id !== op.id);
      break;
    case 'grid':
      map.grid = op.grid;
      break;
    case 'fog+':
      map.fog.ops.push(op.fog);
      if (map.fog.ops.length > MAX_FOG_OPS) map.fog.ops.splice(0, map.fog.ops.length - MAX_FOG_OPS);
      break;
    case 'fog=':
      map.fog.enabled = op.enabled;
      map.fog.ops = op.ops;
      break;
    case 'full':
    case 'ping':
      return false;
  }
  map.rev++;
  return true;
}

/** Abstand in Bildpixeln zwischen zwei Punkten, umgerechnet in Einheiten des Rasters. */
export function measure(grid: GridConfig, a: [number, number], b: [number, number]): { cells: number; units: number } {
  const dx = Math.abs(b[0] - a[0]) / grid.size;
  const dy = Math.abs(b[1] - a[1]) / grid.size;
  // Chebyshev: Diagonalen kosten wie gerade Felder (üblich bei Gitterkarten).
  const cells = Math.max(dx, dy);
  return { cells, units: cells * grid.unitsPerCell };
}

export function snapToGrid(grid: GridConfig, x: number, y: number, size = 1): [number, number] {
  const half = (size % 2 === 0 ? 0 : 0.5) * grid.size;
  const sx = Math.round((x - grid.ox - half) / grid.size) * grid.size + grid.ox + half;
  const sy = Math.round((y - grid.oy - half) / grid.size) * grid.size + grid.oy + half;
  return [sx, sy];
}

/** Liegt der Punkt im aufgedeckten Teil der Karte? Ohne Nebel immer wahr. Die letzte Operation gewinnt. */
export function isRevealed(map: MapState, x: number, y: number): boolean {
  if (!map.fog.enabled) return true;
  let revealed = false;
  for (const op of map.fog.ops) {
    if (inShape(op.s, x, y)) revealed = op.m === 'reveal';
  }
  return revealed;
}

function inShape(s: FogShape, x: number, y: number): boolean {
  switch (s.t) {
    case 'rect': return x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h;
    case 'circle': return Math.hypot(x - s.x, y - s.y) <= s.r;
    case 'poly': {
      let inside = false;
      for (let i = 0, j = s.pts.length - 1; i < s.pts.length; j = i++) {
        const [xi, yi] = s.pts[i];
        const [xj, yj] = s.pts[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    case 'stroke': {
      if (s.pts.length === 1) return Math.hypot(x - s.pts[0][0], y - s.pts[0][1]) <= s.r;
      for (let i = 1; i < s.pts.length; i++) if (distToSegment(x, y, s.pts[i - 1], s.pts[i]) <= s.r) return true;
      return false;
    }
  }
}

function distToSegment(px: number, py: number, a: [number, number], b: [number, number]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len2)) : 0;
  return Math.hypot(px - (a[0] + t * dx), py - (a[1] + t * dy));
}

export const TOKEN_COLORS = ['#00e5ff', '#ffb800', '#ff4d6d', '#3ddc97', '#b388ff', '#ff8a3d', '#e6eaf0'];
