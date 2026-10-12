// Dünne Hülle um PeerJS: Optionen aus den Einstellungen, Peer erzeugen und auf "open" warten.
import Peer, { type PeerOptions, type DataConnection } from 'peerjs';
import { settings } from '../lib/settings.svelte';
import { buildIceConfig, explainFailedJoin, hasCustomTurn } from './ice';
import { brokerProbeUrl } from './backoff';
import { currentIceSettings } from './icetest';
import { t, type Key } from '../i18n';

export type { DataConnection };
export { Peer };

export function peerOptions(): PeerOptions {
  const o: PeerOptions = { debug: 1 };
  if (settings.peerHost.trim()) {
    o.host = settings.peerHost.trim();
    o.port = settings.peerPort;
    o.path = settings.peerPath || '/';
    o.secure = settings.peerSecure;
  }
  o.config = buildIceConfig({ iceJson: settings.iceJson, turnUrl: settings.turnUrl, turnUser: settings.turnUser, turnPass: settings.turnPass, relayOnly: settings.relayOnly });
  return o;
}

export class PeerFailure extends Error {
  constructor(public kind: string, message: string) {
    super(message);
  }
}

/** Beschreibt PeerJS-Fehler verständlich. */
export function explainPeerError(err: unknown): PeerFailure {
  const type = (err as { type?: string })?.type ?? 'unknown';
  const map: Record<string, Key> = {
    'unavailable-id': 'net.peer.unavailableId',
    'peer-unavailable': 'net.peer.peerUnavailable',
    network: 'net.peer.network',
    'server-error': 'net.peer.serverError',
    'socket-error': 'net.peer.socketError',
    'socket-closed': 'net.peer.socketClosed',
    'browser-incompatible': 'net.peer.browserIncompatible',
    'webrtc': 'net.peer.webrtc',
    negotiation: 'net.peer.negotiation',
  };
  const key = map[type];
  return new PeerFailure(type, key ? t(key) : t('net.peer.unknown', { type }));
}

/** Erzeugt einen Peer und wartet, bis er beim Server registriert ist. */
export function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new PeerFailure('timeout', t('net.peer.timeout')));
    }, 15000);
    peer.once('open', () => {
      clearTimeout(timer);
      resolve(peer);
    });
    peer.once('error', (err) => {
      clearTimeout(timer);
      peer.destroy();
      reject(explainPeerError(err));
    });
  });
}

/** Nach einem gescheiterten Beitritt anhand der ICE-Kandidaten erklären, woran es lag. */
export async function diagnoseJoin(conn: DataConnection): Promise<string> {
  const local: string[] = [];
  let remote = 0;
  try {
    const stats = await (conn as unknown as { peerConnection?: RTCPeerConnection }).peerConnection?.getStats();
    stats?.forEach((r) => {
      if (r.type === 'local-candidate' && r.candidateType) local.push(r.candidateType);
      if (r.type === 'remote-candidate') remote++;
    });
  } catch { /* ohne Statistik: allgemeine Meldung */ }
  return explainFailedJoin(local, remote, hasCustomTurn(currentIceSettings()));
}

/** Ist der Vermittlungsserver erreichbar? Ein Neuaufbau bei toter Leitung würde den Peer samt Spielerverbindungen zerstören. */
export async function brokerReachable(timeoutMs = 5000): Promise<boolean> {
  const o = peerOptions();
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    await fetch(brokerProbeUrl({ host: o.host, port: o.port, path: o.path, secure: o.secure }), { cache: 'no-store', signal: ctl.signal });
    return true; // jede HTTP-Antwort heißt: der Server lebt
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}
