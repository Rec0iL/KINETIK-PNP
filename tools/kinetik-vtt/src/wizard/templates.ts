// Beispiele für den Erschaffungsassistenten. Alles frei anpassbar; die Titel orientieren sich an den Beispielen im Regelwerk.
// Die Texte stehen in src/i18n/*/wizard.ts und werden beim Laden in der Sprache der App aufgelöst.
import type { AttrKey } from '../rules';
import { t } from '../i18n';

export interface TitleTemplate { name: string; domains: string[]; lead: [AttrKey, AttrKey]; text: string }

const D = {
  firearms: t('wizard.domain.firearms'),
  melee: t('wizard.domain.melee'),
  unarmed: t('wizard.domain.unarmed'),
  swordsmanship: t('wizard.domain.swordsmanship'),
  thrownWeapons: t('wizard.domain.thrownWeapons'),
  infiltration: t('wizard.domain.infiltration'),
  acrobatics: t('wizard.domain.acrobatics'),
  intimidation: t('wizard.domain.intimidation'),
  persuasion: t('wizard.domain.persuasion'),
  perception: t('wizard.domain.perception'),
  investigation: t('wizard.domain.investigation'),
  medicine: t('wizard.domain.medicine'),
  technology: t('wizard.domain.technology'),
  hacking: t('wizard.domain.hacking'),
  vehicles: t('wizard.domain.vehicles'),
  tactics: t('wizard.domain.tactics'),
  explosives: t('wizard.domain.explosives'),
  survival: t('wizard.domain.survival'),
  healing: t('wizard.domain.healing'),
  meditation: t('wizard.domain.meditation'),
  holds: t('wizard.domain.holds'),
  throws: t('wizard.domain.throws'),
  groundFighting: t('wizard.domain.groundFighting'),
  streetFighting: t('wizard.domain.streetFighting'),
  closeQuarters: t('wizard.domain.closeQuarters'),
  equipment: t('wizard.domain.equipment'),
  brawling: t('wizard.domain.brawling'),
  dirtyFighting: t('wizard.domain.dirtyFighting'),
  pressurePoints: t('wizard.domain.pressurePoints'),
  duel: t('wizard.domain.duel'),
  reflexes: t('wizard.domain.reflexes'),
  iaijutsu: t('wizard.domain.iaijutsu'),
  etiquette: t('wizard.domain.etiquette'),
  interrogation: t('wizard.domain.interrogation'),
  planning: t('wizard.domain.planning'),
  leadership: t('wizard.domain.leadership'),
  escape: t('wizard.domain.escape'),
};

export const TITLE_TEMPLATES: TitleTemplate[] = [
  { name: t('wizard.templates.exHitman.name'), domains: [D.firearms, D.infiltration, D.intimidation], lead: ['fluss', 'praezision'], text: t('wizard.templates.exHitman.text') },
  { name: t('wizard.templates.swat.name'), domains: [D.firearms, D.tactics, D.closeQuarters, D.equipment], lead: ['praezision', 'instinkt'], text: t('wizard.templates.swat.text') },
  { name: t('wizard.templates.bjj.name'), domains: [D.holds, D.throws, D.groundFighting], lead: ['fluss', 'gewalt'], text: t('wizard.templates.bjj.text') },
  { name: t('wizard.templates.brawler.name'), domains: [D.brawling, D.dirtyFighting, D.intimidation], lead: ['gewalt', 'instinkt'], text: t('wizard.templates.brawler.text') },
  { name: t('wizard.templates.stormNinja.name'), domains: [D.infiltration, D.swordsmanship, D.acrobatics, D.thrownWeapons], lead: ['fluss', 'instinkt'], text: t('wizard.templates.stormNinja.text') },
  { name: t('wizard.templates.chiMaster.name'), domains: [D.pressurePoints, D.meditation, D.healing], lead: ['praezision', 'fokus'], text: t('wizard.templates.chiMaster.text') },
  { name: t('wizard.templates.gunslinger.name'), domains: [D.firearms, D.duel, D.reflexes], lead: ['praezision', 'instinkt'], text: t('wizard.templates.gunslinger.text') },
  { name: t('wizard.templates.samurai.name'), domains: [D.swordsmanship, D.iaijutsu, D.etiquette], lead: ['fluss', 'instinkt'], text: t('wizard.templates.samurai.text') },
  { name: t('wizard.templates.detective.name'), domains: [D.investigation, D.perception, D.interrogation], lead: ['instinkt', 'fokus'], text: t('wizard.templates.detective.text') },
  { name: t('wizard.templates.tactician.name'), domains: [D.tactics, D.planning, D.leadership], lead: ['fokus', 'instinkt'], text: t('wizard.templates.tactician.text') },
  { name: t('wizard.templates.parkour.name'), domains: [D.acrobatics, D.escape, D.streetFighting], lead: ['fluss', 'gewalt'], text: t('wizard.templates.parkour.text') },
];

export const DOMAIN_SUGGESTIONS = [
  D.firearms, D.melee, D.unarmed, D.swordsmanship, D.thrownWeapons, D.infiltration, D.acrobatics, D.intimidation,
  D.persuasion, D.perception, D.investigation, D.medicine, D.technology, D.hacking, D.vehicles, D.tactics, D.explosives, D.survival,
  D.healing, D.meditation, D.holds, D.throws, D.groundFighting, D.streetFighting,
];

export interface ArmorPreset { name: string; max: number }
export const ARMOR_PRESETS: ArmorPreset[] = [
  { name: t('wizard.armor.none'), max: 0 },
  { name: t('wizard.armor.leather'), max: 1 },
  { name: t('wizard.armor.kevlar'), max: 2 },
  { name: t('wizard.armor.heavy'), max: 3 },
  { name: t('wizard.armor.luck'), max: 1 },
];

export const WIZARD_STEPS = [
  { key: 'concept', title: t('wizard.steps.concept.title'), rule: 'sec-2-4-charaktererschaffung', text: t('wizard.steps.concept.text') },
  { key: 'titles', title: t('wizard.steps.titles.title'), rule: 'sec-2-2-das-titel-system-level-1-bis-10', text: t('wizard.steps.titles.text') },
  { key: 'attributes', title: t('wizard.steps.attributes.title'), rule: 'sec-2-1-die-attribute-2w6-system', text: t('wizard.steps.attributes.text') },
  { key: 'moves', title: t('wizard.steps.moves.title'), rule: 'sec-5-1-das-bewertungs-framework-effektpunkte', text: t('wizard.steps.moves.text') },
  { key: 'gear', title: t('wizard.steps.gear.title'), rule: 'sec-2-5-waffen-deckung', text: t('wizard.steps.gear.text') },
  { key: 'finish', title: t('wizard.steps.finish.title'), rule: 'sec-2-3-ressourcen-verletzungen', text: t('wizard.steps.finish.text') },
] as const;
