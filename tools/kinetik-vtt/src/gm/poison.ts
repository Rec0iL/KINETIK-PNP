// Gift am Rundenende (3.11) für Spielerbögen und NPCs. Rein, ohne DOM.
import { GIFT, PARALYSIS_TAG, TAG, isTag, overflowInjuries, tickPoison, type Poison } from '../rules';
import type { Character } from '../model/character';
import type { PatchOp } from '../net/protocol';
import type { Npc } from './combat';
import { t, tn } from '../i18n';

export interface PoisonRound {
  ops: PatchOp[];
  notes: string[];
}

/** Alle Gifte eines Spielerbogens ticken lassen. Die Änderungen kommen als Patch zurück, der Bogen selbst bleibt unverändert. */
export function tickCharacter(c: Character): PoisonRound {
  const list = c.poisons ?? [];
  if (!list.length) return { ops: [], notes: [] };
  const ops: PatchOp[] = [];
  const notes: string[] = [];
  const next: Poison[] = [];
  let loss = 0;
  let lame = false;
  let dying = false;
  let waiting = 0;
  for (const p of list) {
    const t = tickPoison(p);
    if (t.poison) next.push(t.poison);
    loss -= t.energie;
    lame ||= t.lame;
    dying ||= t.dying;
    if (t.waiting) waiting++;
  }
  ops.push({ op: 'poisons', list: next });
  if (loss > 0) {
    const before = c.resources.energie;
    ops.push({ op: 'add', key: 'energie', delta: -loss });
    notes.push(t('gm.poison.energyLoss', { name: c.name, n: loss }));
    const n = overflowInjuries(before, before - loss);
    for (let i = 0; i < n; i++) ops.push({ op: 'injury', zone: 'torso', text: t('gm.poison.overflowInjury') });
    if (n) notes.push(tn('gm.poison.overflow', n, { name: c.name }));
    if (c.dying !== null) notes.push(t('gm.poison.dyingDies', { name: c.name }));
  }
  if (lame && !c.tags.some((t) => isTag(t.name, TAG.paralyzed))) {
    ops.push({ op: 'tag', name: PARALYSIS_TAG, size: 'gross', note: t('gm.poison.paralyticNote') });
    notes.push(t('gm.poison.paralyzed', { name: c.name }));
  }
  if (dying) {
    ops.push({ op: 'dying' });
    notes.push(t('gm.poison.becomesDying', { name: c.name }));
  }
  if (waiting && !notes.length) notes.push(t('gm.poison.waiting', { name: c.name }));
  return { ops, notes };
}

/** Gifte eines NPCs ticken lassen. Ändert den NPC direkt. */
export function tickNpc(n: Npc): string[] {
  if (!n.poisons?.length) return [];
  const notes: string[] = [];
  const next: Poison[] = [];
  let loss = 0;
  let lame = false;
  let dying = false;
  for (const p of n.poisons) {
    const t = tickPoison(p);
    if (t.poison) next.push(t.poison);
    loss -= t.energie;
    lame ||= t.lame;
    dying ||= t.dying;
  }
  n.poisons = next;
  if (loss > 0) { n.energie -= loss; notes.push(t('gm.poison.energyLoss', { name: n.name, n: loss })); }
  if (lame && !n.tags.some((t) => isTag(t, TAG.paralyzed))) { n.tags.push(PARALYSIS_TAG); notes.push(t('gm.poison.paralyzed', { name: n.name })); }
  if (dying) { n.dying = true; notes.push(t('gm.poison.npcDies', { name: n.name })); }
  if (n.energie < 0) notes.push(t('gm.poison.npcUnconscious', { name: n.name }));
  return notes;
}

/** Gegenmittel gelungen: Gift weg, bei Lähmgift auch der Tag, bei tödlichem Gift das Sterbend-Fenster. */
export function cureOps(c: Character, poisonId: string): PatchOp[] {
  const list = c.poisons ?? [];
  const p = list.find((x) => x.id === poisonId);
  if (!p) return [];
  const ops: PatchOp[] = [{ op: 'poisons', list: list.filter((x) => x.id !== poisonId) }];
  if (p.level === 'laehm') ops.push({ op: 'untag', name: PARALYSIS_TAG });
  return ops;
}

export const mwText = (p: Poison) => t('gm.poison.dc', { n: p.mw ?? GIFT[p.level].mw });
