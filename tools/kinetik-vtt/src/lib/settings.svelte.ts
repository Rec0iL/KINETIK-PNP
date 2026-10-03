// Kleine Einstellungen pro Browser (nicht Teil des Charakters).
const KEY = 'kinetik.settings';

interface Settings {
  /** Verletzung zieht automatisch 1 WK ab (Schock). */
  autoShock: boolean;
  /** 3D-Würfelanimation bei jedem Wurf. */
  dice3d: boolean;
  /** SL: nach dem Ende eines Titels den nächsten spielen. */
  musicAutoNext: boolean;
  /** Move-Kosten sofort beim Wurf abziehen statt erst nach Bestätigung (Regel 3.12: bezahlt wird nach dem Wurf). */
  autoPayMoves: boolean;
  /** Anzeigename in Runden (Würfelwürfe, Teilnehmerliste). */
  displayName: string;
  /** Eigener PeerJS-Server (leer = öffentlicher Broker von peerjs.com). */
  peerHost: string;
  peerPort: number;
  peerPath: string;
  peerSecure: boolean;
  /** Eigene ICE-Server als JSON (z.B. TURN), leer = Standard von PeerJS. */
  iceJson: string;
  /** Eigener TURN-Server (Relay) für strenge NATs wie Mobilfunk. */
  turnUrl: string;
  turnUser: string;
  turnPass: string;
  /** Nur über den Relay-Server verbinden. */
  relayOnly: boolean;
}

function load(): Settings {
  const d: Settings = { autoShock: true, dice3d: true, musicAutoNext: false, autoPayMoves: false, displayName: '', peerHost: '', peerPort: 443, peerPath: '/', peerSecure: true, iceJson: '', turnUrl: '', turnUser: '', turnPass: '', relayOnly: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...d, ...JSON.parse(raw) };
  } catch { /* ignorieren */ }
  return d;
}

export const settings = $state<Settings>(load());

$effect.root(() => {
  $effect(() => {
    const snap = $state.snapshot(settings);
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* ignorieren */ }
  });
});
