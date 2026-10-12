import { afterEach, describe, expect, it } from 'vitest';
import { buildRules } from '../src/rules/data';
import { canonicalTag, canonicalPrice, priceLabel, tagLabel, tagSize, sameTag } from '../src/rules/tagid';
import { setLocaleForTests } from '../src/i18n';

/** Ersetzt alle Texte durch denselben Platzhalter: übrig bleiben Form, Zahlen, Wahrheitswerte. */
const mask = (v: unknown): unknown => {
  if (typeof v === 'string') return '<text>';
  if (Array.isArray(v)) return v.map(mask);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mask(x)]));
  return v;
};
/** Alle Werte der Felder id/key/mw (Kennungen) samt Pfad. */
const ids = (v: unknown, path = ''): string[] => {
  if (Array.isArray(v)) return v.flatMap((x, i) => ids(x, `${path}[${i}]`));
  if (v && typeof v === 'object') {
    return Object.entries(v).flatMap(([k, x]) =>
      ['id', 'key', 'mw', 'klasse', 'folge', 'attribut', 'profil', 'schliesstAus', 'rules_version'].includes(k) && (typeof x !== 'object' || Array.isArray(x) && x.every((y) => typeof y !== 'object'))
        ? [`${path}.${k}=${JSON.stringify(x)}`]
        : ids(x, `${path}.${k}`));
  }
  return [];
};

const de = buildRules('de');
const en = buildRules('en');

afterEach(() => setLocaleForTests('de'));

describe('Regeldaten auf Englisch (data/i18n/en)', () => {
  it('Zahlen, Form und Kennungen bleiben wie in der Grundlage', () => {
    expect(mask(en)).toEqual(mask(de));
    expect(ids(en)).toEqual(ids(de));
    expect(en.moves.moves.map((m) => m.ep)).toEqual(de.moves.moves.map((m) => m.ep));
  });
  it('Texte sind übersetzt', () => {
    expect(en.tabellen.attribute.map((a) => a.name)).toEqual(['Flow', 'Precision', 'Force', 'Instinct', 'Focus']);
    expect(en.tabellen.attribute[0].kurz).toBe('FLO');
    expect(en.tabellen.zonen.map((z) => z.kurz)).toEqual(['Head', 'Torso', 'L-Arm', 'R-Arm', 'L-Leg', 'R-Leg']);
    expect(en.tabellen.zonen[0].folge).toBe('sterbend');
    expect(en.tabellen.mw.map((m) => m.name)).toEqual(['Standard', 'Demanding', 'Hard', 'Heroic', 'Legendary']);
    expect(en.tabellen.legendaerePreise[0].name).toBe('Winded');
    expect(en.waffen.waffen.find((w) => w.id === 'pistole')?.name).toBe('Pistol');
    expect(en.waffen.waffen.find((w) => w.id === 'sturmgewehr')?.name).toBe('Assault rifle');
    expect(en.waffen.waffen.find((w) => w.id === 'sturmgewehr')?.klasse).toBe('schwer');
    expect(en.waffen.munition.nachladenTag).toBe('Reloading');
    expect(en.epKatalog.effekte.find((e) => e.id === 'zone')?.name).toBe('Choose Zone');
    expect(en.moves.moves.find((m) => m.id === 'judo-wurf')?.name).toBe('Judo Throw');
    expect(en.moves.moves.find((m) => m.id === 'lingshu-nervenstoss')?.name).toBe('Lingshu Nerve Strike');
    expect(en.npc.leiter.map((n) => n.name)).toEqual(['Goon', 'Thug', 'Elite', 'Boss', 'Nemesis']);
    // Keine deutschen Reste in den Namen (Umlaute und ß gibt es im Englischen nicht)
    const names = [...en.waffen.waffen, ...en.moves.moves, ...en.epKatalog.effekte, ...en.npc.leiter].map((x) => x.name);
    expect(names.filter((n) => /[äöüÄÖÜß]/.test(n))).toEqual([]);
  });
  it('Tag-Listen sind elementweise übersetzt', () => {
    expect(en.tags.klein).toHaveLength(de.tags.klein.length);
    expect(en.tags.gross).toHaveLength(de.tags.gross.length);
    expect(en.tags.klein[de.tags.klein.indexOf('Gelähmt')]).toBe('Paralyzed');
    expect(en.tags.gross).toEqual(['Stunned', 'Immobilized', 'Choked', 'Joint Locked']);
    expect(en.tags.zustaende).toHaveLength(de.tags.zustaende.length);
  });
  it('Tags und Preise gelten über Sprachen hinweg (deutsche Namen als Kennung)', () => {
    expect(canonicalTag('Paralyzed')).toBe('Gelähmt');
    expect(canonicalTag('paralyzed ')).toBe('Gelähmt');
    expect(canonicalTag('Gelähmt')).toBe('Gelähmt');
    expect(canonicalTag('Eigener Tag')).toBe('Eigener Tag');
    expect(sameTag('Reloading', 'Nachladen')).toBe(true);
    expect(tagSize('Choked')).toBe('gross');
    expect(tagSize('Prone')).toBe('klein');
    expect(canonicalPrice('Winded')).toBe('Ausgepumpt');
    expect(canonicalPrice('Debt/Reputation')).toBe('Schuld/Ruf');
    setLocaleForTests('de');
    expect(tagLabel('Gelähmt')).toBe('Gelähmt');
    expect(tagLabel('Paralyzed')).toBe('Gelähmt');
    expect(priceLabel('Scar')).toBe('Narbe');
    setLocaleForTests('en');
    expect(tagLabel('Gelähmt')).toBe('Paralyzed');
    expect(priceLabel('Narbe')).toBe('Scar');
  });
});
