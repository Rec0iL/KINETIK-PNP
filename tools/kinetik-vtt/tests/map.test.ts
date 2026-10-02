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
