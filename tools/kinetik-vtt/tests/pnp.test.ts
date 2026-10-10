import { describe, expect, it } from 'vitest';
import { handleMessage, partyList, pickByMood, pnpProfile, PNP_PROTOCOL, type PnpHost, type PnpIn, type PnpPush } from '../src/net/pnp';
import { newCombat, type Npc } from '../src/gm/combat';
import { newScene, type MapOp, type MapState } from '../src/map/mapstate';
import type { Handout } from '../src/net/protocol';
import type { TrackRef } from '../src/music/clock';
import { rules } from '../src/rules';
import { newCharacter } from '../src/model/character';

/** Ein Host ohne Browser: hält die Sitzung im Speicher und protokolliert, was die Brücke auslöst. */
function fakeHost(over: Partial<{ tracks: TrackRef[]; scenes: MapState[] }> = {}) {
  let n = 0;
  const log: string[] = [];
  const session = { handouts: [] as Handout[], scenes: over.scenes ?? ([] as MapState[]), activeScene: null as string | null, tracks: over.tracks ?? ([] as TrackRef[]), combat: newCombat() };
  const host: PnpHost = {
    uid: () => `id${++n}`,
    session: () => session as never,
    storeImage: async (img, max) => {
      log.push(`store ${img.name} <=${max}`);
      return { hash: `h-${img.name}`, width: img.name.startsWith('big') ? 1000 : 1344, height: img.name.startsWith('big') ? 640 : 864 };
    },
    portraits: async (img) => ({ img: `data:big-${img.name}`, token: `data:tok-${img.name}` }),
    addScene: (s) => session.scenes.push(s),
    removeScene: (id) => { session.scenes = session.scenes.filter((s) => s.id !== id); if (session.activeScene === id) session.activeScene = null; },
    activateScene: (id) => { session.activeScene = id; log.push(`activate ${id}`); },
    gmMapOps: (sid, ops: MapOp[]) => {
      const sc = session.scenes.find((s) => s.id === sid)!;
      for (const o of ops) if (o.op === 'tok') { const i = sc.tokens.findIndex((t) => t.id === o.token.id); if (i >= 0) sc.tokens[i] = o.token; else sc.tokens.push(o.token); }
      log.push(`ops ${sid} ${ops.length}`);
    },
    addHandout: (h) => session.handouts.unshift(h),
    removeHandout: (id) => { session.handouts = session.handouts.filter((h) => h.id !== id); },
    sendHandout: (h, to) => { log.push(`send ${h.id} -> ${to ? to.join() : 'alle'}`); return to ? to.length : 2; },
    commitCombat: () => log.push('commit'),
    musicPlay: (t) => log.push(`play ${t.id}`),
    musicStop: () => log.push('stop'),
    catalog: () => [
      { id: 'killers', title: 'Killers', file: 'music/killers.mp3', category: 'Kampf', tag: 'combat' },
      { id: 'sneaky', title: 'Sneaky Snitch', file: 'music/sneaky.mp3', category: 'Schleichen', tag: 'stealth' },
    ],
    notify: (t) => log.push(`toast ${t}`),
  };
  return { host, session, log };
}

const push = (p: PnpPush, id = 'm1'): PnpIn => ({ t: 'push', id, ...p }) as PnpIn;
const img = (name: string) => ({ name, mime: 'image/png', b64: 'AAAA' });
const run = (h: PnpHost, p: PnpPush) => handleMessage(h, push(p));

describe('Profil (aus den Regeldaten abgeleitet)', () => {
  it('meldet Stufen, Bereiche und Voreinstellungen exakt wie das Regelwerk', () => {
    const p = pnpProfile('t');
    expect(p.protocol).toBe(PNP_PROTOCOL);
    expect(p.push).toHaveProperty('character'); // wir können Charaktere empfangen
    const enemy = p.characters.roles.find((r) => r.id === 'enemy')!;
    const tier = enemy.fields.find((f) => f.key === 'tier')!;
    expect(tier.options!.map((o) => o.value)).toEqual(rules.npc.leiter.map((t) => t.key));
    const elite = enemy.presets!.find((x) => x.id === 'elite')!;
    expect(elite.values).toMatchObject({ tier: 'elite', level: 5, bonus: 5, schutz: 1, wk: 6 });
    expect(elite.ranges).toEqual({ level: [3, 5], bonus: [4, 5] });
    expect(enemy.presets!.find((x) => x.id === 'goon')!.values).toMatchObject({ level: 0, bonus: 0, count: 3 });
    // Gruppengröße nur für Goons, Schutz/WK für alle anderen
    expect(enemy.fields.find((f) => f.key === 'count')!.showIf).toEqual({ key: 'tier', equals: 'goon' });
    expect(enemy.fields.find((f) => f.key === 'wk')!.showIf).toEqual({ key: 'tier', notEquals: 'goon' });
    expect(p.characters.roles.map((r) => r.id)).toEqual(['enemy', 'npc', 'pc']);
    expect(p.provides).toEqual({ party: true });
    expect(p.requests).toEqual(['tracks', 'party']);
  });
});

