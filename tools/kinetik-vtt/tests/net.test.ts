import { describe, expect, it } from 'vitest';
import { applyPatch, describePatch } from '../src/model/patch';
import { vitalsOf } from '../src/model/vitals';
import { jinYamada } from '../src/model/examples';
import { formatCode, newRoomCode, normalizeCode, peerIdFor, ROOM_ALPHABET } from '../src/net/protocol';

describe('applyPatch', () => {
  it('Energie/WK werden auf 0 und Maximum begrenzt', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'add', key: 'energie', delta: -20 }]);
    expect(c.resources.energie).toBe(0);
    applyPatch(c, [{ op: 'add', key: 'energie', delta: 99 }]);
    expect(c.resources.energie).toBe(8);
    applyPatch(c, [{ op: 'set', key: 'momentum', value: 9 }]);
    expect(c.resources.momentum).toBe(3);
  });
  it('Verletzung: Schock -1 WK, zweite Kopfverletzung macht sterbend', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'injury', zone: 'kopf', text: 'Streifschuss' }, { op: 'injury', zone: 'kopf', text: 'Treffer' }]);
    expect(c.resources.wk).toBe(5);
    expect(c.dying).toBe(3);
    applyPatch(c, [{ op: 'heal', zone: 'kopf' }]);
    expect(c.dying).toBeNull();
    expect(c.injuries.kopf).toHaveLength(1);
  });
  it('mehr Verletzungen als Felder werden ignoriert', () => {
    const c = jinYamada();
    for (let i = 0; i < 4; i++) applyPatch(c, [{ op: 'injury', zone: 'armL', text: '' }]);
    expect(c.injuries.armL).toHaveLength(2);
  });
  it('Tags hinzufügen und entfernen, Schutz', () => {
    const c = jinYamada();
    applyPatch(c, [{ op: 'tag', name: 'Am Boden', size: 'klein' }, { op: 'add', key: 'schutz', delta: -1 }]);
    expect(c.tags[0].name).toBe('Am Boden');
    expect(c.resources.schutz.current).toBe(1);
    applyPatch(c, [{ op: 'untag', name: 'Am Boden' }]);
    expect(c.tags).toHaveLength(0);
  });
  it('Beschreibung', () => {
    expect(describePatch([{ op: 'add', key: 'wk', delta: -2 }, { op: 'tag', name: 'Geblendet', size: 'klein' }])).toBe('-2 Willenskraft, Tag: Geblendet');
  });
});

describe('Raumcode und Vitals', () => {
  it('Code hat 6 Zeichen aus dem Alphabet, Normalisierung verzeiht Tippfehler', () => {
    const code = newRoomCode();
    expect(code).toHaveLength(6);
    expect([...code].every((ch) => ROOM_ALPHABET.includes(ch))).toBe(true);
    expect(normalizeCode('kx7-f2q')).toBe('KX7F2Q');
    expect(formatCode('KX7F2Q')).toBe('KX7-F2Q');
    expect(peerIdFor('KX7F2Q')).toBe('kinetik-vtt-kx7f2q');
  });
  it('Vitals', () => {
    const v = vitalsOf(jinYamada());
    expect(v).toMatchObject({ energie: 8, energieMax: 8, wk: 7, wkMax: 7, momentumCap: 3, schutz: 2, injuries: 0 });
    expect(v.bonus.fluss).toBe(3);
  });
});
