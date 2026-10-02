// Prüft die Regeldaten in data/: gültiges JSON, Pflichtfelder, Verweise, EP-Summen der Beispiel-Moves.
import { readFileSync } from 'node:fs';
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
  const klasseEp = w.klasse === 'leicht' ? 1 : 2;
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

if (errors.length) {
  console.error(`check-data: ${errors.length} Fehler`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log(`check-data: OK (${moves.moves.length} Moves, ${waffen.waffen.length} Waffen, ${ep.effekte.length} Effekte)`);
