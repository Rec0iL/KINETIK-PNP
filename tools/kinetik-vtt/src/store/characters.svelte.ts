// Charakter-Bibliothek: reaktiv im Speicher, autosave in IndexedDB (ein Eintrag je Charakter).
import { set, del, keys, getMany } from 'idb-keyval';
import { newCharacter, type Character } from '../model/character';
import { sanitizeCharacter } from '../model/io';

const PREFIX = 'char:';

export const library = $state<{
  characters: Character[];
  ready: boolean;
  /** Fehlermeldung, falls der Browser-Speicher nicht nutzbar ist. */
  storageError: string;
}>({ characters: [], ready: false, storageError: '' });

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export async function loadLibrary() {
  try {
    const ks = (await keys()).filter((k) => typeof k === 'string' && k.startsWith(PREFIX));
    const rows = (await getMany(ks)) as Character[];
    library.characters = rows.map((r) => sanitizeCharacter(r)).sort((a, b) => b.updated - a.updated);
  } catch (e) {
    library.storageError = 'Der Browser-Speicher ist nicht verfügbar. Änderungen gehen beim Schließen verloren, bitte regelmäßig als JSON exportieren.';
    console.warn(e);
  }
  library.ready = true;
}

export function saveCharacter(c: Character) {
  clearTimeout(timers.get(c.id));
  timers.set(c.id, setTimeout(async () => {
    try {
      await set(PREFIX + c.id, $state.snapshot(c));
    } catch (e) {
      library.storageError = 'Speichern im Browser fehlgeschlagen. Bitte als JSON exportieren.';
      console.warn(e);
    }
  }, 350));
}

export function touch(c: Character) {
  c.updated = Date.now();
  saveCharacter(c);
}

export function getCharacter(id: string): Character | undefined {
  return library.characters.find((c) => c.id === id);
}

export function addCharacter(c: Character = newCharacter()): Character {
  library.characters.unshift(c);
  const live = library.characters[0];
  saveCharacter(live);
  return live;
}

export async function removeCharacter(id: string) {
  const i = library.characters.findIndex((c) => c.id === id);
  if (i >= 0) library.characters.splice(i, 1);
  clearTimeout(timers.get(id));
  try { await del(PREFIX + id); } catch { /* ignorieren */ }
}

export function duplicateCharacter(id: string): Character | undefined {
  const src = getCharacter(id);
  if (!src) return;
  const copy = sanitizeCharacter(JSON.parse(JSON.stringify($state.snapshot(src))), { newId: true });
  copy.name = `${src.name} (Kopie)`;
  copy.created = copy.updated = Date.now();
  return addCharacter(copy);
}
