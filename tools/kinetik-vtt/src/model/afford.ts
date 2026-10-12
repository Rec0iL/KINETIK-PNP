// Kann ein Charakter die Kosten eines Moves jetzt bezahlen? Rein, ohne DOM.
import type { Character, Move } from './character';
import { viewMove, computeSheet } from './sheet';
import { t } from '../i18n';

export interface Afford { ok: boolean; reason: string; energie: number; momentum: number }

/** Kann der Charakter die Kosten des Moves jetzt bezahlen? */
export function affordability(char: Character, m: Move): Afford {
  const cost = viewMove(char, m).cost;
  const { energie, momentum } = char.resources;
  const sheet = computeSheet(char);
  const base = { energie: cost.energie, momentum: cost.momentum };
  if (sheet.states.ohnmaechtig) return { ok: false, reason: t('model.afford.unconscious'), ...base };
  const lacks: string[] = [];
  if (cost.energie > energie) lacks.push(t('model.afford.lackEnergie', { need: cost.energie, have: Math.max(0, energie) }));
  if (cost.momentum > momentum) lacks.push(t('model.afford.lackMomentum', { need: cost.momentum, have: momentum }));
  return lacks.length ? { ok: false, reason: t('model.afford.tooLittle', { what: lacks.join(t('model.afford.and')) }), ...base } : { ok: true, reason: '', ...base };
}
