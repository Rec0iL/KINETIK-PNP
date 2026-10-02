// Absolute URL (auch in url() von Stylesheet-Variablen und unter Unterpfaden korrekt).
export const art = (name: string) => new URL(`art/${name}.webp`, document.baseURI).href;
export const PORTRAIT_PLACEHOLDER = art('portrait');
