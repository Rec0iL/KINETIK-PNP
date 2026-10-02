import { describe, expect, it } from 'vitest';
import {
  actionBonus, clashDeltaDistribution, energieMax, epCap, growthSteps, isOut, meisterschaft, minLevelForEp, momentumCap,
  moveCost, moveConflicts, outcomeFromDelta, parseFormula, passiveWahrnehmung, probeChance, resolveClash, resolveHit,
  resolveProbe, resolveStealthClash, rules, tagBonus, titleBonusRow, ueberzahlBonus, wkMax, zoneStatus, evaluateMove,
  type Attributes, type MoveSpec, type Title,
} from '../src/rules';

const jinAttr: Attributes = { fluss: 2, praezision: 1, gewalt: 0, instinkt: 2, fokus: -1 };
const killer: Title = { id: 'k', name: 'Ex-Triaden-Auftragskiller', level: 3, domains: ['Schusswaffen', 'Infiltration', 'Einschüchtern'], leadAttrs: ['fluss', 'praezision'] };
const bjj: Title = { id: 'b', name: 'BJJ-Schüler', level: 1, domains: ['Griffe', 'Würfe', 'Bodenkampf'], leadAttrs: ['fluss', 'gewalt'] };

const move = (id: string): MoveSpec => {
  const m = rules.moves.moves.find((x) => x.id === id)!;
  return { effects: m.effekte, deductions: m.abzuege };
};

describe('Meisterschaft und abgeleitete Werte', () => {
  it('Tabelle 2.2', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(meisterschaft)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
  });
  it('Jin: Energie 8, WK 7, Momentum-Deckel 3', () => {
    expect(energieMax(jinAttr)).toBe(8);
    expect(wkMax(jinAttr)).toBe(7);
    expect(momentumCap([killer, bjj])).toBe(3);
  });
  it('Jin: Bonus in der Domäne (Kapitel 6)', () => {
    expect(actionBonus(jinAttr, 'fluss', [killer])).toBe(3);
    expect(actionBonus(jinAttr, 'praezision', [killer])).toBe(2);
    expect(actionBonus(jinAttr, 'fluss', [bjj])).toBe(2);
    expect(titleBonusRow(jinAttr, killer).fluss).toBe(3);
  });
  it('höchster Titel zählt, nicht die Summe; ohne Titel nur das Attribut', () => {
    expect(actionBonus(jinAttr, 'fluss', [killer, bjj])).toBe(3);
    expect(actionBonus(jinAttr, 'fluss', [])).toBe(2);
  });
  it('Nicht-Leitattribut: halbe Meisterschaft abgerundet', () => {
    const t: Title = { ...killer, level: 5 }; // M 2
    expect(actionBonus(jinAttr, 'instinkt', [t])).toBe(2 + 1);
    expect(actionBonus(jinAttr, 'instinkt', [killer])).toBe(2); // M 1 -> 0
  });
  it('Momentum-Deckel steigt auf Level 5 und 10', () => {
    expect(momentumCap([{ level: 4 }])).toBe(3);
    expect(momentumCap([{ level: 5 }])).toBe(4);
    expect(momentumCap([{ level: 10 }])).toBe(5);
  });
  it('EP-Deckel, passive Wahrnehmung, Wachstum', () => {
    expect(epCap(5)).toBe(8);
    expect(passiveWahrnehmung(3)).toBe(8);
    expect([3, 4, 7, 9, 10].map(growthSteps)).toEqual([0, 1, 2, 3, 4]);
  });
  it('Tag-Bonus stapelt bis +3', () => {
    expect(tagBonus(2, 1)).toBe(3);
    expect(tagBonus(1, 0)).toBe(1);
    expect(tagBonus(0, 2)).toBe(3);
  });
});

