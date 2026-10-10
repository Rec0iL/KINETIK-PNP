// Brücke zu PenNodePaper (Vorbereitungs-App für Spielleiter): nimmt Handouts, Karten, Charaktere und Musikbefehle entgegen.
// Rein, ohne DOM und ohne Svelte-Zustand: alles Äußere (Speicher, Sitzung, Wiedergabe) kommt über `PnpHost` herein.
// Protokoll: docs/vtt-bridge-spec.md im PenNodePaper-Projekt.
import { rules, ATTR_KEYS, type NpcType } from '../rules';
import type { Character } from '../model/character';
import { newScene, TOKEN_COLORS, type MapOp, type MapState, type Token } from '../map/mapstate';
import { newNpc, type Npc, type NpcMove } from '../gm/combat';
import type { Handout } from './protocol';
import type { GmSession } from './gm.svelte';
import type { TrackRef } from '../music/clock';
import type { CatalogTrack } from '../music/catalog.svelte';

export const PNP_PROTOCOL = 1;

// ---------- Nachrichten (UPF) ----------
export interface PnpImage { name: string; mime: string; b64: string }
export interface PnpCharacter {
  id: string; role: string; name: string; preset?: string; sheet: Record<string, unknown>; notes?: string; portrait?: PnpImage;
  /** Id der Karte, auf der der Charakter steht (mit der Karte zusammen gesendet): ihre Token mit `character` = diese Id sind seine Token. */
  scene?: string;
  /** Nur bei Spielercharakteren (Meldung an PenNodePaper). */
  playerName?: string; online?: boolean;
}
export type PnpPush =
  | { kind: 'handout'; payload: { id: string; title: string; kind: 'text' | 'image'; text?: string; image?: PnpImage; to?: string; reveal?: boolean } }
  | { kind: 'scene'; payload: {
      id: string; name: string; image: PnpImage; width: number; height: number;
      grid: { type: 'square' | 'hex'; size: number; offsetX: number; offsetY: number; unitsPerCell: number; unit: string; hidden?: boolean };
      /** `character`: Id des Charakters (PnpCharacter.id), für den der Token steht; die Charaktere folgen direkt nach der Karte. */
      tokens: { x: number; y: number; kind: 'pc' | 'npc' | 'enemy'; label?: string; character?: string }[]; activate?: boolean } }
  | { kind: 'character'; payload: PnpCharacter }
  | { kind: 'music_cue'; payload: { action: 'play' | 'stop'; trackId?: string; mood?: string } };
export type PnpIn =
  | { t: 'welcome'; protocol: number; app: string; campaign: string }
  | ({ t: 'push'; id: string } & PnpPush)
  | { t: 'request'; id: string; what: 'tracks' | 'party' };
export type PnpReply = { t: 'result'; id: string; ok: boolean; error?: string; data?: unknown };

// ---------- Fähigkeiten, die wir melden ----------
interface Field {
  key: string; label: string; type: 'text' | 'longtext' | 'number' | 'boolean' | 'select' | 'tags' | 'list';
  options?: { value: string; label?: string }[]; suggestions?: string[]; min?: number; max?: number; step?: number; default?: unknown;
  required?: boolean; group?: string; help?: string; item?: Field[]; showIf?: { key: string; equals?: unknown; notEquals?: unknown };
}

interface Preset { id: string; label: string; values: Record<string, unknown>; ranges?: Record<string, [number, number]>; help?: string }
interface Role { id: string; for: ('enemy' | 'npc' | 'pc')[]; label: string; description: string; portrait: boolean; fields: Field[]; presets?: Preset[] }

