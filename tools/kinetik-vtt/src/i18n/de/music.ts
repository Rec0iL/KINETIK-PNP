// Texte des Bereichs "music" (deutsch, Quelle). Schlüssel: music.<ort>.<name>; die englische Datei ../en/music.ts hat genau dieselben Schlüssel.
export const music = {
  // catalog: Beschriftung der Kategorien nach der Kennung `tag` in public/music/catalog.json
  'music.catalog.all': 'Alle Kategorien',
  'music.catalog.tag.combat': 'Kampf',
  'music.catalog.tag.chase': 'Verfolgung',
  'music.catalog.tag.stealth': 'Heimlichkeit',
  'music.catalog.tag.tension': 'Spannung',
  'music.catalog.tag.dark': 'Düster',
  'music.catalog.tag.noir': 'Noir',
  'music.catalog.tag.calm': 'Ruhig',
  'music.catalog.note': 'Alle Titel: Kevin MacLeod (incompetech.com), Lizenz Creative Commons Namensnennung 4.0. Neu kodiert (80 kbps MP3).',
  // engine
  'music.engine.loadFailed': 'Audiodatei konnte nicht geladen werden.',
  'music.engine.unavailable': 'Titel nicht verfügbar.',
  // MusicBar
  'music.bar.aria': 'Musik',
  'music.bar.loading': 'lädt …',
  'music.bar.unlock': 'Audio aktivieren',
  'music.bar.unmute': 'Ton an',
  'music.bar.mute': 'Stumm',
  'music.bar.volume': 'Lautstärke',
  'music.bar.credits': 'Lizenz und Namensnennung',
} as const;
