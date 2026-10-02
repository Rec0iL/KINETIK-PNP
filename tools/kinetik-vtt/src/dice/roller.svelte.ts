// Würfel-Engine der App: würfelt, schreibt ins Log, benachrichtigt Zuhörer (Netzwerk, Animation).
import {
  cryptoRng, rollDice, parseFormula, resolveProbe, resolveClash, type ProbeResult, type ClashResult,
} from '../rules';
import { uid } from '../model/character';

export type RollKind = 'attr' | 'probe' | 'clash' | 'free' | 'stealth' | 'move';

export interface DieResult { sides: number; value: number }

export interface RollRecord {
  id: string;
  ts: number;
  who: string;
  characterId?: string;
  kind: RollKind;
  label: string;
  /** Anzeigeformel, z.B. "2W6 + 3". */
  formula: string;
  dice: DieResult[];
  bonus: number;
  mod: number;
  total: number;
  mw?: number;
  result?: ProbeResult;
  auto?: boolean;
  /** Nur für den SL sichtbar. */
  secret?: boolean;
  /** Verknüpfter Wurf (Gegenseite eines Clashs). */
  clashWith?: string;
  /** Zusammenfassung des Clash-Ergebnisses (am zweiten Wurf). */
  clash?: Pick<ClashResult, 'delta' | 'outcome' | 'rawOutcome' | 'heldenSchwelle' | 'limited' | 'noRoll' | 'tA' | 'tV'>;
}

const STORAGE_KEY = 'kinetik.rolllog';
const MAX = 200;

function loadLog(): RollRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignorieren */ }
  return [];
}

export const rollLog = $state<{ entries: RollRecord[] }>({ entries: loadLog() });

type Listener = (r: RollRecord) => void;
const listeners = new Set<Listener>();
export function onRoll(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Trägt einen Wurf ins Log ein. Auch für fremde Würfe aus dem Netzwerk (`remote`). */
export function commitRoll(r: RollRecord, opts: { remote?: boolean } = {}) {
  const i = rollLog.entries.findIndex((e) => e.id === r.id);
  if (i >= 0) rollLog.entries[i] = r; // Aktualisierung, z.B. Clash-Ergebnis
  else rollLog.entries.unshift(r);
  if (rollLog.entries.length > MAX) rollLog.entries.length = MAX;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(rollLog.entries))); } catch { /* ignorieren */ }
  if (!opts.remote) for (const l of listeners) l(r);
}

export function clearLog() {
  rollLog.entries.length = 0;
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignorieren */ }
}

const sign = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);

export interface BaseRollOptions {
  who: string;
  characterId?: string;
  label: string;
  bonus: number;
  mod?: number;
  secret?: boolean;
  kind?: RollKind;
}

/** 2W6 + Bonus (+ Modifikator), optional gegen einen MW. */
export function roll2d6(o: BaseRollOptions & { mw?: number }): RollRecord {
  const dice = rollDice(2, 6, cryptoRng).map((value) => ({ sides: 6, value }));
  const sum = dice[0].value + dice[1].value;
  const mod = o.mod ?? 0;
  const rec: RollRecord = {
    id: uid(), ts: Date.now(), who: o.who, characterId: o.characterId, kind: o.kind ?? (o.mw ? 'probe' : 'attr'),
    label: o.label, formula: `2W6 ${sign(o.bonus)}${mod ? ` ${sign(mod)}` : ''}`,
    dice, bonus: o.bonus, mod, total: sum + o.bonus + mod, secret: o.secret,
  };
  if (o.mw) {
    const p = resolveProbe({ dice: sum, bonus: o.bonus, mod, mw: o.mw });
    rec.mw = o.mw;
    rec.result = p.result;
    rec.auto = p.auto;
  }
  commitRoll(rec);
  return rec;
}

/** Wurf mit von Hand eingetragener Augensumme (reale Würfel am Tisch). */
export function rollManual(o: BaseRollOptions & { sum: number; mw?: number }): RollRecord {
  const mod = o.mod ?? 0;
  const rec: RollRecord = {
    id: uid(), ts: Date.now(), who: o.who, characterId: o.characterId, kind: o.kind ?? (o.mw ? 'probe' : 'attr'),
    label: o.label, formula: `2W6 (Tisch) ${sign(o.bonus)}${mod ? ` ${sign(mod)}` : ''}`,
    dice: [], bonus: o.bonus, mod, total: o.sum + o.bonus + mod, secret: o.secret,
  };
  if (o.mw) {
    const p = resolveProbe({ dice: o.sum, bonus: o.bonus, mod, mw: o.mw });
    rec.mw = o.mw;
    rec.result = p.result;
    rec.auto = p.auto;
  }
  commitRoll(rec);
  return rec;
}

/** Freie Formel wie "3d8+2". */
export function rollFormula(o: { who: string; characterId?: string; label?: string; formula: string; secret?: boolean }): RollRecord {
  const f = parseFormula(o.formula);
  const dice: DieResult[] = [];
  let total = f.modifier;
  for (const t of f.terms) {
    for (const value of rollDice(t.count, t.sides, cryptoRng)) {
      dice.push({ sides: t.sides, value });
      total += t.sign * value;
    }
  }
  const rec: RollRecord = {
    id: uid(), ts: Date.now(), who: o.who, characterId: o.characterId, kind: 'free', label: o.label || o.formula,
    formula: o.formula.replace(/\s+/g, ''), dice, bonus: f.modifier, mod: 0, total, secret: o.secret,
  };
  commitRoll(rec);
  return rec;
}

/** Fasst einen Clash aus zwei Würfen zusammen und hängt das Ergebnis an den zweiten. */
export function linkClash(a: RollRecord, d: RollRecord, result: ClashResult): RollRecord {
  const rec: RollRecord = {
    ...d, id: d.id, clashWith: a.id,
    clash: {
      delta: result.delta, outcome: result.outcome, rawOutcome: result.rawOutcome, heldenSchwelle: result.heldenSchwelle,
      limited: result.limited, noRoll: result.noRoll, tA: result.tA, tV: result.tV,
    },
  };
  commitRoll(rec);
  return rec;
}

export { resolveClash };