describe('Clash', () => {
  it('Schwellen-Tabelle 3.1 (Beispiel T(A)=2, T(V)=4)', () => {
    expect(outcomeFromDelta(2, 2, 4)).toBe('dominanz');
    expect(outcomeFromDelta(1, 2, 4)).toBe('schlagabtausch');
    expect(outcomeFromDelta(0, 2, 4)).toBe('schlagabtausch');
    expect(outcomeFromDelta(-1, 2, 4)).toBe('konter');
    expect(outcomeFromDelta(-3, 2, 4)).toBe('konter');
    expect(outcomeFromDelta(-4, 2, 4)).toBe('perfekterKonter');
  });
  it('Anhang A: gleicher Bonus 24/32/20/24 %', () => {
    const d = clashDeltaDistribution();
    const sum: Record<string, number> = { dominanz: 0, schlagabtausch: 0, konter: 0, perfekterKonter: 0 };
    for (const [delta, p] of d) sum[outcomeFromDelta(delta, 3, 3)] += p;
    expect(Math.round(sum.dominanz * 100)).toBe(24);
    expect(Math.round(sum.schlagabtausch * 100)).toBe(32);
    expect(Math.round(sum.konter * 100)).toBe(20);
    expect(Math.round(sum.perfekterKonter * 100)).toBe(24);
  });
  it('Anhang A: Siegchance des Unterlegenen nach Lücke', () => {
    const d = clashDeltaDistribution();
    const win = (gap: number) => [...d].filter(([delta]) => delta - gap >= 1).reduce((s, [, p]) => s + p, 0);
    expect([2, 3, 4, 5, 6, 7].map((g) => Math.round(win(g) * 100))).toEqual([24, 16, 10, 5, 3, 1]);
  });
  it('Anhang A: Schutz als Schwelle 24/16/10/5 %', () => {
    const d = clashDeltaDistribution();
    const wound = (schutz: number) => [...d].filter(([delta]) => delta >= 3 + schutz).reduce((s, [, p]) => s + p, 0);
    expect([0, 1, 2, 3].map((s) => Math.round(wound(s) * 100))).toEqual([24, 16, 10, 5]);
  });
  it('Helden-Schwelle (Beispiel 1: Jin +3 gegen Goons +0)', () => {
    const r = resolveClash({
      attacker: { dice: 8, bonus: 3, isPlayer: true },
      defender: { dice: 5, bonus: 0 },
    });
    expect(r.heldenSchwelle).toBe(true);
    expect([r.tA, r.tV]).toEqual([2, 4]);
    expect(r.delta).toBe(6);
    expect(r.outcome).toBe('dominanz');
  });
  it('Helden-Schwelle gilt nicht bei Vorsprung 1 oder PvP', () => {
    expect(resolveClash({ attacker: { dice: 7, bonus: 2, isPlayer: true }, defender: { dice: 7, bonus: 1 } }).heldenSchwelle).toBe(false);
    expect(resolveClash({ attacker: { dice: 7, bonus: 5, isPlayer: true }, defender: { dice: 7, bonus: 0, isPlayer: true } }).heldenSchwelle).toBe(false);
  });
  it('Helden-Schwelle bei NPC-Angriff: T(A)=4, T(V)=2', () => {
    const r = resolveClash({ attacker: { dice: 7, bonus: 0 }, defender: { dice: 7, bonus: 3, isPlayer: true } });
    expect([r.tA, r.tV]).toEqual([4, 2]);
  });
  it('Beispiel 2: Schlagabtausch bei Δ 2 gegen Boss', () => {
    const r = resolveClash({ attacker: { dice: 9, bonus: 2, isPlayer: true }, defender: { dice: 5, bonus: 4 } });
    expect(r.delta).toBe(2);
    expect(r.outcome).toBe('schlagabtausch');
  });
  it('Beispiel 3: perfekter Konter bei Δ -3', () => {
    const r = resolveClash({ attacker: { dice: 5, bonus: 2, isPlayer: true }, defender: { dice: 8, bonus: 2, isPlayer: true } });
    expect(r.delta).toBe(-3);
    expect(r.outcome).toBe('perfekterKonter');
    expect(r.rewards).toEqual({ side: 'defender', momentum: 1, wk: 1 });
    expect(r.marker).toBe('defender');
  });
  it('Außer Reichweite: Lücke 5 deckelt den Unterlegenen, Heldenhafte Gegenwehr hebt es auf', () => {
    const base = { attacker: { dice: 12, bonus: 0 }, defender: { dice: 2, bonus: 5 } };
    const r = resolveClash(base);
    expect(r.rawOutcome).toBe('dominanz');
    expect(r.outcome).toBe('schlagabtausch');
    expect(r.limited).toBe(true);
    expect(resolveClash({ ...base, heldenhafteGegenwehr: true }).outcome).toBe('dominanz');
    const def = resolveClash({ attacker: { dice: 12, bonus: 5 }, defender: { dice: 12, bonus: 0 } });
    expect(def.outcome).toBe('dominanz');
    const konter = resolveClash({ attacker: { dice: 2, bonus: 0 }, defender: { dice: 12, bonus: 5 } });
    expect(konter.rawOutcome).toBe('perfekterKonter');
    const under = resolveClash({ attacker: { dice: 12, bonus: 5 }, defender: { dice: 2, bonus: 0 } });
    expect(under.outcome).toBe('dominanz');
    const defUnder = resolveClash({ attacker: { dice: 2, bonus: 5 }, defender: { dice: 12, bonus: 0 } });
    expect(defUnder.rawOutcome).toBe('perfekterKonter');
    expect(defUnder.outcome).toBe('schlagabtausch');
  });
  it('Außer Reichweite: Lücke 8 würfelt nicht', () => {
    expect(resolveClash({ attacker: { dice: 7, bonus: 9 }, defender: { dice: 7, bonus: 1 } }).noRoll).toBe(true);
    expect(resolveClash({ attacker: { dice: 7, bonus: 8 }, defender: { dice: 7, bonus: 1 } }).noRoll).toBe(false);
  });
  it('Heimlichkeits-Clash (Beispiel 5): Δ 1 ist Verdacht', () => {
    const r = resolveStealthClash({ dice: 6, bonus: 3, isPlayer: true }, { dice: 5, bonus: 3 });
    expect(r.delta).toBe(1);
    expect(r.stealth).toBe('verdacht');
  });
});

