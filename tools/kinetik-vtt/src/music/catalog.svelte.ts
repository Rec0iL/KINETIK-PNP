import type { TrackRef } from './clock';
import { t } from '../i18n';
export { ALL_CATEGORIES, categoryLabel, categoryFilterLabel } from './categories';

export interface CatalogTrack extends TrackRef {
  category: string;
  tag: string;
  source?: string;
  licenseUrl?: string;
}

export const catalog = $state<{ tracks: CatalogTrack[]; note: string; ready: boolean }>({ tracks: [], note: '', ready: false });

export async function loadCatalog() {
  try {
    const res = await fetch(new URL('music/catalog.json', document.baseURI));
    const data = await res.json();
    catalog.tracks = data.tracks;
    // Der Hinweis im Katalog ist deutsch; angezeigt wird der Text der App-Sprache (gleicher Inhalt).
    catalog.note = data.note ? t('music.catalog.note') : '';
  } catch (e) {
    console.warn('Musikkatalog nicht ladbar', e);
  }
  catalog.ready = true;
}
