// Spieler-Client: verbindet sich mit dem SL, hält den Bogen synchron und verbindet sich nach Abbrüchen von selbst neu.
import type { Character } from '../model/character';
import { sanitizeCharacter } from '../model/io';
import { applyPatch } from '../model/patch';
import { commitRoll, onRoll, type RollRecord } from '../dice/roller.svelte';
import { getCharacter, saveCharacter } from '../store/characters.svelte';
import { settings } from '../lib/settings.svelte';
import { pushToast } from '../ui/toasts.svelte';
import { openPeer, explainPeerError, type DataConnection, type Peer } from './peer';
import { handleAssetMessage, setAssetRequester } from './assets.svelte';
import { addPing } from '../map/pings.svelte';
import { bestClockOffset } from '../music/clock';
import { applyMapOp, type MapOp, type MapState } from '../map/mapstate';
import type { BtOption, Draft, PlayerSituation } from '../gm/situation';
import type { ZoneKey } from '../rules';
import {
  PROTOCOL_VERSION, peerIdFor, normalizeCode, type ClientMsg, type Handout, type PlayerInfo, type ServerMsg, type SharedState,
} from './protocol';

export type PlayerStatus = 'idle' | 'connecting' | 'pending' | 'connected' | 'reconnecting' | 'denied' | 'error';

export const player = $state<{
  status: PlayerStatus;
  error: string;
  code: string;
  gmName: string;
  state: SharedState | null;
  party: PlayerInfo[];
  /** Der Bogen eines anderen Spielers, den ich gerade ansehe (Sichtbarkeit "offen"). */
  view: { playerId: string; character: Character | null } | null;
  /** Die aktive Karte der Runde (ohne versteckte Tokens). */
  map: MapState | null;
  /** Vom SL gesendete Handouts dieser Runde. */
  handouts: Handout[];
  playerId: string;
  characterId: string;
  name: string;
  /** Millisekunden Hin- und Rückweg zum SL. */
  latency: number;
  /** SL-Zeit minus lokale Zeit in ms (für synchrone Musik). */
  clockOffset: number;
  /** Meine Kampfsituationen (geplante Aktionen, Angriffe auf mich). */
  sits: PlayerSituation[];
  /** Meine Bewegungsanfrage wartet auf den SL. */
  pendingMove: { tokenId: string; x: number; y: number } | null;
}>({
  status: 'idle', error: '', code: '', gmName: '', state: null, party: [], view: null, map: null, handouts: [],
  playerId: loadPlayerId(), characterId: '', name: '', latency: 0, clockOffset: 0, sits: [], pendingMove: null,
});

function loadPlayerId(): string {
  try {
    const k = 'kinetik.playerId';
    let v = localStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(k, v); }
    return v;
  } catch {
    return crypto.randomUUID();
  }
}

let peer: Peer | null = null;
let conn: DataConnection | null = null;
let password = '';
let manualClose = false;
let retryTimer: ReturnType<typeof setTimeout>;
let pingTimer: ReturnType<typeof setInterval>;
let sheetTimer: ReturnType<typeof setTimeout>;
let retries = 0;
const clockSamples: { rtt: number; gm: number; localAtRecv: number }[] = [];
let unsubRoll: (() => void) | null = null;

const sendMsg = (m: ClientMsg) => {
  try { if (conn?.open) conn.send(m); } catch (e) { console.warn('send', e); }
};

export const isInRound = () => player.status === 'connected' || player.status === 'reconnecting' || player.status === 'pending';

export function connectToRound(opts: { code: string; name: string; password: string; characterId: string }) {
  if (player.status !== 'idle' && player.status !== 'denied' && player.status !== 'error') return;
  player.code = normalizeCode(opts.code);
  player.name = opts.name.trim() || 'Spieler';
  player.characterId = opts.characterId;
  password = opts.password;
  manualClose = false;
  retries = 0;
  player.error = '';
  player.status = 'connecting';
  void attempt();
  try { sessionStorage.setItem('kinetik.round', JSON.stringify({ code: player.code, name: player.name, password, characterId: player.characterId })); } catch { /* ignorieren */ }
}

