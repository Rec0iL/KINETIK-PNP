// Abgeleitete Werte nach Kapitel 2. Reine Funktionen, keine Abhängigkeiten zum DOM.
import { rules, type AttrKey } from './data';

export type Attributes = Record<AttrKey, number>;

export interface Title {
  id: string;
  name: string;
  level: number;
  domains: string[];
  leadAttrs: [AttrKey, AttrKey];
  startedAtLevel?: number;
}

const clampLevel = (level: number) => Math.max(0, Math.min(10, Math.floor(level)));

/** Meisterschaft M = Level / 2, abgerundet. */
export function meisterschaft(level: number): number {
  return rules.tabellen.meisterschaft[clampLevel(level)];
}

/** Meisterschafts-Anteil eines Titels für ein Attribut: voll bei Leitattribut, sonst halb (abgerundet). */
export function titleMastery(title: Pick<Title, 'level' | 'leadAttrs'>, attr: AttrKey): number {
  const m = meisterschaft(title.level);
  return title.leadAttrs.includes(attr) ? m : Math.floor(m / 2);
}

/**
 * Gesamtbonus einer Probe: Attribut + Meisterschaft des besten passenden Titels.
 * `titles` sind nur die Titel, die die Aktion abdecken. Leer = außerhalb der Domäne.
 */
export function actionBonus(attributes: Attributes, attr: AttrKey, titles: Title[] = []): number {
  const best = titles.reduce((max, t) => Math.max(max, titleMastery(t, attr)), 0);
  return attributes[attr] + best;
}

/** Bonus je Attribut für einen Titel (Bonus-Matrix des Bogens). */
export function titleBonusRow(attributes: Attributes, title: Title): Record<AttrKey, number> {
  const row = {} as Record<AttrKey, number>;
  for (const k of Object.keys(attributes) as AttrKey[]) row[k] = attributes[k] + titleMastery(title, k);
  return row;
}

const sumAttrs = (attributes: Attributes, keys: string[]) =>
  keys.reduce((s, k) => s + attributes[k as AttrKey], 0);

/** Energie-Maximum = 6 + Fluss + Gewalt. */
export function energieMax(attributes: Attributes): number {
  const r = rules.tabellen.ressourcen.energie;
  return r.basis + sumAttrs(attributes, r.attribute);
}

/** Willenskraft-Maximum = 6 + Instinkt + Fokus. */
export function wkMax(attributes: Attributes): number {
  const r = rules.tabellen.ressourcen.wk;
  return r.basis + sumAttrs(attributes, r.attribute);
}

/** Momentum-Deckel: 3, +1 ab Level 5, +1 ab Level 10 (höchster Titel). */
export function momentumCap(titles: Pick<Title, 'level'>[]): number {
  const top = titles.reduce((m, t) => Math.max(m, t.level), 0);
  const m = rules.tabellen.momentum;
  return m.basis + m.zuwachs.filter((z) => top >= z.level).reduce((s, z) => s + z.plus, 0);
}

/** Höchstes Titel-Level. */
export function topLevel(titles: Pick<Title, 'level'>[]): number {
  return titles.reduce((m, t) => Math.max(m, t.level), 0);
}

/** EP-Deckel eines Moves = 3 + Meisterschaft. */
export function epCap(m: number): number {
  return rules.epKatalog.kosten.capBasis + m;
}

/** Passive Wahrnehmung = 5 + Bonus. */
export function passiveWahrnehmung(bonus: number): number {
  return rules.tabellen.ressourcen.passiveWahrnehmungBasis + bonus;
}

/** Anzahl der Attributs-Wachstumsstufen (4, 7, 9, 10), die ein Titel auf diesem Level erreicht hat. */
export function growthSteps(level: number): number {
  return rules.tabellen.wachstumLevels.filter((l) => level >= l).length;
}

/** Attributs-Obergrenze: +3, +4 für ein Leitattribut eines Level-10-Titels. */
export function attributeMax(attr: AttrKey, titles: Title[]): number {
  const a = rules.tabellen.attribut;
  const lvl10Lead = titles.some((t) => t.level >= 10 && t.leadAttrs.includes(attr));
  return lvl10Lead ? a.maxLevel10 : a.max;
}

/** Wirkt ein Attribut auf Energie oder WK? Hilfreich für Hinweise nach einem Wachstumspunkt. */
export function attributeAffects(attr: AttrKey): ('energie' | 'wk')[] {
  const r = rules.tabellen.ressourcen;
  const out: ('energie' | 'wk')[] = [];
  if (r.energie.attribute.includes(attr)) out.push('energie');
  if (r.wk.attribute.includes(attr)) out.push('wk');
  return out;
}

/** Tags-Bonus eines Gegners auf einen Clash: Summe, höchstens +3. */
export function tagBonus(smallTags: number, largeTags: number): number {
  const t = rules.tabellen.tags;
  return Math.min(t.stapelMax, smallTags * t.klein + largeTags * t.gross);
}
