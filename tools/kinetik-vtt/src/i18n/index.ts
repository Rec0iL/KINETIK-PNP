import { de, type Key } from './de';
import { en } from './en';
import { BCP47, getLocale, type Locale } from './locale';

const dicts: Record<Locale, Record<string, string>> = { de, en };

/** Übersetzt einen Schlüssel in die Sprache der App, ersetzt {name}-Platzhalter. Fehlt ein Text, gilt der deutsche, dann der Schlüssel. */
export function t(key: Key, params?: Record<string, string | number>): string {
  let s = dicts[getLocale()][key] ?? dicts.de[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/** Basisschlüssel von Mehrzahlformen: 'x.other' (und 'x.one') -> 'x'. */
export type PluralKey = Key extends infer K ? (K extends `${infer B}.other` ? B : never) : never;

/** Mehrzahl: wählt `<key>.one` oder `<key>.other` nach den Regeln der Sprache und setzt {n}. */
export function tn(key: PluralKey, n: number, params?: Record<string, string | number>): string {
  const cat = new Intl.PluralRules(BCP47[getLocale()]).select(n);
  const k = `${key}.${cat === 'one' ? 'one' : 'other'}` as Key;
  const has = (dicts[getLocale()][k] ?? dicts.de[k]) !== undefined;
  return t(has ? k : (`${key}.other` as Key), { n, ...params });
}

const loc = () => BCP47[getLocale()];
export const fmtNumber = (n: number, opts?: Intl.NumberFormatOptions) => n.toLocaleString(loc(), opts);
export const fmtDate = (d: Date | number, opts?: Intl.DateTimeFormatOptions) => new Date(d).toLocaleDateString(loc(), opts);
export const fmtTime = (d: Date | number, opts?: Intl.DateTimeFormatOptions) => new Date(d).toLocaleTimeString(loc(), opts);
export const fmtDateTime = (d: Date | number, opts?: Intl.DateTimeFormatOptions) => new Date(d).toLocaleString(loc(), opts);

export type { Key };
export { getLocale, LOCALES, LOCALE_LABEL, changeLocale, setLocaleForTests, type Locale } from './locale';
