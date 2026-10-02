// Kann ein Charakter die Kosten eines Moves jetzt bezahlen? Rein, ohne DOM.
import type { Character, Move } from './character';
import { viewMove, computeSheet } from './sheet';

export interface Afford { ok: boolean; reason: string; energie: number; momentum: number }

/** Kann der Charakter die Kosten des Moves jetzt bezahlen? */
export function affordability(char: Character, m: Move): Afford {
  const cost = viewMove(char, m).cost;
  const { energie, momentum } = char.resources;
  const sheet = computeSheet(char);
  const base = { energie: cost.energie, momentum: cost.momentum };
  if (sheet.states.ohnmaechtig) return { ok: false, reason: 'Ohnmächtig: bis zum Szenenende aus dem Spiel (Wecken nötig).', ...base };
  const lacks: string[] = [];
  if (cost.energie > energie) lacks.push(`Energie (${cost.energie} nötig, ${Math.max(0, energie)} da)`);
  if (cost.momentum > momentum) lacks.push(`Momentum (${cost.momentum} nötig, ${momentum} da)`);
  return lacks.length ? { ok: false, reason: `Zu wenig ${lacks.join(' und ')}.`, ...base } : { ok: true, reason: '', ...base };
}
