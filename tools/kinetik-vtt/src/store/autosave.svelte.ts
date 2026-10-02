import { untrack } from 'svelte';
import type { Character } from '../model/character';
import { saveCharacter } from './characters.svelte';

/** Speichert den Charakter bei jeder Änderung (entprellt in saveCharacter). Muss in einer Komponente aufgerufen werden. */
export function useAutosave(getChar: () => Character | undefined) {
  let last = '';
  $effect(() => {
    const c = getChar();
    if (!c) return;
    const { updated: _u, ...rest } = $state.snapshot(c);
    const json = JSON.stringify(rest);
    if (json === last) return;
    const first = last === '';
    last = json;
    if (first) return;
    untrack(() => {
      c.updated = Date.now();
      saveCharacter(c);
    });
  });
}
