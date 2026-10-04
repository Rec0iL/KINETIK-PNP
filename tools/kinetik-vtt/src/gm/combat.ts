// Kampfverwaltung des SL: Seiten-Initiative mit Kinetik-Marker (3.6), Bedrängnis (3.7), NPC-Leiter. Rein, ohne DOM.
import { npcDefaults, isOut, rules, ZONE_KEYS, zoneStatus, type NpcType, type ZoneKey, type Poison } from '../rules';
import type { MoveRequest, Situation } from './situation';

export type Side = 'players' | 'enemies';

export interface Npc {
  id: string;
  name: string;
  type: NpcType;
  level: number;
  bonus: number;
  schutz: number;
  schutzMax: number;
  wk: number;
  wkMax: number;
  energie: number;
  energieMax: number;
  injuries: Partial<Record<ZoneKey, number>>;
  /** Goon-Gruppe: Anzahl ausgeschalteter und verbleibender Mitglieder. */
  count: number;
  hits: number;
  tags: string[];
  note: string;
  hidden: boolean;
  /** Aktive Gifte (3.11). */
  poisons: Poison[];
  /** Sterbend an tödlichem Gift: ausgeschaltet. */
  dying?: boolean;
  /** Porträt (JPEG-Data-URL, ca. 256 px) für die Gegner-Karte. */
  img?: string;
  /** Kleines Porträt (ca. 96 px) für Token und die Spieleransicht. */
  token?: string;
  /** Besondere Fähigkeiten des Gegners (frei beschrieben). */
  moves?: NpcMove[];
  /** Herkunft, wenn von PenNodePaper übergeben (`pnp:<id>`): erneutes Senden aktualisiert statt zu duplizieren. */
  src?: string;
}

export interface NpcMove {
  name: string;
  text: string;
}

export interface CombatState {
  active: boolean;
  round: number;
  /** Wer den Kinetik-Marker hält und damit die Runde beginnt. */
  marker: Side;
  /** Welche Seite gerade handelt. */
  side: Side;
  /** Wer in dieser Runde schon gehandelt hat (Spieler-ID oder NPC-ID). */
  done: Record<string, boolean>;
  /** Bedrängnis-Zähler je Spielercharakter (Spieler-ID). */
  bedraengnis: Record<string, number>;
  npcs: Npc[];
  /** Spieler dürfen die Namen der Gegner und ihren Status sehen. */
  showEnemies: boolean;
  /** Geplante Aktionen der Spieler und Angriffe der Gegner (Kampfsituationen). */
  situations: Situation[];
  /** Bullet Time: in welcher Runde hat der Spieler sie zuletzt bekommen (höchstens einmal pro Runde). */
  bulletTime: Record<string, number>;
  /** Offene Bewegungsanfragen der Spieler. */
  moveRequests: MoveRequest[];
  /** Spielercharaktere, gegen die der nächste Clash +1 bekommt (nach Durchatmen oder Sammeln, 3.10). */
  exposed: Record<string, boolean>;
  /** Freigabe der Pläne ohne Klick des SL. */
  autoRelease: boolean;
}

export const newCombat = (): CombatState => ({
  active: false, round: 0, marker: 'players', side: 'players', done: {}, bedraengnis: {}, npcs: [], showEnemies: true,
  situations: [], bulletTime: {}, moveRequests: [], exposed: {}, autoRelease: false,
});

/** Fehlende Felder älterer Sitzungen ergänzen. */
export function upgradeCombat(c: Partial<CombatState> | undefined): CombatState {
  const u = { ...newCombat(), ...(c ?? {}) } as CombatState;
  for (const n of u.npcs) n.poisons = n.poisons ?? [];
  return u;
}

export function newNpc(id: string, type: NpcType, name?: string, count = 1): Npc {
  const d = npcDefaults(type);
  const wkMax = d.wk || 0;
  return {
    id, name: name || (type === 'goon' ? 'Goons' : d.name), type, level: d.levelMax, bonus: d.bonus,
    schutz: d.schutz, schutzMax: d.schutz, wk: wkMax, wkMax, energie: 6, energieMax: 6,
    injuries: {}, count: type === 'goon' ? Math.max(1, count) : 1, hits: 0, tags: [], note: '', hidden: false, poisons: [],
  };
}

export function startCombat(c: CombatState, opts: { ambush?: Side } = {}): void {
  c.active = true;
  c.round = 1;
  c.marker = opts.ambush ?? 'players';
  c.side = c.marker;
  c.done = {};
  c.bedraengnis = {};
  c.situations = [];
  c.bulletTime = {};
  c.moveRequests = [];
  c.exposed = {};
}

/** Neue Runde: die Seite mit dem Marker beginnt, niemand hat gehandelt. */
export function nextRound(c: CombatState): void {
  c.round += 1;
  c.side = c.marker;
  c.done = {};
  for (const s of c.situations) if (s.status !== 'resolved' && s.status !== 'cancelled') s.status = 'cancelled';
  c.moveRequests = [];
}

