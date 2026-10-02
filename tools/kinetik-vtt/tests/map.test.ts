import { describe, expect, it } from 'vitest';
import { applyMapOp, forPlayers, measure, newScene, snapToGrid, MAX_FOG_OPS, type Token } from '../src/map/mapstate';

const tok = (id: string, hidden = false): Token => ({ id, name: id, x: 10, y: 10, size: 1, color: '#fff', kind: 'npc', hidden });

describe('Karten-Zustand', () => {
  it('Token anlegen, bewegen, löschen erhöht rev', () => {
    const m = newScene('s', 'Test', null, 1000, 800);
    const r0 = m.rev;
    expect(applyMapOp(m, { op: 'tok', token: tok('a') })).toBe(true);
    expect(applyMapOp(m, { op: 'tokmove', id: 'a', x: 50, y: 60 })).toBe(true);
    expect(m.tokens[0]).toMatchObject({ x: 50, y: 60 });
    expect(applyMapOp(m, { op: 'tokmove', id: 'zzz', x: 0, y: 0 })).toBe(false);
    applyMapOp(m, { op: 'tokdel', id: 'a' });
    expect(m.tokens).toHaveLength(0);
    expect(m.rev).toBeGreaterThan(r0);
  });
  it('Spieler sehen keine versteckten Tokens', () => {
    const m = newScene('s', 'Test', null, 1000, 800);
    applyMapOp(m, { op: 'tok', token: tok('a') });
    applyMapOp(m, { op: 'tok', token: tok('b', true) });
    expect(forPlayers(m)!.tokens.map((t) => t.id)).toEqual(['a']);
    expect(m.tokens).toHaveLength(2);
  });
  it('Nebel-Operationen sind begrenzt', () => {
    const m = newScene('s', 'Test', null, 1000, 800);
    for (let i = 0; i < MAX_FOG_OPS + 25; i++) applyMapOp(m, { op: 'fog+', fog: { m: 'reveal', s: { t: 'circle', x: i, y: 0, r: 5 } } });
    expect(m.fog.ops).toHaveLength(MAX_FOG_OPS);
    applyMapOp(m, { op: 'fog=', enabled: true, ops: [] });
    expect(m.fog).toEqual({ enabled: true, ops: [] });
  });
  it('Messen und Einrasten', () => {
    const m = newScene('s', 'Test', null, 1000, 800);
    m.grid.size = 50;
    m.grid.unitsPerCell = 1.5;
    expect(measure(m.grid, [0, 0], [150, 100])).toEqual({ cells: 3, units: 4.5 });
    expect(snapToGrid(m.grid, 123, 77, 1)).toEqual([125, 75]);
    expect(snapToGrid(m.grid, 123, 77, 2)).toEqual([100, 100]);
  });
});

import { bestClockOffset, defaultMusic, expectedPosition } from '../src/music/clock';

describe('Musik-Uhr', () => {
  const st = { ...defaultMusic(), playing: true, anchorGm: 10_000, anchorPos: 5 };
  it('Position läuft mit der SL-Uhr', () => {
    expect(expectedPosition(st, 10_000)).toBe(5);
    expect(expectedPosition(st, 12_500)).toBeCloseTo(7.5);
    expect(expectedPosition({ ...st, playing: false }, 99_000)).toBe(5);
  });
  it('Schleife faltet, sonst Deckel bei der Dauer', () => {
    expect(expectedPosition({ ...st, loop: true }, 10_000 + 60_000, 30)).toBeCloseTo(5);
    expect(expectedPosition({ ...st, loop: false }, 10_000 + 60_000, 30)).toBe(30);
  });
  it('Uhrenversatz aus der Probe mit kleinster Laufzeit', () => {
    // Der SL hat gm=1520 gesendet, 20 ms (halbe Laufzeit) später kommt es lokal bei t=1000 an: Versatz 1520 + 20 - 1000.
    const samples = [
      { rtt: 200, gm: 1_300, localAtRecv: 1_000 },
      { rtt: 40, gm: 1_520, localAtRecv: 1_000 },
    ];
    expect(bestClockOffset(samples)).toBeCloseTo(540);
  });
});
