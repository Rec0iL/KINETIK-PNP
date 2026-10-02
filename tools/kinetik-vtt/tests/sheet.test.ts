import { describe, expect, it } from 'vitest';
import { computeSheet, creationReport, viewMove } from '../src/model/sheet';
import { jinYamada } from '../src/model/examples';
import { exportCharacter, exportLibrary, parseImport, ImportError, sanitizeCharacter } from '../src/model/io';
import { newCharacter, uid, type Move } from '../src/model/character';

describe('Bogen-Berechnung (Jin)', () => {
  const jin = jinYamada();
  it('Ressourcen und Bonus-Matrix', () => {
    const s = computeSheet(jin);
    expect(s.energieMax.value).toBe(8);
    expect(s.wkMax.value).toBe(7);
    expect(s.momentumCap.value).toBe(3);
    expect(s.titleRows[0].row).toMatchObject({ fluss: 3, praezision: 2 });
    expect(s.titleRows[1].row.fluss).toBe(2);
    expect(s.passiv.value).toBe(5 + 2);
  });
  it('Überschreibungen ersetzen den Regelwert, der Regelwert bleibt sichtbar', () => {
    const c = jinYamada();
    c.overrides.energieMax = 12;
    const s = computeSheet(c);
    expect(s.energieMax).toEqual({ rule: 8, value: 12, overridden: true });
  });
  it('Zustände', () => {
    const c = jinYamada();
    c.resources.energie = 0;
    c.injuries.kopf = [{ text: 'a' }, { text: 'b' }];
    c.injuries.armL = [{ text: 'x' }, { text: 'y' }];
    const s = computeSheet(c);
    expect(s.states.ausgepumpt).toBe(true);
    expect(s.states.sterbend).toBe(true);
    expect(s.states.unbrauchbar).toEqual(['armL']);
    expect(s.injuryCount).toBe(4);
  });
  it('Tag-Bonus ist bei +3 gedeckelt', () => {
    const c = jinYamada();
    c.tags = [1, 2, 3].map((n) => ({ id: uid(), name: `t${n}`, size: 'gross' as const }));
    expect(computeSheet(c).tagBonus).toBe(3);
  });
  it('Move-Ansicht rechnet mit dem Titel-Level', () => {
    const m: Move = {
      id: 'm', name: 'Lock', attr: 'fluss', text: '', titleId: jin.titles[1].id,
      effects: [{ id: 'freiMittel' }, { id: 'freiMittel' }], deductions: ['vorbedingung'],
    };
    expect(viewMove(jin, m).cost.energie).toBe(3);
    expect(viewMove(jin, { ...m, costOverride: { energie: 0 } }).cost.energie).toBe(0);
  });
});

describe('Erschaffungshinweise', () => {
  it('Jin liegt im Kino-Budget: Attribute 4 (+2 -1 Rückerstattung), Titel 4', () => {
    const r = creationReport(jinYamada());
    expect(r.attributesSpent).toBe(4);
    expect(r.attributesBudget).toBe(4);
    expect(r.hints).toEqual([]);
    expect(r.titleLevels).toBe(4);
  });
  it('Warnt bei Überschreitung', () => {
    const c = jinYamada();
    c.attributes.gewalt = 3;
    expect(creationReport(c).hints.length).toBeGreaterThan(0);
  });
});

describe('JSON-Import/Export', () => {
  it('Runde: Export, Import ergibt identischen Charakter', () => {
    const c = jinYamada();
    c.injuries.torso = [{ text: 'Schulter durchschossen' }];
    c.moves.push({ id: uid(), name: 'Judo-Wurf', attr: 'fluss', text: 't', effects: [{ id: 'tagKlein', label: 'Am Boden' }], deductions: [] });
    const text = JSON.stringify(exportCharacter(c));
    const [back] = parseImport(text);
    expect(back).toEqual(c);
  });
  it('Bibliothek und rohe Charakter-Objekte', () => {
    const a = jinYamada();
    const b = newCharacter({ name: 'Zweite' });
    expect(parseImport(JSON.stringify(exportLibrary([a, b])))).toHaveLength(2);
    expect(parseImport(JSON.stringify(a))[0].name).toBe('Jin Yamada');
  });
  it('neue IDs beim Import auf Wunsch', () => {
    const a = jinYamada();
    const [copy] = parseImport(JSON.stringify(exportCharacter(a)), { newIds: true });
    expect(copy.id).not.toBe(a.id);
  });
  it('lehnt Müll ab und repariert Teil-Exporte', () => {
    expect(() => parseImport('kein json')).toThrow(ImportError);
    expect(() => parseImport('{"foo":1}')).toThrow(ImportError);
    const c = sanitizeCharacter({ name: 'Nur Name', attributes: { fluss: 5, bogus: 1 } });
    expect(c.attributes.fluss).toBe(5);
    expect(Object.keys(c.attributes)).toHaveLength(5);
    expect(c.injuries.kopf).toEqual([]);
    expect(c.resources.momentum).toBe(0);
  });
});

