// Regeldaten aus data/ (einzige Quelle für alle Tools).
import tabellen from '@data/tabellen.json';
import epKatalog from '@data/ep-katalog.json';
import waffen from '@data/waffen.json';
import moves from '@data/moves.json';
import npc from '@data/npc.json';
import tags from '@data/tags.json';

export type AttrKey = 'fluss' | 'praezision' | 'gewalt' | 'instinkt' | 'fokus';
export type ZoneKey = 'kopf' | 'torso' | 'armL' | 'armR' | 'beinL' | 'beinR';

export const ATTR_KEYS = tabellen.attribute.map((a) => a.key) as AttrKey[];
export const ZONE_KEYS = tabellen.zonen.map((z) => z.key) as ZoneKey[];

export const rules = { tabellen, epKatalog, waffen, moves, npc, tags };
export const RULES_VERSION: string = tabellen.rules_version;
