import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { THEMES, THEME_INFO } from '../src/lib/theme.svelte';
import { de } from '../src/i18n/de';

const css = readFileSync('src/themes/themes.css', 'utf8');
const fontsCss = readFileSync('src/themes/fonts-themes.css', 'utf8');
const ART = ['hero', 'card-player', 'card-join', 'card-gm', 'card-builder', 'portrait'];
const REQUIRED = ['--bg', '--panel', '--ink', '--accent', '--accent-2', '--line', '--font-display', '--font-head', '--font-body', '--field-bg', '--track-bg', '--header-bg', '--die-a', '--die-b', '--die-pip', '--card-fade-a'];

/** Block eines Themes: bei noir der :root-Block mit allen Standardwerten. */
function block(key: string) {
  const sel = key === 'noir' ? ':root,\n:root[data-theme=\'noir\']' : `:root[data-theme='${key}']`;
  const start = css.indexOf(sel);
  expect(start, `Block für ${key}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf('\n}', start));
}

describe('Themes', () => {
  it('es gibt zehn Themes mit Beschriftung', () => {
    expect(THEMES.length).toBe(10);
    for (const k of THEMES) expect(de[`theme.${k}` as keyof typeof de], k).toBeTruthy();
  });
  for (const key of THEMES) {
    it(`${key}: Farben, Schriften und Flächen vollständig (noir liefert die Standardwerte)`, () => {
      const own = block(key);
      const base = block('noir');
      for (const t of REQUIRED) expect(own.includes(t + ':') || base.includes(t + ':'), `${t} in ${key}`).toBe(true);
    });
    it(`${key}: Bildsatz ${THEME_INFO[key].art} komplett`, () => {
      for (const n of ART) expect(existsSync(`public/art/${THEME_INFO[key].art}/${n}.webp`), `${THEME_INFO[key].art}/${n}`).toBe(true);
    });
  }
  it('jede gebündelte Schrift der Theme-Schriften existiert', () => {
    const files = [...fontsCss.matchAll(/url\('\.\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(existsSync(`src/assets/fonts/${f}`), f).toBe(true);
  });
  it('kein Theme setzt eine Schrift ohne @font-face, die nicht systemweit sicher ist', () => {
    const fams = [...css.matchAll(/--font-(?:display|head|body):\s*'([^']+)'/g)].map((m) => m[1]);
    for (const f of new Set(fams)) {
      const known = css.includes(`'${f}'`) && (fontsCss.includes(`font-family: '${f}'`) || readFileSync('src/themes/fonts.css', 'utf8').includes(`font-family: '${f}'`));
      expect(known, `@font-face für ${f}`).toBe(true);
    }
  });
});
