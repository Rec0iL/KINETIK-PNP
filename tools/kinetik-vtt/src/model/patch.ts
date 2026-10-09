// Wendet SL-Änderungen (PatchOp) auf einen Bogen an. Rein, auch für lokale Spieler des SL verwendet.
import { rules, zoneStatus, ZONE_KEYS, GIFT } from '../rules';
import { uid, type Character } from './character';
import { computeSheet } from './sheet';
import type { PatchOp } from '../net/protocol';

export const ENERGIE_MIN = -30;

export function applyPatch(c: Character, ops: PatchOp[], opts: { autoShock?: boolean } = {}): void {
  const autoShock = opts.autoShock ?? true;
  for (const op of ops) {
    const sheet = computeSheet(c);
    switch (op.op) {
      case 'add':
      case 'set': {
        const cur = op.key === 'schutz' ? c.resources.schutz.current : c.resources[op.key];
        const next = op.op === 'add' ? cur + op.delta : op.value;
        const max = { energie: sheet.energieMax.value, wk: sheet.wkMax.value, momentum: sheet.momentumCap.value, schutz: c.resources.schutz.max }[op.key];
        // Energie darf durch Gegnereinwirkung unter 0 fallen (ohnmächtig, Überlauf 3.11), alles andere nicht.
        const v = Math.max(op.key === 'energie' ? ENERGIE_MIN : 0, Math.min(max, next));
        if (op.key === 'schutz') c.resources.schutz.current = v;
        else c.resources[op.key] = v;
        break;
      }
      case 'injury': {
        const def = rules.tabellen.zonen.find((z) => z.key === op.zone);
        if (!def || c.injuries[op.zone].length >= def.felder) break;
        c.injuries[op.zone].push({ text: op.text });
        if (autoShock) c.resources.wk = Math.max(0, c.resources.wk - 1);
        break;
      }
      case 'heal': {
        const list = c.injuries[op.zone];
        if (!list.length) break;
        list.splice(op.index ?? list.length - 1, 1);
        break;
      }
      case 'tag':
        c.tags.push({ id: uid(), name: op.name, size: op.size, note: op.note });
        break;
      case 'untag': {
        const i = c.tags.findIndex((t) => t.name === op.name);
        if (i >= 0) c.tags.splice(i, 1);
        break;
      }
      case 'poison':
        c.poisons = [...(c.poisons ?? []), op.poison];
        break;
      case 'poisons':
        c.poisons = op.list;
        break;
      case 'dying':
        if (c.dying === null) c.dying = rules.tabellen.sterbendRunden;
        c.dyingGift = true;
        break;
    }
  }
  const dying = ZONE_KEYS.some((z) => zoneStatus(z, c.injuries[z].length) === 'sterbend');
  if (dying && c.dying === null) c.dying = rules.tabellen.sterbendRunden;
  if (!dying && !c.dyingGift) c.dying = null;
  if (c.dying === null) c.dyingGift = undefined;
  c.updated = Date.now();
}

/** Lesbare Beschreibung für den Toast beim Spieler. */
export function describePatch(ops: PatchOp[]): string {
  const names: Record<string, string> = { energie: 'Energie', wk: 'Willenskraft', momentum: 'Momentum', schutz: 'Schutz' };
  return ops
    .map((op) => {
      switch (op.op) {
        case 'add': return `${op.delta > 0 ? '+' : ''}${op.delta} ${names[op.key]}`;
        case 'set': return `${names[op.key]} = ${op.value}`;
        case 'injury': return `Verletzung (${rules.tabellen.zonen.find((z) => z.key === op.zone)?.kurz}${op.text ? `: ${op.text}` : ''})`;
        case 'heal': return `Verletzung geheilt (${rules.tabellen.zonen.find((z) => z.key === op.zone)?.kurz})`;
        case 'tag': return `Tag: ${op.name}`;
        case 'untag': return `Tag weg: ${op.name}`;
        case 'poison': return `Vergiftet (${GIFT[op.poison.level].label})`;
        case 'poisons': return 'Gift aktualisiert';
        case 'dying': return op.why === 'gnadenstoss' ? 'Gnadenstoß: sterbend' : 'Sterbend durch Gift';
      }
    })
    .join(', ');
}
