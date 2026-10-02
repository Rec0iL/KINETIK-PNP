// Beispiele für den Erschaffungsassistenten. Alles frei anpassbar; die Titel orientieren sich an den Beispielen im Regelwerk.
import type { AttrKey } from '../rules';

export interface TitleTemplate { name: string; domains: string[]; lead: [AttrKey, AttrKey]; text: string }

export const TITLE_TEMPLATES: TitleTemplate[] = [
  { name: 'Ex-Hitman', domains: ['Schusswaffen', 'Infiltration', 'Einschüchtern'], lead: ['fluss', 'praezision'], text: 'Gun-Fu und Schatten' },
  { name: 'SWAT-Operator', domains: ['Schusswaffen', 'Taktik', 'Nahbereichskampf', 'Ausrüstung'], lead: ['praezision', 'instinkt'], text: 'Diszipliniert, gepanzert' },
  { name: 'BJJ-Schüler', domains: ['Griffe', 'Würfe', 'Bodenkampf'], lead: ['fluss', 'gewalt'], text: 'Bodenkampf und Hebel' },
  { name: 'Straßenschläger', domains: ['Schlägerei', 'Dreckiger Kampf', 'Einschüchtern'], lead: ['gewalt', 'instinkt'], text: 'Roh und unberechenbar' },
  { name: 'Sturmninja', domains: ['Infiltration', 'Schwertkampf', 'Akrobatik', 'Wurfwaffen'], lead: ['fluss', 'instinkt'], text: 'Schnell und lautlos' },
  { name: 'Chi-Meister', domains: ['Nervenpunkte', 'Meditation', 'Heilung'], lead: ['praezision', 'fokus'], text: 'Präzise Technik, innere Ruhe' },
  { name: 'Revolverheld', domains: ['Schusswaffen', 'Duell', 'Reflexe'], lead: ['praezision', 'instinkt'], text: 'Schneller Zug' },
  { name: 'Samurai', domains: ['Schwertkampf', 'Iaijutsu', 'Etikette'], lead: ['fluss', 'instinkt'], text: 'Klinge und Ehre' },
  { name: 'Detective', domains: ['Ermitteln', 'Wahrnehmung', 'Verhören'], lead: ['instinkt', 'fokus'], text: 'Spuren lesen' },
  { name: 'Taktiker', domains: ['Taktik', 'Planung', 'Führung'], lead: ['fokus', 'instinkt'], text: 'Der Plan hinter dem Plan' },
  { name: 'Parkour-Läufer', domains: ['Akrobatik', 'Flucht', 'Straßenkampf'], lead: ['fluss', 'gewalt'], text: 'Die Stadt als Spielplatz' },
];

export const DOMAIN_SUGGESTIONS = [
  'Schusswaffen', 'Nahkampf', 'Waffenloser Kampf', 'Schwertkampf', 'Wurfwaffen', 'Infiltration', 'Akrobatik', 'Einschüchtern',
  'Überreden', 'Wahrnehmung', 'Ermitteln', 'Medizin', 'Technik', 'Hacking', 'Fahrzeuge', 'Taktik', 'Sprengstoff', 'Überleben',
  'Heilung', 'Meditation', 'Griffe', 'Würfe', 'Bodenkampf', 'Straßenkampf',
];

export interface ArmorPreset { name: string; max: number }
export const ARMOR_PRESETS: ArmorPreset[] = [
  { name: 'Keine Rüstung', max: 0 },
  { name: 'Lederjacke (gegen Schnitte und Stürze)', max: 1 },
  { name: 'Verdecktes Kevlar (gegen Kugeln und Schnitte)', max: 2 },
  { name: 'Schwere Panzerung (gegen Kugeln und Schläge)', max: 3 },
  { name: 'Glück und Schicksal (gegen alles ein bisschen)', max: 1 },
];

export const WIZARD_STEPS = [
  { key: 'concept', title: 'Konzept', rule: 'sec-2-4-charaktererschaffung', text: 'Wer ist deine Figur? Name, Idee, Welt.' },
  { key: 'titles', title: 'Titel', rule: 'sec-2-2-das-titel-system-level-1-bis-10', text: 'Was kann deine Figur, und wie gut? Titel geben Meisterschaft.' },
  { key: 'attributes', title: 'Attribute', rule: 'sec-2-1-die-attribute-2w6-system', text: 'Talent: fünf Attribute, ein Budget.' },
  { key: 'moves', title: 'Moves', rule: 'sec-5-1-das-bewertungs-framework-effektpunkte', text: 'Signature-Techniken deiner Figur.' },
  { key: 'gear', title: 'Ausrüstung', rule: 'sec-2-5-waffen-deckung', text: 'Schutz, Waffen und Gepäck.' },
  { key: 'finish', title: 'Abschluss', rule: 'sec-2-3-ressourcen-verletzungen', text: 'Prüfen, Ressourcen füllen, loslegen.' },
] as const;
