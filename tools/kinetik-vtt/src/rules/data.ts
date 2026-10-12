// Regeldaten aus data/ (einzige Quelle für alle Tools). Die deutschen Dateien sind die Grundlage (Ids, Zahlen, Texte);
// data/i18n/<sprache>/*.json enthält nur übersetzte Texte in derselben Form (Listen elementweise, bei Objekten mit "id"/"key"
// dieselben Ids). Beim Laden wird die Übersetzung der aktuellen Sprache eingemischt, Zahlen und Ids bleiben unberührt.
import tabellen from '@data/tabellen.json';
import epKatalog from '@data/ep-katalog.json';
import waffen from '@data/waffen.json';
import moves from '@data/moves.json';
import npc from '@data/npc.json';
import tags from '@data/tags.json';
import enTabellen from '@data/i18n/en/tabellen.json';
import enEpKatalog from '@data/i18n/en/ep-katalog.json';
import enWaffen from '@data/i18n/en/waffen.json';
import enMoves from '@data/i18n/en/moves.json';
import enNpc from '@data/i18n/en/npc.json';
import enTags from '@data/i18n/en/tags.json';
import { getLocale, type Locale } from '../i18n/locale';

export type AttrKey = 'fluss' | 'praezision' | 'gewalt' | 'instinkt' | 'fokus';
export type ZoneKey = 'kopf' | 'torso' | 'armL' | 'armR' | 'beinL' | 'beinR';

export const ATTR_KEYS = tabellen.attribute.map((a) => a.key) as AttrKey[];
export const ZONE_KEYS = tabellen.zonen.map((z) => z.key) as ZoneKey[];

/** Mischt eine Übersetzung in die Grundlage: nur Texte werden ersetzt, Listen elementweise, fehlende Stellen bleiben deutsch. */
export function overlay<T>(base: T, over: unknown): T {
  if (over === undefined || over === null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return base;
    return base.map((b, i) => overlay(b, over[i])) as T;
  }
  if (base && typeof base === 'object') {
    if (typeof over !== 'object') return base;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of Object.keys(over as object)) {
      if (k in out) out[k] = overlay(out[k], (over as Record<string, unknown>)[k]);
    }
    return out as T;
  }
  return (typeof base === 'string' && typeof over === 'string' ? over : base) as T;
}

const OVERLAYS: Partial<Record<Locale, { tabellen: unknown; epKatalog: unknown; waffen: unknown; moves: unknown; npc: unknown; tags: unknown }>> = {
  en: { tabellen: enTabellen, epKatalog: enEpKatalog, waffen: enWaffen, moves: enMoves, npc: enNpc, tags: enTags },
};

export function buildRules(locale: Locale) {
  const o = OVERLAYS[locale];
  if (!o) return { tabellen, epKatalog, waffen, moves, npc, tags };
  return {
    tabellen: overlay(tabellen, o.tabellen),
    epKatalog: overlay(epKatalog, o.epKatalog),
    waffen: overlay(waffen, o.waffen),
    moves: overlay(moves, o.moves),
    npc: overlay(npc, o.npc),
    tags: overlay(tags, o.tags),
  };
}

export const rules = buildRules(getLocale());
export const RULES_VERSION: string = tabellen.rules_version;