describe('Handouts', () => {
  it('Text und Bild landen in der Liste; ohne `reveal` sehen die Spieler nichts', async () => {
    const { host, session, log } = fakeHost();
    expect(await run(host, { kind: 'handout', payload: { id: 'a', title: 'Brief', kind: 'text', text: 'Hallo' } })).toMatchObject({ ok: true, data: { revealed: false } });
    expect(await run(host, { kind: 'handout', payload: { id: 'b', title: 'Plakat', kind: 'image', image: img('plakat.png') } })).toMatchObject({ ok: true });
    expect(session.handouts.map((h) => [h.id, h.kind, h.hash ?? h.text])).toEqual([['b', 'image', 'h-plakat.png'], ['a', 'text', 'Hallo']]);
    expect(log.some((l) => l.startsWith('send'))).toBe(false);
    expect(log).toContain('store plakat.png <=2400');
  });

  it('`reveal` sendet an alle, `to` nur an den Spieler; erneutes Senden ersetzt statt zu verdoppeln', async () => {
    const { host, session, log } = fakeHost();
    await run(host, { kind: 'handout', payload: { id: 'a', title: 'Brief', kind: 'text', text: 'v1', reveal: true } });
    await run(host, { kind: 'handout', payload: { id: 'a', title: 'Brief', kind: 'text', text: 'v2', to: 'p7' } });
    expect(log.filter((l) => l.startsWith('send'))).toEqual(['send a -> alle', 'send a -> p7']);
    expect(session.handouts).toHaveLength(1);
    expect(session.handouts[0].text).toBe('v2');
  });

  it('meldet Fehler als Ergebnis statt zu werfen', async () => {
    const { host } = fakeHost();
    expect(await run(host, { kind: 'handout', payload: { id: 'x', title: '', kind: 'text' } })).toMatchObject({ ok: false, error: expect.stringContaining('Titel') });
    expect(await run(host, { kind: 'handout', payload: { id: 'x', title: 'T', kind: 'image' } })).toMatchObject({ ok: false });
  });
});