/** Aufbau eines Gegners, abgeleitet aus den Regeldaten (Stufen, Bereiche und Voreinstellungen stimmen so immer mit dem Regelwerk überein). */
export function enemyRole(): Role {
  const tiers = rules.npc.leiter;
  const fields: Field[] = [
    { key: 'tier', label: 'Stufe', type: 'select', required: true, default: 'schlaeger', group: 'Grundwerte', options: tiers.map((t) => ({ value: t.key, label: t.name })), help: 'Goon, Schläger, Elite, Boss oder Nemesis (Regel 3.7)' },
    { key: 'level', label: 'Level', type: 'number', min: 0, max: 10, step: 1, group: 'Grundwerte' },
    { key: 'bonus', label: 'Bonus', type: 'number', min: -3, max: 20, step: 1, group: 'Grundwerte' },
    { key: 'count', label: 'Gruppengröße', type: 'number', min: 1, max: 12, default: 3, group: 'Grundwerte', showIf: { key: 'tier', equals: 'goon' }, help: 'Goons treten als Gruppe auf, jeder fällt mit einem Treffer.' },
    { key: 'schutz', label: 'Schutz', type: 'number', min: 0, max: 9, group: 'Ressourcen', showIf: { key: 'tier', notEquals: 'goon' } },
    { key: 'wk', label: 'Willenskraft (WK)', type: 'number', min: 0, max: 30, group: 'Ressourcen', showIf: { key: 'tier', notEquals: 'goon' } },
    { key: 'energie', label: 'Energie', type: 'number', min: 0, max: 30, default: 6, group: 'Ressourcen', showIf: { key: 'tier', notEquals: 'goon' } },
    { key: 'tags', label: 'Tags', type: 'tags', group: 'Zustand', suggestions: [...rules.tags.klein, ...rules.tags.gross], help: 'kleine und große Tags aus dem Regelwerk, z. B. „Am Boden“' },
    { key: 'moves', label: 'Moves / Fähigkeiten', type: 'list', group: 'Fähigkeiten', item: [
      { key: 'name', label: 'Name', type: 'text', required: true, suggestions: rules.moves.moves.map((m) => m.name) },
      { key: 'text', label: 'Wirkung', type: 'longtext' },
    ] },
    { key: 'note', label: 'Verhalten, Schwäche, Beute', type: 'longtext', group: 'Notizen' },
  ];
  const presets: Preset[] = tiers.map((t) => {
    const wk = 'wk' in t ? (t as { wk: number }).wk : 0;
    const values: Record<string, unknown> = { tier: t.key, level: t.levelMax, bonus: t.bonusMax };
    if (t.key === 'goon') values.count = 3;
    else Object.assign(values, { schutz: t.schutz, wk, energie: 6 });
    return {
      id: t.key, label: t.name, values, help: `Ausgeschaltet: ${t.ausgeschaltet}`,
      ranges: { level: [t.levelMin, t.levelMax], bonus: [t.bonusMin, t.bonusMax] },
    };
  });
  return { id: 'enemy', for: ['enemy'], label: 'Gegner', description: 'Ein Gegner im Kampf-Tab (mit Token auf Wunsch).', portrait: true, fields, presets };
}

export function npcRole(): Role {
  return {
    id: 'npc', for: ['npc'], label: 'NPC', description: 'Eine neutrale Figur: wird als Token mit Notiz auf die aktive Karte gesetzt.', portrait: true,
    fields: [
      { key: 'note', label: 'Notiz unter dem Token', type: 'text' },
      { key: 'size', label: 'Größe (Felder)', type: 'number', min: 1, max: 4, step: 1, default: 1 },
    ],
  };
}

