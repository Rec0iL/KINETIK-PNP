// Minimaler Hash-Router (funktioniert auf github.io ohne Server-Konfiguration).
export interface Route {
  name: 'home' | 'characters' | 'character' | 'builder' | 'dice' | 'gm' | 'credits' | 'notfound';
  params: Record<string, string>;
}

function parse(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home', params: {} };
  switch (parts[0]) {
    case 'charaktere': return { name: 'characters', params: {} };
    case 'charakter': return parts[1] ? { name: 'character', params: { id: decodeURIComponent(parts[1]) } } : { name: 'characters', params: {} };
    case 'builder': return { name: 'builder', params: {} };
    case 'wuerfel': return { name: 'dice', params: {} };
    case 'sl': return { name: 'gm', params: {} };
    case 'credits': return { name: 'credits', params: {} };
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