describe('Szenen', () => {
  const payload = (over: object = {}) => ({
    id: 'keller', name: 'Weinkeller', image: img('keller.png'), width: 1344, height: 864,
    grid: { type: 'square' as const, size: 61, offsetX: 0, offsetY: 0, unitsPerCell: 6, unit: 'ft' },
    tokens: [{ x: 2, y: 3, kind: 'pc' as const, label: 'P1' }, { x: 5, y: 1, kind: 'enemy' as const, label: 'E1' }], ...over,
  });

  it('übernimmt Raster und rechnet Felder in Pixelmitten um', async () => {
    const { host, session } = fakeHost();
    expect(await run(host, { kind: 'scene', payload: payload() })).toMatchObject({ ok: true, data: { tokens: 2 } });
    const s = session.scenes[0];
    expect(s).toMatchObject({ id: 'keller', asset: 'h-keller.png', width: 1344, height: 864 });
    expect(s.grid).toMatchObject({ size: 61, ox: 0, oy: 0, unit: 'ft', unitsPerCell: 6, show: true });
    expect(s.tokens[0]).toMatchObject({ name: 'P1', kind: 'pc', x: Math.round(2.5 * 61), y: Math.round(3.5 * 61), size: 1 });
    expect(s.tokens[1]).toMatchObject({ name: 'E1', kind: 'npc', color: '#ff4d6d' });
    expect(session.activeScene).toBeNull();
  });

  it('eine Illustration als Hintergrund kommt ohne sichtbares Raster an', async () => {
    const { host, session } = fakeHost();
    await run(host, { kind: 'scene', payload: payload({ id: 'taverne:bild.png', tokens: [], grid: { type: 'square' as const, size: 40, offsetX: 0, offsetY: 0, unitsPerCell: 1, unit: 'ft', hidden: true } }) });
    expect(session.scenes[0].grid.show).toBe(false);
    expect(session.scenes[0].tokens).toEqual([]);
  });

  it('Spielerstarts (pc) bleiben für Tests möglich, ohne Spieler zuzuordnen', async () => {
    const { host, session } = fakeHost();
    await run(host, { kind: 'scene', payload: payload({ tokens: [{ x: 3, y: 1, kind: 'pc', label: 'P1' }, { x: 2, y: 1, kind: 'npc' }] }) });
    const [pc, npc] = session.scenes[0].tokens;
    expect(pc).toMatchObject({ name: 'P1', kind: 'pc' });
    expect(npc).toMatchObject({ name: 'NPC', kind: 'npc', hidden: false }); // vom SL geführt
  });

  it('skaliert Raster und Token, wenn das gespeicherte Bild kleiner ausfiel', async () => {
    const { host, session } = fakeHost();
    await run(host, { kind: 'scene', payload: payload({ image: img('big.png') }) }); // gespeichert: 1000 statt 1344 breit
    const k = 1000 / 1344;
    expect(session.scenes[0].grid.size).toBeCloseTo(61 * k, 5);
    expect(session.scenes[0].tokens[0].x).toBe(Math.round(2.5 * 61 * k));
  });

  it('`activate` gibt frei; eine bereits aktive Szene bleibt nach dem Ersetzen aktiv', async () => {
    const { host, session, log } = fakeHost();
    await run(host, { kind: 'scene', payload: payload({ activate: true }) });
    expect(session.activeScene).toBe('keller');
    await run(host, { kind: 'scene', payload: payload({ name: 'Weinkeller v2' }) });
    expect(session.scenes).toHaveLength(1);
    expect(session.scenes[0].name).toBe('Weinkeller v2');
    expect(session.activeScene).toBe('keller');
    expect(log.filter((l) => l === 'activate keller')).toHaveLength(2);
  });

  it('lehnt Hex-Raster ehrlich ab', async () => {
    const { host } = fakeHost();
    expect(await run(host, { kind: 'scene', payload: payload({ grid: { type: 'hex', size: 60, offsetX: 0, offsetY: 0, unitsPerCell: 5, unit: 'ft' } }) })).toMatchObject({ ok: false, error: expect.stringContaining('Hex') });
  });
});