/** Aufbau eines Spielercharakters, so wie die VTT ihn an PenNodePaper meldet (nur zum Lesen: Spieler besitzen ihren Bogen). */
export function pcRole(): Role {
  const attrs = rules.tabellen.attribute as { key: string; name: string; text: string }[];
  return {
    id: 'pc', for: ['pc'], label: 'Spielercharakter', portrait: true,
    description: 'Der Charakter eines Spielers aus der laufenden Runde. Die VTT besitzt den Bogen; PenNodePaper liest ihn nur (Auswertung, Erzählhilfe), schreibt aber nicht zurück.',
    fields: [
      { key: 'concept', label: 'Konzept', type: 'text', group: 'Person' },
      { key: 'alias', label: 'Alias', type: 'text', group: 'Person' },
      { key: 'stufe', label: 'Stufe der Kampagne', type: 'select', group: 'Person', options: [{ value: 'strasse', label: 'Straße' }, { value: 'kino', label: 'Kino' }, { value: 'legende', label: 'Legende' }, { value: 'custom', label: 'Eigene' }] },
      ...attrs.map((a): Field => ({ key: a.key, label: a.name, type: 'number', min: 0, max: 10, step: 1, group: 'Attribute', help: a.text })),
      { key: 'energie', label: 'Energie', type: 'number', group: 'Ressourcen' },
      { key: 'wk', label: 'Willenskraft (WK)', type: 'number', group: 'Ressourcen' },
      { key: 'momentum', label: 'Momentum', type: 'number', group: 'Ressourcen' },
      { key: 'schutz', label: 'Schutz', type: 'number', group: 'Ressourcen' },
      { key: 'tags', label: 'Tags', type: 'tags', group: 'Zustand' },
      { key: 'scars', label: 'Narben', type: 'tags', group: 'Zustand' },
      { key: 'moves', label: 'Moves', type: 'list', group: 'Fähigkeiten', item: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'text', label: 'Wirkung', type: 'longtext' },
      ] },
      { key: 'weapons', label: 'Waffen', type: 'list', group: 'Ausrüstung', item: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'text', label: 'Profil', type: 'text' },
      ] },
    ],
  };
}

export function pnpProfile(version: string) {
  return {
    id: 'kinetik-vtt', name: 'KINETIK VTT', version, protocol: PNP_PROTOCOL,
    push: {
      handout: { text: true, image: true, toPlayer: true },
      scene: { grids: ['square'], tokens: true, characterTokens: true },
      character: {},
      music_cue: { tracks: true, mood: true },
    },
    characters: { roles: [enemyRole(), npcRole(), pcRole()] },
    provides: { party: true },
    requests: ['tracks', 'party'],
    images: { maxBytes: 8_000_000, formats: ['png', 'jpg', 'webp'] },
    file: { kind: 'kinetik-session', version: 1 },
  };
}

// ---------- Host: alles, was die Brücke vom Rest der App braucht ----------
export interface PnpHost {
  uid(): string;
  session(): GmSession;
  /** Bild speichern (Asset-Speicher); liefert Hash und tatsächliche Größe. */
  storeImage(img: PnpImage, maxSide: number): Promise<{ hash: string; width: number; height: number }>;
  /** Porträt verkleinern: Karte (~256 px) und Token (~96 px). */
  portraits(img: PnpImage): Promise<{ img: string; token: string }>;
  addScene(s: MapState): void;
  removeScene(id: string): void;
  activateScene(id: string | null): void;
  gmMapOps(sceneId: string, ops: MapOp[]): void;
  addHandout(h: Handout): void;
  removeHandout(id: string): void;
  sendHandout(h: Handout, to: string[] | null): number;
  commitCombat(): void;
  musicPlay(t: TrackRef): void;
  musicStop(): void;
  catalog(): CatalogTrack[];
  notify(text: string): void;
}

const TIER_KEYS = rules.npc.leiter.map((t) => t.key) as NpcType[];
const KIND_COLOR = { pc: '#00e5ff', npc: '#3ddc97', enemy: '#ff4d6d' } as const;
const str = (v: unknown, max = 400) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, Math.round(v))) : d);

/** Data-URL (Porträt des Charakters) -> Bild für die Brücke. */
export function imageFromDataUrl(url: string | undefined, name: string): PnpImage | undefined {
  const m = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(url ?? '');
  if (!m) return undefined;
  const mime = m[1] === 'image/jpg' ? 'image/jpeg' : m[1];
  return { name: `${name}.${mime.split('/')[1].replace('jpeg', 'jpg')}`, mime, b64: m[2] };
}

