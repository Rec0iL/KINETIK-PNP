// Berechnete Werte des Bogens: Regel-Engine auf das Charaktermodell angewendet. Rein, ohne DOM.
import {
  actionBonus, energieMax as ruleEnergieMax, wkMax as ruleWkMax, momentumCap as ruleMomentumCap, passiveWahrnehmung,
  titleBonusRow, meisterschaft, growthSteps, rules, topLevel, moveCost, evaluateMove, zoneStatus, totalInjuries,
  ATTR_KEYS, ZONE_KEYS, type AttrKey, type ZoneKey, type Title, type MoveCost, type MoveEvaluation,
} from '../rules';
import type { Character, Move } from './character';

export interface Derived<T = number> {
  /** Wert nach Regel. */
  rule: T;
  /** Tatsächlich verwendeter Wert (Überschreibung oder Regel). */
  value: T;
  overridden: boolean;
}

function derived(rule: number, override: number | undefined): Derived {
  return override === undefined ? { rule, value: rule, overridden: false } : { rule, value: override, overridden: true };
}

export interface Sheet {
  energieMax: Derived;
  wkMax: Derived;
  momentumCap: Derived;
  /** Beste Gesamtbonus je Attribut über alle Titel (Domäne vorausgesetzt) und ohne Titel. */
  basicBonus: Record<AttrKey, number>;
  /** Passive Wahrnehmung (5 + Instinkt-Bonus des besten Titels, gleichzeitig Standard-Wahrnehmungswert). */
  passiv: Derived;
  titleRows: { title: Title; mastery: number; row: Record<AttrKey, number>; growth: number }[];
  topLevel: number;
  /** Zustände aus den Ressourcen und Verletzungen. */
  states: { ausgepumpt: boolean; gebrochen: boolean; sterbend: boolean; unbrauchbar: ZoneKey[] };
  injuryCount: number;
  tagBonus: number;
}

export function computeSheet(c: Character): Sheet {
  const attrs = c.attributes;
  const rowFor = (t: Title) => titleBonusRow(attrs, t);
  const titleRows = c.titles.map((t) => ({
    title: t,
    mastery: t.masteryOverride ?? meisterschaft(t.level),
    row: rowFor(t),
    growth: growthSteps(t.level),
  }));
  const basicBonus = Object.fromEntries(
    ATTR_KEYS.map((k) => [k, actionBonus(attrs, k, c.titles)]),
  ) as Record<AttrKey, number>;
  const passiv = derived(passiveWahrnehmung(basicBonus.instinkt), c.overrides.passiv);

  const statesZones = ZONE_KEYS.map((z) => ({ z, status: zoneStatus(z, c.injuries[z].length) }));
  const small = c.tags.filter((t) => t.size === 'klein').length;
  const large = c.tags.filter((t) => t.size === 'gross').length;
  const tg = rules.tabellen.tags;

  return {
    energieMax: derived(ruleEnergieMax(attrs), c.overrides.energieMax),
    wkMax: derived(ruleWkMax(attrs), c.overrides.wkMax),
    momentumCap: derived(ruleMomentumCap(c.titles), c.overrides.momentumCap),
    basicBonus,
    passiv,
    titleRows,
    topLevel: topLevel(c.titles),
    states: {
      ausgepumpt: c.resources.energie <= 0,
      gebrochen: c.resources.wk <= 0,
      sterbend: statesZones.some((s) => s.status === 'sterbend'),
      unbrauchbar: statesZones.filter((s) => s.status === 'unbrauchbar').map((s) => s.z),
    },
    injuryCount: totalInjuries(Object.fromEntries(ZONE_KEYS.map((z) => [z, c.injuries[z].length]))),
    tagBonus: Math.min(tg.stapelMax, small * tg.klein + large * tg.gross),
  };
}

export interface MoveView {
  evaluation: MoveEvaluation;
  cost: MoveCost;
  /** Level des zugehörigen Titels (oder höchstes Level). */
  level: number;
  titleName: string;
  mastered: boolean;
}

