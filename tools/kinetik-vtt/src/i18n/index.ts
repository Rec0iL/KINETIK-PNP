import { de, type Key } from './de';

const dict: Record<string, string> = de;

/** Übersetzt einen Schlüssel, ersetzt {name}-Platzhalter. */
export function t(key: Key, params?: Record<string, string | number>): string {
  let s = dict[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export type { Key };