/** Die Spielercharaktere der laufenden Runde im Aufbau von `pcRole()`. Spieler ohne Charakter fehlen. */
export function partyList(session: Pick<GmSession, 'players'>): PnpCharacter[] {
  return session.players.flatMap((p): PnpCharacter[] => {
    const c: Character | null = p.character;
    if (!c) return [];
    const sheet: Record<string, unknown> = {
      concept: c.concept, alias: c.alias, stufe: c.stufe,
      energie: c.resources.energie, wk: c.resources.wk, momentum: c.resources.momentum, schutz: c.resources.schutz.current,
      tags: c.tags.map((t) => t.name), scars: c.scars.map((s) => s.text),
      moves: c.moves.map((m) => ({ name: m.name, text: m.text })),
      weapons: c.weapons.map((w) => ({ name: w.name, text: w.profilText })),
    };
    for (const k of ATTR_KEYS) sheet[k] = c.attributes[k];
    for (const k of Object.keys(sheet)) if (sheet[k] === '' || (Array.isArray(sheet[k]) && !(sheet[k] as unknown[]).length)) delete sheet[k];
    return [{
      id: p.id, role: 'pc', name: c.name || c.alias || p.name, sheet,
      playerName: c.player || p.name, online: p.connected || !!p.local,
      portrait: imageFromDataUrl(c.portrait, 'portrait'),
    }];
  });
}

export function b64ToBytes(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

// ---------- Umwandlungen (rein) ----------
export function movesOf(v: unknown): NpcMove[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 30).flatMap((m): NpcMove[] => {
    if (typeof m === 'string') return m.trim() ? [{ name: str(m, 80), text: '' }] : [];
    if (m && typeof m === 'object') {
      const o = m as Record<string, unknown>;
      const name = str(o.name, 80).trim();
      return name ? [{ name, text: str(o.text, 600) }] : [];
    }
    return [];
  });
}

/** Gegner-Bogen -> Kampf-NPC. Mit `existing` werden nur die beschreibenden Felder erneuert (Verletzungen, Treffer usw. bleiben). */
export function npcFromSheet(c: PnpCharacter, id: string, portrait: { img: string; token: string } | undefined, existing?: Npc): Npc {
  const sh = c.sheet;
  const type = (TIER_KEYS as string[]).includes(String(sh.tier)) ? (String(sh.tier) as NpcType) : 'goon';
  const base = existing ?? newNpc(id, type, c.name, num(sh.count, 1, 12, 3));
  const goon = type === 'goon';
  const next: Npc = { ...base, name: c.name.slice(0, 80) || base.name, tags: Array.isArray(sh.tags) ? sh.tags.map((t) => str(t, 40)).filter(Boolean) : base.tags };
  if (!existing || existing.type === type) {
    next.level = num(sh.level, 0, 10, base.level);
    next.bonus = num(sh.bonus, -3, 20, base.bonus);
    if (!goon) {
      next.schutzMax = num(sh.schutz, 0, 9, base.schutzMax);
      next.wkMax = num(sh.wk, 0, 30, base.wkMax);
      next.energieMax = num(sh.energie, 0, 30, base.energieMax);
      if (!existing) { next.schutz = next.schutzMax; next.wk = next.wkMax; next.energie = next.energieMax; }
    }
  }
  // der eigene Notizwert des Bogens zuerst; sonst der freie Text der Vorbereitungs-App (Zusammenfassung und SL-Notizen)
  next.note = (str(sh.note, 600).trim() || str(c.notes, 600)).replace(/\s*\n+\s*/g, ' — ').slice(0, 600);
  next.moves = movesOf(sh.moves);
  next.src = `pnp:${c.id}`;
  if (portrait) { next.img = portrait.img; next.token = portrait.token; }
  return next;
}

/** Boss und Nemesis stehen in KINETIK als 2x2-Token auf der Karte (wie beim Aufstellen im GM-Menü), alle anderen als 1x1. */
export const tokenSizeOfTier = (type: NpcType): number => (type === 'boss' || type === 'nemesis' ? 2 : 1);

