import { rules, type AttrKey } from '../rules';
import { uid, type Move } from '../model/character';

export function moveFromTemplate(templateId: string, opts: { titleId?: string; level?: number } = {}): Move | undefined {
  const t = rules.moves.moves.find((m) => m.id === templateId);
  if (!t) return;
  return {
    id: uid(),
    name: t.name,
    attr: t.attribut[0] as AttrKey,
    text: t.text,
    effects: t.effekte.map((e) => ({ ...e })),
    deductions: [...t.abzuege],
    titleId: opts.titleId,
    learnedAtLevel: opts.level,
    templateId,
  };
}

export function blankMove(opts: { titleId?: string; level?: number } = {}): Move {
  return { id: uid(), name: 'Neuer Move', attr: 'fluss', text: '', effects: [], deductions: [], titleId: opts.titleId, learnedAtLevel: opts.level };
}
