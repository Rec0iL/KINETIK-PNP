import { theme, THEME_INFO } from './theme.svelte';

// Absolute URL (auch in url() von Stylesheet-Variablen und unter Unterpfaden korrekt).
const url = (path: string) => new URL(`art/${path}.webp`, document.baseURI).href;

/** Bild des aktuellen Themes (hero, card-player, card-join, card-gm, card-builder, portrait). Reaktiv auf den Themewechsel. */
export const art = (name: string) => url(`${THEME_INFO[theme.current].art}/${name}`);
/** Themenunabhängige Bilder (Karten). */
export const sharedArt = (name: string) => url(name);
export const portraitPlaceholder = () => art('portrait');
