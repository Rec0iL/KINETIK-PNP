import type { Vitals, PlayerInfo } from '../net/protocol';
import type { Character } from './character';
import { computeSheet } from './sheet';

export function vitalsOf(c: Character): Vitals {
  const s = computeSheet(c);
  return {
    energie: c.resources.energie, energieMax: s.energieMax.value,
    wk: c.resources.wk, wkMax: s.wkMax.value,
    momentum: c.resources.momentum, momentumCap: s.momentumCap.value,
    schutz: c.resources.schutz.current, schutzMax: c.resources.schutz.max,
    injuries: s.injuryCount,
    ausgepumpt: s.states.ausgepumpt, gebrochen: s.states.gebrochen, sterbend: s.states.sterbend,
    tags: c.tags.map((t) => ({ name: t.name, size: t.size })),
    poisons: (c.poisons ?? []).map((p) => ({ level: p.level, delay: p.delay })),
    bonus: s.basicBonus,
  };
}

/** Kleines Porträt für die Gruppenleiste: die gespeicherten 320px reichen, werden aber nur mitgeschickt, wenn nötig. */
export function infoOf(c: Character, base: Pick<PlayerInfo, 'id' | 'name' | 'connected'> & Partial<PlayerInfo>): PlayerInfo {
  return {
    ...base,
    characterName: c.name,
    alias: c.alias || undefined,
    portrait: c.portrait,
    titles: c.titles.map((t) => `${t.name} L${t.level}`).join(' · ') || undefined,
    vitals: vitalsOf(c),
  };
}
