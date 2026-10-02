// SL-Host: nimmt Spieler an, hält die Sitzung, verteilt Zustand. Der SL-Tab ist der einzige Server.
import { get, set, del } from 'idb-keyval';
import type { Character } from '../model/character';
import { sanitizeCharacter } from '../model/io';
import { applyPatch, describePatch } from '../model/patch';
import { infoOf } from '../model/vitals';
import { commitRoll, onRoll, rollLog, type RollRecord } from '../dice/roller.svelte';
import { settings } from '../lib/settings.svelte';
import { pushToast } from '../ui/toasts.svelte';
import { openPeer, explainPeerError, type DataConnection, type Peer } from './peer';
import {
  PROTOCOL_VERSION, newRoomCode, peerIdFor, type ClientMsg, type PatchOp, type PlayerInfo, type ServerMsg, type SharedState,
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
    code: newRoomCode(), password: '', players: [], gmNotes: '', created: Date.now(),
    state: { gmName: '', visibility: 'party', notes: '', rounds: 0 },
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
      break;
    }
    case 'ping':
      send(conn, { t: 'pong', ts: msg.ts });
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
    case 'bye':
      conn.close();
      break;
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
  send(conn, { t: 'welcome', playerId: p.id, gmName: s.state.gmName, state: $state.snapshot(s.state), players: partyFor(p.id), log: $state.snapshot(log) as RollRecord[], resume });
  feed(`${p.name} ist ${resume ? 'wieder da' : 'beigetreten'}.`);
  scheduleParty();
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
