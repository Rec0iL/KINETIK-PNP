// Gift am Rundenende (3.11) für Spielerbögen und NPCs. Rein, ohne DOM.
import { GIFT, PARALYSIS_TAG, overflowInjuries, tickPoison, type Poison } from '../rules';
import type { Character } from '../model/character';
import type { PatchOp } from '../net/protocol';
import type { Npc } from './combat';

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
    notes.push(`${c.name}: −${loss} Energie durch Gift`);
    const n = overflowInjuries(before, before - loss);
    for (let i = 0; i < n; i++) ops.push({ op: 'injury', zone: 'torso', text: 'Überlauf (Gift)' });
    if (n) notes.push(`${c.name}: Überlauf, ${n} Verletzung(en) am Torso`);
    if (c.dying !== null) notes.push(`${c.name} ist sterbend und verliert weiter Energie: stirbt (3.11)`);
  }
  if (lame && !c.tags.some((t) => t.name === PARALYSIS_TAG)) {
    ops.push({ op: 'tag', name: PARALYSIS_TAG, size: 'gross', note: 'Lähmgift' });
    notes.push(`${c.name}: gelähmt (großer Tag)`);
  }
  if (dying) {
    ops.push({ op: 'dying' });
    notes.push(`${c.name}: wird sterbend (tödliches Gift), Gegenmittel nötig`);
  }
  if (waiting && !notes.length) notes.push(`${c.name}: Gift wirkt noch nicht (Verzögerung)`);
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
  if (loss > 0) { n.energie -= loss; notes.push(`${n.name}: −${loss} Energie durch Gift`); }
  if (lame && !n.tags.includes(PARALYSIS_TAG)) { n.tags.push(PARALYSIS_TAG); notes.push(`${n.name}: gelähmt (großer Tag)`); }
  if (dying) { n.dying = true; notes.push(`${n.name}: stirbt am tödlichen Gift`); }
  if (n.energie < 0) notes.push(`${n.name}: Energie unter 0, ohnmächtig`);
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

export const mwText = (p: Poison) => `MW ${p.mw ?? GIFT[p.level].mw}`;