export const otherSide = (s: Side): Side => (s === 'players' ? 'enemies' : 'players');

export function endCombat(c: CombatState): void {
  c.active = false;
  c.round = 0;
  c.done = {};
  c.bedraengnis = {};
  c.situations = [];
  c.bulletTime = {};
  c.moveRequests = [];
  c.exposed = {};
}

/**
 * Ein Goon-Treffer auf einen Spielercharakter (3.7): 1. Treffer -1 Schutz oder WK (Zähler 1),
 * 2. Treffer in Folge eine Verletzung (Zähler 0).
 */
export function bedraengnisHit(counter: number): { counter: number; result: 'erster' | 'verletzung' } {
  return counter >= 1 ? { counter: 0, result: 'verletzung' } : { counter: 1, result: 'erster' };
}

/** Normaler Treffer auf einen NPC: erst Schutz, dann Willenskraft. */
export function npcNormalHit(n: Npc): 'schutz' | 'wk' {
  if (n.type === 'goon') { n.hits += 1; n.count = Math.max(0, n.count - 1); return 'wk'; }
  if (n.schutz > 0) { n.schutz -= 1; return 'schutz'; }
  n.wk = Math.max(0, n.wk - 1);
  return 'wk';
}

export function npcInjury(n: Npc, zone: ZoneKey): boolean {
  const def = rules.tabellen.zonen.find((z) => z.key === zone)!;
  const cur = n.injuries[zone] ?? 0;
  if (cur >= def.felder) return false;
  n.injuries[zone] = cur + 1;
  n.wk = Math.max(0, n.wk - 1);
  return true;
}

export function npcStatus(n: Npc): { out: boolean; reason: string } {
  if (n.dying) return { out: true, reason: 'Sterbend an tödlichem Gift' };
  if (n.type !== 'goon' && n.energie < 0) return { out: true, reason: 'Energie unter 0: ohnmächtig' };
  if (n.type === 'goon') return n.count <= 0 ? { out: true, reason: 'Alle ausgeschaltet' } : { out: false, reason: '' };
  return isOut(n.type, { hits: n.hits, wk: n.wk, injuries: n.injuries });
}

export function npcZoneState(n: Npc, z: ZoneKey) {
  return zoneStatus(z, n.injuries[z] ?? 0);
}

export type RoughState = 'unverletzt' | 'angeschlagen' | 'schwer' | 'aus';
export const ROUGH_LABEL: Record<RoughState, string> = {
  unverletzt: 'unverletzt', angeschlagen: 'angeschlagen', schwer: 'schwer getroffen', aus: 'ausgeschaltet',
};

/** Grober Zustand für die Spieleransicht: keine Zahlen, nur ein Eindruck. */
export function roughState(n: Npc): RoughState {
  if (npcStatus(n).out) return 'aus';
  const inj = Object.values(n.injuries).reduce((a, b) => a + (b ?? 0), 0);
  if (n.type === 'goon') return n.hits > 0 ? 'angeschlagen' : 'unverletzt';
  if (inj >= 2 || (inj >= 1 && n.wk <= n.wkMax / 2)) return 'schwer';
  if (inj >= 1 || n.wk < n.wkMax || n.schutz < n.schutzMax) return 'angeschlagen';
  return 'unverletzt';
}

export interface PublicEnemy {
  id: string;
  name: string;
  out: boolean;
  state: RoughState;
  tags: { name: string; size: 'klein' | 'gross' }[];
  goon: boolean;
  /** Kleines Porträt, falls vorhanden. */
  img?: string;
}

/** Was Spieler vom Kampf sehen. */
export interface PublicCombat {
  active: boolean;
  round: number;
  marker: Side;
  side: Side;
  done: string[];
  bedraengnis: Record<string, number>;
  enemies: PublicEnemy[];
  /** Spieler, die in dieser Runde schon Bullet Time hatten. */
  bulletUsed: string[];
}

export function publicCombat(c: CombatState): PublicCombat {
  return {
    active: c.active, round: c.round, marker: c.marker, side: c.side,
    done: Object.entries(c.done).filter(([, v]) => v).map(([k]) => k),
    bedraengnis: { ...c.bedraengnis },
    enemies: c.showEnemies
      ? c.npcs.filter((n) => !n.hidden).map((n) => ({
        id: n.id, name: n.type === 'goon' ? `${n.name} (${n.count})` : n.name, out: npcStatus(n).out, state: roughState(n),
        tags: n.tags.map((t) => ({ name: t, size: tagSize(t) })), goon: n.type === 'goon', img: n.token,
      }))
      : [],
    bulletUsed: Object.entries(c.bulletTime).filter(([, r]) => r === c.round).map(([id]) => id),
  };
}

/** Größe eines Tags aus dem Katalog, unbekannte (eigene) Tags zählen als klein. */
export function tagSize(name: string): 'klein' | 'gross' {
  return (rules.tags.gross as string[]).includes(name) ? 'gross' : 'klein';
}

export { ZONE_KEYS };
