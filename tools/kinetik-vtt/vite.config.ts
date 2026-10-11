import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const dataDir = fileURLToPath(new URL('../../data', import.meta.url));

// Betreiberangaben für Impressum und Datenschutzerklärung: nicht im Repository. Quellen in dieser Reihenfolge:
// Umgebungsvariable KINETIK_LEGAL_JSON (GitHub-Secret im Pages-Workflow), die ungetrackte Datei legal.local.json
// (Vorlage: legal.example.json) und ~/.config/kinetik/legal.json (fester Ort für Rechner, die frisch aus GitHub bauen).
// Fehlt alles, bleibt der Build lauffähig, die Seite Impressum zeigt dann nur einen Hinweis.
function loadLegal(): Record<string, unknown> | null {
  const file = fileURLToPath(new URL('./legal.local.json', import.meta.url));
  const shared = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'kinetik', 'legal.json');
  const read = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8') : '');
  const raw = process.env.KINETIK_LEGAL_JSON?.trim() || read(file).trim() || read(shared).trim();
  if (!raw) {
    if (process.env.CI) console.warn('[legal] Keine Betreiberangaben (KINETIK_LEGAL_JSON fehlt): Impressum bleibt leer.');
    return null;
  }
  let v: unknown;
  try { v = JSON.parse(raw); } catch { throw new Error('[legal] legal.local.json / KINETIK_LEGAL_JSON ist kein gültiges JSON.'); }
  // E-Mail und Telefon liegen nur Base64-kodiert im Bundle: Scraper finden im ausgelieferten JS keine Adresse im Klartext.
  // Die Seite dekodiert erst nach einem Klick (src/ui/Reveal.svelte).
  const b64 = (x: string) => Buffer.from(x.trim(), 'utf8').toString('base64');
  const person = (o: Record<string, unknown>, where: string) => {
    for (const k of ['name', 'street', 'city', 'email']) {
      if (typeof o?.[k] !== 'string' || !(o[k] as string).trim()) throw new Error(`[legal] Feld "${k}" fehlt (${where}).`);
    }
    const phone = typeof o.phone === 'string' && o.phone.trim() ? b64(o.phone) : '';
    return { name: o.name as string, street: o.street as string, city: o.city as string, emailB64: b64(o.email as string), phoneB64: phone };
  };
  const o = v as Record<string, unknown>;
  const out: Record<string, unknown> = { ...person(o, 'Betreiber'), hosting: typeof o.hosting === 'string' ? o.hosting.trim() : '' };
  // Zweiter Betreiber (z. B. Inhaber von Domain und Server), nur in Builds für dessen Adresse
  if (o.partner) out.partner = person(o.partner as Record<string, unknown>, 'partner');
  return out;
}

// base './' macht die App unter jedem Unterpfad lauffähig (github.io/<repo>/).
export default defineConfig({
  base: './',
  plugins: [svelte()],
  define: { __LEGAL__: JSON.stringify(loadLegal()) },
  resolve: { alias: { '@data': dataDir } },
  server: { fs: { allow: ['../..'] } },
  build: { target: 'es2022', chunkSizeWarningLimit: 900 },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
