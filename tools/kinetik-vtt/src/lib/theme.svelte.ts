export type ThemeKey = 'noir' | 'terminal' | 'hybrid';
export const THEMES: ThemeKey[] = ['noir', 'terminal', 'hybrid'];

const STORAGE_KEY = 'kinetik.theme';

function load(): ThemeKey {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && (THEMES as string[]).includes(v)) return v as ThemeKey;
  } catch { /* Speicher gesperrt: Standard nehmen */ }
  return 'noir';
}

export const theme = $state<{ current: ThemeKey }>({ current: load() });

export function applyTheme(next: ThemeKey) {
  theme.current = next;
  document.documentElement.dataset.theme = next;
  const color = { noir: '#0b0c10', terminal: '#050807', hybrid: '#0b0c10' }[next];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignorieren */ }
}
