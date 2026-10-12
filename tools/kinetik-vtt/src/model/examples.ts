// Beispielcharakter aus Kapitel 6 des Regelwerks.
import { newCharacter, newTitle, uid, type Character } from './character';
import { t } from '../i18n';

export function jinYamada(): Character {
  const killer = newTitle({
    name: t('model.examples.killerTitle'), level: 3,
    domains: [t('model.examples.domainFirearms'), t('model.examples.domainInfiltration'), t('model.examples.domainIntimidation')],
    leadAttrs: ['fluss', 'praezision'], startedAtLevel: 3,
  });
  const bjj = newTitle({
    name: t('model.examples.bjjTitle'), level: 1,
    domains: [t('model.examples.domainHolds'), t('model.examples.domainThrows'), t('model.examples.domainGround')], leadAttrs: ['fluss', 'gewalt'], startedAtLevel: 1,
  });
  return newCharacter({
    name: 'Jin Yamada',
    alias: 'Ghost',
    concept: t('model.examples.concept'),
    stufe: 'kino',
    attributes: { fluss: 2, praezision: 1, gewalt: 0, instinkt: 2, fokus: -1 },
    titles: [killer, bjj],
    resources: { energie: 8, wk: 7, momentum: 0, schutz: { type: t('model.examples.armor'), current: 2, max: 2 } },
    weapons: [{ id: uid(), name: t('model.examples.weapon'), klasse: 'leicht', ep: 1, profilText: t('model.examples.weaponProfile'), durchschlag: 1, templateId: 'pistole' }],
    notes: [{ id: uid(), title: t('model.character.notes'), text: t('model.examples.note') }],
  });
}
