// Eigene Move-Bibliothek des Move-Builders (unabhängig von Charakteren).
import { get, set } from 'idb-keyval';
import type { Move } from '../model/character';
import { sanitizeMove } from '../model/io';

const KEY = 'moves';

export const moveLibrary = $state<{ moves: Move[]; ready: boolean }>({ moves: [], ready: false });

let timer: ReturnType<typeof setTimeout>;

export async function loadMoveLibrary() {
  try {
    const rows = ((await get(KEY)) as unknown[] | undefined) ?? [];
    moveLibrary.moves = rows.map((r) => sanitizeMove(r));
  } catch (e) {
    console.warn(e);
  }
  moveLibrary.ready = true;
}

export function saveMoveLibrary() {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    try { await set(KEY, $state.snapshot(moveLibrary.moves)); } catch (e) { console.warn(e); }
  }, 350);
}
