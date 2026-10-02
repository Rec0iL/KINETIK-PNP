// Kurzlebige Ping-Markierungen auf der Karte (nicht Teil des gespeicherten Zustands).
export interface Ping { id: number; x: number; y: number; who: string; color: string; ts: number }
export const pings = $state<{ list: Ping[] }>({ list: [] });
let n = 0;

export function addPing(x: number, y: number, who: string, color: string) {
  const id = ++n;
  pings.list.push({ id, x, y, who, color, ts: performance.now() });
  setTimeout(() => {
    const i = pings.list.findIndex((p) => p.id === id);
    if (i >= 0) pings.list.splice(i, 1);
  }, 3200);
}
