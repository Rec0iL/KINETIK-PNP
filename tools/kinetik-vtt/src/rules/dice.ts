// Würfel-Grundlagen: Zufall, Notation, exakte 2W6-Verteilung für Tests und Wahrscheinlichkeitsanzeigen.

export type Rng = () => number;

/** Kryptografisch gute Zufallszahl in [0,1) (Fallback Math.random). */
export const cryptoRng: Rng = () => {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] / 2 ** 32;
  }
  return Math.random();
};

export function rollDie(sides: number, rng: Rng = cryptoRng): number {
  return 1 + Math.floor(rng() * sides);
}

export function rollDice(count: number, sides: number, rng: Rng = cryptoRng): number[] {
  return Array.from({ length: count }, () => rollDie(sides, rng));
}

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}
export interface DiceFormula {
  terms: DiceTerm[];
  modifier: number;
}

/** Parst Formeln wie "2d6+3", "d20", "3d8-2+1d4". Wirft bei ungültiger Eingabe. */
export function parseFormula(input: string): DiceFormula {
  const s = input.replace(/\s+/g, '').toLowerCase().replace(/w/g, 'd');
  if (!s) throw new Error('Leere Formel');
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gy;
  const terms: DiceTerm[] = [];
  let modifier = 0;
  let pos = 0;
  let m: RegExpExecArray | null;
  while (pos < s.length && (m = re.exec(s))) {
    pos = re.lastIndex;
    const sign: 1 | -1 = m[1] === '-' ? -1 : 1;
    if (m[3]) {
      const count = m[2] === '' ? 1 : Number(m[2]);
      const sides = Number(m[3]);
      if (count < 1 || count > 50 || sides < 2 || sides > 1000) throw new Error('Würfel außerhalb des Bereichs');
      terms.push({ count, sides, sign });
    } else {
      modifier += sign * Number(m[4]);
    }
  }
  if (pos !== s.length || (!terms.length && !modifier)) throw new Error(`Ungültige Formel: ${input}`);
  return { terms, modifier };
}

/** Anzahl der Möglichkeiten für jede Summe aus n Würfeln mit s Seiten. */
export function sumDistribution(n: number, sides: number): Map<number, number> {
  let dist = new Map<number, number>([[0, 1]]);
  for (let i = 0; i < n; i++) {
    const next = new Map<number, number>();
    for (const [sum, c] of dist) for (let f = 1; f <= sides; f++) next.set(sum + f, (next.get(sum + f) ?? 0) + c);
    dist = next;
  }
  return dist;
}

const TWO_D6 = sumDistribution(2, 6);
const TWO_D6_TOTAL = 36;

/** Wahrscheinlichkeitsverteilung der Differenz zweier 2W6-Würfe (Δ = X - Y), Schlüssel = Δ. */
export function clashDeltaDistribution(): Map<number, number> {
  const out = new Map<number, number>();
  for (const [x, cx] of TWO_D6) {
    for (const [y, cy] of TWO_D6) {
      const d = x - y;
      out.set(d, (out.get(d) ?? 0) + (cx * cy) / (TWO_D6_TOTAL * TWO_D6_TOTAL));
    }
  }
  return out;
}

/** P(2W6 + bonus >= mw). */
export function probeChance(bonus: number, mw: number): { success: number; price: number } {
  let success = 0;
  let price = 0;
  for (const [sum, c] of TWO_D6) {
    const total = sum + bonus;
    if (total >= mw) success += c / TWO_D6_TOTAL;
    else if (mw - total <= 2) price += c / TWO_D6_TOTAL;
  }
  return { success, price };
}
