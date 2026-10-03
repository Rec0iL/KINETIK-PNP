// SL-Host: nimmt Spieler an, hält die Sitzung, verteilt Zustand. Der SL-Tab ist der einzige Server.
import { get, set, del } from 'idb-keyval';
import type { Character } from '../model/character';
import { sanitizeCharacter } from '../model/io';
import { applyPatch, describePatch } from '../model/patch';
import { infoOf } from '../model/vitals';
import { commitRoll, linkClash, onRoll, rollLog, roll2d6, type RollRecord } from '../dice/roller.svelte';
import { settings } from '../lib/settings.svelte';
import { pushToast } from '../ui/toasts.svelte';
import { openPeer, explainPeerError, type DataConnection, type Peer } from './peer';
import { serveAsset } from './assets.svelte';
import { addPing } from '../map/pings.svelte';
import { defaultMusic, expectedPosition, type MusicState, type TrackRef } from '../music/clock';
import { currentTime } from '../music/engine.svelte';
import { newCombat, nextRound, npcStatus, publicCombat, upgradeCombat, type CombatState } from '../gm/combat';
import {
  KIND_LABEL, applyProposal, computeResult, createSituation, grantBulletTime, isOpen, nearestIds, npcRollMod, playerRollMod, playerView,
  proposeResolution, rollToSit, situationsOf, type Draft, type SitKind, type Situation,
} from '../gm/situation';
import { tickCharacter, tickNpc } from '../gm/poison';
import { ATTR_KEYS, ZONE_KEYS, GIFT_LEVELS, MAX_GIFT_DELAY } from '../rules';
import { uid } from '../model/character';
import { vitalsOf } from '../model/vitals';
import { getAssetBytes, putAsset } from './assets.svelte';
import { applyMapOp, forPlayers, type MapOp, type MapState } from '../map/mapstate';
import {
  PROTOCOL_VERSION, newRoomCode, peerIdFor, type ClientMsg, type Handout, type PatchOp, type PlayerInfo, type ServerMsg, type SharedState,
  type Visibility,
} from './protocol';

export interface GmPlayer {
  id: string;
  name: string;
  connected: boolean;
  local?: boolean;
  character: Character | null;
  share?: Visibility;
  lastSeen: number;
}

export interface GmSession {
  code: string;
  password: string;
  players: GmPlayer[];
  state: SharedState;
  /** Private Notizen des SL. */
  gmNotes: string;
  created: number;
  /** Vorbereitete Karten (Szenen). Nur die aktive wird mit den Spielern geteilt. */
  scenes: MapState[];
  activeScene: string | null;
  /** Hochgeladene Musiktitel (mitgelieferte stehen im Katalog). */
  tracks: TrackRef[];
  combat: CombatState;
  handouts: Handout[];
}

export interface FeedEntry { ts: number; text: string }

export const gm = $state<{
  status: 'idle' | 'starting' | 'open' | 'error';
  error: string;
  /** Vermittlungsserver erreichbar? Bestehende Verbindungen laufen auch ohne weiter. */
  broker: boolean;
  session: GmSession | null;
  pending: { id: string; name: string }[];
  feed: FeedEntry[];
}>({ status: 'idle', error: '', broker: false, session: null, pending: [], feed: [] });

const STORE_KEY = 'gm-session';
let peer: Peer | null = null;
const conns = new Map<string, DataConnection>();
const pendingConns = new Map<string, DataConnection>();
const connOwner = new Map<DataConnection, string>();
/** Wer betrachtet gerade welchen Bogen: Ziel -> Betrachter. */
const viewers = new Map<string, Set<string>>();
let unsubRoll: (() => void) | null = null;
let saveTimer: ReturnType<typeof setTimeout>;
let partyTimer: ReturnType<typeof setTimeout>;

const send = (conn: DataConnection | undefined, msg: ServerMsg) => {
  try { if (conn?.open) conn.send(msg); } catch (e) { console.warn('send', e); }
};

function feed(text: string) {
  gm.feed.unshift({ ts: Date.now(), text });
  if (gm.feed.length > 60) gm.feed.length = 60;
}

// ---------- Persistenz ----------
export async function loadSavedSession(): Promise<GmSession | null> {
  try {
    const s = (await get(STORE_KEY)) as GmSession | undefined;
    if (!s) return null;
    s.tracks = s.tracks ?? [];
    s.combat = upgradeCombat(s.combat);
    s.handouts = s.handouts ?? [];
    s.state.combat = s.combat.active ? publicCombat(s.combat) : null;
    s.state.music = { ...defaultMusic(), ...(s.state.music ?? {}), playing: false };
    s.scenes = s.scenes ?? [];
    s.activeScene = s.activeScene ?? null;
    s.players = (s.players ?? []).map((p) => ({ ...p, connected: false, character: p.character ? sanitizeCharacter(p.character) : null }));
    return s;
  } catch { return null; }
}

export function persistSession() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!gm.session) return;
    try { await set(STORE_KEY, $state.snapshot(gm.session)); } catch (e) { console.warn(e); }
  }, 500);
}

export async function forgetSession() {
  try { await del(STORE_KEY); } catch { /* ignorieren */ }
}

// ---------- Hilfsfunktionen ----------
const playerById = (id: string) => gm.session?.players.find((p) => p.id === id);
const effectiveShare = (p: GmPlayer): Visibility => p.share ?? gm.session!.state.visibility;