import { exportMoves, parseMoveImport } from '../src/model/io';
import { moveFromTemplate } from '../src/sheet/moveTemplates';

describe('Move-Import/Export', () => {
  it('Runde mit neuen IDs', () => {
    const m = moveFromTemplate('lock-reversal', { level: 1 })!;
    const [back] = parseMoveImport(JSON.stringify(exportMoves([m])));
    expect(back.id).not.toBe(m.id);
    expect({ ...back, id: m.id }).toEqual(m);
  });
  it('lehnt Müll ab, repariert Teile', () => {
    expect(() => parseMoveImport('{"x":1}')).toThrow(ImportError);
    const [m] = parseMoveImport('{"kinetik":"move","move":{"name":"X","attr":"bogus","effects":[{"id":"zone"},{"nope":1}]}}');
    expect(m.attr).toBe('fluss');
    expect(m.effects).toEqual([{ id: 'zone' }]);
  });
});

import { stufeConfig } from '../src/model/sheet';
import { evaluateMove, tierForEp } from '../src/rules';

describe('Kampagnenstartstufe', () => {
  it('feste Stufen und eigene Stufe liefern ihre Budgets', () => {
    const c = newCharacter({ stufe: 'legende' });
    expect(stufeConfig(c)).toMatchObject({ attributBudget: 5, titelBudget: 7, startLevelMax: 5 });
    c.stufe = 'custom';
    c.customStufe = { attributBudget: 6, titelBudget: 9, startLevelMax: 4 };
    expect(stufeConfig(c)).toMatchObject({ name: 'Eigene', attributBudget: 6, titelBudget: 9, startLevelMax: 4 });
  });
  it('Erschaffungsbericht nutzt die eigene Stufe', () => {
    const c = jinYamada();
    c.stufe = 'custom';
    c.customStufe = { attributBudget: 2, titelBudget: 2, startLevelMax: 2 };
    const r = creationReport(c);
    expect(r.stufe.name).toBe('Eigene');
    expect(r.hints.length).toBeGreaterThan(0);
  });
  it('Import repariert unbekannte Stufen und fehlende eigene Budgets', () => {
    const c = sanitizeCharacter({ name: 'X', stufe: 'unsinn' });
    expect(c.stufe).toBe('kino');
    expect(c.customStufe).toEqual({ attributBudget: 4, titelBudget: 4, startLevelMax: 3 });
    expect(c.draft).toBe(false);
    expect(sanitizeCharacter({ stufe: 'custom', customStufe: { attributBudget: 7 } }).customStufe.attributBudget).toBe(7);
  });
});

describe('Neue Regeln 3.11 und 5.1', () => {
  it('negative Energie: ohnmächtig, je 3 Punkte unter 0 eine Verletzung fällig', () => {
    const c = jinYamada();
    c.resources.energie = -1;
    expect(computeSheet(c).states).toMatchObject({ ausgepumpt: true, ohnmaechtig: true });
    expect(computeSheet(c).overflow).toBe(0);
    c.resources.energie = -4;
    expect(computeSheet(c).overflow).toBe(1);
    c.resources.energie = -9;
    expect(computeSheet(c).overflow).toBe(3);
    c.resources.energie = 0;
    expect(computeSheet(c).states.ohnmaechtig).toBe(false);
  });
  it('Gift-Moves aus 5.2 und Todesberührung aus 5.4 stimmen mit ihren EP', () => {
    for (const id of ['blasrohr-pfeil', 'dokushu-beruehrung', 'garrotte']) {
      const m = moveFromTemplate(id)!;
      expect(evaluateMove(m).ep, id).toBe(3);
    }
    const t = moveFromTemplate('todesberuehrung')!;
    expect(evaluateMove(t)).toMatchObject({ ep: 8, tier: 'legendaer', minLevel: 10 });
    expect(t.prices).toEqual(['Narbe', 'Selten']);
  });
  it('Meister-Move erst ab 7 EP', () => {
    expect([5, 6, 7, 8].map(tierForEp)).toEqual(['momentum', 'momentum', 'meister', 'legendaer']);
  });
});
