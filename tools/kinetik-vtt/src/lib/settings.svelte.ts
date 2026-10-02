// Kleine Einstellungen pro Browser (nicht Teil des Charakters).
const KEY = 'kinetik.settings';

interface Settings {
  /** Verletzung zieht automatisch 1 WK ab (Schock). */
  autoShock: boolean;
  /** Anzeigename in Runden (Würfelwürfe, Teilnehmerliste). */
  displayName: string;
}

function load(): Settings {
  const d: Settings = { autoShock: true, displayName: '' };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...d, ...JSON.parse(raw) };
  } catch { /* ignorieren */ }
  return d;
}

export const settings = $state<Settings>(load());

$effect.root(() => {
  $effect(() => {
    const snap = $state.snapshot(settings);
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* ignorieren */ }
  });
});
