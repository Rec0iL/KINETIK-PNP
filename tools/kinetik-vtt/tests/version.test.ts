import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Die Version steht an vielen Stellen. Quelle ist der Untertitel des Regelwerks ("Version 3.6."); alles andere muss damit übereinstimmen.
const root = '../..';
const read = (p: string) => readFileSync(`${root}/${p}`, 'utf8');
const rulebook = read('regelwerk/KINETIK_Regelwerk.md');
const version = /Version\s+(\d+(?:\.\d+)*)/.exec(rulebook.slice(0, 600))?.[1] ?? '';

describe('Regelwerk-Version', () => {
  it('ist im Regelwerk gesetzt', () => {
    expect(version).toMatch(/^\d+\.\d+$/);
  });
  it('Regeldaten (data/*.json) tragen dieselbe Version', () => {
    for (const f of readdirSync(`${root}/data`).filter((x) => x.endsWith('.json'))) {
      const j = JSON.parse(read(`data/${f}`));
      if ('rules_version' in j) expect(j.rules_version, f).toBe(version);
    }
  });
  it('englische Übersetzung hat dieselbe Version und Struktur (scripts/check_translation.py)', () => {
    const en = read('regelwerk/KINETIK_Regelwerk.en.md');
    expect(/Version\s+(\d+(?:\.\d+)*)/.exec(en.slice(0, 600))?.[1]).toBe(version);
    const r = spawnSync('python3', [`${root}/scripts/check_translation.py`], { encoding: 'utf8' });
    expect(r.stdout + r.stderr, 'check_translation.py').toMatch(/^0 Fehler/m);
    expect(r.status).toBe(0);
  });
  it('Änderungsprotokoll nennt sie an oberster Stelle', () => {
    expect(/^## v(\d+\.\d+)/m.exec(read('CHANGELOG.md'))?.[1]).toBe(version);
  });
  it('README und Daten-README nennen sie', () => {
    expect(read('README.md')).toContain(`**v${version}**`);
    expect(read('data/README.md')).toContain(`Regelwerk v${version}`);
  });
  it('PDF-Links zeigen auf die aktuelle Fassung', () => {
    const links = [...read('README.md').matchAll(/export\/KINETIK_Regelwerk_v(\d+\.\d+)\.pdf/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(0);
    for (const v of links) expect(v).toBe(version);
    expect(read('assets/pdf/README.md')).toContain(`KINETIK_Regelwerk_v${version}.pdf`);
  });
  it('PDF-Projekte: Ausgabedatei und Cover-Text (Neo-Noir und alle Themes)', () => {
    const projects = ['assets/pdf', ...readdirSync(`${root}/assets/pdf-themes`).filter((d) => existsSync(`${root}/assets/pdf-themes/${d}/project.json`)).map((d) => `assets/pdf-themes/${d}`)];
    expect(projects.length).toBeGreaterThanOrEqual(10);
    for (const p of projects) {
      const c = JSON.parse(read(`${p}/project.json`));
      expect(c.tagline, p).toContain(`Version ${version}`);
      if (p === 'assets/pdf') expect(c.output, p).toContain(`v${version}.pdf`);
    }
  });
});
