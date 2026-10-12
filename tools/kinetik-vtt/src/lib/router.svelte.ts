// Minimaler Hash-Router (funktioniert auf github.io ohne Server-Konfiguration).
// Die deutschen Pfade sind die Links, die geteilt werden (#/beitreten/<code>); die englischen Namen sind Aliase dafür.
export interface Route {
  name: 'home' | 'create' | 'wizard' | 'join' | 'round' | 'characters' | 'character' | 'builder' | 'dice' | 'gm' | 'credits' | 'impressum' | 'datenschutz' | 'notfound';
  params: Record<string, string>;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home', params: {} };
  switch (parts[0]) {
    case 'charaktere':
    case 'characters': return { name: 'characters', params: {} };
    case 'charakter':
    case 'character': return parts[1] ? { name: 'character', params: { id: decodeURIComponent(parts[1]) } } : { name: 'characters', params: {} };
    case 'builder': return { name: 'builder', params: {} };
    case 'wuerfel':
    case 'dice': return { name: 'dice', params: {} };
    case 'neu':
    case 'new': return { name: 'create', params: {} };
    case 'wizard': return parts[1] ? { name: 'wizard', params: { id: decodeURIComponent(parts[1]), step: parts[2] ?? '1' } } : { name: 'create', params: {} };
    case 'sl':
    case 'gm': return { name: 'gm', params: {} };
    case 'beitreten':
    case 'join': return { name: 'join', params: { code: parts[1] ?? '' } };
    case 'runde':
    case 'round': return { name: 'round', params: {} };
    case 'credits': return { name: 'credits', params: {} };
    case 'impressum':
    case 'imprint': return { name: 'impressum', params: {} };
    case 'datenschutz':
    case 'privacy': return { name: 'datenschutz', params: {} };
    default: return { name: 'notfound', params: {} };
  }
}

export const router = $state<{ route: Route }>({ route: parse(location.hash) });

window.addEventListener('hashchange', () => {
  router.route = parse(location.hash);
  window.scrollTo({ top: 0 });
});

export function navigate(path: string) {
  location.hash = path.startsWith('#') ? path : `#${path}`;
}