describe('Charaktere', () => {
  const enemy = (sheet: Record<string, unknown>, extra: object = {}) => ({ kind: 'character' as const, payload: { id: 'brute', role: 'enemy', name: 'Dockside Brute', sheet, ...extra } });

  it('Gegner: erzeugt einen Kampf-NPC mit den Werten des Bogens', async () => {
    const { host, session, log } = fakeHost();
    const r = await run(host, enemy({ tier: 'elite', level: 4, bonus: 5, schutz: 1, wk: 6, energie: 7, tags: ['Am Boden'], moves: [{ name: 'Schulterwurf', text: 'Wirft jemanden um.' }, 'Brüllen', { text: 'kein Name' }], note: 'Schwach gegen Schmeichelei' }, { notes: 'Hafen-Schläger', portrait: img('brute.png') }));
    expect(r).toMatchObject({ ok: true, data: { updated: false } });
    const n = session.combat.npcs[0] as Npc;
    expect(n).toMatchObject({ name: 'Dockside Brute', type: 'elite', level: 4, bonus: 5, schutz: 1, schutzMax: 1, wk: 6, wkMax: 6, energie: 7, energieMax: 7, count: 1, hits: 0, src: 'pnp:brute', img: 'data:big-brute.png', token: 'data:tok-brute.png', hidden: false });
    expect(n.tags).toEqual(['Am Boden']);
    expect(n.moves).toEqual([{ name: 'Schulterwurf', text: 'Wirft jemanden um.' }, { name: 'Brüllen', text: '' }]); // Eintrag ohne Namen entfällt
    expect(n.note).toBe('Schwach gegen Schmeichelei'); // Bogen-Notiz hat Vorrang vor dem freien Text
    expect(log).toContain('commit');
  });

  it('ohne Bogen-Notiz dient der freie Text der App als Notiz', async () => {
    const { host, session } = fakeHost();
    await run(host, enemy({ tier: 'schlaeger' }, { notes: 'Hafen-Schläger\n\nflieht, wenn sein Boss fällt' }));
    expect(session.combat.npcs[0].note).toBe('Hafen-Schläger — flieht, wenn sein Boss fällt');
  });

  it('Goons: Gruppengröße; kein Schutz/WK', async () => {
    const { host, session } = fakeHost();
    await run(host, enemy({ tier: 'goon', count: 5 }, { id: 'g', name: 'Hafenratten' }));
    expect(session.combat.npcs[0]).toMatchObject({ type: 'goon', count: 5, level: 0, bonus: 0, wkMax: 0 });
  });

  it('erneutes Senden aktualisiert und behält den Kampfzustand', async () => {
    const { host, session } = fakeHost();
    await run(host, enemy({ tier: 'schlaeger', level: 1, bonus: 2, schutz: 0, wk: 4 }));
    const n = session.combat.npcs[0];
    n.wk = 1; n.hits = 2; n.injuries = { torso: 1 }; n.hidden = true;
    await run(host, enemy({ tier: 'schlaeger', level: 2, bonus: 2, schutz: 0, wk: 4, tags: ['Wütend'] }, { name: 'Brute (umbenannt)' }));
    expect(session.combat.npcs).toHaveLength(1);
    expect(session.combat.npcs[0]).toMatchObject({ name: 'Brute (umbenannt)', level: 2, wk: 1, wkMax: 4, hits: 2, injuries: { torso: 1 }, hidden: true, tags: ['Wütend'] });
  });

  it('neues Porträt landet auch auf den vorhandenen Token des Gegners', async () => {
    const sc = newScene('s1', 'Karte', null, 800, 600);
    const { host, session, log } = fakeHost({ scenes: [sc] });
    await run(host, enemy({ tier: 'schlaeger' }));
    const npcId = session.combat.npcs[0].id;
    sc.tokens.push({ id: 't1', name: 'Brute', x: 10, y: 10, size: 1, color: '#f00', kind: 'npc', npcId });
    await run(host, enemy({ tier: 'schlaeger' }, { portrait: img('neu.png') }));
    expect(sc.tokens[0].img).toBe('data:tok-neu.png');
    expect(log).toContain('ops s1 1');
  });

  it('NPC: wird Token mit Notiz auf der aktiven Karte; erneutes Senden aktualisiert denselben Token', async () => {
    const sc = newScene('s1', 'Karte', null, 800, 600);
    const { host, session } = fakeHost({ scenes: [sc] });
    session.activeScene = 's1';
    const npc = (sheet: Record<string, unknown>) => ({ kind: 'character' as const, payload: { id: 'brenn', role: 'npc', name: 'Brenn', sheet, portrait: img('brenn.png') } });
    expect(await run(host, npc({ note: 'Wirt', size: 2 }))).toMatchObject({ ok: true, data: { updated: false, scene: 's1' } });
    expect(sc.tokens[0]).toMatchObject({ name: 'Brenn', note: 'Wirt', size: 2, kind: 'npc', img: 'data:tok-brenn.png', src: 'pnp:brenn' });
    await run(host, npc({ note: 'Wirt, nervös', size: 2 }));
    expect(sc.tokens).toHaveLength(1);
    expect(sc.tokens[0].note).toBe('Wirt, nervös');
  });

  it('NPC ohne Karte und unbekannte Rolle: klare Fehlermeldung', async () => {
    const { host } = fakeHost();
    expect(await run(host, { kind: 'character', payload: { id: 'x', role: 'npc', name: 'X', sheet: {} } })).toMatchObject({ ok: false, error: expect.stringContaining('Keine Karte') });
    expect(await run(host, { kind: 'character', payload: { id: 'x', role: 'dragon', name: 'X', sheet: {} } })).toMatchObject({ ok: false, error: expect.stringContaining('Unbekannte Rolle') });
  });
});

