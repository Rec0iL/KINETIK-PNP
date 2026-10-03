// Nachrichten zwischen SL (Host) und Spielern. Alles typisiertes JSON-kompatibles Objekt, übertragen über PeerJS-Datenkanäle.
import type { Character } from '../model/character';
import type { RollRecord } from '../dice/roller.svelte';
import type { AttrKey, ZoneKey, Poison } from '../rules';
import type { MapOp, MapState } from '../map/mapstate';
import type { MusicState } from '../music/clock';
import type { PublicCombat } from '../gm/combat';
import type { BtOption, Draft, PlayerSituation } from '../gm/situation';

export const PROTOCOL_VERSION = 2;

export type Visibility = 'party' | 'private' | 'open';

export interface Vitals {
  energie: number; energieMax: number;
  wk: number; wkMax: number;
  momentum: number; momentumCap: number;
  schutz: number; schutzMax: number;
  injuries: number;
  ausgepumpt: boolean; gebrochen: boolean; sterbend: boolean;
  tags: { name: string; size: 'klein' | 'gross' }[];
  /** Aktive Gifte (Stufe und Verzögerung), für die Anzeige beim SL. */
  poisons: { level: Poison['level']; delay: number }[];
  /** Bonus je Attribut (bester Titel, gleiche Zahl wie "Probe" im Bogen), nützlich für den SL-Clash. */
  bonus: Record<AttrKey, number>;
}

export interface PlayerInfo {
  id: string;
  name: string;
  characterName?: string;
  alias?: string;
  /** Kleines Porträt (Data-URL). */
  portrait?: string;
  titles?: string;
  connected: boolean;
  /** Lokaler Spieler: kein Gerät verbunden, der SL pflegt den Bogen. */
  local?: boolean;
  vitals?: Vitals;
  /** Sichtbarkeit seines Bogens für andere Spieler (Überschreibung des Standards). */
  share?: Visibility;
}

export type PatchResource = 'energie' | 'wk' | 'momentum' | 'schutz';

/** Änderungen, die der SL an einem Spielerbogen vornimmt. Der Spieler wendet sie an und schickt seinen Bogen zurück. */
export type PatchOp =
  | { op: 'add'; key: PatchResource; delta: number }
  | { op: 'set'; key: PatchResource; value: number }
  | { op: 'injury'; zone: ZoneKey; text: string }
  | { op: 'heal'; zone: ZoneKey; index?: number }
  | { op: 'tag'; name: string; size: 'klein' | 'gross'; note?: string }
  | { op: 'untag'; name: string }
  /** Ein Gift in den Körper bringen (3.11). */
  | { op: 'poison'; poison: Poison }
  /** Giftliste ersetzen (nach einem Rundenende oder einem Gegenmittel). */
  | { op: 'poisons'; list: Poison[] }
  /** Sterbend durch Gift (3 Runden, bis stabilisiert). */
  | { op: 'dying' };

export interface HelloMsg {
  t: 'hello';
  v: number;
  playerId: string;
  name: string;
  password?: string;
}

export type ClientMsg =
  | HelloMsg
  | { t: 'sheet'; character: Character }
  | { t: 'roll'; roll: RollRecord }
  | { t: 'ping'; ts: number }
  | { t: 'want'; hash: string }
  | { t: 'view'; playerId: string | null }
  | { t: 'map'; ops: MapOp[] }
  /** Aktion planen: der SL bekommt eine Kampfsituation. */
  | { t: 'plan'; draft: Draft }
  | { t: 'plan-cancel'; id: string }
  /** Wahl bei Bullet Time (Zone nur bei `zone`). */
  | { t: 'bt-choice'; id: string; option: BtOption; zone?: ZoneKey }
  /** Bewegung im Kampf: Anfrage, der SL gibt frei. */
  | { t: 'move-req'; tokenId: string; x: number; y: number }
  | { t: 'bye' };

/** Geteilter Zustand, den der SL an alle verteilt. Jeder Schlüssel wird einzeln übertragen. */
export interface SharedState {
  gmName: string;
  visibility: Visibility;
  notes: string;
  rounds: number;
  music: MusicState;
  /** Öffentlicher Kampfzustand (null = kein Kampf). */
  combat: PublicCombat | null;
}

export interface Handout {
  id: string;
  title: string;
  kind: 'image' | 'text';
  /** Bild: Asset-Hash. */
  hash?: string;
  text?: string;
  ts: number;
}

export type ServerMsg =
  | { t: 'welcome'; playerId: string; gmName: string; state: SharedState; players: PlayerInfo[]; log: RollRecord[]; resume: boolean; map: MapState | null }
  | { t: 'pending' }
  | { t: 'deny'; reason: string }
  | { t: 'party'; players: PlayerInfo[] }
  | { t: 'sheet-view'; playerId: string; character: Character | null }
  | { t: 'patch'; ops: PatchOp[]; note?: string }
  | { t: 'roll'; roll: RollRecord }
  | { t: 'state'; key: keyof SharedState; value: SharedState[keyof SharedState] }
  | { t: 'toast'; text: string }
  | { t: 'handout'; handout: Handout }
  | { t: 'map'; ops: MapOp[] }
  /** Alle eigenen Kampfsituationen (ohne Werte der Gegner). */
  | { t: 'sits'; list: PlayerSituation[] }
  | { t: 'move-result'; ok: boolean; note: string }
  | { t: 'asset-head'; hash: string; name: string; mime: string; size: number; total: number }
  | { t: 'asset-chunk'; hash: string; i: number; data: Uint8Array | ArrayBuffer }
  | { t: 'asset-missing'; hash: string }
  | { t: 'pong'; ts: number; gm: number }
  | { t: 'kick'; reason: string };

export const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRoomCode(): string {
  const a = new Uint8Array(6);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => ROOM_ALPHABET[b % ROOM_ALPHABET.length]).join('');
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function formatCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;
}

export const peerIdFor = (code: string) => `kinetik-vtt-${code.toLowerCase()}`;