/** Token auf `size` Felder bringen und dabei seine linke obere Zelle behalten (die Mitte wandert mit). */
function resizedToken(t: Token, size: number, grid: number): Token {
  const d = ((size - t.size) * grid) / 2;
  return { ...t, size, x: Math.round(t.x + d), y: Math.round(t.y + d) };
}

/** Karte (Bild + Raster + Startpositionen) -> Szene. Positionen kommen in Feldern an und werden zu Pixelmitten.
 *  Spieler legt der SL im Menü an: Startmarken (`pc`) kommen nur an, wenn jemand sie ausdrücklich schickt (Test). */
export function sceneFromPush(p: Extract<PnpPush, { kind: 'scene' }>['payload'], stored: { hash: string; width: number; height: number }, uid: () => string, npcs: Pick<Npc, 'id' | 'src' | 'token' | 'type'>[] = []): MapState {
  const k = p.width > 0 ? stored.width / p.width : 1; // das Bild kann beim Speichern verkleinert worden sein
  const s = newScene(p.id, p.name, stored.hash, stored.width, stored.height);
  s.grid = {
    ...s.grid, show: !p.grid.hidden, size: Math.max(8, p.grid.size * k), ox: p.grid.offsetX * k, oy: p.grid.offsetY * k,
    unit: p.grid.unit || 'ft', unitsPerCell: p.grid.unitsPerCell || 1,
  };
  s.tokens = p.tokens.map((t, i): Token => {
    // Token eines Charakters: Herkunft merken (`src`), und wenn sein Kampf-Gegner schon da ist, gleich verknüpfen
    const npc = t.character ? npcs.find((n) => n.src === `pnp:${t.character}`) : undefined;
    const tok: Token = {
      id: uid(), name: (t.label || { pc: `Spieler ${i + 1}`, npc: 'NPC', enemy: 'Gegner' }[t.kind]).slice(0, 40),
      x: Math.round(((t.x + 0.5) * p.grid.size + p.grid.offsetX) * k), y: Math.round(((t.y + 0.5) * p.grid.size + p.grid.offsetY) * k),
      size: 1, color: t.kind === 'pc' ? (TOKEN_COLORS[i % TOKEN_COLORS.length] ?? KIND_COLOR.pc) : KIND_COLOR[t.kind], kind: t.kind === 'pc' ? 'pc' : 'npc', hidden: false,
      ...(t.character ? { src: `pnp:${t.character}` } : {}),
      ...(npc ? { npcId: npc.id, ...(npc.token ? { img: npc.token } : {}) } : {}),
    };
    const size = npc ? tokenSizeOfTier(npc.type) : 1;
    return size === 1 ? tok : resizedToken(tok, size, s.grid.size);
  });
  return s;
}

/** Stimmung -> Titel: Wörter der Stimmung gegen Kategorie, Tag und Titel. */
export function pickByMood(mood: string, tracks: TrackRef[]): TrackRef | undefined {
  const words = mood.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
  if (!words.length) return undefined;
  const score = (t: TrackRef & { category?: string; tag?: string }) => {
    const hay = `${t.category ?? ''} ${t.tag ?? ''}`.toLowerCase();
    const title = t.title.toLowerCase();
    return words.reduce((n, w) => n + (hay.includes(w) ? 2 : 0) + (title.includes(w) ? 1 : 0), 0);
  };
  const best = [...tracks].map((t) => ({ t, s: score(t) })).sort((a, b) => b.s - a.s)[0];
  return best && best.s > 0 ? best.t : undefined;
}

export function trackList(host: PnpHost) {
  const s = host.session();
  return [
    ...host.catalog().map((t) => ({ id: t.id, title: t.title, category: t.category, uploaded: false })),
    ...s.tracks.map((t) => ({ id: t.id, title: t.title, uploaded: true })),
  ];
}

