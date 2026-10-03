// Wartezeiten für den Neuaufbau der Verbindung zum Vermittlungsserver.
export const RECONNECT_MAX_TRIES = 8;
export const RECONNECT_MAX_MS = 30000;

/** 2 s, 4 s, 8 s, 16 s, dann höchstens 30 s. `attempt` zählt ab 0. */
export const backoffMs = (attempt: number): number => Math.min(RECONNECT_MAX_MS, 2000 * 2 ** Math.max(0, attempt));

export interface BrokerAddr { host?: string; port?: number; path?: string; secure?: boolean }

/** Adresse, unter der der Vermittlungsserver seine ID-Schnittstelle anbietet (wie PeerJS sie selbst aufruft). */
export function brokerProbeUrl(o: BrokerAddr): string {
  const secure = o.secure ?? true;
  const path = (o.path ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
  return `${secure ? 'https' : 'http'}://${o.host ?? '0.peerjs.com'}:${o.port ?? 443}${path}peerjs/id?ts=${Date.now()}`;
}
