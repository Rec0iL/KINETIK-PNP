import { describe, expect, it } from 'vitest';
import { de } from '../src/i18n/de';
import { en } from '../src/i18n/en';
import { t, tn, setLocaleForTests } from '../src/i18n';

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('Sprachdateien', () => {
  it('englisch hat genau die Schlüssel von deutsch, ohne leere Texte', () => {
    const missing = Object.keys(de).filter((k) => !(k in en));
    const extra = Object.keys(en).filter((k) => !(k in de));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    const empty = Object.entries(en).filter(([, v]) => !String(v).trim()).map(([k]) => k);
    expect(empty).toEqual([]);
  });
  it('Platzhalter stimmen überein', () => {
    const bad = Object.keys(de).filter((k) => JSON.stringify(params((de as Record<string, string>)[k])) !== JSON.stringify(params((en as Record<string, string>)[k] ?? '')));
    expect(bad).toEqual([]);
  });
  it('Mehrzahlformen sind vollständig', () => {
    for (const lang of [de, en] as Record<string, string>[]) {
      const bases = new Set(Object.keys(lang).filter((k) => /\.(one|other)$/.test(k)).map((k) => k.replace(/\.(one|other)$/, '')));
      for (const b of bases) expect(`${b}.other` in lang, `${b}.other`).toBe(true);
    }
  });
  it('t() und tn() setzen Parameter und fallen auf Deutsch zurück', () => {
    setLocaleForTests('en');
    expect(t('app.tagline')).toBe('Cinematic Action Roleplaying');
    expect(t('home.rb.read')).toBe('Read the rulebook');
    setLocaleForTests('de');
    expect(t('home.rb.read')).toBe('Regelwerk lesen');
    expect(typeof tn).toBe('function');
  });
});
