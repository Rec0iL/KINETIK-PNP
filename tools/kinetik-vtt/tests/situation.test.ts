import { describe, expect, it } from 'vitest';
import { newCombat, newNpc, startCombat, nextRound, publicCombat, roughState } from '../src/gm/combat';
import {
  applyProposal, canGrantBulletTime, computeResult, createSituation, grantBulletTime, npcRollMod, playerRollMod, playerView,
  proposeResolution, usedTagBonus, rollToSit, type Situation,
} from '../src/gm/situation';

function setup(type: 'goon' | 'elite' | 'boss' = 'elite') {
  const c = newCombat();
  startCombat(c);
  const npc = newNpc('n1', type, 'Gegner', 3);
  c.npcs.push(npc);
  return { c, npc };
}
const attackSit = (c: ReturnType<typeof newCombat>, extra: Partial<Situation> = {}) => {
  const s = createSituation(c, 's1', 'p1', { kind: 'attack', npcId: 'n1', attr: 'gewalt', technique: 'Schlag', moveName: '', tagsUsed: [] });
  Object.assign(s, extra);
  return s;
};
const roll = (s: Situation, p: [number, number, number], n: [number, number, number]) => {
  s.pRoll = rollToSit('a', p[0] + p[1] + p[2], p[1], p[2]);
  s.nRoll = rollToSit('b', n[0] + n[1] + n[2], n[1], n[2]);
  s.result = computeResult(s)!;
};

describe('Modifikatoren', () => {
  it('Tags: klein +1, groß +2, höchstens +3', () => {
    const tags = [{ name: 'Am Boden', size: 'klein' as const }, { name: 'Fixiert', size: 'gross' as const }, { name: 'Geblendet', size: 'klein' as const }];
    expect(usedTagBonus(['Am Boden'], tags)).toBe(1);
    expect(usedTagBonus(['Am Boden', 'Fixiert'], tags)).toBe(3);
    expect(usedTagBonus(['Am Boden', 'Fixiert', 'Geblendet'], tags)).toBe(3);
    expect(usedTagBonus(['Unbekannt'], tags)).toBe(0);
  });
  it('Spielerwurf: SL-Modifikator plus Tags des Gegners', () => {
    const { c, npc } = setup();
    npc.tags = ['Am Boden'];
    const s = attackSit(c, { mod: -1, tagsUsed: ['Am Boden'] });
    expect(playerRollMod(s, npc)).toBe(0);
  });
  it('Gegnerwurf: Überzahl und +1 gegen Erschöpfte', () => {
    const { c } = setup();
    const s = createSituation(c, 's2', 'p1', { kind: 'defend', npcId: 'n1', attr: 'fluss', technique: '', moveName: '', tagsUsed: [] });
    s.attackers = 3;
    expect(npcRollMod(s, c, [])).toBe(2);
    c.exposed.p1 = true;
    expect(npcRollMod(s, c, [])).toBe(3);
  });
});

describe('Bullet Time', () => {
  it('höchstens einmal pro Spieler und Runde', () => {
    const { c } = setup();
    const a = attackSit(c);
    expect(grantBulletTime(c, a)).toBe(true);
    const b = createSituation(c, 's3', 'p1', { kind: 'attack', npcId: 'n1', attr: 'gewalt', technique: '', moveName: '', tagsUsed: [] });
    expect(canGrantBulletTime(c, 'p1')).toBe(false);
    expect(grantBulletTime(c, b)).toBe(false);
    expect(canGrantBulletTime(c, 'p2')).toBe(true);
    nextRound(c);
    expect(canGrantBulletTime(c, 'p1')).toBe(true);
  });
});