// ---------- Behandlung der Nachrichten ----------
export async function handlePush(host: PnpHost, push: PnpPush): Promise<unknown> {
  const s = host.session();
  switch (push.kind) {
    case 'handout': {
      const p = push.payload;
      if (!p.title?.trim()) throw new Error('Handout ohne Titel');
      let h: Handout;
      if (p.kind === 'image') {
        if (!p.image) throw new Error('Bild-Handout ohne Bild');
        const stored = await host.storeImage(p.image, 2400);
        h = { id: p.id, title: p.title.slice(0, 120), kind: 'image', hash: stored.hash, ts: Date.now() };
      } else {
        h = { id: p.id, title: p.title.slice(0, 120), kind: 'text', text: p.text ?? '', ts: Date.now() };
      }
      if (s.handouts.some((x) => x.id === p.id)) host.removeHandout(p.id); // erneutes Senden ersetzt
      host.addHandout(h);
      const sent = p.reveal || p.to ? host.sendHandout(h, p.to ? [p.to] : null) : undefined;
      host.notify(`PenNodePaper: Handout „${h.title}“ ${sent !== undefined ? `an ${sent} Spieler gesendet` : 'zur Handout-Liste hinzugefügt'}`);
      return { revealed: sent !== undefined, recipients: sent };
    }
    case 'scene': {
      const p = push.payload;
      if (p.grid.type !== 'square') throw new Error('Hex-Raster werden noch nicht unterstützt');
      const stored = await host.storeImage(p.image, 4096);
      const scene = sceneFromPush(p, stored, host.uid, s.combat.npcs);
      const wasLive = s.activeScene === p.id;
      if (s.scenes.some((x) => x.id === p.id)) host.removeScene(p.id);
      host.addScene(scene);
      if (p.activate || wasLive) host.activateScene(p.id);
      host.notify(`PenNodePaper: Karte „${p.name}“ übernommen${p.activate ? ' und freigegeben' : ''}`);
      return { tokens: scene.tokens.length };
    }
    case 'character':
      return pushCharacter(host, push.payload);
    case 'music_cue': {
      const p = push.payload;
      if (p.action === 'stop') {
        host.musicStop();
        return { stopped: true };
      }
      const all: TrackRef[] = [...host.catalog(), ...s.tracks];
      const track = (p.trackId && all.find((t) => t.id === p.trackId)) || (p.mood ? pickByMood(p.mood, all) : undefined);
      if (!track) throw new Error(p.trackId ? `Unbekannter Titel „${p.trackId}“` : p.mood ? `Kein Titel passt zur Stimmung „${p.mood}“` : 'Titel oder Stimmung angeben');
      host.musicPlay(track);
      return { playing: track.title };
    }
  }
}

