// Sprache der App. Sie steht beim Start fest und wird nur über einen Neustart der Seite gewechselt: Dadurch müssen weder
// Tabellen auf Modulebene noch Regeldaten, Canvas-Texte oder Listen in <script> auf einen Wechsel reagieren.
export type Locale = 'de' | 'en';
export const LOCALES: readonly Locale[] = ['de', 'en'];
export const LOCALE_LABEL: Record<Locale, string> = { de: 'Deutsch', en: 'English' };
/** Formatierungssprache für Zahlen, Datum und Uhrzeit. */
export const BCP47: Record<Locale, string> = { de: 'de-DE', en: 'en-GB' };

const KEY = 'kinetik.lang';

export const isLocale = (v: unknown): v is Locale => v === 'de' || v === 'en';

/** Reihenfolge: ?lang=xx (wird gemerkt), gespeicherte Wahl, Browsersprachen (de bleibt de, alles andere wird englisch). */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'de';   // Tests und Build laufen deutsch
  try {
    const q = new URLSearchParams(window.location.search).get('lang');
    if (isLocale(q)) {
      try { localStorage.setItem(KEY, q); } catch { /* ohne Speicher nur für diesen Besuch */ }
      return q;
    }
  } catch { /* ignorieren */ }
  try {
    const saved = localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch { /* ignorieren */ }
  const prefs = (typeof navigator !== 'undefined' && navigator.languages?.length ? navigator.languages : [navigator?.language ?? '']) as readonly string[];
  for (const l of prefs) {
    const p = l.toLowerCase().slice(0, 2);
    if (p === 'de' || p === 'en') return p;
  }
  return 'en';
}

let current: Locale = detectLocale();
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLocale = (): Locale => current;

/** Nur für Tests: Sprache umstellen, ohne die Seite neu zu laden. */
export function setLocaleForTests(l: Locale): void { current = l; }

/** Sprache wechseln: merkt sich die Wahl und lädt die Seite neu (siehe oben). */
export function changeLocale(l: Locale): void {
  if (l === current) return;
  try { localStorage.setItem(KEY, l); } catch { /* ignorieren */ }
  const url = new URL(window.location.href);
  url.searchParams.delete('lang');
  window.location.replace(url.toString());
}
