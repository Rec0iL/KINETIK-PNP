// NPC-Leiter (3.7), Ausgeschaltet-bei (3.11) und Zonen-Status (2.3).
import { rules, type ZoneKey } from './data';
import { t } from '../i18n';

export type NpcType = 'goon' | 'schlaeger' | 'elite' | 'boss' | 'nemesis';
export type Injuries = Partial<Record<ZoneKey, number>>;

export type ZoneStatus = 'ok' | 'unbrauchbar' | 'sterbend';

export function zoneStatus(zone: ZoneKey, count: number): ZoneStatus {
  const z = rules.tabellen.zonen.find((x) => x.key === zone)!;
  if (count < z.felder) return 'ok';
  return z.folge === 'sterbend' ? 'sterbend' : 'unbrauchbar';
}

export const totalInjuries = (i: Injuries) => Object.values(i).reduce((s, n) => s + (n ?? 0), 0);

export function npcDefaults(type: NpcType) {
  const n = rules.npc.leiter.find((x) => x.key === type)!;
  const wk = 'wk' in n ? (n as { wk: number }).wk : 0;
  return { type, name: n.name, levelMin: n.levelMin, levelMax: n.levelMax, bonus: n.bonusMax, schutz: n.schutz, wk };
}

export interface FightState {
  hits?: number;
  wk: number;
  injuries: Injuries;
}

/** Ist die Figur ausgeschaltet? Liefert den Grund als Text. */
export function isOut(type: NpcType | 'spieler', s: FightState): { out: boolean; reason: string } {
  const kopf = s.injuries.kopf ?? 0;
  const torso = s.injuries.torso ?? 0;
  const total = totalInjuries(s.injuries);
  switch (type) {
    case 'goon':
      return (s.hits ?? 0) >= 1 ? { out: true, reason: t('rules.npc.out.goon') } : { out: false, reason: '' };
    case 'schlaeger':
    case 'elite':
      if (s.wk <= 0) return { out: true, reason: t('rules.npc.out.eliteBroken') };
      if (total >= 2) return { out: true, reason: t('rules.npc.out.twoInjuries') };
      return { out: false, reason: '' };
    case 'boss':
    case 'nemesis':
      if (total >= 3) return { out: true, reason: t('rules.npc.out.threeInjuries') };
      if (kopf >= 2) return { out: true, reason: t('rules.npc.out.head') };
      if (torso >= 3) return { out: true, reason: t('rules.npc.out.torso') };
      if (s.wk <= 0) return { out: true, reason: t('rules.npc.out.bossBroken') };
      return { out: false, reason: '' };
    case 'spieler':
      if (kopf >= 2) return { out: true, reason: t('rules.npc.out.dyingHead') };
      if (torso >= 3) return { out: true, reason: t('rules.npc.out.dyingTorso') };
      if (s.wk <= 0) return { out: true, reason: t('rules.npc.out.broken') };
      return { out: false, reason: '' };
  }
}

/** Überzahl: +1 je weiterem Angreifer, höchstens +3. */
export function ueberzahlBonus(angreifer: number): number {
  const u = rules.npc.ueberzahl;
  return Math.min(u.max, Math.max(0, angreifer - 1) * u.proWeiterem);
}
