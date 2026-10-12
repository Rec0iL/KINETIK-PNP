import type { music as demusic } from '../de/music';

export const music: Record<keyof typeof demusic, string> = {
  // catalog
  'music.catalog.all': 'All categories',
  'music.catalog.tag.combat': 'Combat',
  'music.catalog.tag.chase': 'Chase',
  'music.catalog.tag.stealth': 'Stealth',
  'music.catalog.tag.tension': 'Tension',
  'music.catalog.tag.dark': 'Dark',
  'music.catalog.tag.noir': 'Noir',
  'music.catalog.tag.calm': 'Calm',
  'music.catalog.note': 'All tracks: Kevin MacLeod (incompetech.com), licensed under Creative Commons Attribution 4.0. Re-encoded (80 kbps MP3).',
  // engine
  'music.engine.loadFailed': 'Could not load the audio file.',
  'music.engine.unavailable': 'Track not available.',
  // MusicBar
  'music.bar.aria': 'Music',
  'music.bar.loading': 'loading …',
  'music.bar.unlock': 'Enable audio',
  'music.bar.unmute': 'Unmute',
  'music.bar.mute': 'Mute',
  'music.bar.volume': 'Volume',
  'music.bar.credits': 'License and attribution',
};
