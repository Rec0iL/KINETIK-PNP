// Prüft die Regeldaten in data/: gültiges JSON, Pflichtfelder, Verweise, EP-Summen der Beispiel-Moves.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const errors = [];
const err = (m) => errors.push(m);

const tab = read('tabellen.json');
const ep = read('ep-katalog.json');
const waffen = read('waffen.json');
const moves = read('moves.json');
const npc = read('npc.json');
const tags = read('tags.json');

for (const [n, d] of Object.entries({ tabellen: tab, 'ep-katalog': ep, waffen, moves, npc, tags })) {
  if (!d.rules_version) err(`${n}.json: rules_version fehlt`);
}
if (tab.meisterschaft.length !== 11) err('tabellen: meisterschaft braucht 11 Einträge (Level 0-10)');
for (let l = 0; l <= 10; l++) {
  if (tab.meisterschaft[l] !== Math.floor(l / 2)) err(`tabellen: Meisterschaft Level ${l} ist nicht floor(l/2)`);
}
if (tab.attribute.length !== 5) err('tabellen: 5 Attribute erwartet');
if (tab.zonen.length !== 6) err('tabellen: 6 Zonen erwartet');

const effekte = new Map(ep.effekte.map((e) => [e.id, e]));
const abzuege = new Map(ep.abzuege.map((a) => [a.id, a]));
for (const e of ep.effekte) {
  for (const x of e.schliesstAus ?? []) if (!effekte.has(x)) err(`ep-katalog: ${e.id} verweist auf unbekanntes ${x}`);
}

const attrKeys = new Set(tab.attribute.map((a) => a.key));
for (const w of waffen.waffen) {
  for (const p of w.profil) if (!effekte.has(p)) err(`waffen: ${w.id} verweist auf unbekannten Effekt ${p}`);
  const sum = w.profil.reduce((s, p) => s + effekte.get(p).ep, 0);
  const klasseEp = w.klasse === 'leicht' ? 1 : w.klasse === 'explosiv' ? 3 : 2;
  if (w.ep !== klasseEp) err(`waffen: ${w.id} ep ${w.ep} passt nicht zur Klasse ${w.klasse}`);
  if (w.id !== 'sniper50' && sum !== w.ep) err(`waffen: ${w.id} Profil-EP ${sum} != ${w.ep}`);
}

for (const m of moves.moves) {
  for (const a of m.attribut) if (!attrKeys.has(a)) err(`moves: ${m.id} unbekanntes Attribut ${a}`);
  let sum = 0;
  for (const e of m.effekte) {
    const def = effekte.get(e.id);
    if (!def) { err(`moves: ${m.id} unbekannter Effekt ${e.id}`); continue; }
    sum += e.ep ?? def.ep;
  }
  for (const a of m.abzuege) {
    const def = abzuege.get(a);
    if (!def) err(`moves: ${m.id} unbekannter Abzug ${a}`); else sum += def.ep;
  }
  if (sum !== m.ep) err(`moves: ${m.id} EP-Summe ${sum} != ${m.ep}`);
  const minLevel = m.ep <= 3 ? 1 : 2 * (m.ep - 3);
  if (m.minLevel !== minLevel) err(`moves: ${m.id} minLevel ${m.minLevel} != ${minLevel}`);
}

for (const n of npc.leiter) if (n.bonusMin > n.bonusMax) err(`npc: ${n.key} Bonus-Bereich ungültig`);

// Übersetzungen in data/i18n/<sprache>/: dieselbe Form wie die deutsche Grundlage, nur Texte, vollständig.
// Kennungen (ID_FIELDS) dürfen zur Zuordnung wiederholt werden und müssen dann gleich sein. Felder in NON_TEXT sind Kennungen,
// Aufzählungswerte oder Verweise (Effekt-Ids, Attribut-Schlüssel), die der Code vergleicht: Sie werden nicht übersetzt.
// Maßgeblich ist das nächste Objektfeld auf dem Pfad, Listen von Kennungen (profil, abzuege in moves) fallen also mit darunter,
// Listen von Objekten (abzuege im EP-Katalog) nicht.
const ID_FIELDS = new Set(['id', 'key', 'mw', 'rules_version']);
const NON_TEXT = new Set([...ID_FIELDS, 'en', 'folge', 'klasse', 'attribut', 'attribute', 'profil', 'schliesstAus', 'abzuege']);
const BASE = { 'tabellen.json': tab, 'ep-katalog.json': ep, 'waffen.json': waffen, 'moves.json': moves, 'npc.json': npc, 'tags.json': tags };
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
// Kennung oder Verweis nur, wenn der Wert ein einfacher Wert oder eine Liste einfacher Werte ist (tabellen.mw und
// tabellen.attribute sind Listen von Objekten mit Texten).
const isPlain = (v) => !Array.isArray(v) ? v === null || typeof v !== 'object' : v.every((x) => x === null || typeof x !== 'object');
const kind = (v) => (Array.isArray(v) ? 'Liste' : isObj(v) ? 'Objekt' : typeof v);

