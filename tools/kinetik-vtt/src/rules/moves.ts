// Move-Bewertung und Kosten (Kapitel 5).
import { rules } from './data';
import { meisterschaft, epCap } from './derive';

export interface MoveEffect {
  id: string;
  /** Anzeigename-Zusatz (z.B. "Am Boden"). */
  label?: string;
  /** Überschreibt die EP des Katalogeffekts (freie Effekte, SL-Schätzung). */
  ep?: number;
  /** Überschreibt, ob der Effekt als Sondereffekt (Stern) gilt. */
  stern?: boolean;
}

export interface MoveSpec {
  effects: MoveEffect[];
  /** IDs der gewählten Abzüge (vorbedingung, risiko, setup, einmal). */
  deductions: string[];
  /** Manuelle EP-Gesamtsumme statt Berechnung (Hausregel / SL-Entscheidung). */
  epOverride?: number;
  /** Bezahlung der ★-EP: Energie (Standard) oder Momentum (1 je angefangene 2 ★-EP). */
  starPayment?: 'energie' | 'momentum';
  /** Vom SL früher für gemeistert erklärt (Muskelgedächtnis). */
  masteredByGM?: boolean;
  /** Level, auf dem der Move gelernt wurde. */
  learnedAtLevel?: number;
}

export type MoveTier = 'energie' | 'momentum' | 'meister' | 'legendaer';

export interface MoveEvaluation {
  /** Summe der Effekte ohne Abzüge. */
  rawEp: number;
  normalEp: number;
  starEp: number;
  deduction: number;
  /** Endgültige EP (nach Abzügen, ggf. manuell überschrieben). */
  ep: number;
  tier: MoveTier;
  minLevel: number;
  conflicts: string[];
}

export interface MoveCost {
  energie: number;
  momentum: number;
  mastered: boolean;
  tier: MoveTier;
  /** Level liegt unter dem Mindestlevel des Moves. */
  levelTooLow: boolean;
  /** Level 10 für legendäre Moves nötig. */
  notes: string[];
}

const effectIndex = new Map(rules.epKatalog.effekte.map((e) => [e.id, e]));
const deductionIndex = new Map(rules.epKatalog.abzuege.map((a) => [a.id, a]));

export function effectDef(id: string) {
  return effectIndex.get(id);
}

export function effectEp(e: MoveEffect): number {
  return e.ep ?? effectIndex.get(e.id)?.ep ?? 0;
}

export function isStar(e: MoveEffect): boolean {
  return e.stern ?? !!effectIndex.get(e.id)?.stern;
}

/** Mindestlevel nach EP: 3 EP und weniger ab Level 1, danach Cap 3 + M, also Level 2 * (EP - 3). */
export function minLevelForEp(ep: number): number {
  return ep <= rules.epKatalog.kosten.capBasis ? 1 : 2 * (ep - rules.epKatalog.kosten.capBasis);
}

export function tierForEp(ep: number): MoveTier {
  const k = rules.epKatalog.kosten;
  if (ep >= k.legendaerEp) return 'legendaer';
  if (ep >= 7) return 'meister';
  if (ep > k.energieMoveMaxEp) return 'momentum';
  return 'energie';
}

export const TIER_LABEL: Record<MoveTier, string> = {
  energie: 'Energie-Move',
  momentum: 'Momentum-Move',
  meister: 'Meister-Move',
  legendaer: 'Legendärer Move',
};

/** Momentum-Kosten nach EP (ab 4 EP). */
export function momentumForEp(ep: number): number {
  const row = rules.epKatalog.kosten.momentum.find((r) => ep >= r.ab && ep <= r.bis);
  if (row) return row.momentum;
  const last = rules.epKatalog.kosten.momentum[rules.epKatalog.kosten.momentum.length - 1];
  return ep > last.bis ? last.momentum : 0;
}

