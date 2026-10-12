// Kategorien der mitgelieferten Musik: public/music/catalog.json hat je Titel eine sprachneutrale Kennung `tag`
// (combat, chase, ...) und eine deutsche `category`. Gefiltert wird über `tag`, angezeigt mit categoryLabel().
import { t, type Key } from '../i18n';

/** Filterwert "alle Kategorien" (kein Tag des Katalogs heißt so). */
export const ALL_CATEGORIES = 'all';

const TAG_KEY: Record<string, Key> = {
  combat: 'music.catalog.tag.combat',
  chase: 'music.catalog.tag.chase',
  stealth: 'music.catalog.tag.stealth',
  tension: 'music.catalog.tag.tension',
  dark: 'music.catalog.tag.dark',
  noir: 'music.catalog.tag.noir',
  calm: 'music.catalog.tag.calm',
};

/** Name der Kategorie in der Sprache der App: bekannte Kennungen übersetzt, sonst die `category` aus dem Katalog. */
export function categoryLabel(track: { tag?: string; category?: string }): string {
  const key = track.tag && Object.prototype.hasOwnProperty.call(TAG_KEY, track.tag) ? TAG_KEY[track.tag] : undefined;
  return key ? t(key) : (track.category ?? track.tag ?? '');
}

/** Beschriftung eines Filterwerts (Kennung oder ALL_CATEGORIES). */
export function categoryFilterLabel(tag: string): string {
  return tag === ALL_CATEGORIES ? t('music.catalog.all') : categoryLabel({ tag });
}
