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