/** Prüft eine Übersetzung gegen die Grundlage: gleiche Form, nur Texte, Kennungen unverändert. */
function checkOverlay(where, base, over, path) {
  if (Array.isArray(base)) {
    if (!Array.isArray(over)) return err(`${where}: ${path} muss eine Liste sein (ist ${kind(over)})`);
    if (over.length !== base.length) err(`${where}: ${path} hat ${over.length} Einträge, die Grundlage ${base.length}`);
    over.forEach((o, i) => { if (i < base.length) checkOverlay(where, base[i], o, `${path}[${i}]`); });
    return;
  }
  if (isObj(base)) {
    if (!isObj(over)) return err(`${where}: ${path} muss ein Objekt sein (ist ${kind(over)})`);
    for (const [k, v] of Object.entries(over)) {
      const p = path ? `${path}.${k}` : k;
      if (!(k in base)) { err(`${where}: ${p} gibt es in der Grundlage nicht`); continue; }
      if (ID_FIELDS.has(k) && isPlain(base[k])) {
        if (JSON.stringify(v) !== JSON.stringify(base[k])) err(`${where}: ${p} ist ${JSON.stringify(v)}, in der Grundlage ${JSON.stringify(base[k])}`);
        continue;
      }
      if (NON_TEXT.has(k) && isPlain(base[k])) { err(`${where}: ${p} ist kein Text und wird nicht übersetzt`); continue; }
      checkOverlay(where, base[k], v, p);
    }
    return;
  }
  if (typeof base !== 'string') return err(`${where}: ${path} ist in der Grundlage ${kind(base)}, nur Texte werden übersetzt`);
  if (typeof over !== 'string') return err(`${where}: ${path} muss Text sein (ist ${kind(over)})`);
  if (!over.trim()) err(`${where}: ${path} ist leer`);
}

/** Vollständigkeit: jeder Text der Grundlage (außer NON_TEXT) braucht eine Übersetzung. */
function checkComplete(where, base, over, path, field) {
  if (field && NON_TEXT.has(field) && isPlain(base)) return;
  if (Array.isArray(base)) {
    base.forEach((b, i) => checkComplete(where, b, Array.isArray(over) ? over[i] : undefined, `${path}[${i}]`, field));
  } else if (isObj(base)) {
    for (const [k, v] of Object.entries(base)) checkComplete(where, v, isObj(over) ? over[k] : undefined, path ? `${path}.${k}` : k, k);
  } else if (typeof base === 'string' && base.trim() && over === undefined) {
    err(`${where}: Übersetzung fehlt für ${path} („${base}“)`);
  }
}

const i18nDir = join(dir, 'i18n');
const locales = existsSync(i18nDir) ? readdirSync(i18nDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
for (const lang of locales) {
  const known = new Set(Object.keys(BASE));
  for (const f of readdirSync(join(i18nDir, lang))) {
    if (f.endsWith('.json') && !known.has(f)) err(`i18n/${lang}/${f}: keine passende Datei in data/`);
  }
  for (const [f, base] of Object.entries(BASE)) {
    const where = `i18n/${lang}/${f}`;
    const file = join(i18nDir, lang, f);
    if (!existsSync(file)) { err(`${where}: Datei fehlt`); continue; }
    let over;
    try { over = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { err(`${where}: kein gültiges JSON (${e.message})`); continue; }
    checkOverlay(where, base, over, '');
    checkComplete(where, base, over, '', '');
  }
}

if (errors.length) {
  console.error(`check-data: ${errors.length} Fehler`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`check-data: OK (${moves.moves.length} Moves, ${waffen.waffen.length} Waffen, ${ep.effekte.length} Effekte, Sprachen: de${locales.map((l) => ', ' + l).join('')})`);
