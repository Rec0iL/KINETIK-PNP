// Beispielcharakter aus Kapitel 6 des Regelwerks.
import { newCharacter, newTitle, uid, type Character } from './character';

export function jinYamada(): Character {
  const killer = newTitle({
    name: 'Ex-Triaden-Auftragskiller', level: 3, domains: ['Schusswaffen', 'Infiltration', 'Einschüchtern'],
    leadAttrs: ['fluss', 'praezision'], startedAtLevel: 3,
  });
  const bjj = newTitle({
    name: 'BJJ-Schüler', level: 1, domains: ['Griffe', 'Würfe', 'Bodenkampf'], leadAttrs: ['fluss', 'gewalt'], startedAtLevel: 1,
  });
  return newCharacter({
    name: 'Jin Yamada',
    alias: 'Ghost',
    concept: 'Ehemaliger Auftragskiller der Triaden, der nach einem letzten Job untergetaucht ist.',
    stufe: 'kino',
    attributes: { fluss: 2, praezision: 1, gewalt: 0, instinkt: 2, fokus: -1 },
    titles: [killer, bjj],
    resources: { energie: 8, wk: 7, momentum: 0, schutz: { type: 'Verdecktes Kevlar (gegen Kugeln und Schnitte)', current: 2, max: 2 } },
    weapons: [{ id: uid(), name: 'Pistole', klasse: 'leicht', ep: 1, profilText: 'Zone wählen', durchschlag: 1, templateId: 'pistole' }],
    notes: [{ id: uid(), title: 'Notizen', text: 'Beispielcharakter aus dem Regelwerk (Kapitel 6).' }],
  });
}
