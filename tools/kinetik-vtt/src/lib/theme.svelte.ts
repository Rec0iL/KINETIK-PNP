export type ThemeKey = 'noir' | 'sincity' | 'manga' | 'wushu' | 'ukiyo' | 'western' | 'akte' | 'pixel' | 'terminal' | 'hybrid';

/** color: Browserleiste (meta theme-color), art: Bildsatz in public/art/<art>/, pixelArt: Bilder ohne Glättung skalieren. */
export const THEME_INFO: Record<ThemeKey, { color: string; art: string; pixelArt?: boolean }> = {
  noir: { color: '#0b0c10', art: 'noir' },
  sincity: { color: '#000000', art: 'sincity' },
  manga: { color: '#f1eee6', art: 'manga' },
  wushu: { color: '#e8dec6', art: 'wushu' },
  ukiyo: { color: '#0e2135', art: 'ukiyo' },
  western: { color: '#170f0a', art: 'western' },
  akte: { color: '#d9c8a0', art: 'akte' },
  pixel: { color: '#1a1c2c', art: 'pixel', pixelArt: true },
  terminal: { color: '#030605', art: 'terminal' },
  hybrid: { color: '#07061a', art: 'hybrid' },
};
export const THEMES = Object.keys(THEME_INFO) as ThemeKey[];

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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_INFO[next].color);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignorieren */ }
}
