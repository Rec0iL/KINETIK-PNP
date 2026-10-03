// Dünne Hülle um PeerJS: Optionen aus den Einstellungen, Peer erzeugen und auf "open" warten.
import Peer, { type PeerOptions, type DataConnection } from 'peerjs';
import { settings } from '../lib/settings.svelte';
import { buildIceConfig, explainFailedJoin, hasCustomTurn } from './ice';
import { currentIceSettings } from './icetest';

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
  const map: Record<string, string> = {
    'unavailable-id': 'Dieser Raumcode ist gerade belegt (ist die Runde noch in einem anderen Tab offen?).',
    'peer-unavailable': 'Keine Runde mit diesem Code gefunden. Läuft der SL-Tab und stimmt der Code?',
    network: 'Keine Verbindung zum Vermittlungsserver. Internet und Server-Einstellungen prüfen.',
    'server-error': 'Der Vermittlungsserver antwortet nicht.',
    'socket-error': 'Verbindung zum Vermittlungsserver unterbrochen.',
    'socket-closed': 'Verbindung zum Vermittlungsserver geschlossen.',
    'browser-incompatible': 'Dieser Browser unterstützt WebRTC nicht.',
    'webrtc': 'WebRTC-Fehler: Direktverbindung nicht möglich (Firewall?). Ein TURN-Server kann helfen.',
    negotiation: 'Verbindungsaufbau fehlgeschlagen (Firewall oder strenges NAT?).',
  };
  return new PeerFailure(type, map[type] ?? `Verbindungsfehler (${type}).`);
}

/** Erzeugt einen Peer und wartet, bis er beim Server registriert ist. */
export function openPeer(id?: string): Promise<Peer> {
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => {
      peer.destroy();
      reject(new PeerFailure('timeout', 'Zeitüberschreitung beim Verbinden mit dem Vermittlungsserver.'));
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