describe('Trefferkaskade', () => {
  it('Schutz 2: Verletzung erst ab Δ 5', () => {
    expect(resolveHit({ outcome: 'dominanz', delta: 4, t: 3, schutz: 2 }).kind).toBe('abgefangen');
    expect(resolveHit({ outcome: 'dominanz', delta: 5, t: 3, schutz: 2 }).kind).toBe('verletzung');
  });
  it('normaler Treffer: erst Schutz, dann WK', () => {
    expect(resolveHit({ outcome: 'schlagabtausch', delta: 1, t: 3, schutz: 1 }).kind).toBe('schutz');
    expect(resolveHit({ outcome: 'konter', delta: 1, t: 3, schutz: 0 }).kind).toBe('wk');
  });
  it('Durchschlag und Ignorieren senken den Schutz', () => {
    expect(resolveHit({ outcome: 'dominanz', delta: 4, t: 3, schutz: 2, durchschlag: 1 }).kind).toBe('verletzung');
    expect(resolveHit({ outcome: 'schlagabtausch', delta: 1, t: 3, schutz: 3, schutzIgnoriert: true }).kind).toBe('wk');
  });
  it('Härtegrad', () => {
    expect(resolveHit({ outcome: 'schlagabtausch', delta: 2, t: 3, schutz: 0, haertegrad: true }).kind).toBe('verletzung');
  });
});

describe('Proben', () => {
  it('Erfolg, Preis, Fehlschlag, Automatik', () => {
    expect(resolveProbe({ dice: 6, bonus: 3, mw: 9 }).result).toBe('erfolg');
    expect(resolveProbe({ dice: 5, bonus: 3, mw: 9 }).result).toBe('preis');
    expect(resolveProbe({ dice: 4, bonus: 3, mw: 9 }).result).toBe('preis');
    expect(resolveProbe({ dice: 3, bonus: 3, mw: 9 }).result).toBe('fehlschlag');
    expect(resolveProbe({ dice: 7, bonus: 3, mw: 5 }).auto).toBe(true);
    expect(resolveProbe({ dice: 7, bonus: 3, mw: 7 }).auto).toBe(false);
  });
  it('Erfolgschancen-Tabelle Kapitel 4', () => {
    const pct = (b: number, mw: number) => {
      const c = probeChance(b, mw);
      return [Math.round(c.success * 100), Math.round(c.price * 100)];
    };
    expect(pct(3, 7)[0]).toBe(92);
    expect(pct(3, 9)).toEqual([72, 19]);
    expect(pct(3, 11)).toEqual([42, 31]);
    expect(pct(5, 11)).toEqual([72, 19]);
    expect(pct(9, 13)).toEqual([92, 8]);
  });
  it('Würfelformeln', () => {
    expect(parseFormula('2d6+3')).toEqual({ terms: [{ count: 2, sides: 6, sign: 1 }], modifier: 3 });
    expect(parseFormula('d20 - 2 + 1w4').terms).toHaveLength(2);
    expect(() => parseFormula('abc')).toThrow();
    expect(() => parseFormula('')).toThrow();
  });
});

