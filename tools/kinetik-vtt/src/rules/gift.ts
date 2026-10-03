// Gift (3.11, 5.1): Stufen, Verzögerung, Wirkung am Rundenende, Gegenmittel. Rein, ohne DOM.
import { rules } from './data';

export type GiftLevel = 'schwach' | 'stark' | 'laehm' | 'toedlich';

export interface GiftDef {
  label: string;
  /** EP im Katalog (5.1). */
  ep: number;
  /** Energieverlust je Wirkrunde (0 bei Lähmgift und tödlichem Gift). */
  energie: number;
  /** Wirkrunden bei Energieverlust (0 = einmaliger Effekt). */
  rounds: number;
  /** Gegenmittel-Probe (3.11). */
  mw: number;
  /** ID des Katalogeffekts. */
  effectId: string;
  text: string;
}

export const GIFT: Record<GiftLevel, GiftDef> = {
  schwach: { label: 'Schwach', ep: 1, energie: 1, rounds: 2, mw: 7, effectId: 'giftSchwach', text: '−1 Energie am Rundenende, 2 Runden lang' },
  stark: { label: 'Stark', ep: 2, energie: 2, rounds: 2, mw: 9, effectId: 'giftStark', text: '−2 Energie am Rundenende, 2 Runden lang' },
  laehm: { label: 'Lähmgift', ep: 2, energie: 0, rounds: 0, mw: 9, effectId: 'laehmgift', text: 'großer Tag Gelähmt bis Szenenende oder Gegenmittel' },
  toedlich: { label: 'Tödlich', ep: 3, energie: 0, rounds: 0, mw: 11, effectId: 'giftToedlich', text: 'nach der Verzögerung sterbend, Gegenmittel muss vorher gelingen' },
};

export const GIFT_LEVELS = Object.keys(GIFT) as GiftLevel[];
export const MAX_GIFT_DELAY = 3;
export const PARALYSIS_TAG = 'Gelähmt';

export interface Poison {
  id: string;
  level: GiftLevel;
  /** Runden ohne Wirkung, bevor das Gift greift (0 bis 3, Wahl des Anwenders). */
  delay: number;
  /** Verbleibende Wirkrunden bei Energieverlust. */
  left: number;
  /** Lähmung oder Sterbend bereits ausgelöst. */
  fired?: boolean;
  /** Woher das Gift kommt (für die Anzeige). */
  source: string;
  /** Abweichender MW des Gegenmittels (SL-Entscheid, z.B. 13 bei der Todesberührung). */
  mw?: number;
}

export function newPoison(id: string, level: GiftLevel, delay: number, source = '', mw?: number): Poison {
  return {
    id, level, delay: Math.max(0, Math.min(MAX_GIFT_DELAY, Math.round(delay))), left: GIFT[level].rounds, source, mw,
  };
}

export const antidoteMw = (p: Poison) => p.mw ?? GIFT[p.level].mw;

/** Welches Gift steckt in den Effekten eines Moves? Das stärkste zählt. */
export function giftOfEffects(effectIds: string[]): GiftLevel | null {
  const order: GiftLevel[] = ['toedlich', 'stark', 'laehm', 'schwach'];
  for (const lv of order) if (effectIds.includes(GIFT[lv].effectId)) return lv;
  return null;
}

export interface PoisonTick {
  /** Gift danach (null = wirkt nicht mehr). */
  poison: Poison | null;
  energie: number;
  /** Lähmung setzt ein. */
  lame: boolean;
  /** Das Opfer wird sterbend. */
  dying: boolean;
  /** Das Gift wartet noch (Verzögerung). */
  waiting: boolean;
}

/** Ende einer Runde: ein Gift tickt. Verzögerung zählt herunter, danach wirkt es. */
export function tickPoison(p: Poison): PoisonTick {
  const none = { energie: 0, lame: false, dying: false, waiting: false };
  if (p.delay > 0) return { ...none, poison: { ...p, delay: p.delay - 1 }, waiting: true };
  const def = GIFT[p.level];
  if (p.level === 'laehm') {
    return { ...none, lame: !p.fired, poison: { ...p, fired: true } };
  }
  if (p.level === 'toedlich') return { ...none, dying: true, poison: null };
  const left = p.left - 1;
  return { ...none, energie: -def.energie, poison: left > 0 ? { ...p, left } : null };
}

/** Sprechender Text für die Anzeige. */
export function describePoison(p: Poison): string {
  const def = GIFT[p.level];
  const when = p.delay > 0 ? `wirkt in ${p.delay} Runde${p.delay === 1 ? '' : 'n'}` : p.level === 'laehm' && p.fired ? 'gelähmt' : 'wirkt';
  const rest = p.level === 'schwach' || p.level === 'stark' ? `, noch ${p.left}× −${def.energie} Energie` : '';
  return `Vergiftet (${def.label}): ${when}${rest}`;
}

/**
 * Überlauf bei negativer Energie (3.11): je volle 3 Punkte unter 0 eine Verletzung.
 * Liefert, wie viele Verletzungen durch den Wechsel von `before` auf `after` neu fällig sind.
 */
export function overflowInjuries(before: number, after: number): number {
  const due = (e: number) => (e < 0 ? Math.floor(-e / 3) : 0);
  return Math.max(0, due(after) - due(before));
}

/** Gegenmittel-Probe gelungen? Erfolg, oder Erfolg mit Preis zählt nicht (das Gift bleibt). */
export const antidoteWorks = (result: 'erfolg' | 'preis' | 'fehlschlag' | undefined, auto?: boolean) => auto === true || result === 'erfolg';

export const giftCatalog = rules.epKatalog.effekte.filter((e) => 'gift' in e);
