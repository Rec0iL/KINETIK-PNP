// ICE-Konfiguration und Auswertung von Verbindungsproblemen. Rein, ohne DOM und ohne PeerJS (testbar).
// Direkte Browser-zu-Browser-Verbindungen scheitern hinter strengem NAT (Mobilfunk/CGNAT, Firmennetze).
// Dann braucht es einen Relay-Server (TURN), der den Verkehr weiterleitet.

export interface IceSettings {
  /** Eigene ICE-Server als JSON, ersetzt alles andere. */
  iceJson: string;
  /** Eigener TURN-Server: eine oder mehrere URLs (turn: oder turns:), getrennt durch Komma, Leerzeichen oder Zeilenumbruch. */
  turnUrl: string;
  turnUser: string;
  turnPass: string;
  /** Nur Relay-Kandidaten verwenden (hilft, wenn direkte Wege hängen bleiben). */
  relayOnly: boolean;
}

export const STUN_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

/** Öffentlicher TURN von PeerJS: geteilt und ohne Zusage, nur ein Notnagel. */
export const PEERJS_TURN: RTCIceServer = {
  urls: [
    'turn:eu-0.turn.peerjs.com:3478',
    'turn:us-0.turn.peerjs.com:3478',
    'turn:eu-0.turn.peerjs.com:3478?transport=tcp',
    'turn:us-0.turn.peerjs.com:3478?transport=tcp',
  ],
  username: 'peerjs',
  credential: 'peerjsp',
};

export function parseTurnUrls(text: string): string[] {
  return text.split(/[\s,;]+/).map((u) => u.trim()).filter((u) => /^turns?:/i.test(u));
}

function parseIceJson(json: string): RTCIceServer[] | null {
  if (!json.trim()) return null;
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) return v as RTCIceServer[];
    if (v && typeof v === 'object' && Array.isArray(v.iceServers)) return v.iceServers as RTCIceServer[];
  } catch { /* ungültig: wird ignoriert */ }
  return null;
}

export const hasCustomTurn = (s: IceSettings) => parseTurnUrls(s.turnUrl).length > 0 || !!parseIceJson(s.iceJson)?.some((x) => JSON.stringify(x.urls).includes('turn'));

export function buildIceConfig(s: IceSettings): RTCConfiguration {
  let iceServers = parseIceJson(s.iceJson);
  if (!iceServers) {
    iceServers = [...STUN_SERVERS];
    const urls = parseTurnUrls(s.turnUrl);
    if (urls.length) iceServers.push({ urls, username: s.turnUser.trim(), credential: s.turnPass });
    iceServers.push(PEERJS_TURN);
  }
  return { iceServers, iceTransportPolicy: s.relayOnly ? 'relay' : 'all' };
}

// ---------- Auswertung ----------
export interface CandidateInfo { type: string; protocol: string }

export interface IceReport {
  host: boolean;
  srflx: boolean;
  relay: boolean;
  /** Relay über TCP/TLS (kommt auch durch Firewalls, die UDP sperren). */
  relayTcp: boolean;
  /** Fehlermeldungen der ICE-Server (z.B. 701 = nicht erreichbar, 401 = falsche Zugangsdaten). */
  errors: string[];
}

export function summarize(cands: CandidateInfo[], errors: string[] = []): IceReport {
  const has = (t: string) => cands.some((c) => c.type === t);
  return {
    host: has('host'), srflx: has('srflx'), relay: has('relay'),
    relayTcp: cands.some((c) => c.type === 'relay' && c.protocol === 'tcp'), errors,
  };
}

export interface Verdict { ok: boolean; title: string; text: string }

export function verdict(r: IceReport, customTurn: boolean): Verdict {
  if (!r.host && !r.srflx && !r.relay) {
    return {
      ok: false, title: 'WebRTC ist in diesem Browser blockiert',
      text: 'Es entstehen keine Verbindungsdaten. Häufigste Ursache: eine VPN- oder Privacy-Erweiterung mit WebRTC-Schutz. Deaktivieren oder einen anderen Browser nutzen.',
    };
  }
  if (!r.relay) {
    const auth = r.errors.some((e) => /\b401\b|\b403\b/.test(e));
    return {
      ok: false, title: 'Kein Relay-Server erreichbar',
      text: `${auth ? 'Die Zugangsdaten des TURN-Servers werden abgelehnt. ' : 'Der TURN-Server antwortet nicht (UDP gesperrt oder Server nicht erreichbar). '}`
        + `${customTurn ? 'Prüfe URL, Benutzer und Passwort. ' : 'Der mitgelieferte öffentliche TURN reicht nicht. '}`
        + 'Hinter Mobilfunk oder strengem NAT braucht es einen eigenen TURN-Server, am besten mit „turns:…:443“ (läuft wie normaler HTTPS-Verkehr).',
    };
  }
  if (!r.srflx) {
    return {
      ok: true, title: 'Nur über Relay',
      text: 'Direkte Wege sind nicht möglich (strenges NAT), aber der Relay-Server ist erreichbar. Die Verbindung läuft darüber. „Nur über Relay“ kann den Aufbau beschleunigen.',
    };
  }
  return {
    ok: true, title: 'Verbindung sollte klappen',
    text: `Direkte Wege und Relay-Server sind erreichbar.${r.relayTcp ? ' Der Relay funktioniert auch über TCP.' : ''}`,
  };
}

/** Meldung, wenn ein Beitritt nach Ablauf der Zeit nicht zustande kam. */
export function explainFailedJoin(localTypes: string[], remoteCount: number, customTurn: boolean): string {
  const r = summarize(localTypes.map((type) => ({ type, protocol: '' })));
  if (!r.host && !r.srflx && !r.relay) {
    return 'WebRTC ist in diesem Browser blockiert (VPN- oder Privacy-Erweiterung?). Deaktivieren oder einen anderen Browser nutzen.';
  }
  if (remoteCount === 0) {
    return 'Der Raum wurde gefunden, aber vom Spielleiter kamen keine Verbindungsdaten an. Hat der SL den Tab noch offen? Sonst unter „Erweitert“ den Verbindungstest ausführen.';
  }
  if (!r.relay && !customTurn) {
    return 'Keine direkte Verbindung möglich, vermutlich strenges NAT (Mobilfunk, Firmennetz). Unter „Erweitert“ einen TURN-Server eintragen und den Verbindungstest ausführen.';
  }
  return 'Die Direktverbindung kam nicht zustande. Unter „Erweitert“ den Verbindungstest ausführen, die TURN-Zugangsdaten prüfen oder „Nur über Relay“ einschalten.';
}
