// Regelwerk als HTML (gebaut von scripts/build_rulebook_web.py). Lädt erst, wenn es gebraucht wird.
import { theme, THEME_INFO } from '../lib/theme.svelte';
export interface RbSection { id: string; title: string; html: string; image: string | null; fill: string | null }
export interface RbChapter {
  id: string; number: number | null; title: string; subtitle: string; appendix: boolean;
  image: string | null; fill: string | null; html: string; sections: RbSection[];
}
export interface RbData {
  version: string; title: string; intro: string; cover: string | null; pdf: string | null; chapters: RbChapter[];
  /** Bildsätze je Theme: Schlüssel der Bilder, die es unter img/<theme>/ gibt. */
  themed?: Record<string, string[]>;
}

export const rulebook = $state<{
  open: boolean;
  wide: boolean;
  data: RbData | null;
  loading: boolean;
  error: string;
  /** Beim Öffnen dorthin springen (Abschnitts- oder Kapitel-ID). */
  target: string;
  /** Zähler, damit auch dasselbe Ziel erneut anspringt. */
  jump: number;
}>({ open: false, wide: false, data: null, loading: false, error: '', target: '', jump: 0 });

let promise: Promise<void> | null = null;

export function loadRulebook(): Promise<void> {
  if (rulebook.data) return Promise.resolve();
  if (promise) return promise;
  rulebook.loading = true;
  promise = fetch(new URL('rulebook/rulebook.json', document.baseURI))
    .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then((d: RbData) => { rulebook.data = absolutize(d); })
    .catch((e) => { rulebook.error = `Regelwerk nicht ladbar (${(e as Error).message}).`; promise = null; })
    .finally(() => { rulebook.loading = false; });
  return promise;
}

/** Öffnet das Regelwerk, optional an einem Abschnitt (z.B. 'sec-2-4-charaktererschaffung'). */
export function openRulebook(target = '') {
  rulebook.open = true;
  if (target) { rulebook.target = target; rulebook.jump++; }
  void loadRulebook();
}
export const closeRulebook = () => { rulebook.open = false; };
export const toggleRulebook = () => (rulebook.open ? closeRulebook() : openRulebook());

/** Bilder im Text verweisen relativ auf rulebook/img: auf absolute Adressen umstellen, sonst findet die Seite sie nicht. */
function absolutize(d: RbData): RbData {
  const fix = (html: string) => html.replace(/(<img[^>]*\ssrc=")img\//g, `$1${rbUrl('img/')}`);
  d.intro = fix(d.intro);
  for (const c of d.chapters) {
    c.html = fix(c.html);
    for (const s of c.sections) s.html = fix(s.html);
  }
  return d;
}

export const rbUrl = (path: string) => new URL(`rulebook/${path}`, document.baseURI).href;

/** Bildsatz des gewählten Themes (z.B. 'wushu'), falls es einen gibt. */
const themeSet = () => (rulebook.data?.themed ?? {})[THEME_INFO[theme.current].art] ?? null;

/** Adresse eines Regelwerk-Bilds im Stil des gewählten Themes. Fehlt dem Satz ein Bild, gilt das Standardbild. Reaktiv auf den Themewechsel. */
export function rbImg(path: string | null): string | null {
  if (!path) return null;
  const set = themeSet();
  const key = path.replace(/^img\//, '').replace(/\.webp$/, '');
  return rbUrl(set?.includes(key) ? `img/${THEME_INFO[theme.current].art}/${key}.webp` : path);
}

/** Füllbilder gibt es nur im Standardstil (sie sind auf die PDF-Lücken zugeschnitten): bei einem eigenen Bildsatz entfallen sie. */
export const rbFill = (path: string | null): string | null => (path && !themeSet() ? rbUrl(path) : null);

/** Reiner Text eines HTML-Abschnitts für die Suche. */
export function plainText(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim();
}