async function pushCharacter(host: PnpHost, c: PnpCharacter): Promise<unknown> {
  const s = host.session();
  if (!c.name?.trim()) throw new Error('Charakter ohne Namen');
  const portrait = c.portrait ? await host.portraits(c.portrait) : undefined;

  if (c.role === 'enemy') {
    const existing = s.combat.npcs.find((n) => n.src === `pnp:${c.id}`);
    const npc = npcFromSheet(c, existing?.id ?? host.uid(), portrait, existing);
    if (existing) Object.assign(existing, npc);
    else s.combat.npcs.push(npc);
    // Token dieses Gegners verknüpfen: die von PenNodePaper mit der Karte gesendeten (`src`) und die schon verknüpften; Porträt auf alle
    let tied = 0;
    for (const sc of s.scenes) {
      const mine = sc.tokens.filter((t) => t.npcId === npc.id || t.src === `pnp:${c.id}`);
      tied += mine.length;
      // Goons: mehrere Token einer Gruppe heißen wie in der VTT sonst auch „Name 1“, „Name 2“ …
      const numbered = npc.type === 'goon' && mine.length > 1;
      const want = tokenSizeOfTier(npc.type);
      const ops: MapOp[] = mine.map((t, i) => ({
        op: 'tok',
        // ein Boss steht so groß da wie einer, den man im Menü aufstellt (hat der SL die Größe schon geändert, bleibt sie)
        token: { ...(t.size === 1 && want !== 1 ? resizedToken(t, want, sc.grid.size) : t), npcId: npc.id, src: `pnp:${c.id}`, ...(numbered && t.name === npc.name ? { name: `${npc.name} ${i + 1}`.slice(0, 40) } : {}), ...(portrait ? { img: portrait.token } : {}) },
      }));
      if (ops.length) host.gmMapOps(sc.id, ops);
    }
    // eine Goon-Gruppe hat mindestens so viele Mitglieder, wie Token für sie auf der Karte stehen
    if (npc.type === 'goon' && tied > npc.count) npc.count = Math.min(12, tied);
    host.commitCombat();
    host.notify(`PenNodePaper: Gegner „${npc.name}“ ${existing ? 'aktualisiert' : 'zum Kampf hinzugefügt'}`);
    return { npcId: npc.id, updated: !!existing };
  }

  if (c.role === 'npc') {
    const src = `pnp:${c.id}`;
    const size = (old?: number) => num(c.sheet.size, 1, 4, old ?? 1);
    const note = str(c.sheet.note, 80) || undefined;
    // Steht der NPC schon als Token auf einer Karte (mit ihr gesendet oder früher gesetzt), werden alle seine Token aktualisiert
    // (Name und Platz bleiben die des SL); sonst setzen wir einen auf die genannte oder aktive Karte.
    let updated = 0;
    let sceneId = '';
    for (const sc of s.scenes) {
      const mine = sc.tokens.filter((t) => t.src === src);
      if (!mine.length) continue;
      host.gmMapOps(sc.id, mine.map((t): MapOp => ({ op: 'tok', token: { ...t, size: size(t.size), note, ...(portrait ? { img: portrait.token } : {}) } })));
      updated += mine.length;
      sceneId ||= sc.id;
    }
    if (updated) {
      host.notify(`PenNodePaper: NPC „${c.name}“ aktualisiert`);
      return { tokenId: s.scenes.find((x) => x.id === sceneId)?.tokens.find((t) => t.src === src)?.id, scene: sceneId, updated: true, tokens: updated };
    }
    const scene = s.scenes.find((x) => x.id === c.scene) ?? s.scenes.find((x) => x.id === s.activeScene) ?? s.scenes[0];
    if (!scene) throw new Error('Keine Karte vorhanden: lege zuerst eine Szene an, dann kann der NPC als Token gesetzt werden.');
    const g = scene.grid.size;
    const token: Token = {
      id: host.uid(), x: scene.width / 2, y: scene.height / 2 - g * 2, color: KIND_COLOR.npc, kind: 'npc', hidden: false,
      name: c.name.slice(0, 40), size: size(), note, src,
      ...(portrait ? { img: portrait.token } : {}),
    };
    host.gmMapOps(scene.id, [{ op: 'tok', token }]);
    host.notify(`PenNodePaper: NPC „${token.name}“ auf Karte „${scene.name}“ gesetzt`);
    return { tokenId: token.id, scene: scene.id, updated: false };
  }
  if (c.role === 'pc') throw new Error('Spielercharaktere gehören den Spielern: sie werden in der VTT gepflegt und nur an PenNodePaper gemeldet.');
  throw new Error(`Unbekannte Rolle „${c.role}“ (bekannt: enemy, npc)`);
}

/** Einstiegspunkt für jede eingehende Nachricht. Liefert die Antwort (oder nichts, z. B. bei `welcome`). */
export async function handleMessage(host: PnpHost, msg: PnpIn): Promise<PnpReply | null> {
  if (msg.t === 'push') {
    try {
      return { t: 'result', id: msg.id, ok: true, data: await handlePush(host, msg) };
    } catch (e) {
      return { t: 'result', id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  if (msg.t === 'request') {
    try {
      if (msg.what === 'tracks') return { t: 'result', id: msg.id, ok: true, data: trackList(host) };
      if (msg.what === 'party') return { t: 'result', id: msg.id, ok: true, data: partyList(host.session()) };
      return { t: 'result', id: msg.id, ok: false, error: `Unbekannte Anfrage „${String(msg.what)}“` };
    } catch (e) {
      return { t: 'result', id: msg.id, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
  return null;
}
