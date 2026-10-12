// Tags und Preise werden in Charakteren und Sitzungen als Text gespeichert und mit Regeln verglichen ("Gelähmt", "Nachladen").
// Damit das über Sprachen hinweg funktioniert (ein deutscher Charakter in einer englischen Runde), gelten die deutschen Namen aus
// data/ als Kennung: canonicalTag("Paralyzed") === "Gelähmt". Angezeigt wird der Name der aktuellen Sprache (tagLabel).
import tagsDe from '@data/tags.json';
import tagsEn from '@data/i18n/en/tags.json';
import tabellenDe from '@data/tabellen.json';
import tabellenEn from '@data/i18n/en/tabellen.json';
import { getLocale, LOCALES, type Locale } from '../i18n/locale';

const norm = (s: string) => s.trim().toLowerCase();

/** Alle Namen (deutsche Grundlage plus Übersetzungen) je Kennung. */
const names = new Map<string, Partial<Record<Locale, string>>>();
const alias = new Map<string, string>();

function register(base: readonly string[] | undefined, locale: Locale, translated: readonly string[] | undefined) {
  (base ?? []).forEach((id, i) => {
    const entry = names.get(id) ?? { de: id };
    const name = locale === 'de' ? id : translated?.[i] ?? id;
    entry[locale] = name;
    names.set(id, entry);
    alias.set(norm(name), id);
    alias.set(norm(id), id);
  });
}

type TagFile = typeof tagsDe;
const lists = (f: Partial<TagFile> | Record<string, unknown>): Record<string, readonly string[]> => {
  const o = f as Partial<TagFile>;
  return {
    klein: o.klein ?? [], gross: o.gross ?? [], zustaende: o.zustaende ?? [],
    schleicherKlein: o.umgebung?.schleicherKlein ?? [], waechterKlein: o.umgebung?.waechterKlein ?? [], umgebungGross: o.umgebung?.gross ?? [],
  };
}
const de = lists(tagsDe);
const en = lists(tagsEn);
for (const key of Object.keys(de)) {
  for (const l of LOCALES) register(de[key], l, l === 'en' ? en[key] : undefined);
}

/** Preise legendärer Moves (tabellen.legendaerePreise) auf dieselbe Weise. */
const priceNames = new Map<string, Partial<Record<Locale, string>>>();
const priceAlias = new Map<string, string>();
tabellenDe.legendaerePreise.forEach((p, i) => {
  const en = (tabellenEn as { legendaerePreise?: { name?: string }[] }).legendaerePreise?.[i]?.name ?? p.name;
  priceNames.set(p.name, { de: p.name, en });
  priceAlias.set(norm(p.name), p.name);
  priceAlias.set(norm(en), p.name);
});

const GROSS = new Set([...(tagsDe.gross ?? [])]);

/** Kennung (deutscher Name) eines bekannten Tags in beliebiger Sprache, sonst der Name unverändert. */
export function canonicalTag(name: string): string {
  return alias.get(norm(name)) ?? name.trim();
}
export const sameTag = (a: string, b: string): boolean => canonicalTag(a) === canonicalTag(b);
/** Name des Tags in der Sprache der App (unbekannte Tags bleiben, wie sie sind). */
export function tagLabel(name: string): string {
  const id = alias.get(norm(name));
  return id ? names.get(id)?.[getLocale()] ?? id : name;
}
/** 'gross' für die großen Tags des Regelwerks (3.3), sonst 'klein'. */
export function tagSize(name: string): 'klein' | 'gross' {
  return GROSS.has(canonicalTag(name)) ? 'gross' : 'klein';
}

export function canonicalPrice(name: string): string {
  return priceAlias.get(norm(name)) ?? name.trim();
}
export function priceLabel(name: string): string {
  const id = priceAlias.get(norm(name));
  return id ? priceNames.get(id)?.[getLocale()] ?? id : name;
}

/** Kennungen der Tags, auf die Regeln reagieren. */
export const TAG = { paralyzed: 'Gelähmt', reloading: 'Nachladen', offBalance: 'Aus der Balance' } as const;
export const isTag = (name: string, id: (typeof TAG)[keyof typeof TAG]): boolean => canonicalTag(name) === id;
