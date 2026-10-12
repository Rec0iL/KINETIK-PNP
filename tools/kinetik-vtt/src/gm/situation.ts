// Kampfsituationen: ein geplanter Angriff oder eine Aktion eines Spielers, bzw. ein Angriff eines Gegners auf einen Spieler.
// Rein, ohne DOM: Modifikatoren, Clash, Vorschlag der Folgen (3.1 bis 3.10) und deren Anwendung.
import {
  resolveClash, resolveHit, tagBonus, ueberzahlBonus, newPoison, GIFT, TAG, tagLabel, sameTag,
  type AttrKey, type ClashResult, type GiftLevel, type HitKind, type Poison, type ZoneKey,
} from '../rules';
import type { PatchOp } from '../net/protocol';
import { t, tn } from '../i18n';
import {
  bedraengnisHit, npcInjury, npcStatus, tagSize, type CombatState, type Npc, type Side,
} from './combat';

export type SitKind = 'attack' | 'defend' | 'breath' | 'gather';
export type SitStatus = 'planned' | 'released' | 'rolled' | 'resolved' | 'cancelled';
export type BtOption = 'zone' | 'ep' | 'momentum';

export const KIND_LABEL: Record<SitKind, string> = {
  attack: t('gm.sit.kind.attack'), defend: t('gm.sit.kind.defend'), breath: t('gm.sit.kind.breath'), gather: t('gm.sit.kind.gather'),
};
export const BT_LABEL: Record<BtOption, string> = {
  zone: t('gm.sit.bt.zone'), ep: t('gm.sit.bt.ep'), momentum: t('gm.sit.bt.momentum'),
};

/** Ein Wurf, wie ihn die Situation braucht: Augensumme getrennt von Bonus und Modifikator. */
export interface SitRoll { id: string; dice: number; bonus: number; mod: number }

export interface Situation {
  id: string;
  round: number;
  createdAt: number;
  kind: SitKind;
  /** Der beteiligte Spielercharakter (Spieler-ID). */
  playerId: string;
  /** Angriff: das Ziel. Verteidigung: der Angreifer. */
  npcId: string | null;
  attr: AttrKey;
  technique: string;
  /** Vorgemerkter Move, der vor dem Clash wirkt (wird vom Spieler vorab bezahlt). */
  moveName: string;
  /** Tags des Gegners (Angriff) bzw. des Spielers (Verteidigung), die der Angreifer ausnutzt. */
  tagsUsed: string[];
  /** Erleichtern (+) oder Erschweren (−) für den Spieler. */
  mod: number;
  modReason: string;
  /** Verteidigung: wie viele Gegner greifen gemeinsam an (Überzahl, 3.7). */
  attackers: number;
  bullet?: { option?: BtOption; zone?: ZoneKey };
  /** Heldenhafte Gegenwehr (3 Momentum, 3.5). */
  hero: boolean;
  /** Gift des Angreifers (aus dem Move oder vom SL gesetzt, 3.11). */
  gift?: { level: GiftLevel; delay: number; ignoresSchutz: boolean };
  /** Mehrzielangriff (5.1) oder Fläche (3.14): weitere Ziele würfeln einzeln. */
  area?: 'ziele' | 'flaeche';
  status: SitStatus;
  pRoll?: SitRoll;
  nRoll?: SitRoll;
  result?: ClashResult;
  proposal?: ProposalItem[];
}