/** Regelverstöße im Aufbau (z.B. Durchschlag zusammen mit Schutz ignorieren/zerstören). */
export function moveConflicts(spec: MoveSpec): string[] {
  const out: string[] = [];
  const ids = new Set(spec.effects.map((e) => e.id));
  for (const id of ids) {
    const def = effectIndex.get(id) as { schliesstAus?: string[]; name: string } | undefined;
    for (const other of def?.schliesstAus ?? []) {
      if (ids.has(other) && id < other) {
        out.push(`${def!.name} ist nicht kombinierbar mit ${effectIndex.get(other)?.name}.`);
      }
    }
  }
  const wurfMax = (effectIndex.get('wurfPlus') as { max?: number } | undefined)?.max ?? 2;
  if (spec.effects.filter((e) => e.id === 'wurfPlus').length > wurfMax) out.push('Der Wurfbonus ist auf +2 begrenzt.');
  return out;
}

export function evaluateMove(spec: MoveSpec): MoveEvaluation {
  let normalEp = 0;
  let starEp = 0;
  for (const e of spec.effects) (isStar(e) ? (starEp += effectEp(e)) : (normalEp += effectEp(e)));
  const rawEp = normalEp + starEp;
  const wanted = spec.deductions.reduce((s, id) => s - (deductionIndex.get(id)?.ep ?? 0), 0);
  const deduction = Math.min(rules.epKatalog.abzugMax, wanted);
  const calc = Math.max(0, rawEp - deduction);
  const ep = spec.epOverride ?? calc;
  return {
    rawEp, normalEp, starEp, deduction, ep,
    tier: tierForEp(ep), minLevel: minLevelForEp(ep), conflicts: moveConflicts(spec),
  };
}

export function isMastered(spec: Pick<MoveSpec, 'masteredByGM' | 'learnedAtLevel'>, titleLevel: number, ep: number): boolean {
  const k = rules.epKatalog.kosten;
  if (ep >= k.legendaerEp || ep <= k.energieMoveMaxEp) return false; // legendär nie, Energie-Moves brauchen es nicht
  if (spec.masteredByGM) return true;
  return spec.learnedAtLevel !== undefined && titleLevel >= spec.learnedAtLevel + k.gemeistertLevelAbstand;
}

/** Kosten eines Moves für einen Titel auf `titleLevel`. */
export function moveCost(spec: MoveSpec, titleLevel: number): MoveCost {
  const k = rules.epKatalog.kosten;
  const ev = evaluateMove(spec);
  const m = meisterschaft(titleLevel);
  const notes: string[] = [];
  const mastered = isMastered(spec, titleLevel, ev.ep);

  // Abzüge gehen zuerst von den normalen EP ab, ein Rest von den ★-EP.
  const normalAfter = Math.max(0, ev.normalEp - ev.deduction);
  const starAfter = Math.max(0, ev.starEp - Math.max(0, ev.deduction - ev.normalEp));
  const ep = ev.ep;

  let energie = 0;
  let momentum = 0;
  const momentumMove = ep > k.energieMoveMaxEp && !mastered;
  if (momentumMove) {
    momentum = momentumForEp(ep);
    energie = k.momentumMoveEnergie;
  } else {
    const base = spec.epOverride !== undefined ? ep : normalAfter;
    energie = Math.max(0, base - m);
    if (ep >= k.mindestEnergieAbEp && titleLevel < k.mindestEnergieEntfaelltAbLevel) energie = Math.max(1, energie);
  }
  if (starAfter > 0) {
    if (spec.starPayment === 'momentum') momentum += Math.ceil(starAfter / k.sternMomentumProEp);
    else energie += starAfter;
  }
  if (mastered) notes.push('Gemeistert: kostet kein Momentum mehr.');
  if (ev.tier === 'legendaer') notes.push(`Legendär: nur mit Titel auf Level ${k.legendaerLevel}, braucht Dominanz und einen Preis.`);
  if (ep > epCap(m)) notes.push(`Über dem EP-Deckel (${epCap(m)}) dieses Levels.`);

  return {
    energie, momentum, mastered, tier: ev.tier,
    levelTooLow: titleLevel < ev.minLevel, notes,
  };
}

export function costLabel(c: Pick<MoveCost, 'energie' | 'momentum'>): string {
  const parts: string[] = [];
  if (c.momentum) parts.push(`${c.momentum} Momentum`);
  if (c.energie || !c.momentum) parts.push(`${c.energie} Energie`);
  return parts.join(' + ');
}
