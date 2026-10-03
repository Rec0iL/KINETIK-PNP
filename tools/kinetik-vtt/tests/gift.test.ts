import { describe, expect, it } from 'vitest';
import { GIFT, antidoteMw, giftOfEffects, newPoison, overflowInjuries, tickPoison, type Poison } from '../src/rules';
import { tickCharacter, tickNpc, cureOps } from '../src/gm/poison';
import { newNpc } from '../src/gm/combat';
import { applyPatch } from '../src/model/patch';
import { jinYamada } from '../src/model/examples';

const run = (p: Poison, rounds: number) => {
  const log: ReturnType<typeof tickPoison>[] = [];
  let cur: Poison | null = p;
  for (let i = 0; i < rounds && cur; i++) { const t = tickPoison(cur); log.push(t); cur = t.poison; }
  return log;
};

describe('Gift (3.11)', () => {
  it('schwach: -1 Energie, 2 Runden, insgesamt -2', () => {
    const log = run(newPoison('a', 'schwach', 0), 5);
    expect(log.map((t) => t.energie)).toEqual([-1, -1]);
    expect(log[1].poison).toBeNull();
  });
  it('stark mit Verzögerung 2: erst nach 2 Runden, dann 2 × -2 (Beispiel 6)', () => {
    const log = run(newPoison('a', 'stark', 2), 6);
    expect(log.map((t) => t.energie)).toEqual([0, 0, -2, -2]);
    expect(log[0].waiting).toBe(true);
  });
  it('Verzögerung ist auf 3 Runden begrenzt', () => {
    expect(newPoison('a', 'stark', 9).delay).toBe(3);
    expect(newPoison('a', 'stark', -2).delay).toBe(0);
  });
  it('Lähmgift lähmt einmal und bleibt bis zum Gegenmittel', () => {
    const log = run(newPoison('a', 'laehm', 1), 4);
    expect(log.map((t) => t.lame)).toEqual([false, true, false, false]);
    expect(log[3].poison).not.toBeNull();
  });
  it('tödliches Gift macht nach der Verzögerung sterbend', () => {
    const log = run(newPoison('a', 'toedlich', 2), 4);
    expect(log.map((t) => t.dying)).toEqual([false, false, true]);
    expect(log[2].poison).toBeNull();
  });
  it('Gegenmittel-MW: 7 / 9 / 9 / 11, abweichend einstellbar (Todesberührung 13)', () => {
    expect(Object.values(GIFT).map((g) => g.mw)).toEqual([7, 9, 9, 11]);
    expect(antidoteMw(newPoison('a', 'toedlich', 0, '', 13))).toBe(13);
  });
  it('Katalogeffekte werden zur Gift-Stufe, das stärkste zählt', () => {
    expect(giftOfEffects(['zone', 'giftStark'])).toBe('stark');
    expect(giftOfEffects(['giftSchwach', 'giftToedlich'])).toBe('toedlich');
    expect(giftOfEffects(['zone'])).toBeNull();
  });
  it('Überlauf: je volle 3 Punkte unter 0 eine Verletzung', () => {
    expect(overflowInjuries(2, -1)).toBe(0);
    expect(overflowInjuries(1, -3)).toBe(1);
    expect(overflowInjuries(-2, -7)).toBe(2);
    expect(overflowInjuries(-3, -4)).toBe(0);
  });
});

describe('Gift am Bogen und am NPC', () => {
  it('Rundenende zieht Energie ab und zählt die Verzögerung herunter', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'poison', poison: newPoison('g', 'stark', 1, 'Chen') }]);
    const r1 = tickCharacter(c);
    applyPatch(c, r1.ops);
    expect(c.resources.energie).toBe(8);
    expect(c.poisons[0].delay).toBe(0);
    const r2 = tickCharacter(c);
    applyPatch(c, r2.ops);
    expect(c.resources.energie).toBe(6);
    applyPatch(c, tickCharacter(c).ops);
    applyPatch(c, tickCharacter(c).ops);
    expect(c.resources.energie).toBe(4);
    expect(c.poisons).toHaveLength(0);
  });
  it('ohnmächtig und vergiftet: Überlauf gibt eine Torso-Verletzung', () => {
    const c = jinYamada();
    c.resources.energie = -2;
    applyPatch(c, [{ op: 'poison', poison: newPoison('g', 'stark', 0) }]);
    const r = tickCharacter(c);
    applyPatch(c, r.ops);
    expect(c.resources.energie).toBe(-4);
    expect(c.injuries.torso).toHaveLength(1);
  });
  it('Lähmgift setzt den großen Tag, das Gegenmittel nimmt ihn wieder', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'poison', poison: newPoison('g', 'laehm', 0) }]);
    applyPatch(c, tickCharacter(c).ops);
    expect(c.tags.find((t) => t.name === 'Gelähmt')?.size).toBe('gross');
    applyPatch(c, cureOps(c, 'g'));
    expect(c.poisons).toHaveLength(0);
    expect(c.tags.some((t) => t.name === 'Gelähmt')).toBe(false);
  });
  it('tödliches Gift: sterbend, bleibt es auch ohne Zonenverletzung, Stabilisieren beendet es', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'poison', poison: newPoison('g', 'toedlich', 0) }]);
    applyPatch(c, tickCharacter(c).ops);
    expect(c.dying).toBe(3);
    applyPatch(c, [{ op: 'add', key: 'wk', delta: 0 }]);
    expect(c.dying).toBe(3);
    c.dying = null;
    applyPatch(c, [{ op: 'add', key: 'wk', delta: 0 }]);
    expect(c.dying).toBeNull();
    expect(c.dyingGift).toBeUndefined();
  });
  it('NPC: Energie sinkt, unter 0 ausgeschaltet, tödliches Gift stirbt', () => {
    const n = newNpc('n', 'elite');
    n.poisons = [newPoison('g', 'stark', 0)];
    tickNpc(n); tickNpc(n); tickNpc(n);
    expect(n.energie).toBe(2);
    expect(n.poisons).toHaveLength(0);
    const m = newNpc('m', 'boss');
    m.poisons = [newPoison('g', 'toedlich', 0)];
    tickNpc(m);
    expect(m.dying).toBe(true);
  });
});