export interface MoveRequest {
  id: string;
  playerId: string;
  tokenId: string;
  name: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// ---------- Folgen ----------
export type Effect =
  | { k: 'npcHit'; npcId: string; hit: HitKind; zone: ZoneKey }
  | { k: 'goonOut'; npcId: string; n: number; tokenIds: string[] }
  | { k: 'pcHit'; playerId: string; hit: HitKind; zone: ZoneKey; why: string }
  | { k: 'pcRes'; playerId: string; momentum?: number; energie?: number; wk?: number }
  | { k: 'bedr'; playerId: string; value: number }
  | { k: 'marker'; side: Side }
  | { k: 'done'; id: string }
  | { k: 'exposed'; playerId: string; on: boolean }
  | { k: 'tag'; who: 'pc' | 'npc'; id: string; name: string }
  | { k: 'poison'; who: 'pc' | 'npc'; id: string; poison: Poison }
  | { k: 'note' };

export interface ProposalItem {
  id: string;
  label: string;
  on: boolean;
  /** Punkte einer Gruppe schließen sich aus (z.B. Schlagabtausch: beide treffen oder Nachteils-Tag). */
  group?: string;
  effect: Effect;
}

// ---------- Modifikatoren ----------
export interface TagRef { name: string; size: 'klein' | 'gross' }

/** Bonus aus den genutzten Tags (klein +1, groß +2, Stapel höchstens +3). */
export function usedTagBonus(used: string[], available: TagRef[]): number {
  let small = 0;
  let large = 0;
  for (const name of used) {
    const t = available.find((x) => sameTag(x.name, name));
    if (!t) continue;
    if (t.size === 'gross') large++;
    else small++;
  }
  return tagBonus(small, large);
}

export const npcTags = (n: Npc): TagRef[] => n.tags.map((t) => ({ name: t, size: tagSize(t) }));

/** Modifikator auf den Wurf des Spielers: SL-Modifikator plus Tags des Gegners (nur beim Angriff). */
export function playerRollMod(sit: Situation, npc: Npc | null): number {
  const tags = sit.kind === 'attack' && npc ? usedTagBonus(sit.tagsUsed, npcTags(npc)) : 0;
  return sit.mod + tags;
}

/** Modifikator auf den Wurf des Gegners: Tags am Spieler, Überzahl, +1 gegen einen Erschöpften. */
export function npcRollMod(sit: Situation, c: CombatState, pcTags: TagRef[]): number {
  const tags = sit.kind === 'defend' ? usedTagBonus(sit.tagsUsed, pcTags) : 0;
  const over = sit.kind === 'defend' ? ueberzahlBonus(Math.max(1, sit.attackers)) : 0;
  return tags + over + (c.exposed[sit.playerId] ? 1 : 0);
}

// ---------- Bullet Time ----------
export const canGrantBulletTime = (c: CombatState, playerId: string) => c.active && c.bulletTime[playerId] !== c.round;

/** Gibt Bullet Time frei. `false`, wenn der Spieler sie in dieser Runde schon hatte. */
export function grantBulletTime(c: CombatState, sit: Situation): boolean {
  if (!canGrantBulletTime(c, sit.playerId) || sit.bullet) return false;
  c.bulletTime[sit.playerId] = c.round;
  sit.bullet = {};
  return true;
}

// ---------- Anlegen und Freigeben ----------
export interface Draft {
  kind: SitKind;
  npcId: string | null;
  attr: AttrKey;
  technique: string;
  moveName: string;
  tagsUsed: string[];
  /** Gift-Move: Stufe und Verzögerung aus dem vorgemerkten Move. */
  gift?: { level: GiftLevel; delay: number };
  /** Der vorgemerkte Move trifft mehrere Ziele oder eine Fläche. */
  area?: 'ziele' | 'flaeche';
}

export function createSituation(c: CombatState, id: string, playerId: string, d: Draft): Situation {
  const needsTarget = d.kind === 'attack' || d.kind === 'defend';
  const sit: Situation = {
    id, round: c.round, createdAt: Date.now(), kind: d.kind, playerId, npcId: needsTarget ? d.npcId : null,
    attr: d.attr, technique: d.technique.slice(0, 200), moveName: d.moveName.slice(0, 80), tagsUsed: d.tagsUsed.slice(0, 6),
    mod: 0, modReason: '', attackers: 1, hero: false,
    gift: d.gift && needsTarget ? { level: d.gift.level, delay: d.gift.delay, ignoresSchutz: false } : undefined,
    area: d.area && d.kind === 'attack' ? d.area : undefined,
    status: c.autoRelease ? 'released' : 'planned',
  };
  c.situations.push(sit);
  if (c.situations.length > 80) c.situations.splice(0, c.situations.length - 80);
  return sit;
}

export const isOpen = (s: Situation) => s.status === 'planned' || s.status === 'released' || s.status === 'rolled';

/** Sichtbar für den Spieler: nur die eigenen und nie verworfene alte Runden. */
export function situationsOf(c: CombatState, playerId: string): Situation[] {
  return c.situations.filter((s) => s.playerId === playerId && (isOpen(s) || s.round === c.round));
}

// ---------- Würfe und Auswertung ----------
export function rollToSit(id: string, total: number, bonus: number, mod: number): SitRoll {
  return { id, dice: total - bonus - mod, bonus, mod };
}

export function computeResult(sit: Situation): ClashResult | null {
  if (!sit.pRoll || !sit.nRoll) return null;
  const p = { dice: sit.pRoll.dice, bonus: sit.pRoll.bonus, mod: sit.pRoll.mod, isPlayer: true };
  const n = { dice: sit.nRoll.dice, bonus: sit.nRoll.bonus, mod: sit.nRoll.mod, isPlayer: false };
  const playerAttacks = sit.kind === 'attack';
  return resolveClash({ attacker: playerAttacks ? p : n, defender: playerAttacks ? n : p, heldenhafteGegenwehr: sit.hero });
}

let itemSeq = 0;
const iid = () => `p${++itemSeq}`;

export interface ProposeInput {
  sit: Situation;
  npc: Npc | null;
  pcName: string;
  pcSchutz: number;
  pcBedraengnis: number;
  /** Gegner-Token (Goons), dem Angreifer nach Abstand sortiert. */
  nearTokens?: string[];
  exposedUsed?: boolean;
}

/** Folgen eines Clashs oder einer Aktion als Liste von Vorschlägen. Der SL hakt ab und wendet sie an. */
export function proposeResolution(i: ProposeInput): ProposalItem[] {
  const { sit, npc, pcName } = i;
  const out: ProposalItem[] = [];
  const add = (label: string, effect: Effect, on = true, group?: string) => out.push({ id: iid(), label, on, group, effect });
  const pc = sit.playerId;
  const bulletZone: ZoneKey | undefined = sit.bullet?.option === 'zone' ? sit.bullet.zone : undefined;

  if (sit.kind === 'breath' || sit.kind === 'gather') {
    if (sit.kind === 'breath') add(t('gm.sit.p.breath', { name: pcName }), { k: 'pcRes', playerId: pc, energie: 2 });
    else add(t('gm.sit.p.gather', { name: pcName }), { k: 'pcRes', playerId: pc, wk: 2 });
    add(t('gm.sit.p.exposedOn', { name: pcName }), { k: 'exposed', playerId: pc, on: true });
    add(t('gm.sit.p.acted', { name: pcName }), { k: 'done', id: pc });
    return out;
  }

  const res = sit.result;
  if (!res || !npc) return out;
  const pcAttacks = sit.kind === 'attack';
  const o = res.outcome;
  const npcName = npc.name;
  const goon = npc.type === 'goon';
  const dominant = o === 'dominanz' || o === 'perfekterKonter';
  const attackerHits = o === 'dominanz' || o === 'schlagabtausch';
  const bothHit = o === 'schlagabtausch';
  const pcWins = pcAttacks ? o === 'dominanz' : o === 'konter' || o === 'perfekterKonter';

  if (res.noRoll) add(t('gm.sit.p.noRoll'), { k: 'note' }, false);
  if (res.limited) add(t('gm.sit.p.limited'), { k: 'note' }, false);

  const hitOnPc = (outcome: typeof o, delta: number, thr: number, group?: string, on = true): HitKind | null => {
    if (goon) {
      const r = bedraengnisHit(i.pcBedraengnis);
      if (r.result === 'erster') {
        add(t('gm.sit.p.goonFirst', { name: pcName, res: i.pcSchutz > 0 ? t('gm.sit.p.resProtection') : t('gm.sit.p.resWp') }), { k: 'pcHit', playerId: pc, hit: i.pcSchutz > 0 ? 'schutz' : 'wk', zone: 'torso', why: t('gm.sit.why.goons') }, on, group);
      } else {
        add(t('gm.sit.p.goonSecond', { name: pcName }), { k: 'pcHit', playerId: pc, hit: 'verletzung', zone: 'torso', why: t('gm.sit.why.goons') }, on, group);
      }
      add(t('gm.sit.p.pressure', { name: pcName, n: r.counter }), { k: 'bedr', playerId: pc, value: r.counter }, on, group);
      return r.result === 'erster' ? (i.pcSchutz > 0 ? 'schutz' : 'wk') : 'verletzung';
    }
    const h = resolveHit({ outcome, delta, t: thr, schutz: i.pcSchutz });
    add(`${pcName}: ${h.text}`, { k: 'pcHit', playerId: pc, hit: h.kind, zone: 'torso', why: t('gm.sit.why.hitBy', { name: npcName }) }, on, group);
    return h.kind;
  };

  const hitOnNpc = (outcome: typeof o, delta: number, thr: number, group?: string, on = true): HitKind | null => {
    if (goon) {
      // Dominanz und perfekter Konter sind die großen Siege: 2 Goons, der SL darf auf 3 erhöhen (3.7).
      const big = outcome === 'dominanz' || outcome === 'perfekterKonter';
      const n = big ? 2 : 1;
      const tokenIds = (i.nearTokens ?? []).slice(0, n);
      add(t(big ? 'gm.sit.p.goonOutBig' : 'gm.sit.p.goonOut', { name: npcName, n }), { k: 'goonOut', npcId: npc.id, n, tokenIds }, on, group);
      return null;
    }
    const h = resolveHit({ outcome, delta, t: thr, schutz: npc.schutz });
    add(`${npcName}: ${h.text}`, { k: 'npcHit', npcId: npc.id, hit: h.kind, zone: bulletZone ?? 'torso' }, on, group);
    return h.kind;
  };

  // Wer trifft wen?
  const hitter: 'attacker' | 'defender' = attackerHits ? 'attacker' : 'defender';
  const hDelta = hitter === 'attacker' ? res.delta : -res.delta;
  const hT = hitter === 'attacker' ? res.tA : res.tV;
  const pcIsHitter = (hitter === 'attacker') === pcAttacks;
  const mainHit = pcIsHitter ? hitOnNpc(o, hDelta, hT) : hitOnPc(o, hDelta, hT);

  // Gift (3.11): wirkt nur, wenn der Treffer des Angreifers den Körper erreicht (Schutz 0 oder Verletzung).
  if (sit.gift && hitter === 'attacker' && !(pcAttacks && goon)) {
    const targetSchutz = pcAttacks ? npc.schutz : i.pcSchutz;
    const reaches = sit.gift.ignoresSchutz || mainHit === 'verletzung' || targetSchutz === 0;
    const target = pcAttacks ? { who: 'npc' as const, id: npc.id, name: npcName } : { who: 'pc' as const, id: pc, name: pcName };
    const poison = newPoison(`g${sit.id}`, sit.gift.level, sit.gift.delay, pcAttacks ? pcName : npcName);
    const later = sit.gift.delay ? tn('gm.sit.p.poisonDelay', sit.gift.delay) : t('gm.sit.p.poisonEndOfRound');
    add(
      reaches
        ? t('gm.sit.p.poisoned', { name: target.name, level: GIFT[sit.gift.level].label, later })
        : t('gm.sit.p.poisonBlocked', { name: target.name }),
      { k: 'poison', who: target.who, id: target.id, poison },
      reaches,
    );
  }

  if (bothHit) {
    // Schlagabtausch (3.1): beide treffen, oder der Angreifer bekommt einen kleinen Nachteils-Tag.
    if (pcAttacks) hitOnPc('schlagabtausch', 0, res.tV, 'sa');
    else hitOnNpc('schlagabtausch', 0, res.tV, 'sa');
    if (pcAttacks) add(t('gm.sit.p.offBalance', { name: pcName, tag: tagLabel(TAG.offBalance) }), { k: 'tag', who: 'pc', id: pc, name: tagLabel(TAG.offBalance) }, false, 'sa');
    else add(t('gm.sit.p.offBalance', { name: npcName, tag: tagLabel(TAG.offBalance) }), { k: 'tag', who: 'npc', id: npc.id, name: tagLabel(TAG.offBalance) }, false, 'sa');
  }

  if (pcWins) add(t('gm.sit.p.pcWins', { name: pcName }), { k: 'bedr', playerId: pc, value: 0 });

  if (res.rewards) {
    const pcSide = (res.rewards.side === 'attacker') === pcAttacks;
    if (pcSide) {
      const r = res.rewards;
      const bits = [
        t('gm.sit.p.rewardMomentum', { n: r.momentum }),
        r.energie ? t('gm.sit.p.rewardEnergy', { n: r.energie }) : '',
        r.wk ? t('gm.sit.p.rewardWp', { n: r.wk }) : '',
      ].filter(Boolean).join(', ');
      add(t('gm.sit.p.rewards', { name: pcName, bits }), { k: 'pcRes', playerId: pc, momentum: r.momentum, energie: r.energie, wk: r.wk });
    }
  }
  if (res.marker) {
    const pcGets = (res.marker === 'attacker') === pcAttacks;
    add(t(pcGets ? 'gm.sit.p.markerPlayers' : 'gm.sit.p.markerEnemies'), { k: 'marker', side: pcGets ? 'players' : 'enemies' });
  }

  if (sit.area) {
    add(
      sit.area === 'flaeche'
        ? t('gm.sit.p.area')
        : t('gm.sit.p.multi'),
      { k: 'note' },
      false,
    );
  }
  if (sit.bullet?.option === 'momentum') add(t('gm.sit.p.bulletMomentum', { name: pcName }), { k: 'pcRes', playerId: pc, momentum: 1 });
  if (sit.bullet?.option === 'ep') add(t('gm.sit.p.bulletEp'), { k: 'note' }, false);
  if (sit.bullet?.option === 'zone' && !bulletZone) add(t('gm.sit.p.bulletZone'), { k: 'note' }, false);

  if (i.exposedUsed) add(t('gm.sit.p.exposedUsed', { name: pcName }), { k: 'exposed', playerId: pc, on: false });
  add(t('gm.sit.p.acted', { name: pcAttacks ? pcName : npcName }), { k: 'done', id: pcAttacks ? pc : npc.id });
  return out;
}

// ---------- Anwenden ----------
/** Patch-Befehle für einen Spielerbogen aus einer Folge. */
export function pcOps(e: Extract<Effect, { k: 'pcHit' | 'pcRes' }>): PatchOp[] {
  if (e.k === 'pcRes') {
    const ops: PatchOp[] = [];
    if (e.momentum) ops.push({ op: 'add', key: 'momentum', delta: e.momentum });
    if (e.energie) ops.push({ op: 'add', key: 'energie', delta: e.energie });
    if (e.wk) ops.push({ op: 'add', key: 'wk', delta: e.wk });
    return ops;
  }
  switch (e.hit) {
    case 'verletzung': return [{ op: 'injury', zone: e.zone, text: e.why }];
    case 'abgefangen': return [{ op: 'add', key: 'schutz', delta: -1 }, { op: 'add', key: 'wk', delta: -1 }];
    case 'schutz': return [{ op: 'add', key: 'schutz', delta: -1 }];
    case 'wk': return [{ op: 'add', key: 'wk', delta: -1 }];
  }
}

export interface Applied {
  /** Änderungen an Spielerbögen. */
  patches: { playerId: string; ops: PatchOp[] }[];
  /** Tokens, die von der Karte verschwinden (ausgeschaltete Goons). */
  removeTokens: string[];
  /** Spieler, die einen Tag bekommen sollen. */
  notes: string[];
}

/** Wendet die angehakten Folgen auf den Kampfzustand an. Spielerbögen und Karte erledigt der Aufrufer. */
export function applyProposal(c: CombatState, items: ProposalItem[]): Applied {
  const res: Applied = { patches: [], removeTokens: [], notes: [] };
  const patch = (playerId: string, ops: PatchOp[]) => { if (ops.length) res.patches.push({ playerId, ops }); };
  for (const it of items) {
    if (!it.on) continue;
    const e = it.effect;
    switch (e.k) {
      case 'npcHit': {
        const n = c.npcs.find((x) => x.id === e.npcId);
        if (!n) break;
        if (e.hit === 'verletzung') { if (!npcInjury(n, e.zone)) n.wk = Math.max(0, n.wk - 1); }
        else if (e.hit === 'abgefangen') { n.schutz = Math.max(0, n.schutz - 1); n.wk = Math.max(0, n.wk - 1); }
        else if (e.hit === 'schutz') n.schutz = Math.max(0, n.schutz - 1);
        else n.wk = Math.max(0, n.wk - 1);
        break;
      }
      case 'goonOut': {
        const n = c.npcs.find((x) => x.id === e.npcId);
        if (!n) break;
        const k = e.tokenIds.length || e.n;
        n.hits += k;
        n.count = Math.max(0, n.count - k);
        res.removeTokens.push(...e.tokenIds);
        break;
      }
      case 'pcHit':
      case 'pcRes': patch(e.playerId, pcOps(e)); break;
      case 'bedr': c.bedraengnis[e.playerId] = e.value; break;
      case 'marker': c.marker = e.side; break;
      case 'done': c.done[e.id] = true; break;
      case 'exposed': if (e.on) c.exposed[e.playerId] = true; else delete c.exposed[e.playerId]; break;
      case 'tag':
        if (e.who === 'pc') patch(e.id, [{ op: 'tag', name: e.name, size: 'klein' }]);
        else { const n = c.npcs.find((x) => x.id === e.id); if (n && !n.tags.includes(e.name)) n.tags.push(e.name); }
        break;
      case 'poison': {
        if (e.who === 'npc') {
          const n = c.npcs.find((x) => x.id === e.id);
          if (n && n.type !== 'goon') n.poisons = [...(n.poisons ?? []), e.poison];
        } else patch(e.id, [{ op: 'poison', poison: e.poison }]);
        break;
      }
      case 'note': break;
    }
  }
  return res;
}

/** Tokens einer NPC-Gruppe, dem Punkt nach Abstand sortiert (ausgeschaltete zuletzt). */
export function nearestIds(tokens: { id: string; x: number; y: number; npcId?: string; out?: boolean }[], npcId: string, from: { x: number; y: number } | null): string[] {
  return tokens
    .filter((t) => t.npcId === npcId && !t.out)
    .sort((a, b) => (from ? Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y) : 0))
    .map((t) => t.id);
}