describe('Karte mit Charakteren (Token gehören zu ihrem Gegner)', () => {
  type Tok = { x: number; y: number; kind: 'pc' | 'npc' | 'enemy'; label?: string; character?: string };
  const sceneP = (tokens: Tok[], over: object = {}) => ({
    kind: 'scene' as const,
    payload: {
      id: 'taverne', name: 'Taverne', image: img('taverne.png'), width: 1344, height: 864,
      grid: { type: 'square' as const, size: 56, offsetX: 0, offsetY: 0, unitsPerCell: 6, unit: 'ft' }, tokens, ...over,
    },
  });
  const enemy = (id: string, sheet: Record<string, unknown>) => ({ kind: 'character' as const, payload: { id, role: 'enemy', name: 'Hafen-Schläger', sheet, scene: 'taverne', portrait: img('b.png') } });

  it('meldet, dass Token an Charaktere gebunden werden können', () => {
    expect(pnpProfile('t').push.scene).toMatchObject({ tokens: true, characterTokens: true });
  });

  it('Karte zuerst, Gegner danach: die Token des Gegners werden mit seinem Kampf-NPC verknüpft (Goons: alle Token, eine Gruppe)', async () => {
    const { host, session, log } = fakeHost();
    await run(host, sceneP([
      { x: 2, y: 2, kind: 'enemy', label: 'Hafen-Schläger', character: 'brute' },
      { x: 3, y: 2, kind: 'enemy', label: 'Hafen-Schläger', character: 'brute' },
      { x: 9, y: 4, kind: 'npc', label: 'Ein Fass' },
    ]));
    const sc = session.scenes[0];
    expect(sc.tokens.map((t) => t.src)).toEqual(['pnp:brute', 'pnp:brute', undefined]); // Herkunft gemerkt, noch nicht verknüpft
    expect(sc.tokens[0].npcId).toBeUndefined();

    const r = await run(host, enemy('brute', { tier: 'goon', count: 1, level: 0 }));
    expect(r).toMatchObject({ ok: true, data: { updated: false } });
    const npc = session.combat.npcs[0];
    expect(npc).toMatchObject({ src: 'pnp:brute', type: 'goon', count: 2 }); // zwei Token auf der Karte: die Gruppe hat mindestens zwei Mitglieder
    expect(sc.tokens.filter((t) => t.npcId === npc.id)).toHaveLength(2);
    expect(sc.tokens[0]).toMatchObject({ img: 'data:tok-b.png', npcId: npc.id });
    expect(sc.tokens.slice(0, 2).map((t) => t.name)).toEqual(['Hafen-Schläger 1', 'Hafen-Schläger 2']); // wie die Goons der VTT sonst: durchnummeriert
    expect(sc.tokens[2].npcId).toBeUndefined(); // der einfache Marker bleibt einer
    expect(log).toContain('commit');
  });

  it('Gegner schon da, dann die Karte (oder die Karte erneut): Token werden gleich verknüpft', async () => {
    const { host, session } = fakeHost();
    await run(host, enemy('brute', { tier: 'schlaeger', level: 2, bonus: 2 }));
    await run(host, sceneP([{ x: 2, y: 2, kind: 'enemy', character: 'brute', label: 'Hafen-Schläger' }]));
    const npc = session.combat.npcs[0];
    expect(session.scenes[0].tokens[0]).toMatchObject({ npcId: npc.id, img: 'data:tok-b.png' });
    // die Karte erneut senden ersetzt Token, der Kampfstand des Gegners bleibt
    npc.hits = 1;
    await run(host, sceneP([{ x: 4, y: 4, kind: 'enemy', character: 'brute', label: 'Hafen-Schläger' }]));
    expect(session.scenes).toHaveLength(1);
    expect(session.scenes[0].tokens[0]).toMatchObject({ npcId: npc.id });
    expect(session.combat.npcs).toHaveLength(1);
  });

  it('Boss und Nemesis stehen so groß (2x2) auf der Karte wie beim Aufstellen im Menü; Schläger und Goons bleiben 1x1', async () => {
    const { host, session } = fakeHost();
    await run(host, sceneP([
      { x: 4, y: 4, kind: 'enemy', character: 'chef', label: 'Der Kapitän' },
      { x: 8, y: 4, kind: 'enemy', character: 'brute', label: 'Hafen-Schläger' },
    ]));
    const sc = session.scenes[0];
    const g = sc.grid.size;
    const before = sc.tokens.map((t) => ({ x: t.x, y: t.y }));
    await run(host, enemy('chef', { tier: 'boss', level: 8, bonus: 6 }));
    await run(host, enemy('brute', { tier: 'schlaeger', level: 2, bonus: 2 }));
    expect(sc.tokens[0]).toMatchObject({ size: 2, npcId: session.combat.npcs[0].id });
    // die linke obere Zelle bleibt: die Mitte liegt auf der Rasterkreuzung (halbes Feld nach rechts unten)
    expect(sc.tokens[0].x).toBeCloseTo(before[0].x + g / 2, 0);
    expect(sc.tokens[0].y).toBeCloseTo(before[0].y + g / 2, 0);
    expect(sc.tokens[1]).toMatchObject({ size: 1, x: before[1].x, y: before[1].y });
    // eine vom SL geänderte Größe bleibt bei einer erneuten Sendung
    sc.tokens[0].size = 3;
    await run(host, enemy('chef', { tier: 'boss', level: 9, bonus: 6 }));
    expect(sc.tokens[0].size).toBe(3);
  });

  it('Boss: Gegner schon da, dann die Karte: der Token kommt gleich in der Bossgröße an', async () => {
    const { host, session } = fakeHost();
    await run(host, enemy('chef', { tier: 'nemesis', level: 10, bonus: 8 }));
    await run(host, sceneP([{ x: 4, y: 4, kind: 'enemy', character: 'chef', label: 'Der Kapitän' }]));
    const t = session.scenes[0].tokens[0];
    expect(t).toMatchObject({ size: 2, npcId: session.combat.npcs[0].id });
    expect(t.x).toBe(Math.round((4 + 1) * session.scenes[0].grid.size)); // Rasterkreuzung, nicht Feldmitte
  });

  it('NPC: der mit der Karte gesendete Token wird aktualisiert, es entsteht kein zweiter', async () => {
    const { host, session } = fakeHost();
    await run(host, sceneP([{ x: 5, y: 3, kind: 'npc', label: 'Hinter dem Tresen', character: 'brenn' }]));
    const r = await run(host, { kind: 'character', payload: { id: 'brenn', role: 'npc', name: 'Brenn', sheet: { note: 'Wirt', size: 2 }, scene: 'taverne', portrait: img('brenn.png') } });
    expect(r).toMatchObject({ ok: true, data: { updated: true, scene: 'taverne' } });
    const sc = session.scenes[0];
    expect(sc.tokens).toHaveLength(1);
    expect(sc.tokens[0]).toMatchObject({ name: 'Hinter dem Tresen', note: 'Wirt', size: 2, img: 'data:tok-brenn.png', src: 'pnp:brenn' }); // der Name des SL bleibt
  });

  it('NPC ohne Token auf der Karte wird auf die genannte Karte gesetzt, nicht auf die aktive', async () => {
    const { host, session } = fakeHost();
    await run(host, sceneP([], { id: 'taverne' }));
    await run(host, sceneP([], { id: 'keller', name: 'Keller', activate: true }));
    expect(session.activeScene).toBe('keller');
    const r = await run(host, { kind: 'character', payload: { id: 'brenn', role: 'npc', name: 'Brenn', sheet: {}, scene: 'taverne' } });
    expect(r).toMatchObject({ ok: true, data: { scene: 'taverne' } });
  });
});