describe('Moves (Kapitel 5)', () => {
  it('alle Beispiel-Moves: EP-Summe und Kosten auf Mindestlevel', () => {
    for (const m of rules.moves.moves) {
      const spec = move(m.id);
      const ev = evaluateMove(spec);
      expect(ev.ep, m.id).toBe(m.ep);
      expect(ev.minLevel, m.id).toBe(m.minLevel);
    }
    expect(moveCost(move('mozambique'), 1)).toMatchObject({ energie: 3, momentum: 0 });
    expect(moveCost(move('rear-naked-choke'), 1)).toMatchObject({ energie: 2, momentum: 0 });
    expect(moveCost(move('querschlaeger'), 2)).toMatchObject({ energie: 1, momentum: 1 });
    expect(moveCost(move('flashbang-breach'), 4)).toMatchObject({ energie: 1, momentum: 1 });
  });
  it('Qi-Fluss: 2 Energie oder 1 Momentum (★)', () => {
    expect(moveCost(move('qi-fluss'), 1)).toMatchObject({ energie: 2, momentum: 0 });
    expect(moveCost({ ...move('qi-fluss'), starPayment: 'momentum' }, 1)).toMatchObject({ energie: 0, momentum: 1 });
    // ★ bekommt keinen Meisterschafts-Rabatt
    expect(moveCost(move('qi-fluss'), 10)).toMatchObject({ energie: 2 });
  });
  it('Lock Reversal: Level 1 / 5 / 10 = 3 / 1 / 0 Energie', () => {
    expect([1, 5, 10].map((l) => moveCost(move('lock-reversal'), l).energie)).toEqual([3, 1, 0]);
  });
  it('Elena: Dreckiger Trick (2 EP) kostet 2, auf Level 5 gratis', () => {
    const spec: MoveSpec = { effects: [{ id: 'freiMittel' }], deductions: [] };
    expect(moveCost(spec, 1).energie).toBe(2);
    expect(moveCost(spec, 5).energie).toBe(0);
  });
  it('Kaito: Schatten-Kopie 3 / 1 / 0, Rasengan Momentum dann gemeistert', () => {
    const kopie: MoveSpec = { effects: [{ id: 'freiGross' }], deductions: [] };
    expect([1, 5, 10].map((l) => moveCost(kopie, l).energie)).toEqual([3, 1, 0]);
    const rasengan: MoveSpec = {
      effects: [{ id: 'schutzIgnorieren' }, { id: 'freiKlein', label: 'Umgebung zerstören' }, { id: 'zone' }],
      deductions: [], learnedAtLevel: 5,
    };
    expect(moveCost(rasengan, 5)).toMatchObject({ energie: 1, momentum: 1, mastered: false });
    expect(moveCost(rasengan, 9)).toMatchObject({ mastered: false });
    expect(moveCost(rasengan, 10)).toMatchObject({ energie: 0, momentum: 0, mastered: true });
    expect(moveCost({ ...rasengan, masteredByGM: true }, 6).momentum).toBe(0);
  });
  it('Momentum-Stufen und Legendär', () => {
    const mk = (ep: number): MoveSpec => ({ effects: [], deductions: [], epOverride: ep });
    expect([4, 5, 6, 7, 8].map((ep) => moveCost(mk(ep), 10).momentum)).toEqual([1, 1, 2, 2, 3]);
    expect(moveCost(mk(8), 10)).toMatchObject({ momentum: 3, energie: 1, tier: 'legendaer' });
    expect(moveCost({ ...mk(8), learnedAtLevel: 1 }, 10).mastered).toBe(false);
  });
  it('Mindestlevel nach EP und Abzugs-Deckel', () => {
    expect([3, 4, 5, 6, 7, 8].map(minLevelForEp)).toEqual([1, 2, 4, 6, 8, 10]);
    const spec: MoveSpec = { effects: [{ id: 'freiGross' }], deductions: ['vorbedingung', 'risiko', 'setup'] };
    expect(evaluateMove(spec).deduction).toBe(2);
    expect(evaluateMove(spec).ep).toBe(1);
  });
  it('Durchschlag ist nicht kombinierbar mit Schutz ignorieren/zerstören', () => {
    expect(moveConflicts({ effects: [{ id: 'durchschlag' }, { id: 'schutzIgnoriert' }], deductions: [] })).toHaveLength(0);
    expect(moveConflicts({ effects: [{ id: 'durchschlag' }, { id: 'schutzIgnorieren' }], deductions: [] })).toHaveLength(1);
  });
});

describe('NPC und Zonen', () => {
  it('Zonen-Status', () => {
    expect(zoneStatus('kopf', 1)).toBe('ok');
    expect(zoneStatus('kopf', 2)).toBe('sterbend');
    expect(zoneStatus('torso', 2)).toBe('ok');
    expect(zoneStatus('torso', 3)).toBe('sterbend');
    expect(zoneStatus('armL', 2)).toBe('unbrauchbar');
  });
  it('Ausgeschaltet bei', () => {
    expect(isOut('goon', { hits: 1, wk: 0, injuries: {} }).out).toBe(true);
    expect(isOut('elite', { wk: 3, injuries: { armL: 1, beinR: 1 } }).out).toBe(true);
    expect(isOut('boss', { wk: 5, injuries: { kopf: 2 } }).out).toBe(true);
    expect(isOut('boss', { wk: 5, injuries: { armL: 1, beinR: 1 } }).out).toBe(false);
    expect(isOut('spieler', { wk: 4, injuries: { torso: 3 } }).out).toBe(true);
    expect(isOut('spieler', { wk: 0, injuries: {} }).out).toBe(true);
  });
  it('Überzahl: +1 je weiterem Angreifer, max +3', () => {
    expect([1, 2, 3, 4, 5, 9].map(ueberzahlBonus)).toEqual([0, 1, 2, 3, 3, 3]);
  });
});
