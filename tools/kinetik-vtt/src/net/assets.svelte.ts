// Asset-Speicher (IndexedDB, nach SHA-256 adressiert) und Übertragung in Blöcken über die Datenkanäle.
import { get, set, keys, del } from 'idb-keyval';
import type { DataConnection } from './peer';
import type { ServerMsg } from './protocol';

export interface AssetMeta { hash: string; name: string; mime: string; size: number }
interface Stored { meta: AssetMeta; bytes: ArrayBuffer }

export const assets = $state<{
  have: Record<string, AssetMeta>;
  progress: Record<string, { loaded: number; total: number }>;
  failed: Record<string, string>;
}>({ have: {}, progress: {}, failed: {} });

const PREFIX = 'asset:';
const CHUNK = 15 * 1024;
const urls = new Map<string, string>();
const waiters = new Map<string, { resolve: (m: AssetMeta) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }[]>();
const assembling = new Map<string, { meta: AssetMeta; parts: (Uint8Array | undefined)[]; got: number }>();
let requester: ((hash: string) => void) | null = null;

export const setAssetRequester = (fn: ((hash: string) => void) | null) => { requester = fn; };

export async function hashBytes(buf: ArrayBuffer): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(d)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function loadAssetIndex() {
  try {
    for (const k of await keys()) {
      if (typeof k !== 'string' || !k.startsWith(PREFIX)) continue;
      const rec = (await get(k)) as Stored | undefined;
      if (rec) assets.have[rec.meta.hash] = rec.meta;
    }
  } catch (e) { console.warn(e); }
}

export async function putAsset(bytes: ArrayBuffer, name: string, mime: string): Promise<AssetMeta> {
  const hash = await hashBytes(bytes);
  const meta: AssetMeta = { hash, name, mime, size: bytes.byteLength };
  if (!assets.have[hash]) await set(PREFIX + hash, { meta, bytes } satisfies Stored);
  assets.have[hash] = meta;
  return meta;
}

export async function removeAsset(hash: string) {
  delete assets.have[hash];
  const u = urls.get(hash);
  if (u) { URL.revokeObjectURL(u); urls.delete(hash); }
  try { await del(PREFIX + hash); } catch { /* ignorieren */ }
}

export async function getAssetBytes(hash: string): Promise<{ meta: AssetMeta; bytes: ArrayBuffer } | undefined> {
  try { return (await get(PREFIX + hash)) as Stored | undefined; } catch { return undefined; }
}

/** Object-URL des Assets (zwischengespeichert). */
export async function assetUrl(hash: string): Promise<string | undefined> {
  const cached = urls.get(hash);
  if (cached) return cached;
  const rec = await getAssetBytes(hash);
  if (!rec) return undefined;
  const url = URL.createObjectURL(new Blob([rec.bytes], { type: rec.meta.mime }));
  urls.set(hash, url);
  return url;
}

/** Fordert ein Asset beim SL an (wenn nicht vorhanden) und wartet, bis es da ist. */
export function requestAsset(hash: string): Promise<AssetMeta> {
  const have = assets.have[hash];
  if (have) return Promise.resolve(have);
  return new Promise((resolve, reject) => {
    const list = waiters.get(hash) ?? [];
    const first = list.length === 0;
    const timer = setTimeout(() => {
      const l = waiters.get(hash) ?? [];
      waiters.set(hash, l.filter((w) => w.timer !== timer));
      reject(new Error('Zeitüberschreitung bei der Übertragung.'));
    }, 120000);
    list.push({ resolve, reject, timer });
    waiters.set(hash, list);
    if (first) {
      delete assets.failed[hash];
      requester?.(hash);
    }
  });
}

function settle(hash: string, err?: Error) {
  const list = waiters.get(hash) ?? [];
  waiters.delete(hash);
  for (const w of list) {
    clearTimeout(w.timer);
    if (err) w.reject(err);
    else w.resolve(assets.have[hash]);
  }
}

/** Verarbeitet Asset-Nachrichten vom SL. Liefert `true`, wenn die Nachricht dazugehörte. */
export async function handleAssetMessage(m: ServerMsg): Promise<boolean> {
  switch (m.t) {
    case 'asset-head':
      assembling.set(m.hash, { meta: { hash: m.hash, name: m.name, mime: m.mime, size: m.size }, parts: new Array(m.total), got: 0 });
      assets.progress[m.hash] = { loaded: 0, total: m.size };
      return true;
    case 'asset-chunk': {
      const a = assembling.get(m.hash);
      if (!a) return true;
      const data = new Uint8Array(m.data as ArrayBuffer);
      if (!a.parts[m.i]) { a.parts[m.i] = data; a.got++; }
      assets.progress[m.hash] = { loaded: Math.min(a.meta.size, a.got * CHUNK), total: a.meta.size };
      if (a.got === a.parts.length) {
        assembling.delete(m.hash);
        const out = new Uint8Array(a.meta.size);
        let off = 0;
        for (const p of a.parts) { out.set(p!, off); off += p!.byteLength; }
        const hash = await hashBytes(out.buffer);
        delete assets.progress[m.hash];
        if (hash !== m.hash) {
          assets.failed[m.hash] = 'Prüfsumme stimmt nicht.';
          settle(m.hash, new Error('Prüfsumme stimmt nicht.'));
        } else {
          await putAsset(out.buffer, a.meta.name, a.meta.mime);
          settle(m.hash);
        }
      }
      return true;
    }
    case 'asset-missing':
      assembling.delete(m.hash);
      delete assets.progress[m.hash];
      assets.failed[m.hash] = 'Der SL hat diese Datei nicht mehr.';
      settle(m.hash, new Error('Der SL hat diese Datei nicht mehr.'));
      return true;
    default:
      return false;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sendet ein Asset an einen Spieler (mit Gegendruck, damit der Datenkanal nicht überläuft). */
export async function serveAsset(conn: DataConnection, hash: string) {
  const rec = await getAssetBytes(hash);
  const send = (m: ServerMsg) => { if (conn.open) conn.send(m); };
  if (!rec) return send({ t: 'asset-missing', hash });
  const total = Math.max(1, Math.ceil(rec.bytes.byteLength / CHUNK));
  send({ t: 'asset-head', hash, name: rec.meta.name, mime: rec.meta.mime, size: rec.meta.size, total });
  for (let i = 0; i < total; i++) {
    const dc = (conn as unknown as { dataChannel?: RTCDataChannel }).dataChannel;
    while (conn.open && dc && dc.bufferedAmount > 768 * 1024) await sleep(15);
    if (!conn.open) return;
    send({ t: 'asset-chunk', hash, i, data: new Uint8Array(rec.bytes.slice(i * CHUNK, (i + 1) * CHUNK)) });
    if (i % 32 === 31) await sleep(0);
  }
}

/** Bild für die Karte vorbereiten: große Bilder werden verkleinert, damit die Übertragung zumutbar bleibt. */
export async function prepareImage(file: File, maxSide = 4096): Promise<{ bytes: ArrayBuffer; mime: string; width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const { width, height } = bmp;
  if (Math.max(width, height) <= maxSide && file.size <= 8 * 1024 * 1024) {
    bmp.close?.();
    return { bytes: await file.arrayBuffer(), mime: file.type || 'image/png', width, height };
  }
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Bild konnte nicht verkleinert werden.'))), 'image/webp', 0.88));
  return { bytes: await blob.arrayBuffer(), mime: 'image/webp', width: w, height: h };
}