describe('Vorschlag der Folgen', () => {
  it('Dominanz gegen Boss: Treffer, Belohnung, Marker, fertig', () => {
    const { c, npc } = setup('boss');
    const s = attackSit(c);
    roll(s, [12, 4, 0], [3, 6, 0]);
    expect(s.result!.outcome).toBe('dominanz');
    const items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 2, pcBedraengnis: 0 });
    const kinds = items.map((i) => i.effect.k);
    expect(kinds).toContain('npcHit');
    expect(kinds).toContain('marker');
    expect(items.find((i) => i.effect.k === 'pcRes')).toBeTruthy();
    expect(items.find((i) => i.effect.k === 'done')?.effect).toEqual({ k: 'done', id: 'p1' });
    const before = npc.schutz;
    const applied = applyProposal(c, items);
    expect(c.marker).toBe('players');
    expect(c.done.p1).toBe(true);
    expect(npc.schutz + npc.wk).toBeLessThan(before + npc.wkMax);
    expect(applied.patches.some((p) => p.playerId === 'p1')).toBe(true);
  });
  it('Goon-Gruppe: Dominanz schaltet 2 aus, die nächsten Token vorausgewählt', () => {
    const { c, npc } = setup('goon');
    const s = attackSit(c);
    roll(s, [12, 4, 0], [3, 0, 0]);
    const items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 0, pcBedraengnis: 0, nearTokens: ['t1', 't2', 't3'] });
    const e = items.find((i) => i.effect.k === 'goonOut')!.effect as { n: number; tokenIds: string[] };
    expect(e.n).toBe(2);
    expect(e.tokenIds).toEqual(['t1', 't2']);
    const applied = applyProposal(c, items);
    expect(npc.count).toBe(1);
    expect(applied.removeTokens).toEqual(['t1', 't2']);
  });
  it('Perfekter Konter gegen Goons: ebenfalls 2 ausgeschaltet', () => {
    const { c, npc } = setup('goon');
    const s = createSituation(c, 's6', 'p1', { kind: 'defend', npcId: 'n1', attr: 'fluss', technique: '', moveName: '', tagsUsed: [] });
    roll(s, [2, 0, 0], [8, 0, 0]);
    // Spieler verteidigt (dice 2 + 0) gegen Goons (8): Δ aus Sicht des Angreifers = +6, also Dominanz der Goons. Umgekehrt:
    roll(s, [12, 0, 0], [2, 0, 0]);
    expect(s.result!.outcome).toBe('perfekterKonter');
    const items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 0, pcBedraengnis: 0, nearTokens: ['a', 'b', 'c'] });
    expect((items.find((i) => i.effect.k === 'goonOut')!.effect as { n: number }).n).toBe(2);
  });
  it('Konter: Goons treffen, Bedrängnis zählt (1. Treffer, dann Verletzung)', () => {
    const { c, npc } = setup('goon');
    const s = attackSit(c);
    roll(s, [5, 0, 0], [6, 0, 0]);
    expect(s.result!.outcome).toBe('konter');
    let items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 0 });
    expect(items.find((i) => i.effect.k === 'bedr')?.effect).toEqual({ k: 'bedr', playerId: 'p1', value: 1 });
    items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 1 });
    expect(items.find((i) => i.effect.k === 'pcHit')?.effect).toMatchObject({ hit: 'verletzung' });
    applyProposal(c, items);
    expect(c.bedraengnis.p1).toBe(0);
  });
  it('Schlagabtausch: beide treffen, Alternative Nachteils-Tag schließt es aus', () => {
    const { c, npc } = setup('elite');
    const s = attackSit(c);
    roll(s, [7, 2, 0], [7, 2, 0]);
    expect(s.result!.outcome).toBe('schlagabtausch');
    const items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 0 });
    const group = items.filter((i) => i.group === 'sa');
    expect(group.length).toBe(2);
    expect(group.filter((i) => i.on).length).toBe(1);
  });
  it('Durchatmen: +2 Energie und der nächste Clash gegen den Spieler +1', () => {
    const { c } = setup();
    const s = createSituation(c, 's4', 'p1', { kind: 'breath', npcId: null, attr: 'fluss', technique: '', moveName: '', tagsUsed: [] });
    const items = proposeResolution({ sit: s, npc: null, pcName: 'Jin', pcSchutz: 0, pcBedraengnis: 0 });
    const applied = applyProposal(c, items);
    expect(applied.patches[0].ops).toEqual([{ op: 'add', key: 'energie', delta: 2 }]);
    expect(c.exposed.p1).toBe(true);
  });
  it('Gift: wirkt bei Verletzung oder Schutz 0, bleibt sonst am Schutz hängen', () => {
    const { c, npc } = setup('elite');
    npc.schutz = 1;
    const s = attackSit(c, { gift: { level: 'stark', delay: 2, ignoresSchutz: false } });
    roll(s, [6, 3, 0], [7, 2, 0]);
    expect(s.result!.outcome).toBe('schlagabtausch');
    const blocked = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 0 }).find((i) => i.effect.k === 'poison')!;
    expect(blocked.on).toBe(false);
    npc.schutz = 0;
    const reached = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 0 }).find((i) => i.effect.k === 'poison')!;
    expect(reached.on).toBe(true);
    applyProposal(c, [reached]);
    expect(npc.poisons[0]).toMatchObject({ level: 'stark', delay: 2 });
  });
  it('Gift mit Schutz ignorieren wirkt trotz Schutz', () => {
    const { c, npc } = setup('boss');
    const s = attackSit(c, { gift: { level: 'schwach', delay: 0, ignoresSchutz: true } });
    roll(s, [6, 3, 0], [7, 2, 0]);
    const p = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 1, pcBedraengnis: 0 }).find((i) => i.effect.k === 'poison')!;
    expect(p.on).toBe(true);
  });
  it('Gegner mit Gift trifft den Spieler: Gift kommt als Patch', () => {
    const { c, npc } = setup('elite');
    const s = createSituation(c, 's5', 'p1', { kind: 'defend', npcId: 'n1', attr: 'fluss', technique: '', moveName: '', tagsUsed: [] });
    s.gift = { level: 'laehm', delay: 0, ignoresSchutz: false };
    roll(s, [4, 2, 0], [9, 4, 0]);
    expect(s.result!.outcome === 'dominanz' || s.result!.outcome === 'schlagabtausch').toBe(true);
    const items = proposeResolution({ sit: s, npc, pcName: 'Jin', pcSchutz: 0, pcBedraengnis: 0 });
    const applied = applyProposal(c, items);
    expect(applied.patches.some((p) => p.ops.some((o) => o.op === 'poison'))).toBe(true);
  });
});

describe('Spieleransicht', () => {
  it('Ergebnis erst nach beiden Würfen, keine NPC-Werte', () => {
    const { c, npc } = setup('boss');
    const s = attackSit(c);
    s.status = 'released';
    expect(playerView(s, npc).summary).toBeNull();
    roll(s, [8, 3, 0], [6, 6, 0]);
    s.status = 'rolled';
    const v = playerView(s, npc);
    expect(v.summary?.outcome).toBeDefined();
    expect(JSON.stringify(v)).not.toMatch(/schutz|wk|bonus/i);
  });
  it('Gegnerzustand grob, ohne Zahlen', () => {
    const { c, npc } = setup('boss');
    expect(roughState(npc)).toBe('unverletzt');
    npc.wk = 2;
    expect(roughState(npc)).toBe('angeschlagen');
    npc.injuries.torso = 1;
    expect(roughState(npc)).toBe('schwer');
    const pub = publicCombat(c);
    expect(JSON.stringify(pub.enemies[0])).not.toMatch(/"bonus"|"wk"|"schutz"/);
  });
});
