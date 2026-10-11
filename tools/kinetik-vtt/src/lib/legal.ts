// Rechtliches: Betreiberangaben (privat, nur zur Build-Zeit eingebettet) und das Copyright (öffentlich).
// Die Angaben stehen nicht im Repository: vite.config.ts liest legal.local.json oder KINETIK_LEGAL_JSON und setzt __LEGAL__.

export interface Person {
  name: string;
  street: string;
  city: string;
  /** E-Mail Base64-kodiert, damit sie nicht im Klartext im Bundle steht (Scraper). */
  emailB64: string;
  phoneB64?: string;
}

export interface Operator extends Person {
  /** Freitext zum eigenen Webserver (Anbieter, Standort), erscheint in der Datenschutzerklärung. */
  hosting?: string;
  /** Zweiter Betreiber, wenn die Seite gemeinsam betrieben wird (Inhaber von Domain und Server). */
  partner?: Person;
}

declare const __LEGAL__: Operator | null;

/** Betreiberangaben für Impressum und Datenschutz; null, wenn der Build keine hat (z.B. ein Fork). */
export const operator: Operator | null = typeof __LEGAL__ === 'undefined' ? null : __LEGAL__;

export const COPYRIGHT_YEAR = '2026';
export const COPYRIGHT_HOLDER = 'Alexander Freidzon (Rec0iL)';
export const COPYRIGHT = `© ${COPYRIGHT_YEAR} ${COPYRIGHT_HOLDER}`;

export const REPO_URL = 'https://github.com/Rec0iL/KINETIK-PNP';

/** Dekodiert ein Base64-Feld der Betreiberangaben (E-Mail, Telefon), erst nach einem Klick auf der Seite. */
export function reveal(b64: string): string {
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