export function viewMove(c: Character, m: Move): MoveView {
  const title = c.titles.find((t) => t.id === m.titleId);
  const level = title ? title.level : topLevel(c.titles);
  const evaluation = evaluateMove(m);
  const base = moveCost(m, level);
  const cost: MoveCost = m.costOverride
    ? { ...base, energie: m.costOverride.energie ?? base.energie, momentum: m.costOverride.momentum ?? base.momentum }
    : base;
  return { evaluation, cost, level, titleName: title?.name ?? '', mastered: base.mastered };
}

/** Wirkt ein Titel für diesen Move? Für Würfe: Bonus des Moves = Attribut + Meisterschaft des Titels. */
export function moveRollBonus(c: Character, m: Move): number {
  const title = c.titles.find((t) => t.id === m.titleId);
  return actionBonus(c.attributes, m.attr, title ? [title] : []);
}

export interface CreationReport {
  stufe: { name: string; attributBudget: number; titelBudget: number; startLevelMax: number };
  attributesSpent: number;
  attributesBudget: number;
  attributesOver: boolean;
  /** Anzahl der Attribute auf -1 (max. 2 zählen als Rückerstattung). */
  minusCount: number;
  startMax: number;
  attributesAboveStartMax: AttrKey[];
  titleLevels: number;
  titleBudget: number;
  titlesOverStartMax: string[];
  growthPoints: number;
  hints: string[];
}

/** Hinweise zur Charaktererschaffung (2.4). Nur Hinweise, nie blockierend. */
export function creationReport(c: Character): CreationReport {
  const stufe = rules.tabellen.kampagnenstufen.find((s) => s.key === c.stufe) ?? rules.tabellen.kampagnenstufen[1];
  const attrs = ATTR_KEYS.map((k) => c.attributes[k]);
  const growthPoints = c.titles.reduce((s, t) => s + growthSteps(t.startedAtLevel ?? t.level), 0);
  const minusCount = attrs.filter((a) => a < 0).length;
  const refunded = Math.min(2, minusCount);
  const sum = attrs.reduce((s, a) => s + Math.max(0, a), 0);
  const attributesSpent = sum - refunded;
  const attributesBudget = stufe.attributBudget + growthPoints;
  const startMax = rules.tabellen.attribut.startMax + (c.naturtalent ? 1 : 0) + (growthPoints > 0 ? 1 : 0);
  const aboveStart = ATTR_KEYS.filter((k) => c.attributes[k] > startMax);
  const titleLevels = c.titles.reduce((s, t) => s + (t.startedAtLevel ?? t.level), 0);
  const over = c.titles.filter((t) => (t.startedAtLevel ?? t.level) > stufe.startLevelMax).map((t) => t.name);
  const hints: string[] = [];
  if (attributesSpent > attributesBudget) hints.push(`${attributesSpent - attributesBudget} Attributspunkt(e) über dem Budget.`);
  if (minusCount > 2) hints.push('Nur zwei Attribute auf -1 geben einen Punkt zurück.');
  if (aboveStart.length) hints.push('Ein Attribut liegt über dem Startmaximum.');
  if (titleLevels > stufe.titelBudget) hints.push(`${titleLevels - stufe.titelBudget} Titel-Level über dem Startbudget.`);
  if (over.length) hints.push(`Start-Level über ${stufe.startLevelMax}: ${over.join(', ')}.`);
  return {
    stufe: { name: stufe.name, attributBudget: stufe.attributBudget, titelBudget: stufe.titelBudget, startLevelMax: stufe.startLevelMax },
    attributesSpent, attributesBudget, attributesOver: attributesSpent > attributesBudget, minusCount,
    startMax, attributesAboveStartMax: aboveStart, titleLevels, titleBudget: stufe.titelBudget, titlesOverStartMax: over,
    growthPoints, hints,
  };
}
