// Proben gegen die Umgebung (Kapitel 4).
import { rules } from './data';

export type ProbeResult = 'erfolg' | 'preis' | 'fehlschlag';

export interface ProbeInput {
  /** Augensumme der 2W6. */
  dice: number;
  bonus: number;
  mod?: number;
  mw: number;
}

export interface ProbeOutcome {
  total: number;
  mw: number;
  result: ProbeResult;
  /** MW <= Bonus + 2: es muss nicht gewürfelt werden. */
  auto: boolean;
  /** Abstand zum MW (positiv = darüber). */
  margin: number;
}

export const PROBE_LABEL: Record<ProbeResult, string> = {
  erfolg: 'Erfolg',
  preis: 'Erfolg mit Preis',
  fehlschlag: 'Fehlschlag',
};

export function isAutoSuccess(bonus: number, mw: number, mod = 0): boolean {
  return mw <= bonus + mod + 2;
}

export function resolveProbe(p: ProbeInput): ProbeOutcome {
  const total = p.dice + p.bonus + (p.mod ?? 0);
  const margin = total - p.mw;
  const result: ProbeResult = margin >= 0 ? 'erfolg' : margin >= -2 ? 'preis' : 'fehlschlag';
  return { total, mw: p.mw, result, auto: isAutoSuccess(p.bonus, p.mw, p.mod), margin };
}

export function mwName(mw: number): string {
  const hit = rules.tabellen.mw.find((m) => m.mw === mw);
  return hit ? hit.name : `MW ${mw}`;
}
