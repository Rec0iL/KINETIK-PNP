// Kampfverwaltung des SL: Seiten-Initiative mit Kinetik-Marker (3.6), Bedrängnis (3.7), NPC-Leiter. Rein, ohne DOM.
import { npcDefaults, isOut, rules, ZONE_KEYS, zoneStatus, type NpcType, type ZoneKey } from '../rules';

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
}

export const newCombat = (): CombatState => ({
  active: false, round: 0, marker: 'players', side: 'players', done: {}, bedraengnis: {}, npcs: [], showEnemies: true,
});

export function newNpc(id: string, type: NpcType, name?: string, count = 1): Npc {
  const d = npcDefaults(type);
  const wkMax = d.wk || 0;
  return {
    id, name: name || (type === 'goon' ? 'Goons' : d.name), type, level: d.levelMax, bonus: d.bonus,
    schutz: d.schutz, schutzMax: d.schutz, wk: wkMax, wkMax, energie: 6, energieMax: 6,
    injuries: {}, count: type === 'goon' ? Math.max(1, count) : 1, hits: 0, tags: [], note: '', hidden: false,
  };
}

export function startCombat(c: CombatState, opts: { ambush?: Side } = {}): void {
  c.active = true;
  c.round = 1;
  c.marker = opts.ambush ?? 'players';
  c.side = c.marker;
  c.done = {};
  c.bedraengnis = {};
}

/** Neue Runde: die Seite mit dem Marker beginnt, niemand hat gehandelt. */
export function nextRound(c: CombatState): void {
  c.round += 1;
  c.side = c.marker;
  c.done = {};
}

export const otherSide = (s: Side): Side => (s === 'players' ? 'enemies' : 'players');

export function endCombat(c: CombatState): void {
  c.active = false;
  c.round = 0;
  c.done = {};
  c.bedraengnis = {};
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
  if (n.type === 'goon') return n.count <= 0 ? { out: true, reason: 'Alle ausgeschaltet' } : { out: false, reason: '' };
  return isOut(n.type, { hits: n.hits, wk: n.wk, injuries: n.injuries });
}

export function npcZoneState(n: Npc, z: ZoneKey) {
  return zoneStatus(z, n.injuries[z] ?? 0);
}

/** Was Spieler vom Kampf sehen. */
export interface PublicCombat {
  active: boolean;
  round: number;
  marker: Side;
  side: Side;
  done: string[];
  bedraengnis: Record<string, number>;
  enemies: { id: string; name: string; out: boolean }[];
}

export function publicCombat(c: CombatState): PublicCombat {
  return {
    active: c.active, round: c.round, marker: c.marker, side: c.side,
    done: Object.entries(c.done).filter(([, v]) => v).map(([k]) => k),
    bedraengnis: { ...c.bedraengnis },
    enemies: c.showEnemies ? c.npcs.filter((n) => !n.hidden).map((n) => ({ id: n.id, name: n.type === 'goon' ? `${n.name} (${n.count})` : n.name, out: npcStatus(n).out })) : [],
  };
}

export { ZONE_KEYS };
