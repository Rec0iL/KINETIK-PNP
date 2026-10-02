// Move einsetzen: Kosten prüfen, nach dem Wurf bezahlen (3.12) oder auf Wunsch sofort beim Wurf abziehen.
import { costLabel } from '../rules';
import type { Character, Move } from '../model/character';
import { moveRollBonus } from '../model/sheet';
import { affordability } from '../model/afford';
export { affordability };
import { roll2d6 } from '../dice/roller.svelte';
import { settings } from '../lib/settings.svelte';
import { pushToast } from '../ui/toasts.svelte';

/** Ein Wurf wartet darauf, dass der Spieler den Move einsetzt und bezahlt. */
export const moveUse = $state<{ pending: { charId: string; moveId: string; total: number } | null }>({ pending: null });

export function pay(char: Character, m: Move): boolean {
  const a = affordability(char, m);
  if (!a.ok) { pushToast(a.reason, 'warn'); return false; }
  char.resources.energie -= a.energie;
  char.resources.momentum -= a.momentum;
  pushToast(`${m.name}: ${costLabel(a)} bezahlt.`, 'info', 3500);
  return true;
}

/** Würfelt den Move. Bezahlt je nach Einstellung sofort oder erst auf Bestätigung. */
export function rollMove(char: Character, m: Move) {
  if (!affordability(char, m).ok) return;
  const rec = roll2d6({
    who: settings.displayName || char.name, characterId: char.id, kind: 'move', label: m.name, bonus: moveRollBonus(char, m),
  });
  if (settings.autoPayMoves) {
    pay(char, m);
    moveUse.pending = null;
  } else {
    moveUse.pending = { charId: char.id, moveId: m.id, total: rec.total };
  }
}

export function confirmPending(char: Character, m: Move) {
  if (pay(char, m)) moveUse.pending = null;
}
export const dismissPending = () => { moveUse.pending = null; };
export const pendingFor = (char: Character, m: Move) =>
  moveUse.pending && moveUse.pending.charId === char.id && moveUse.pending.moveId === m.id ? moveUse.pending : null;
