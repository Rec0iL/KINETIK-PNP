// JSON-Import/Export mit Validierung und Migration.
import { ATTR_KEYS, ZONE_KEYS, RULES_VERSION } from '../rules';
import { SCHEMA_VERSION, newCharacter, uid, type Character, type Move } from './character';

export interface CharacterFile {
  kinetik: 'character';
  schemaVersion: number;
  rulesVersion: string;
  exportedAt: string;
  character: Character;
}
export interface LibraryFile {
  kinetik: 'library';
  schemaVersion: number;
  rulesVersion: string;
  exportedAt: string;
  characters: Character[];
}

export class ImportError extends Error {}

export function exportCharacter(c: Character): CharacterFile {
  return {
    kinetik: 'character', schemaVersion: SCHEMA_VERSION, rulesVersion: RULES_VERSION,
    exportedAt: new Date().toISOString(), character: JSON.parse(JSON.stringify(c)),
  };
}

export function exportLibrary(cs: Character[]): LibraryFile {
  return {
    kinetik: 'library', schemaVersion: SCHEMA_VERSION, rulesVersion: RULES_VERSION,
    exportedAt: new Date().toISOString(), characters: JSON.parse(JSON.stringify(cs)),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Macht aus beliebigem JSON einen gültigen Charakter. Unbekannte Felder bleiben erhalten,
 * fehlende werden mit Standardwerten gefüllt, so überleben auch Teil-Exporte und ältere Versionen.
 */
export function sanitizeCharacter(raw: unknown, opts: { newId?: boolean } = {}): Character {
  if (!isObj(raw)) throw new ImportError('Der Inhalt ist kein Charakter.');
  const base = newCharacter();
  const c: Character = { ...base, ...(raw as Partial<Character>) };
  c.schemaVersion = SCHEMA_VERSION;
  c.id = opts.newId || !str(raw.id) ? uid() : str(raw.id);
  c.name = str(raw.name, 'Unbenannt');
  c.stufe = (['strasse', 'kino', 'legende', 'custom'] as const).includes(raw.stufe as never) ? (raw.stufe as Character['stufe']) : 'kino';
  const cs = isObj(raw.customStufe) ? raw.customStufe : {};
  c.customStufe = {
    attributBudget: Math.max(0, Math.round(num(cs.attributBudget, 4))),
    titelBudget: Math.max(0, Math.round(num(cs.titelBudget, 4))),
    startLevelMax: Math.max(1, Math.min(10, Math.round(num(cs.startLevelMax, 3)))),
  };
  c.draft = raw.draft === true;
  const attrs = isObj(raw.attributes) ? raw.attributes : {};
  c.attributes = Object.fromEntries(ATTR_KEYS.map((k) => [k, Math.round(num(attrs[k], 0))])) as Character['attributes'];
  const inj = isObj(raw.injuries) ? raw.injuries : {};
  c.injuries = Object.fromEntries(
    ZONE_KEYS.map((z) => [z, arr<{ text?: unknown }>(inj[z]).map((i) => ({ text: str(i?.text) }))]),
  ) as Character['injuries'];
  const res = isObj(raw.resources) ? raw.resources : {};
  const sch = isObj(res.schutz) ? res.schutz : {};
  c.resources = {
    energie: num(res.energie, base.resources.energie),
    wk: num(res.wk, base.resources.wk),
    momentum: Math.max(0, num(res.momentum, 0)),
    schutz: { type: str(sch.type), current: num(sch.current, 0), max: num(sch.max, 0) },
  };
  c.titles = arr<Character['titles'][number]>(raw.titles).map((t) => ({
    ...t,
    id: str(t.id) || uid(),
    name: str(t.name, 'Titel'),
    level: Math.max(0, Math.min(10, Math.round(num(t.level, 1)))),
    domains: arr<string>(t.domains).map(String),
    leadAttrs: ([t.leadAttrs?.[0], t.leadAttrs?.[1]].map((a, i) => (ATTR_KEYS.includes(a as never) ? a : ATTR_KEYS[i])) as [Character['titles'][number]['leadAttrs'][0], Character['titles'][number]['leadAttrs'][1]]),
  }));
  for (const k of ['tags', 'scars', 'disadvantages', 'moves', 'weapons', 'inventory', 'notes', 'customFields'] as const) {
    (c as unknown as Record<string, unknown>)[k] = arr<{ id?: string }>(raw[k]).map((e) => ({ ...e, id: e.id || uid() }));
  }
  c.overrides = isObj(raw.overrides) ? (raw.overrides as Character['overrides']) : {};
  c.dying = typeof raw.dying === 'number' ? raw.dying : null;
  c.created = num(raw.created, Date.now());
  c.updated = num(raw.updated, Date.now());
  return c;
}

/** Liest eine Datei (Charakter, Bibliothek oder rohes Charakter-Objekt) und liefert die Charaktere. */
export function parseImport(text: string, opts: { newIds?: boolean } = {}): Character[] {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ImportError('Die Datei ist kein gültiges JSON.');
  }
  if (isObj(json) && json.kinetik === 'library' && Array.isArray(json.characters)) {
    return json.characters.map((c) => sanitizeCharacter(c, { newId: opts.newIds }));
  }
  if (isObj(json) && json.kinetik === 'character' && json.character) {
    return [sanitizeCharacter(json.character, { newId: opts.newIds })];
  }
  if (isObj(json) && ('attributes' in json || 'titles' in json || 'name' in json)) {
    return [sanitizeCharacter(json, { newId: opts.newIds })];
  }
  throw new ImportError('Das ist keine KINETIK-Datei.');
}

export function fileNameFor(c: Pick<Character, 'name'>): string {
  const slug = c.name.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'charakter';
  return `kinetik-${slug}.json`;
}

export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- Moves als eigene JSON-Dateien (Move-Builder) ---
export interface MovesFile {
  kinetik: 'moves';
  schemaVersion: number;
  rulesVersion: string;
  exportedAt: string;
  moves: Move[];
}

export function exportMoves(moves: Move[]): MovesFile {
  return {
    kinetik: 'moves', schemaVersion: SCHEMA_VERSION, rulesVersion: RULES_VERSION,
    exportedAt: new Date().toISOString(), moves: JSON.parse(JSON.stringify(moves)),
  };
}

export function sanitizeMove(raw: unknown, opts: { newId?: boolean } = {}): Move {
  if (!isObj(raw)) throw new ImportError('Der Inhalt ist kein Move.');
  const effects = arr<{ id?: unknown; label?: unknown; ep?: unknown; stern?: unknown }>(raw.effects)
    .filter((e) => isObj(e) && typeof e.id === 'string')
    .map((e) => ({
      id: e.id as string,
      ...(typeof e.label === 'string' && e.label ? { label: e.label } : {}),
      ...(typeof e.ep === 'number' ? { ep: e.ep } : {}),
      ...(typeof e.stern === 'boolean' ? { stern: e.stern } : {}),
    }));
  const attr = ATTR_KEYS.includes(raw.attr as never) ? (raw.attr as Move['attr']) : 'fluss';
  const m: Move = {
    ...(raw as Partial<Move>),
    id: opts.newId || !str(raw.id) ? uid() : str(raw.id),
    name: str(raw.name, 'Move'),
    attr,
    text: str(raw.text),
    effects,
    deductions: arr<string>(raw.deductions).map(String),
  };
  return m;
}

export function parseMoveImport(text: string): Move[] {
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new ImportError('Die Datei ist kein gültiges JSON.'); }
  if (isObj(json) && json.kinetik === 'moves' && Array.isArray(json.moves)) return json.moves.map((m) => sanitizeMove(m, { newId: true }));
  if (isObj(json) && json.kinetik === 'move' && json.move) return [sanitizeMove(json.move, { newId: true })];
  if (isObj(json) && 'effects' in json) return [sanitizeMove(json, { newId: true })];
  throw new ImportError('Das ist keine KINETIK-Move-Datei.');
}