describe('Musik', () => {
  it('Titelliste enthält mitgelieferte und eigene Titel', async () => {
    const { host } = fakeHost({ tracks: [{ id: 'mine', title: 'Mein Kampfthema', hash: 'abc' }] });
    const r = await handleMessage(host, { t: 'request', id: 'r1', what: 'tracks' });
    expect(r).toMatchObject({ ok: true, data: [{ id: 'killers', uploaded: false, category: 'Kampf' }, { id: 'sneaky', uploaded: false }, { id: 'mine', title: 'Mein Kampfthema', uploaded: true }] });
  });

  it('spielt per Id (auch eigene Uploads) oder Stimmung, stoppt, und meldet Unpassendes', async () => {
    const { host, log } = fakeHost({ tracks: [{ id: 'mine', title: 'Mein Thema', hash: 'abc' }] });
    await run(host, { kind: 'music_cue', payload: { action: 'play', trackId: 'mine' } });
    await run(host, { kind: 'music_cue', payload: { action: 'play', mood: 'combat chase' } });
    await run(host, { kind: 'music_cue', payload: { action: 'play', mood: 'Schleichen im Dunkeln' } });
    await run(host, { kind: 'music_cue', payload: { action: 'stop' } });
    expect(log.filter((l) => /^(play|stop)/.test(l))).toEqual(['play mine', 'play killers', 'play sneaky', 'stop']);
    expect(await run(host, { kind: 'music_cue', payload: { action: 'play', mood: 'zzz qqq' } })).toMatchObject({ ok: false, error: expect.stringContaining('Stimmung') });
    expect(await run(host, { kind: 'music_cue', payload: { action: 'play', trackId: 'nope' } })).toMatchObject({ ok: false, error: expect.stringContaining('nope') });
  });

  it('pickByMood bevorzugt Kategorie/Tag vor dem Titel', () => {
    const t = [{ id: 'a', title: 'Kampf der Titanen', category: 'Ruhe' }, { id: 'b', title: 'Stille', category: 'Kampf', tag: 'combat' }];
    expect(pickByMood('kampf', t as never)?.id).toBe('b');
    expect(pickByMood('', t as never)).toBeUndefined();
  });
});

