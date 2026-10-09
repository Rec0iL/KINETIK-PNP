// Munition und Nachladen (2.5, optional). Rein, ohne DOM.
import { rules } from './data';

export interface AmmoState {
  /** Größe des Magazins in Angriffen (der W6 am Tisch). */
  cap: number;
  cur: number;
  /** Magazine im Vorrat, nur wenn der Tisch den Vorrat mitzählt. */
  reserve?: number;
  reserveMax?: number;
  /** Schwere Waffe: Nachladen braucht eine ganze Aktion. */
  heavy: boolean;
}

export const RELOAD_TAG = rules.waffen.munition.nachladenTag;

interface AmmoTemplate { magazin?: number; schwerNachladen?: boolean; wegwurf?: boolean }

/** Magazin einer Waffenvorlage (null: Nahkampfwaffe ohne Munition). */
export function newAmmo(tpl: AmmoTemplate | undefined, withReserve: boolean): AmmoState | null {
  if (!tpl?.magazin) return null;
  const m = rules.waffen.munition;
  const heavy = !!tpl.schwerNachladen;
  const a: AmmoState = { cap: tpl.magazin, cur: tpl.magazin, heavy };
  if (withReserve && !tpl.wegwurf) {
    a.reserveMax = heavy ? m.vorratSchwer : m.vorrat;
    a.reserve = a.reserveMax;
  }
  return a;
}

/** Ein Angriff mit der Waffe zählt das Magazin herunter. */
export function fireShot(a: AmmoState): AmmoState {
  return { ...a, cur: Math.max(0, a.cur - 1) };
}

export interface ReloadResult {
  ok: boolean;
  ammo: AmmoState;
  /** Kleiner Tag, der durch das Nachladen im Clash entsteht. */
  tag: string | null;
  /** Schwere Waffen brauchen eine ganze Aktion. */
  action: boolean;
  reason?: string;
}

/**
 * Nachladen (2.5): im Clash gibt es den kleinen Tag Nachladen, in ruhigen Momenten ist es gratis.
 * Ein Move wie Wick Flick (Effekt `nachladen`) lädt ohne Tag nach.
 */
export function reload(a: AmmoState, opts: { inClash: boolean; viaMove?: boolean }): ReloadResult {
  if (a.reserve !== undefined && a.reserve <= 0) return { ok: false, ammo: a, tag: null, action: false, reason: 'Kein Magazin mehr im Vorrat.' };
  const ammo: AmmoState = { ...a, cur: a.cap, reserve: a.reserve === undefined ? undefined : a.reserve - 1 };
  return { ok: true, ammo, tag: opts.inClash && !opts.viaMove ? RELOAD_TAG : null, action: a.heavy };
}

/** Lädt der Move im Clash nach (Effekt `nachladen`)? Dann entfällt der Tag. */
export const movesReload = (effectIds: string[]) => effectIds.includes('nachladen');

/** Ein Flächen- oder Mehrzielangriff (3.14)? */
export function areaOfEffects(effectIds: string[]): 'flaeche' | 'ziele' | null {
  if (effectIds.includes('flaeche')) return 'flaeche';
  if (effectIds.includes('ziele3') || effectIds.includes('ziel2')) return 'ziele';
  return null;
}
