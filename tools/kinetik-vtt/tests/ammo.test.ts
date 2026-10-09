import { describe, expect, it } from 'vitest';
import { areaOfEffects, evaluateMove, fireShot, movesReload, newAmmo, reload, rules } from '../src/rules';
import { applyPatch } from '../src/model/patch';
import { describePatch } from '../src/model/patch';
import { newCharacter } from '../src/model/character';
import { newCombat, newNpc, startCombat } from '../src/gm/combat';
import { computeResult, createSituation, proposeResolution, rollToSit } from '../src/gm/situation';

const tpl = (id: string) => rules.waffen.waffen.find((w) => w.id === id);

describe('Munition (2.5, optional)', () => {
  it('Magazingrößen: 6 normal, 3 schwer (LMG), 1 Rakete', () => {
    expect(newAmmo(tpl('pistole'), false)).toMatchObject({ cap: 6, cur: 6, heavy: false });
    expect(newAmmo(tpl('sturmgewehr'), false)?.cap).toBe(6);
    expect(newAmmo(tpl('lmg'), false)).toMatchObject({ cap: 3, heavy: true });
    expect(newAmmo(tpl('raketenwerfer'), false)).toMatchObject({ cap: 1, heavy: true });
    expect(newAmmo(tpl('katana'), false)).toBeNull();
  });
  it('Vorrat: 3 Magazine, schwere Waffen 2, Wegwurfwaffen keinen', () => {
    expect(newAmmo(tpl('pistole'), true)?.reserve).toBe(3);
    expect(newAmmo(tpl('lmg'), true)?.reserve).toBe(2);
    expect(newAmmo(tpl('splittergranate'), true)?.reserve).toBeUndefined();
  });
  it('jeder Angriff zählt herunter, nie unter 0', () => {
    let a = newAmmo(tpl('pistole'), false)!;
    for (let i = 0; i < 8; i++) a = fireShot(a);
    expect(a.cur).toBe(0);
  });
  it('Nachladen im Clash gibt den Tag Nachladen, ruhig ist es gratis, per Move ohne Tag', () => {
    const a = fireShot(newAmmo(tpl('sturmgewehr'), true)!);
    const clash = reload(a, { inClash: true });
    expect(clash).toMatchObject({ ok: true, tag: 'Nachladen', action: false });
    expect(clash.ammo).toMatchObject({ cur: 6, reserve: 2 });
    expect(reload(a, { inClash: false }).tag).toBeNull();
    expect(reload(a, { inClash: true, viaMove: true }).tag).toBeNull();
  });
  it('Schwere Waffen brauchen eine ganze Aktion, ein leerer Vorrat verhindert das Nachladen', () => {
    expect(reload(newAmmo(tpl('lmg'), false)!, { inClash: true }).action).toBe(true);
    const leer = { ...newAmmo(tpl('pistole'), true)!, reserve: 0 };
    expect(reload(leer, { inClash: false }).ok).toBe(false);
  });
});

describe('Neue Moves und Waffen (v3.6)', () => {
  it('Wick Flick: 2 EP, Trommel-Salto: 4 EP ab Level 2', () => {
    const wick = rules.moves.moves.find((m) => m.id === 'wick-flick')!;
    const trommel = rules.moves.moves.find((m) => m.id === 'trommel-salto')!;
    expect(evaluateMove({ effects: wick.effekte, deductions: wick.abzuege }).ep).toBe(2);
    const e = evaluateMove({ effects: trommel.effekte, deductions: trommel.abzuege });
    expect(e.ep).toBe(4);
    expect(e.minLevel).toBe(2);
    expect(movesReload(wick.effekte.map((x) => x.id))).toBe(true);
  });
  it('Fläche kostet 3 EP und ist auf Level 1 möglich', () => {
    const e = evaluateMove({ effects: [{ id: 'flaeche' }], deductions: [] });
    expect(e.ep).toBe(3);
    expect(e.minLevel).toBe(1);
  });
  it('Mehrzielangriffe werden erkannt', () => {
    expect(areaOfEffects(['flaeche'])).toBe('flaeche');
    expect(areaOfEffects(['ziele3', 'zone'])).toBe('ziele');
    expect(areaOfEffects(['zone'])).toBeNull();
  });
});

describe('Flächenangriff und Gnadenstoß im Kampf', () => {
  it('die Auflösung enthält den Hinweis auf weitere Ziele', () => {
    const c = newCombat();
    startCombat(c);
    const npc = newNpc('n1', 'goon', 'Goons', 3);
    c.npcs.push(npc);
    const s = createSituation(c, 's1', 'p1', { kind: 'attack', npcId: 'n1', attr: 'gewalt', technique: 'Granate', moveName: '', tagsUsed: [], area: 'flaeche' });
    expect(s.area).toBe('flaeche');
    s.pRoll = rollToSit('a', 15, 3, 0);
    s.nRoll = rollToSit('b', 5, 0, 0);
    s.result = computeResult(s)!;
    const prop = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 0, pcBedraengnis: 0, nearTokens: ['t1', 't2'] });
    expect(prop.some((p) => p.label.includes('Fläche'))).toBe(true);
  });
  it('Gnadenstoß macht einen Spielercharakter sterbend, nicht tot', () => {
    const ch = newCharacter();
    applyPatch(ch, [{ op: 'dying', why: 'gnadenstoss' }]);
    expect(ch.dying).toBe(rules.tabellen.sterbendRunden);
    expect(describePatch([{ op: 'dying', why: 'gnadenstoss' }])).toContain('Gnadenstoß');
  });
});