/** Nach einem Neuladen der Seite automatisch in die letzte Runde zurück. */
export function resumeFromSession(): boolean {
  try {
    const raw = sessionStorage.getItem('kinetik.round');
    if (!raw) return false;
    const o = JSON.parse(raw);
    connectToRound(o);
    return true;
  } catch { return false; }
}

export function setActiveCharacter(id: string) {
  player.characterId = id;
  pushSheetNow();
}

async function attempt() {
  clearTimeout(retryTimer);
  try {
    peer?.destroy();
    peer = await openPeer();
  } catch (e) {
    return failed((e as Error).message);
  }
  const target = peerIdFor(player.code);
  const c = peer.connect(target, { reliable: true });
  conn = c;
  let opened = false;
  const guard = setTimeout(() => { if (!opened) { c.close(); failed('Zeitüberschreitung: Die Runde antwortet nicht.'); } }, 15000);
  c.on('open', () => {
    opened = true;
    clearTimeout(guard);
    sendMsg({ t: 'hello', v: PROTOCOL_VERSION, playerId: player.playerId, name: player.name, password });
  });
  c.on('data', (d) => onMessage(d as ServerMsg));
  c.on('close', () => {
    clearTimeout(guard);
    if (conn !== c) return;
    if (manualClose || player.status === 'denied') return;
    failed('Verbindung zur Runde verloren.');
  });
  c.on('error', () => { /* close folgt */ });
  peer.on('error', (err) => {
    const f = explainPeerError(err);
    if (f.kind === 'peer-unavailable') { clearTimeout(guard); failed(f.message); }
  });
}

function failed(message: string) {
  if (manualClose) return;
  const wasIn = player.status === 'connected' || player.status === 'reconnecting';
  stopPing();
  if (!wasIn && retries === 0 && player.status === 'connecting') {
    // erster Verbindungsversuch gescheitert: nicht endlos weiterversuchen
    player.status = 'error';
    player.error = message;
    cleanup();
    return;
  }
  player.status = 'reconnecting';
  player.error = message;
  retries++;
  const delay = Math.min(10000, 1500 * retries);
  retryTimer = setTimeout(() => void attempt(), delay);
}

function onMessage(m: ServerMsg) {
  switch (m.t) {
    case 'pending':
      player.status = 'pending';
      break;
    case 'deny':
    case 'kick':
      player.status = 'denied';
      player.error = m.t === 'deny' ? m.reason : m.reason;
      manualClose = true;
      stopPing();
      clearTimeout(retryTimer);
      try { sessionStorage.removeItem('kinetik.round'); } catch { /* ignorieren */ }
      break;
    case 'welcome': {
      player.status = 'connected';
      player.error = '';
      retries = 0;
      player.gmName = m.gmName;
      player.state = m.state;
      player.party = m.players;
      player.map = m.map;
      player.sits = [];
      player.pendingMove = null;
      player.handouts = loadHandouts();
      setAssetRequester((hash) => sendMsg({ t: 'want', hash }));
      for (const r of m.log) commitRoll(r, { remote: true, quiet: true });
      startPing();
      unsubRoll?.();
      unsubRoll = onRoll((r) => sendMsg({ t: 'roll', roll: $state.snapshot(r) as RollRecord }));
      pushSheetNow();
      pushToast(m.resume ? `Wieder verbunden mit ${m.gmName}.` : `Du bist in ${m.gmName}s Runde.`, 'good');
      break;
    }
    case 'party':
      player.party = m.players;
      break;
    case 'sheet-view':
      player.view = { playerId: m.playerId, character: m.character ? sanitizeCharacter(m.character) : null };
      break;
    case 'state':
      if (player.state) (player.state as unknown as Record<string, unknown>)[m.key] = m.value;
      if (m.key === 'visibility') player.view = null;
      if (m.key === 'gmName') player.gmName = String(m.value);
      break;
    case 'roll':
      commitRoll(m.roll, { remote: true });
      break;
    case 'patch': {
      const c = getCharacter(player.characterId);
      if (c) {
        applyPatch(c, m.ops, { autoShock: settings.autoShock });
        saveCharacter(c);
        pushSheetNow();
      }
      pushToast(`SL: ${m.note ?? 'Änderung am Bogen'}`, 'warn', 7000);
      break;
    }
    case 'toast':
      pushToast(m.text, 'info', 8000);
      break;
    case 'sits':
      player.sits = m.list;
      break;
    case 'move-result':
      player.pendingMove = null;
      pushToast(m.note, m.ok ? 'good' : 'warn', 4000);
      break;
    case 'handout':
      if (!player.handouts.some((h) => h.id === m.handout.id)) player.handouts.unshift(m.handout);
      saveHandouts();
      pushToast(`Neues Handout: ${m.handout.title}`, 'good', 8000);
      break;
    case 'pong': {
      const rtt = performance.now() - m.ts;
      player.latency = Math.round(rtt);
      clockSamples.push({ rtt, gm: m.gm, localAtRecv: Date.now() });
      if (clockSamples.length > 8) clockSamples.shift();
      player.clockOffset = bestClockOffset(clockSamples);
      break;
    }
    case 'map':
      for (const op of m.ops) {
        if (op.op === 'full') player.map = op.map;
        else if (op.op === 'ping') addPing(op.x, op.y, op.who, op.color);
        else if (player.map) applyMapOp(player.map, op);
      }
      break;
    case 'asset-head':
    case 'asset-chunk':
    case 'asset-missing':
      void handleAssetMessage(m);
      break;
  }
}