// ---------- Was der Spieler sieht ----------
export interface PlayerSituation {
  id: string;
  round: number;
  kind: SitKind;
  npcId: string | null;
  attr: AttrKey;
  technique: string;
  moveName: string;
  tagsUsed: string[];
  mod: number;
  modReason: string;
  /** Summe aller Modifikatoren auf den Wurf des Spielers. */
  rollMod: number;
  attackers: number;
  /** Gift des Moves, den der Angriff trägt. */
  gift: { level: GiftLevel; delay: number } | null;
  /** Bullet Time: vom SL vergeben, Wahl des Spielers. */
  bullet: { option?: BtOption; zone?: ZoneKey } | null;
  status: SitStatus;
  rolled: boolean;
  /** Erst nach beiden Würfen. */
  summary: { outcome: ClashResult['outcome']; delta: number; note: string } | null;
}

export function playerView(sit: Situation, npc: Npc | null): PlayerSituation {
  const r = sit.result;
  const showResult = !!r && (sit.status === 'rolled' || sit.status === 'resolved');
  return {
    id: sit.id, round: sit.round, kind: sit.kind, npcId: sit.npcId, attr: sit.attr, technique: sit.technique, moveName: sit.moveName,
    tagsUsed: sit.tagsUsed, mod: sit.mod, modReason: sit.modReason, rollMod: playerRollMod(sit, npc), attackers: sit.attackers,
    gift: sit.gift && sit.kind === 'attack' ? { level: sit.gift.level, delay: sit.gift.delay } : null,
    bullet: sit.bullet ? { ...sit.bullet } : null, status: sit.status, rolled: !!sit.pRoll,
    summary: showResult && r ? { outcome: r.outcome, delta: r.delta, note: r.noRoll ? t('gm.sit.note.noRoll') : r.limited ? t('gm.sit.note.limited') : r.heldenSchwelle ? t('gm.sit.note.heroThreshold') : '' } : null,
  };
}

export const isNpcOut = (n: Npc | undefined) => !!n && npcStatus(n).out;
