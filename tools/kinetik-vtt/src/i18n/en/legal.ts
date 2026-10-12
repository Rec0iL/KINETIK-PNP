import type { legal as deLegal } from '../de/legal';

export const legal: Record<keyof typeof deLegal, string> = {
  'legal.notice': 'This page is a German legal text and is only legally binding in German.',
  'legal.credits.title': 'Credits',
  'legal.credits.music': 'Music',
  'legal.credits.musicNote': 'All bundled tracks: Kevin MacLeod (incompetech.com), Creative Commons Attribution 4.0.',
  'legal.credits.musicLicense': 'Licensed under Creative Commons: By Attribution 4.0 License, {link}. Re-encoded for the app (MP3, 80 kbps).',
  'legal.credits.graphics': 'Graphics',
  'legal.credits.graphicsText': "The images in this app (home page, card art, sample map, portrait placeholder) were generated with the Krea 2 AI image model in ComfyUI, using the prompts from {script}.",
  'legal.credits.fonts': 'Fonts',
  'legal.credits.fontsText': 'Barlow, Barlow Condensed, Bebas Neue, Oswald, Press Start 2P, Silkscreen, VT323, Big Shoulders, Special Elite, Tektur, Noto Serif SC, Bangers, Rye, Arvo, Shippori Mincho, Zen Kaku Gothic New and Courier Prime (Google Fonts), SIL Open Font License 1.1.',
  'legal.credits.license': 'License',
  'legal.credits.licenseBefore': 'Rules text, rules data and images:',
  'legal.credits.licenseUrl': 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en',
  'legal.credits.licenseAfter': '(non-commercial). App source code: MIT. Source and details:',
  'legal.credits.software': 'Software',
  'legal.credits.softwareText': 'Svelte, Vite, PeerJS (WebRTC), idb-keyval. All under MIT-style licenses. The KINETIK rulebook and this app are part of the same project.',
};