function startPing() {
  stopPing();
  clockSamples.length = 0;
  pingTimer = setInterval(() => sendMsg({ t: 'ping', ts: performance.now() }), 5000);
  // Am Anfang schnell mehrere Proben für eine gute Uhrenschätzung.
  for (let i = 0; i < 4; i++) setTimeout(() => sendMsg({ t: 'ping', ts: performance.now() }), i * 250);
}
function stopPing() { clearInterval(pingTimer); }

function cleanup() {
  stopPing();
  unsubRoll?.();
  unsubRoll = null;
  try { conn?.close(); } catch { /* ignorieren */ }
  conn = null;
  peer?.destroy();
  peer = null;
}

export function leaveRound() {
  manualClose = true;
  clearTimeout(retryTimer);
  sendMsg({ t: 'bye' });
  cleanup();
  player.status = 'idle';
  player.party = [];
  player.state = null;
  player.view = null;
  player.map = null;
  player.sits = [];
  player.pendingMove = null;
  setAssetRequester(null);
  player.error = '';
  try { sessionStorage.removeItem('kinetik.round'); } catch { /* ignorieren */ }
}

/** Schickt den aktiven Bogen (entprellt). Wird bei jeder Änderung aufgerufen. */
export function scheduleSheet(c: Character) {
  if (player.status !== 'connected' || c.id !== player.characterId) return;
  clearTimeout(sheetTimer);
  const snap = $state.snapshot(c) as Character;
  sheetTimer = setTimeout(() => sendMsg({ t: 'sheet', character: snap }), 350);
}

export function pushSheetNow() {
  clearTimeout(sheetTimer);
  const c = getCharacter(player.characterId);
  if (c && player.status === 'connected') sendMsg({ t: 'sheet', character: $state.snapshot(c) as Character });
}

export function viewPlayer(id: string | null) {
  player.view = id ? { playerId: id, character: null } : null;
  sendMsg({ t: 'view', playerId: id });
}

export function sendMapOps(ops: MapOp[]) {
  sendMsg({ t: 'map', ops });
}

/** Aktion planen: der SL bekommt eine Kampfsituation. */
export function sendPlan(draft: Draft) {
  sendMsg({ t: 'plan', draft });
}
export function cancelPlan(id: string) {
  sendMsg({ t: 'plan-cancel', id });
}
export function sendBulletChoice(id: string, option: BtOption, zone?: ZoneKey) {
  sendMsg({ t: 'bt-choice', id, option, zone });
}
/** Bewegung im Kampf: Anfrage an den SL. */
export function sendMoveRequest(tokenId: string, x: number, y: number) {
  player.pendingMove = { tokenId, x, y };
  sendMsg({ t: 'move-req', tokenId, x, y });
}

const handoutKey = () => `kinetik.handouts.${player.code}`;
function loadHandouts(): Handout[] {
  try { return JSON.parse(localStorage.getItem(handoutKey()) ?? '[]'); } catch { return []; }
}
function saveHandouts() {
  try { localStorage.setItem(handoutKey(), JSON.stringify($state.snapshot(player.handouts))); } catch { /* ignorieren */ }
}
