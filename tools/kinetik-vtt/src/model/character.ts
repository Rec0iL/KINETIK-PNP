// Datenmodell des Charakterbogens. Abgeleitete Werte werden nie gespeichert, nur Überschreibungen (`overrides`).
import type { AttrKey, ZoneKey, Title, MoveSpec, Poison, AmmoState } from '../rules';
import { ATTR_KEYS, ZONE_KEYS } from '../rules';

export const SCHEMA_VERSION = 1;

export type Stufe = 'strasse' | 'kino' | 'legende' | 'custom';

/** Eigene Kampagnenstufe: der Tisch legt die Budgets selbst fest. */
export interface CustomStufe { attributBudget: number; titelBudget: number; startLevelMax: number }

export interface Injury { text: string }
export interface TagEntry {
  id: string;
  name: string;
  size: 'klein' | 'gross';
  note?: string;
  /** Bleibt bei kurzer Rast bestehen (z.B. Narbe als dauerhafter Tag). */
  permanent?: boolean;
}
export interface TextEntry { id: string; text: string }
export interface Move extends MoveSpec {
  id: string;
  name: string;
  /** Zugehöriger Titel (Meisterschaft und Level). */
  titleId?: string;
  /** Gift-Moves: Runden bis das Gift wirkt (0 bis 3), legt der Anwender beim Erstellen fest (3.11). */
  giftDelay?: number;
  attr: AttrKey;
  text: string;
  /** Legendäre Moves: 1 bis 2 gewählte Preise. */
  prices?: string[];
  /** Manuelle Kosten (überschreiben die Berechnung). */
  costOverride?: { energie?: number; momentum?: number };
  /** Aus dieser Vorlage erzeugt (data/moves.json). */
  templateId?: string;
  note?: string;
}
export interface Weapon {
  id: string;
  name: string;
  klasse: 'leicht' | 'schwer' | 'explosiv' | 'frei';
  ep: number;
  profilText: string;
  durchschlag: number;
  note?: string;
  templateId?: string;
  /** Magazin und Vorrat (optionales Munitionstracking, 2.5). */
  mag?: AmmoState;
}
export interface InventoryItem { id: string; name: string; qty: number; note?: string }
export interface NoteEntry { id: string; title: string; text: string }
export interface CustomField { id: string; label: string; value: string }

export interface Character {
  schemaVersion: number;
  id: string;
  name: string;
  alias: string;
  player: string;
  concept: string;
  /** Verkleinertes Bild als Data-URL. */
  portrait?: string;
  stufe: Stufe;
  customStufe: CustomStufe;
  /** Noch in der Charaktererschaffung (Assistent oder manuell). */
  draft: boolean;
  naturtalent: boolean;
  /** Munitionstracking (2.5, optional): Magazin mitzählen, Vorrat als zweite Stufe. */
  munition?: { track: boolean; vorrat: boolean };
  setting: string;
  attributes: Record<AttrKey, number>;
  titles: Title[];
  resources: {
    energie: number;
    wk: number;
    momentum: number;
    schutz: { type: string; current: number; max: number };
  };
  injuries: Record<ZoneKey, Injury[]>;
  /** Verbleibende Runden bis zum Tod, wenn sterbend (3.11). */
  dying: number | null;
  /** Das Sterbend-Fenster kommt von tödlichem Gift (nicht von Verletzungen), endet mit Stabilisieren oder Gegenmittel. */
  dyingGift?: boolean;
  /** Aktive Gifte mit Verzögerung und Wirkrunden (3.11). */
  poisons: Poison[];
  tags: TagEntry[];
  scars: TextEntry[];
  disadvantages: TextEntry[];
  moves: Move[];
  weapons: Weapon[];
  inventory: InventoryItem[];
  notes: NoteEntry[];
  customFields: CustomField[];
  /** Überschriebene abgeleitete Werte: energieMax, wkMax, momentumCap, passiv. */
  overrides: Partial<Record<OverrideKey, number>>;
  created: number;
  updated: number;
}

export type OverrideKey = 'energieMax' | 'wkMax' | 'momentumCap' | 'passiv';

export const uid = (): string =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).slice(0, 36);

export function emptyInjuries(): Record<ZoneKey, Injury[]> {
  return Object.fromEntries(ZONE_KEYS.map((z) => [z, [] as Injury[]])) as Record<ZoneKey, Injury[]>;
}

export function newCharacter(partial: Partial<Character> = {}): Character {
  const now = Date.now();
  const attributes = Object.fromEntries(ATTR_KEYS.map((k) => [k, 0])) as Record<AttrKey, number>;
  return {
    schemaVersion: SCHEMA_VERSION,
    id: uid(),
    name: 'Neuer Charakter',
    alias: '',
    player: '',
    concept: '',
    stufe: 'kino',
    customStufe: { attributBudget: 4, titelBudget: 4, startLevelMax: 3 },
    draft: false,
    naturtalent: false,
    setting: '',
    attributes,
    titles: [],
    resources: { energie: 6, wk: 6, momentum: 0, schutz: { type: '', current: 0, max: 0 } },
    injuries: emptyInjuries(),
    dying: null,
    poisons: [],
    tags: [],
    scars: [],
    disadvantages: [],
    moves: [],
    weapons: [],
    inventory: [],
    notes: [{ id: uid(), title: 'Notizen', text: '' }],
    customFields: [],
    overrides: {},
    created: now,
    updated: now,
    ...partial,
  };
}

export function newTitle(partial: Partial<Title> = {}): Title {
  return { id: uid(), name: 'Neuer Titel', level: 1, domains: [], leadAttrs: ['fluss', 'praezision'], ...partial };
}