describe('Nachrichten', () => {
  it('welcome braucht keine Antwort', async () => {
    expect(await handleMessage(fakeHost().host, { t: 'welcome', protocol: 1, app: 'pennodepaper', campaign: 'X' })).toBeNull();
  });
});

describe('Spielergruppe (Meldung an PenNodePaper)', () => {
  const player = (id: string, over: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({ id, name: `Spieler ${id}`, connected: true, lastSeen: 0, character: newCharacter(over as never), ...extra });

  it('meldet Konzept, Attribute, Ressourcen, Tags, Moves und Waffen im Aufbau der Rolle „pc“', () => {
    const c = newCharacter({ name: 'Jin Yamada', concept: 'Ex-Kurier', player: 'Sam' });
    c.attributes.gewalt = 3;
    c.tags.push({ id: 't1', name: 'Narbe', size: 'klein' });
    c.moves.push({ id: 'm1', name: 'Würgegriff', attr: 'gewalt', text: 'Hält fest.' } as never);
    const [pc] = partyList({ players: [{ id: 'p1', name: 'Sam', connected: false, local: true, lastSeen: 0, character: c }] });
    expect(pc).toMatchObject({ id: 'p1', role: 'pc', name: 'Jin Yamada', playerName: 'Sam', online: true });
    expect(pc.sheet).toMatchObject({ concept: 'Ex-Kurier', gewalt: 3, tags: ['Narbe'], moves: [{ name: 'Würgegriff', text: 'Hält fest.' }] });
    // jeder gemeldete Schlüssel kommt in der Rolle vor
    const keys = new Set(pnpProfile('t').characters.roles.find((r) => r.id === 'pc')!.fields.map((f) => f.key));
    for (const k of Object.keys(pc.sheet)) expect(keys.has(k)).toBe(true);
  });

  it('lässt Spieler ohne Charakter weg und wandelt das Porträt in ein Bild um', () => {
    const withPortrait = player('a', { name: 'Mia', portrait: 'data:image/png;base64,AAAA' });
    const none = { id: 'b', name: 'Leer', connected: true, lastSeen: 0, character: null };
    const list = partyList({ players: [withPortrait, none] as never });
    expect(list.map((c) => c.name)).toEqual(['Mia']);
    expect(list[0].portrait).toEqual({ name: 'portrait.png', mime: 'image/png', b64: 'AAAA' });
  });

  it('beantwortet die Anfrage „party“; ohne laufende Runde mit einer klaren Fehlermeldung', async () => {
    const { host, session } = fakeHost();
    (session as { players?: unknown }).players = [player('a', { name: 'Mia' })];
    const ok = await handleMessage(host, { t: 'request', id: 'r1', what: 'party' });
    expect(ok).toMatchObject({ ok: true, data: [{ id: 'a', name: 'Mia' }] });
    host.session = () => { throw new Error('Keine laufende Runde'); };
    expect(await handleMessage(host, { t: 'request', id: 'r2', what: 'party' })).toMatchObject({ ok: false, error: expect.stringContaining('Keine laufende Runde') });
  });

  it('nimmt keine Spielercharaktere per Push an', async () => {
    expect(await run(fakeHost().host, { kind: 'character', payload: { id: 'x', role: 'pc', name: 'X', sheet: {} } })).toMatchObject({ ok: false, error: expect.stringContaining('Spieler') });
  });
});