/** Liste der Mitspieler, so wie `viewerId` sie sehen darf. `null` = SL sieht alles. */
export function partyFor(viewerId: string | null): PlayerInfo[] {
  const s = gm.session;
  if (!s) return [];
  return s.players.map((p) => {
    const base: PlayerInfo = { id: p.id, name: p.name, connected: p.connected || !!p.local, local: p.local, share: p.share };
    if (!p.character) return base;
    if (viewerId === null || viewerId === p.id) return infoOf(p.character, base);
    return effectiveShare(p) === 'private' ? base : infoOf(p.character, base);
  });
}

function broadcast(msg: ServerMsg, except?: string) {
  for (const [id, c] of conns) if (id !== except) send(c, msg);
}

export function scheduleParty() {
  clearTimeout(partyTimer);
  partyTimer = setTimeout(() => {
    for (const [id, c] of conns) send(c, { t: 'party', players: partyFor(id) });
  }, 120);
}

function pushViews(targetId: string) {
  const p = playerById(targetId);
  const set = viewers.get(targetId);
  if (!p || !set) return;
  for (const v of set) send(conns.get(v), { t: 'sheet-view', playerId: targetId, character: p.character });
}

// ---------- Start / Stopp ----------
export async function startHost(opts: { gmName: string; password: string; resume: GmSession | null }) {
  if (gm.status === 'open' || gm.status === 'starting') return;
  gm.status = 'starting';
  gm.error = '';
  const s: GmSession = opts.resume ?? {
    code: newRoomCode(), password: '', players: [], gmNotes: '', created: Date.now(), scenes: [], activeScene: null, tracks: [], combat: newCombat(), handouts: [],
    state: { gmName: '', visibility: 'party', notes: '', rounds: 0, music: defaultMusic(), combat: null },
  };
  s.state.gmName = opts.gmName || s.state.gmName || 'Spielleiter';
  s.password = opts.password;
  // Nach einem Neuladen hält der Server die alte Registrierung kurz fest: ein paar Mal erneut versuchen.
  for (let attempt = 0; ; attempt++) {
    try {
      peer = await openPeer(peerIdFor(s.code));
      break;
    } catch (e) {
      const busy = (e as { kind?: string }).kind === 'unavailable-id';
      if (busy && opts.resume && attempt < 16) {
        gm.error = 'Der Server hält den alten Raumcode noch fest (bis zu einer Minute nach dem Neuladen). Neuer Versuch läuft …';
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      gm.status = 'error';
      gm.error = (e as Error).message;
      return;
    }
  }
  gm.session = s;
  gm.status = 'open';
  gm.error = '';
  gm.broker = true;
  try { sessionStorage.setItem('kinetik.gmActive', '1'); } catch { /* ignorieren */ }
  feed('Runde gestartet.');
  peer.on('connection', onConnection);
  peer.on('disconnected', () => {
    gm.broker = false;
    setTimeout(() => peer && !peer.destroyed && peer.reconnect(), 2000);
  });
  peer.on('open', () => { gm.broker = true; });
  peer.on('error', (err) => {
    const f = explainPeerError(err);
    if (f.kind !== 'peer-unavailable') pushToast(f.message, 'warn');
  });
  unsubRoll = onRoll((r) => { if (!r.secret) broadcast({ t: 'roll', roll: r }); });
  persistSession();
}

/** Nach einem Neuladen des SL-Tabs die Runde automatisch fortsetzen. */
export async function resumeHostIfActive(): Promise<boolean> {
  try { if (sessionStorage.getItem('kinetik.gmActive') !== '1') return false; } catch { return false; }
  const saved = await loadSavedSession();
  if (!saved) return false;
  await startHost({ gmName: saved.state.gmName, password: saved.password, resume: saved });
  if (gm.status === 'open') pushToast('Runde nach dem Neuladen fortgesetzt.', 'good');
  return true;
}

export function stopHost() {
  try { sessionStorage.removeItem('kinetik.gmActive'); } catch { /* ignorieren */ }
  for (const c of conns.values()) { send(c, { t: 'kick', reason: 'Die Runde wurde beendet.' }); c.close(); }
  conns.clear();
  pendingConns.clear();
  connOwner.clear();
  viewers.clear();
  unsubRoll?.();
  unsubRoll = null;
  peer?.destroy();
  peer = null;
  gm.status = 'idle';
  gm.broker = false;
  gm.pending = [];
  for (const p of gm.session?.players ?? []) p.connected = false;
  persistSession();
}

export async function endSession() {
  stopHost();
  gm.session = null;
  await forgetSession();
}

// ---------- Verbindungen ----------
function onConnection(conn: DataConnection) {
  conn.on('data', (d) => onData(conn, d as ClientMsg));
  conn.on('close', () => onClose(conn));
  conn.on('error', (e) => console.warn('conn', e));
}

function onClose(conn: DataConnection) {
  const id = connOwner.get(conn);
  connOwner.delete(conn);
  if (!id) {
    for (const [pid, c] of pendingConns) if (c === conn) { pendingConns.delete(pid); gm.pending = gm.pending.filter((x) => x.id !== pid); }
    return;
  }
  if (conns.get(id) !== conn) return; // alte Verbindung, schon ersetzt
  conns.delete(id);
  for (const set of viewers.values()) set.delete(id);
  viewers.delete(id);
  const p = playerById(id);
  if (p) {
    p.connected = false;
    p.lastSeen = Date.now();
    feed(`${p.name} hat die Verbindung verloren.`);
  }
  scheduleParty();
  persistSession();
}

function onData(conn: DataConnection, msg: ClientMsg) {
  if (!msg || typeof msg !== 'object' || !gm.session) return;
  if (msg.t === 'hello') return onHello(conn, msg);
  const id = connOwner.get(conn);
  if (!id) return; // nicht angemeldet
  const p = playerById(id);
  if (!p) return;
  switch (msg.t) {
    case 'sheet': {
      try { p.character = sanitizeCharacter(msg.character); } catch { return; }
      p.lastSeen = Date.now();
      scheduleParty();
      pushViews(id);
      persistSession();
      break;
    }
    case 'roll': {
      const r = msg.roll as RollRecord;
      if (!r || typeof r.id !== 'string') return;
      commitRoll(r, { remote: true });
      if (!r.secret) broadcast({ t: 'roll', roll: r }, id);
      if (typeof r.sit === 'string') attachPlayerRoll(id, r);
      break;
    }
    case 'ping':
      send(conn, { t: 'pong', ts: msg.ts, gm: Date.now() });
      break;
    case 'view': {
      for (const set of viewers.values()) set.delete(id);
      if (msg.playerId) {
        const target = playerById(msg.playerId);
        if (target && effectiveShare(target) === 'open') {
          if (!viewers.has(msg.playerId)) viewers.set(msg.playerId, new Set());
          viewers.get(msg.playerId)!.add(id);
          send(conn, { t: 'sheet-view', playerId: msg.playerId, character: target.character });
        } else send(conn, { t: 'sheet-view', playerId: msg.playerId, character: null });
      }
      break;
    }
    case 'want':
      if (typeof msg.hash === 'string') void serveAsset(conn, msg.hash);
      break;
    case 'map':
      onPlayerMapOps(id, p.name, msg.ops);
      break;
    case 'plan':
      onPlan(id, msg.draft);
      break;
    case 'plan-cancel': {
      const sit = sitById(String(msg.id));
      if (sit && sit.playerId === id && (sit.status === 'planned' || sit.status === 'released') && !sit.pRoll) sit.status = 'cancelled';
      break;
    }
    case 'bt-choice': {
      const sit = sitById(String(msg.id));
      if (!sit || sit.playerId !== id || !sit.bullet || sit.bullet.option || !['zone', 'ep', 'momentum'].includes(msg.option)) break;
      sit.bullet.option = msg.option;
      if (msg.option === 'zone' && ZONE_KEYS.includes(msg.zone as never)) sit.bullet.zone = msg.zone;
      feed(`${p.name}: Bullet Time, ${msg.option === 'zone' ? 'Zonenwahl' : msg.option === 'ep' ? '+1 EP' : '+1 Momentum'}.`);
      if (sit.proposal) buildProposal(sit);
      break;
    }
    case 'move-req':
      onMoveRequest(id, p.name, msg.tokenId, msg.x, msg.y);
      break;
    case 'bye':
      conn.close();
      break;
  }
}

// ---------- Karte ----------
export const activeScene = (): MapState | null => {
  const s = gm.session;
  return s?.scenes.find((x) => x.id === s.activeScene) ?? null;
};

/** Was Spieler von einer Änderung sehen dürfen (versteckte Tokens bleiben beim SL). */
function playerOps(scene: MapState, ops: MapOp[]): MapOp[] {
  const out: MapOp[] = [];
  for (const op of ops) {
    if (op.op === 'tok') out.push(op.token.hidden ? { op: 'tokdel', id: op.token.id } : op);
    else if (op.op === 'tokmove') { if (!scene.tokens.find((t) => t.id === op.id)?.hidden) out.push(op); }
    else if (op.op === 'full') out.push({ op: 'full', map: forPlayers(op.map) });
    else out.push(op);
  }
  return out;
}

/** Änderung des SL an einer Szene. Ist es die aktive, geht sie an die Spieler. */
export function gmMapOps(sceneId: string, ops: MapOp[]) {
  const s = gm.session;
  const scene = s?.scenes.find((x) => x.id === sceneId);
  if (!s || !scene) return;
  for (const op of ops) applyMapOp(scene, op);
  if (s.activeScene === sceneId) {
    const filtered = playerOps(scene, ops);
    if (filtered.length) broadcast({ t: 'map', ops: $state.snapshot(filtered) as MapOp[] });
  }
  persistSession();
}

export function addScene(scene: MapState) {
  gm.session?.scenes.push(scene);
  persistSession();
}

export function removeScene(id: string) {
  const s = gm.session;
  if (!s) return;
  if (s.activeScene === id) activateScene(null);
  s.scenes = s.scenes.filter((x) => x.id !== id);
  persistSession();
}

export function activateScene(id: string | null) {
  const s = gm.session;
  if (!s) return;
  s.activeScene = id;
  broadcast({ t: 'map', ops: [{ op: 'full', map: $state.snapshot(forPlayers(activeScene())) as MapState | null }] });
  persistSession();
}

export function gmPing(x: number, y: number, color: string) {
  const who = gm.session?.state.gmName ?? 'SL';
  addPing(x, y, who, color);
  broadcast({ t: 'map', ops: [{ op: 'ping', x, y, who, color }] });
}

function onPlayerMapOps(playerId: string, name: string, ops: MapOp[]) {
  const scene = activeScene();
  if (!scene || !Array.isArray(ops)) return;
  for (const op of ops) {
    if (op.op === 'ping') {
      addPing(op.x, op.y, name, op.color);
      broadcast({ t: 'map', ops: [{ op: 'ping', x: op.x, y: op.y, who: name, color: op.color }] }, playerId);
    } else if (op.op === 'tokmove') {
      if (gm.session?.combat.active) continue; // im Kampf nur per Anfrage (move-req)
      const t = scene.tokens.find((x) => x.id === op.id);
      if (t && t.playerId === playerId && Number.isFinite(op.x) && Number.isFinite(op.y)) {
        applyMapOp(scene, { op: 'tokmove', id: op.id, x: op.x, y: op.y });
        broadcast({ t: 'map', ops: [{ op: 'tokmove', id: op.id, x: op.x, y: op.y }] }, playerId);
        persistSession();
      }
    }
  }
}

function onHello(conn: DataConnection, msg: Extract<ClientMsg, { t: 'hello' }>) {
  const s = gm.session!;
  if (msg.v !== PROTOCOL_VERSION) return void (send(conn, { t: 'deny', reason: 'Inkompatible Version. Bitte die Seite neu laden.' }), conn.close());
  if (s.password && msg.password !== s.password) return void (send(conn, { t: 'deny', reason: 'Falsches Passwort.' }), setTimeout(() => conn.close(), 200));
  const name = String(msg.name || 'Spieler').slice(0, 40);
  const known = playerById(msg.playerId);
  if (known && !known.local) return accept(conn, known, name, true);
  pendingConns.get(msg.playerId)?.close();
  pendingConns.set(msg.playerId, conn);
  gm.pending = [...gm.pending.filter((x) => x.id !== msg.playerId), { id: msg.playerId, name }];
  send(conn, { t: 'pending' });
  feed(`${name} möchte beitreten.`);
  pushToast(`${name} möchte beitreten.`, 'info');
}

function accept(conn: DataConnection, p: GmPlayer, name: string, resume: boolean) {
  const old = conns.get(p.id);
  if (old && old !== conn) { connOwner.delete(old); old.close(); }
  p.name = name || p.name;
  p.connected = true;
  p.lastSeen = Date.now();
  conns.set(p.id, conn);
  connOwner.set(conn, p.id);
  const s = gm.session!;
  const log = rollLog.entries.filter((r) => !r.secret).slice(0, 50).reverse();
  send(conn, {
    t: 'welcome', playerId: p.id, gmName: s.state.gmName, state: $state.snapshot(s.state), players: partyFor(p.id),
    log: $state.snapshot(log) as RollRecord[], resume, map: $state.snapshot(forPlayers(activeScene())) as MapState | null,
  });
  feed(`${p.name} ist ${resume ? 'wieder da' : 'beigetreten'}.`);
  scheduleParty();
  lastSits.delete(p.id);
  pushSituations();
  persistSession();
}

export function approve(id: string) {
  const conn = pendingConns.get(id);
  const entry = gm.pending.find((x) => x.id === id);
  if (!conn || !entry || !gm.session) return;
  pendingConns.delete(id);
  gm.pending = gm.pending.filter((x) => x.id !== id);
  const p: GmPlayer = { id, name: entry.name, connected: false, character: null, lastSeen: Date.now() };
  gm.session.players.push(p);
  accept(conn, gm.session.players[gm.session.players.length - 1], entry.name, false);
}

export function deny(id: string) {
  const conn = pendingConns.get(id);
  send(conn, { t: 'deny', reason: 'Der Spielleiter hat die Anfrage abgelehnt.' });
  setTimeout(() => conn?.close(), 200);
  pendingConns.delete(id);
  gm.pending = gm.pending.filter((x) => x.id !== id);
}

export function kick(id: string) {
  const conn = conns.get(id);
  send(conn, { t: 'kick', reason: 'Der Spielleiter hat dich aus der Runde entfernt.' });
  setTimeout(() => conn?.close(), 200);
  removePlayer(id);
}

export function removePlayer(id: string) {
  const s = gm.session;
  if (!s) return;
  const conn = conns.get(id);
  if (conn) { connOwner.delete(conn); conns.delete(id); conn.close(); }
  s.players = s.players.filter((p) => p.id !== id);
  scheduleParty();
  persistSession();
}

// ---------- SL-Aktionen ----------
export function setVisibility(mode: Visibility) {
  const s = gm.session;
  if (!s) return;
  s.state.visibility = mode;
  broadcast({ t: 'state', key: 'visibility', value: mode });
  viewers.clear();
  scheduleParty();
  persistSession();
}

export function setPlayerShare(id: string, mode: Visibility | undefined) {
  const p = playerById(id);
  if (!p) return;
  p.share = mode;
  for (const set of viewers.values()) set.delete(id);
  viewers.delete(id);
  scheduleParty();
  persistSession();
}

export function setSharedNotes(text: string) {
  const s = gm.session;
  if (!s) return;
  s.state.notes = text;
  broadcast({ t: 'state', key: 'notes', value: text });
  persistSession();
}

export function setGmName(name: string) {
  const s = gm.session;
  if (!s) return;
  s.state.gmName = name;
  broadcast({ t: 'state', key: 'gmName', value: name });
  persistSession();
}

export function sendToast(playerId: string | null, text: string) {
  if (playerId) send(conns.get(playerId), { t: 'toast', text });
  else broadcast({ t: 'toast', text });
}

/** Änderung an einem Spielerbogen. Lokale Spieler werden direkt geändert, verbundene über den Spieler. */
export function patchPlayer(id: string, ops: PatchOp[]): boolean {
  const p = playerById(id);
  if (!p) return false;
  if (p.local) {
    if (!p.character) return false;
    applyPatch(p.character, ops, { autoShock: settings.autoShock });
    scheduleParty();
    persistSession();
    return true;
  }
  const conn = conns.get(id);
  if (!conn?.open) {
    pushToast(`${p.name} ist nicht verbunden.`, 'warn');
    return false;
  }
  send(conn, { t: 'patch', ops, note: describePatch(ops) });
  return true;
}

// ---------- Lokale Spieler (ohne Gerät) ----------
export function addLocalPlayer(character: Character) {
  const s = gm.session;
  if (!s) return;
  s.players.push({ id: crypto.randomUUID(), name: character.player || character.name, connected: false, local: true, character, lastSeen: Date.now() });
  scheduleParty();
  persistSession();
}

export function updateLocalCharacter(id: string) {
  scheduleParty();
  persistSession();
  pushViews(id);
}

export const connectedCount = () => conns.size;

// ---------- Musik ----------
function pushMusic() {
  const s = gm.session;
  if (!s) return;
  broadcast({ t: 'state', key: 'music', value: $state.snapshot(s.state.music) as MusicState });
  persistSession();
}

/** Aktuelle Position laut Zustand (der SL ist die Zeitquelle). */
function musicPos(): number {
  const m = gm.session!.state.music;
  return m.playing ? currentTime() : m.anchorPos || expectedPosition(m, Date.now());
}

export function musicPlay(track: TrackRef, loop?: boolean) {
  const m = gm.session?.state.music;
  if (!m) return;
  m.track = $state.snapshot(track) as TrackRef;
  m.loop = loop ?? track.loop ?? false;
  m.playing = true;
  m.anchorGm = Date.now();
  m.anchorPos = 0;
  pushMusic();
}

export function musicPause() {
  const m = gm.session?.state.music;
  if (!m?.track || !m.playing) return;
  m.anchorPos = musicPos();
  m.anchorGm = Date.now();
  m.playing = false;
  pushMusic();
}

export function musicResume() {
  const m = gm.session?.state.music;
  if (!m?.track || m.playing) return;
  m.anchorGm = Date.now();
  m.playing = true;
  pushMusic();
}

export function musicStop() {
  const m = gm.session?.state.music;
  if (!m) return;
  m.track = null;
  m.playing = false;
  m.anchorPos = 0;
  pushMusic();
}

export function musicSeek(pos: number) {
  const m = gm.session?.state.music;
  if (!m?.track) return;
  m.anchorPos = Math.max(0, pos);
  m.anchorGm = Date.now();
  pushMusic();
}

export function musicVolume(v: number) {
  const m = gm.session?.state.music;
  if (!m) return;
  m.volume = Math.max(0, Math.min(1, v));
  pushMusic();
}

export function musicLoop(loop: boolean) {
  const m = gm.session?.state.music;
  if (!m) return;
  m.anchorPos = musicPos();
  m.anchorGm = Date.now();
  m.loop = loop;
  pushMusic();
}

export function addTrack(t: TrackRef) {
  gm.session?.tracks.push(t);
  persistSession();
}

export function removeTrack(id: string) {
  const s = gm.session;
  if (!s) return;
  if (s.state.music.track?.id === id) musicStop();
  s.tracks = s.tracks.filter((t) => t.id !== id);
  persistSession();
}

// ---------- Kampf ----------
/** Öffentlichen Kampfzustand an alle verteilen (nach jeder Änderung am Kampf). */
export function commitCombat() {
  const s = gm.session;
  if (!s) return;
  const pub = s.combat.active ? publicCombat($state.snapshot(s.combat) as CombatState) : null;
  s.state.combat = pub;
  broadcast({ t: 'state', key: 'combat', value: pub });
  pushSituations();
  syncTokens();
  persistSession();
}

// ---------- Kampfsituationen ----------
const sitById = (id: string) => gm.session?.combat.situations.find((s) => s.id === id);
const npcById = (id: string | null) => (id ? gm.session?.combat.npcs.find((n) => n.id === id) ?? null : null);
const lastSits = new Map<string, string>();

/** Jedem Spieler seine Situationen schicken (nur bei Änderung). */
function pushSituations() {
  const s = gm.session;
  if (!s) return;
  const c = $state.snapshot(s.combat) as CombatState;
  for (const [id, conn] of conns) {
    const list = c.active ? situationsOf(c, id).map((x) => playerView(x, npcById(x.npcId))) : [];
    const key = JSON.stringify(list);
    if (lastSits.get(id) === key) continue;
    lastSits.set(id, key);
    send(conn, { t: 'sits', list });
  }
}

/** Karten-Token ausgeschalteter Gegner abdunkeln, Token gelöschter Gegner entfernen. */
function syncTokens() {
  const s = gm.session;
  if (!s) return;
  for (const scene of s.scenes) {
    const ops: MapOp[] = [];
    for (const t of scene.tokens) {
      if (!t.npcId) continue;
      const npc = s.combat.npcs.find((n) => n.id === t.npcId);
      if (!npc) { ops.push({ op: 'tokdel', id: t.id }); continue; }
      const out = npcStatus(npc).out;
      if (!!t.out !== out) ops.push({ op: 'tok', token: { ...$state.snapshot(t), out } });
    }
    if (ops.length) gmMapOps(scene.id, ops);
  }
}

function pcName(playerId: string) {
  const p = playerById(playerId);
  return p?.character?.name || p?.name || 'Spieler';
}

function onPlan(playerId: string, d: Draft) {
  const s = gm.session!;
  const c = s.combat;
  const p = playerById(playerId);
  const warn = (text: string) => send(conns.get(playerId), { t: 'toast', text });
  if (!p || !d || typeof d !== 'object') return;
  if (!c.active) return warn('Es läuft kein Kampf.');
  if (!['attack', 'breath', 'gather'].includes(d.kind) || !ATTR_KEYS.includes(d.attr)) return;
  if (c.done[playerId] || c.situations.some((x) => x.playerId === playerId && x.round === c.round && x.kind !== 'defend' && isOpen(x))) {
    return warn('Du hast in dieser Runde schon eine Aktion (3.6).');
  }
  const npc = npcById(d.npcId);
  if (d.kind === 'attack' && (!npc || npc.hidden || npcStatus(npc).out)) return warn('Dieses Ziel gibt es nicht oder es ist schon ausgeschaltet.');
  const gift = d.gift && GIFT_LEVELS.includes(d.gift.level) ? { level: d.gift.level, delay: Math.max(0, Math.min(MAX_GIFT_DELAY, Math.round(Number(d.gift.delay) || 0))) } : undefined;
  const sit = createSituation(c, uid(), playerId, {
    kind: d.kind, npcId: d.npcId, attr: d.attr, technique: String(d.technique ?? ''), moveName: String(d.moveName ?? ''),
    tagsUsed: Array.isArray(d.tagsUsed) ? d.tagsUsed.map(String) : [], gift,
  });
  feed(`${p.name} plant: ${KIND_LABEL[sit.kind]}${npc ? ` gegen ${npc.name}` : ''}.`);
  pushToast(`${p.name} plant: ${KIND_LABEL[sit.kind]}${npc ? ` gegen ${npc.name}` : ''}`, 'info', 5000);
  if (sit.status === 'released' && (sit.kind === 'breath' || sit.kind === 'gather')) finish(sit);
}

function onMoveRequest(playerId: string, name: string, tokenId: string, x: number, y: number) {
  const s = gm.session!;
  const c = s.combat;
  const scene = activeScene();
  const t = scene?.tokens.find((k) => k.id === tokenId);
  if (!c.active || !t || t.playerId !== playerId || !Number.isFinite(x) || !Number.isFinite(y)) return;
  c.moveRequests = c.moveRequests.filter((r) => r.playerId !== playerId);
  c.moveRequests.push({ id: uid(), playerId, tokenId, name: t.name, from: { x: t.x, y: t.y }, to: { x, y } });
  feed(`${name} möchte sich bewegen.`);
  pushToast(`${name} möchte sich bewegen`, 'info', 5000);
}

/** Der SL antwortet auf eine Bewegungsanfrage. */
export function answerMove(id: string, ok: boolean) {
  const s = gm.session;
  const r = s?.combat.moveRequests.find((x) => x.id === id);
  if (!s || !r) return;
  const scene = activeScene();
  if (ok && scene) gmMapOps(scene.id, [{ op: 'tokmove', id: r.tokenId, x: r.to.x, y: r.to.y }]);
  s.combat.moveRequests = s.combat.moveRequests.filter((x) => x.id !== id);
  send(conns.get(r.playerId), { t: 'move-result', ok, note: ok ? 'Bewegung bestätigt.' : 'Der SL lehnt die Bewegung ab.' });
}

/** Der SL legt für einen Spieler eine Aktion an (z.B. für lokale Spieler ohne Gerät). */
export function gmPlan(playerId: string, d: Draft): Situation | null {
  const c = gm.session?.combat;
  if (!c?.active || !playerById(playerId)) return null;
  const sit = createSituation(c, uid(), playerId, { ...d, tagsUsed: d.tagsUsed ?? [] });
  if (sit.status === 'planned') sit.status = 'released';
  if (sit.kind === 'breath' || sit.kind === 'gather') finish(sit);
  return sit;
}

/** Ein Gegner greift einen Spieler an: der Spieler bekommt eine Verteidigungs-Abfrage. */
export function gmAttack(playerId: string, npcId: string): Situation | null {
  const c = gm.session?.combat;
  const npc = npcById(npcId);
  if (!c?.active || !npc || !playerById(playerId)) return null;
  const sit = createSituation(c, uid(), playerId, { kind: 'defend', npcId, attr: 'fluss', technique: `${npc.name} greift an`, moveName: '', tagsUsed: [] });
  sit.status = 'released';
  sit.attackers = npc.type === 'goon' ? Math.max(1, npc.count) : 1;
  feed(`${npc.name} greift ${pcName(playerId)} an.`);
  sendToast(playerId, `${npc.name} greift dich an!`);
  return sit;
}

export function releaseSit(id: string) {
  const sit = sitById(id);
  if (!sit || sit.status !== 'planned') return;
  sit.status = 'released';
  if (sit.kind === 'breath' || sit.kind === 'gather') finish(sit);
}

export function cancelSit(id: string) {
  const sit = sitById(id);
  if (sit && sit.status !== 'resolved') sit.status = 'cancelled';
}

/** Erleichtern/Erschweren, Tags oder Gift ändern: erlaubt, solange der Spieler noch nicht gewürfelt hat. */
export const sitEditable = (sit: Situation) => (sit.status === 'planned' || sit.status === 'released') && !sit.pRoll;

export function grantBullet(id: string) {
  const c = gm.session?.combat;
  const sit = sitById(id);
  if (!c || !sit) return;
  if (!grantBulletTime(c, sit)) { pushToast('Bullet Time gab es in dieser Runde für diesen Spieler schon.', 'warn'); return; }
  sendToast(sit.playerId, 'Bullet Time! Wähle Zonenwahl, +1 EP oder +1 Momentum.');
}

function attachPlayerRoll(playerId: string, r: RollRecord) {
  const sit = sitById(String(r.sit));
  if (!sit || sit.playerId !== playerId || sit.pRoll || (sit.kind !== 'attack' && sit.kind !== 'defend')) return;
  if (sit.status !== 'released') { send(conns.get(playerId), { t: 'toast', text: 'Der SL hat diese Aktion noch nicht freigegeben.' }); return; }
  sit.pRoll = rollToSit(r.id, r.total, r.bonus, r.mod);
  sit.hero = !!r.hero;
  finish(sit);
}

/** Der SL würfelt für den Gegner der Situation. */
export function rollNpcFor(id: string, secret = false) {
  const c = gm.session?.combat;
  const sit = sitById(id);
  const npc = npcById(sit?.npcId ?? null);
  if (!c || !sit || !npc || sit.nRoll || (sit.status !== 'released' && sit.status !== 'planned')) return;
  const pc = playerById(sit.playerId)?.character;
  const mod = npcRollMod(sit, c, pc ? pc.tags.map((t) => ({ name: t.name, size: t.size })) : []);
  const rec = roll2d6({
    who: npc.name, label: `${KIND_LABEL[sit.kind]}: ${npc.name} gegen ${pcName(sit.playerId)}`, bonus: npc.bonus, mod, kind: 'clash', secret, sit: sit.id,
  });
  sit.nRoll = rollToSit(rec.id, rec.total, rec.bonus, rec.mod);
  finish(sit);
}

/** Der SL würfelt für einen Spieler ohne Gerät (lokaler Spieler oder getrennt). */
export function rollPlayerFor(id: string) {
  const sit = sitById(id);
  const p = sit ? playerById(sit.playerId) : null;
  if (!sit || !p?.character || sit.pRoll || sit.status !== 'released' || (sit.kind !== 'attack' && sit.kind !== 'defend')) return;
  const bonus = vitalsOf(p.character).bonus[sit.attr];
  const rec = roll2d6({
    who: p.character.name, characterId: p.character.id, label: `${KIND_LABEL[sit.kind]} (${sit.technique || sit.attr})`, bonus,
    mod: playerRollMod(sit, npcById(sit.npcId)), kind: 'clash', sit: sit.id,
  });
  sit.pRoll = rollToSit(rec.id, rec.total, rec.bonus, rec.mod);
  finish(sit);
}

function buildProposal(sit: Situation) {
  const c = gm.session!.combat;
  const p = playerById(sit.playerId);
  const npc = npcById(sit.npcId);
  const scene = activeScene();
  const pcTok = scene?.tokens.find((t) => t.playerId === sit.playerId) ?? null;
  sit.proposal = proposeResolution({
    sit, npc, pcName: pcName(sit.playerId), pcSchutz: p?.character?.resources.schutz.current ?? 0,
    pcBedraengnis: c.bedraengnis[sit.playerId] ?? 0, nearTokens: scene && npc ? nearestIds($state.snapshot(scene.tokens), npc.id, pcTok ? { x: pcTok.x, y: pcTok.y } : null) : [],
    exposedUsed: !!c.exposed[sit.playerId] && (sit.kind === 'attack' || sit.kind === 'defend'),
  });
}

/** Beide Würfe da: Clash rechnen, Wurf-Protokoll verknüpfen, Folgen vorschlagen. */
function finish(sit: Situation) {
  if (sit.kind === 'breath' || sit.kind === 'gather') { buildProposal(sit); sit.status = 'rolled'; return; }
  if (!sit.pRoll || !sit.nRoll) return;
  const res = computeResult(sit);
  if (!res) return;
  sit.result = res;
  sit.status = 'rolled';
  const a = rollLog.entries.find((e) => e.id === sit.pRoll!.id);
  const d = rollLog.entries.find((e) => e.id === sit.nRoll!.id);
  if (a && d) linkClash($state.snapshot(a) as RollRecord, $state.snapshot(d) as RollRecord, res);
  buildProposal(sit);
}

export function refreshProposal(id: string) {
  const sit = sitById(id);
  if (sit && sit.result) buildProposal(sit);
}

/** Wendet die angehakten Folgen an: NPCs, Kampfzustand, Karte, Spielerbögen. */
export function applySit(id: string) {
  const s = gm.session;
  const sit = sitById(id);
  if (!s || !sit?.proposal || sit.status === 'resolved') return;
  const applied = applyProposal(s.combat, sit.proposal);
  const byPlayer = new Map<string, import('./protocol').PatchOp[]>();
  for (const pt of applied.patches) byPlayer.set(pt.playerId, [...(byPlayer.get(pt.playerId) ?? []), ...pt.ops]);
  for (const [pid, ops] of byPlayer) patchPlayer(pid, ops);
  const scene = activeScene();
  if (scene && applied.removeTokens.length) gmMapOps(scene.id, applied.removeTokens.map((tid) => ({ op: 'tokdel', id: tid }) as MapOp));
  sit.status = 'resolved';
  feed(`${KIND_LABEL[sit.kind]} von ${pcName(sit.playerId)} abgewickelt.`);
}

// ---------- Rundenende und Gift ----------
/** Gift tickt am Rundenende: Spielerbögen und NPCs. */
export function poisonRound() {
  const s = gm.session;
  if (!s) return;
  const notes: string[] = [];
  for (const p of s.players) {
    if (!p.character?.poisons?.length) continue;
    const r = tickCharacter(p.character);
    notes.push(...r.notes);
    patchPlayer(p.id, r.ops);
  }
  for (const n of s.combat.npcs) notes.push(...tickNpc(n));
  for (const t of notes) feed(t);
  if (notes.length) pushToast(`Gift: ${notes.join(' · ')}`, 'warn', 9000);
}

/** Neue Runde: erst wirkt das Gift (Rundenende), dann beginnt die nächste. */
export function advanceRound() {
  const c = gm.session?.combat;
  if (!c) return;
  poisonRound();
  nextRound(c);
}

// ---------- Handouts ----------
export function addHandout(h: Handout) {
  gm.session?.handouts.unshift(h);
  persistSession();
}

export function removeHandout(id: string) {
  const s = gm.session;
  if (!s) return;
  s.handouts = s.handouts.filter((h) => h.id !== id);
  persistSession();
}

/** `to` = null: an alle. Gibt zurück, wie viele Spieler es bekommen haben. */
export function sendHandout(h: Handout, to: string[] | null): number {
  let n = 0;
  for (const [id, c] of conns) {
    if (to && !to.includes(id)) continue;
    send(c, { t: 'handout', handout: $state.snapshot(h) as Handout });
    n++;
  }
  return n;
}

// ---------- Sitzung sichern ----------
interface SessionFile {
  kinetik: 'session';
  version: 1;
  exportedAt: string;
  session: GmSession;
  assets?: Record<string, { name: string; mime: string; b64: string }>;
}

function toB64(bytes: ArrayBuffer): string {
  const u = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
function fromB64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}

/** Hashes aller Dateien, die die Sitzung braucht (Karten, Titel, Handouts). */
export function sessionAssetHashes(s: GmSession): string[] {
  const h = new Set<string>();
  for (const sc of s.scenes) if (sc.asset) h.add(sc.asset);
  for (const t of s.tracks) if (t.hash) h.add(t.hash);
  for (const x of s.handouts) if (x.hash) h.add(x.hash);
  return [...h];
}

export async function exportSession(includeAssets: boolean): Promise<SessionFile | null> {
  const s = gm.session;
  if (!s) return null;
  const file: SessionFile = { kinetik: 'session', version: 1, exportedAt: new Date().toISOString(), session: $state.snapshot(s) as GmSession };
  for (const p of file.session.players) p.connected = false;
  if (includeAssets) {
    file.assets = {};
    for (const hash of sessionAssetHashes(s)) {
      const rec = await getAssetBytes(hash);
      if (rec) file.assets[hash] = { name: rec.meta.name, mime: rec.meta.mime, b64: toB64(rec.bytes) };
    }
  }
  return file;
}

/** Liest eine Sitzungsdatei, stellt Dateien wieder her und liefert die Sitzung (noch nicht gestartet). */
export async function importSession(text: string): Promise<GmSession> {
  let json: SessionFile;
  try { json = JSON.parse(text); } catch { throw new Error('Die Datei ist kein gültiges JSON.'); }
  if (json?.kinetik !== 'session' || !json.session) throw new Error('Das ist keine KINETIK-Sitzungsdatei.');
  for (const a of Object.values(json.assets ?? {})) await putAsset(fromB64(a.b64), a.name, a.mime);
  const s = json.session;
  s.tracks = s.tracks ?? [];
  s.scenes = s.scenes ?? [];
  s.handouts = s.handouts ?? [];
  s.combat = upgradeCombat(s.combat);
  s.players = (s.players ?? []).map((p) => ({ ...p, connected: false, character: p.character ? sanitizeCharacter(p.character) : null }));
  s.state.music = { ...defaultMusic(), ...(s.state.music ?? {}), playing: false };
  s.state.combat = s.combat.active ? publicCombat(s.combat) : null;
  await set(STORE_KEY, s);
  return s;
}
