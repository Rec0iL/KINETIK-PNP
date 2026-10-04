// Laufzeit der PenNodePaper-Brücke: hält die WebSocket-Verbindung und verdrahtet `PnpHost` mit der echten Sitzung.
import { gm, addScene, removeScene, activateScene, gmMapOps, addHandout, removeHandout, sendHandout, commitCombat, musicPlay, musicStop } from './gm.svelte';
import { putAsset, prepareImage } from './assets.svelte';
import { catalog } from '../music/catalog.svelte';
import { imageToDataUrl, shrinkDataUrl } from '../lib/image';
import { uid } from '../model/character';
import { settings } from '../lib/settings.svelte';
import { pushToast } from '../ui/toasts.svelte';
import { backoffMs, RECONNECT_MAX_TRIES } from './backoff';
import { b64ToBytes, handleMessage, pnpProfile, PNP_PROTOCOL, type PnpCharacter, type PnpHost, type PnpImage, type PnpIn } from './pnp';

const APP_VERSION = '1.0.0';

export const pnp = $state<{ status: 'off' | 'connecting' | 'connected' | 'error'; error: string; campaign: string }>({ status: 'off', error: '', campaign: '' });

const fileOf = (img: PnpImage) => new File([b64ToBytes(img.b64)], img.name, { type: img.mime });

const host: PnpHost = {
  uid,
  session() {
    if (!gm.session || gm.status !== 'open') throw new Error('Keine laufende Runde: starte zuerst die Runde im Spielleiter-Bereich.');
    return gm.session;
  },
  async storeImage(img, maxSide) {
    const prep = await prepareImage(fileOf(img), maxSide);
    const meta = await putAsset(prep.bytes, img.name, prep.mime);
    return { hash: meta.hash, width: prep.width, height: prep.height };
  },
  async portraits(img) {
    const big = await imageToDataUrl(fileOf(img), 256);
    return { img: big, token: await shrinkDataUrl(big, 96) };
  },
  addScene, removeScene, activateScene, gmMapOps, addHandout, removeHandout, sendHandout, commitCombat, musicPlay, musicStop,
  catalog: () => catalog.tracks,
  notify: (t) => pushToast(t, 'good'),
};

let ws: WebSocket | null = null;
let lastParty = '';
let wanted = false;
let tries = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

function address(): string {
  const base = settings.pnpUrl.trim() || 'ws://127.0.0.1:4317/bridge';
  return `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(settings.pnpToken.trim())}`;
}

function open() {
  clearTimeout(timer);
  pnp.status = 'connecting';
  let sock: WebSocket;
  try {
    sock = new WebSocket(address());
  } catch (e) {
    pnp.status = 'error';
    pnp.error = e instanceof Error ? e.message : 'Ungültige Adresse';
    return;
  }
  ws = sock;
  sock.onopen = () => sock.send(JSON.stringify({ t: 'hello', protocol: PNP_PROTOCOL, profile: pnpProfile(APP_VERSION) }));
  sock.onmessage = (e) => {
    let msg: PnpIn;
    try {
      msg = JSON.parse(String(e.data));
    } catch {
      return;
    }
    if (msg.t === 'welcome') {
      tries = 0;
      lastParty = '';
      pnp.status = 'connected';
      pnp.error = '';
      pnp.campaign = msg.campaign;
      return;
    }
    void handleMessage(host, msg).then((r) => r && sock.readyState === WebSocket.OPEN && sock.send(JSON.stringify(r)));
  };
  sock.onclose = (e) => {
    if (ws === sock) ws = null;
    if (!wanted) return;
    if (e.code === 1008) {
      pnp.status = 'error';
      pnp.error = e.reason || 'Protokollversion wird nicht unterstützt';
      return;
    }
    if (tries >= RECONNECT_MAX_TRIES) {
      pnp.status = 'error';
      pnp.error = 'Keine Verbindung zu PenNodePaper. Läuft die App, und stimmen Adresse und Token?';
      return;
    }
    pnp.status = 'connecting';
    timer = setTimeout(open, backoffMs(tries++));
  };
}

/** Meldet die Spielercharaktere ungefragt (nur wenn sie sich seit der letzten Meldung geändert haben). */
export function reportParty(characters: PnpCharacter[], signature: string) {
  if (!ws || ws.readyState !== WebSocket.OPEN || signature === lastParty) return;
  lastParty = signature;
  ws.send(JSON.stringify({ t: 'party', characters }));
}

export function connectBridge() {
  wanted = true;
  tries = 0;
  ws?.close();
  open();
}

export function disconnectBridge() {
  wanted = false;
  clearTimeout(timer);
  ws?.close();
  ws = null;
  pnp.status = 'off';
}
