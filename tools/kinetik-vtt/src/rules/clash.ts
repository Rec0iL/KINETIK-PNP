// Clash (3.1), Helden-Schwelle (3.4), Außer Reichweite (3.5), Trefferkaskade (3.2), Heimlichkeits-Clash (4.1).
import { rules } from './data';

export type ClashOutcome = 'dominanz' | 'schlagabtausch' | 'konter' | 'perfekterKonter';
export type StealthOutcome = 'unbemerkt' | 'verdacht' | 'entdeckt' | 'durchschaut';

export interface ClashSide {
  /** Augensumme der 2W6. */
  dice: number;
  /** Gesamtbonus aus Attribut + Meisterschaft (zählt für Helden-Schwelle und Außer Reichweite). */
  bonus: number;
  /** Weitere Modifikatoren auf den Wurf (Tags, Überzahl, Wurfbonus). Zählen nicht für die Lücke. */
  mod?: number;
  /** Spielercharakter? Nur wenn genau eine Seite Spieler ist, greift die Helden-Schwelle. */
  isPlayer?: boolean;
}

export interface ClashInput {
  attacker: ClashSide;
  defender: ClashSide;
  /** Heldenhafte Gegenwehr (3 Momentum): hebt die Einschränkung durch "Außer Reichweite" auf. */
  heldenhafteGegenwehr?: boolean;
}

export interface ClashResult {
  attackerTotal: number;
  defenderTotal: number;
  delta: number;
  /** Dominanz-Schwelle des Angreifers / des Verteidigers. */
  tA: number;
  tV: number;
  heldenSchwelle: boolean;
  /** Gesamtbonus-Lücke zwischen beiden Seiten. */
  gap: number;
  /** Seite mit dem niedrigeren Bonus (null bei Gleichstand). */
  underdog: 'attacker' | 'defender' | null;
  /** Ergebnis rein nach Würfeln. */
  rawOutcome: ClashOutcome;
  /** Ergebnis nach Anwendung von "Außer Reichweite". */
  outcome: ClashOutcome;
  /** Lücke >= 5: das Ergebnis des Unterlegenen wurde gedeckelt. */
  limited: boolean;
  /** Lücke >= 8: es wird nicht gewürfelt, der Überlegene erzählt. */
  noRoll: boolean;
  /** Wer holt den Kinetik-Marker (Dominanz bzw. perfekter Konter)? */
  marker: 'attacker' | 'defender' | null;
  /** Vorschläge für Belohnungen (werden nie automatisch angewendet). */
  rewards: { side: 'attacker' | 'defender'; momentum: number; energie?: number; wk?: number } | null;
}

export const OUTCOME_LABEL: Record<ClashOutcome, string> = {
  dominanz: 'Dominanz',
  schlagabtausch: 'Schlagabtausch',
  konter: 'Konter',
  perfekterKonter: 'Perfekter Konter',
};

export const STEALTH_LABEL: Record<StealthOutcome, string> = {
  unbemerkt: 'Unbemerkt',
  verdacht: 'Verdacht',
  entdeckt: 'Entdeckt',
  durchschaut: 'Durchschaut',
};

const total = (s: ClashSide) => s.dice + s.bonus + (s.mod ?? 0);

/** Dominanz-Schwellen beider Seiten inkl. Helden-Schwelle. */
export function thresholds(a: ClashSide, d: ClashSide): { tA: number; tV: number; helden: boolean } {
  const s = rules.tabellen.schwellen;
  let tA: number = s.dominanz;
  let tV: number = s.dominanz;
  let helden = false;
  if (!!a.isPlayer !== !!d.isPlayer) {
    const player = a.isPlayer ? a : d;
    const npc = a.isPlayer ? d : a;
    if (player.bonus - npc.bonus >= s.helden.vorsprung) {
      helden = true;
      if (a.isPlayer) { tA = s.helden.spieler; tV = s.helden.npc; }
      else { tA = s.helden.npc; tV = s.helden.spieler; }
    }
  }
  return { tA, tV, helden };
}

/** Ergebnis aus Δ und den beiden Schwellen. */
export function outcomeFromDelta(delta: number, tA: number, tV: number): ClashOutcome {
  if (delta >= tA) return 'dominanz';
  if (delta >= 0) return 'schlagabtausch';
  if (delta > -tV) return 'konter';
  return 'perfekterKonter';
}

export function resolveClash(input: ClashInput): ClashResult {
  const { attacker: a, defender: d } = input;
  const { tA, tV, helden } = thresholds(a, d);
  const attackerTotal = total(a);
  const defenderTotal = total(d);
  const delta = attackerTotal - defenderTotal;
  const rawOutcome = outcomeFromDelta(delta, tA, tV);

  const gap = Math.abs(a.bonus - d.bonus);
  const underdog = a.bonus === d.bonus ? null : a.bonus < d.bonus ? 'attacker' : 'defender';
  const ar = rules.tabellen.schwellen.ausserReichweite;
  const noRoll = gap >= ar.keinWurf && !input.heldenhafteGegenwehr;

  let outcome = rawOutcome;
  let limited = false;
  if (gap >= ar.begrenzt && !input.heldenhafteGegenwehr) {
    if (underdog === 'attacker' && outcome === 'dominanz') { outcome = 'schlagabtausch'; limited = true; }
    if (underdog === 'defender' && (outcome === 'konter' || outcome === 'perfekterKonter')) {
      outcome = 'schlagabtausch';
      limited = true;
    }
  }

  const marker = outcome === 'dominanz' ? 'attacker' : outcome === 'perfekterKonter' ? 'defender' : null;
  const rewards =
    outcome === 'dominanz'
      ? ({ side: 'attacker', momentum: 1, energie: 1 } as const)
      : outcome === 'perfekterKonter'
        ? ({ side: 'defender', momentum: 1, wk: 1 } as const)
        : null;

  return {
    attackerTotal, defenderTotal, delta, tA, tV, heldenSchwelle: helden, gap, underdog,
    rawOutcome, outcome, limited, noRoll, marker, rewards,
  };
}

/** Heimlichkeits-Clash (4.1): Schleicher gegen Wächter, T = 3, Helden-Schwelle und Außer Reichweite wie im Kampf. */
export function resolveStealthClash(sneaker: ClashSide, guard: ClashSide, heldenhafteGegenwehr = false) {
  const r = resolveClash({ attacker: sneaker, defender: guard, heldenhafteGegenwehr });
  const map: Record<ClashOutcome, StealthOutcome> = {
    dominanz: 'unbemerkt', schlagabtausch: 'verdacht', konter: 'entdeckt', perfekterKonter: 'durchschaut',
  };
  const stealth = map[r.outcome];
  const text: Record<StealthOutcome, string> = {
    unbemerkt: '2 Start-Momentum und der Kinetik-Marker für den Schleicher.',
    verdacht: '1 Start-Momentum, der Wächter erhält den kleinen Tag Misstrauisch.',
    entdeckt: 'Der Wächter handelt zuerst, kein Hinterhalt.',
    durchschaut: 'Wächter: 1 Start-Momentum und Marker. Schleicher: kleiner Tag Exponiert.',
  };
  return { ...r, stealth, text: text[stealth] };
}

export type HitKind = 'verletzung' | 'abgefangen' | 'schutz' | 'wk';

export interface HitInput {
  outcome: ClashOutcome;
  /** Δ aus Sicht des Treffenden (positiv). */
  delta: number;
  /** Dominanz-Schwelle des Treffenden. */
  t: number;
  /** Aktueller Schutz des Ziels (passend zur Angriffsart). */
  schutz: number;
  /** Durchschlag des Treffers (Waffe/Move). */
  durchschlag?: number;
  /** Schutz wird vom Move ignoriert oder zerstört. */
  schutzIgnoriert?: boolean;
  /** Härtegrad (optional): Waffentreffer ohne passenden Schutz verletzt schon bei Δ = T - 1. */
  haertegrad?: boolean;
}

export interface HitResult {
  kind: HitKind;
  effektiverSchutz: number;
  text: string;
}

/** Kaskade Schutz → Willenskraft → Verletzung (3.2). */
export function resolveHit(h: HitInput): HitResult {
  const eff = h.schutzIgnoriert ? 0 : Math.max(0, h.schutz - (h.durchschlag ?? 0));
  const dominant = h.outcome === 'dominanz' || h.outcome === 'perfekterKonter';
  if (dominant) {
    if (h.delta >= h.t + eff) return { kind: 'verletzung', effektiverSchutz: eff, text: 'Verletzung (Schock: -1 WK).' };
    return { kind: 'abgefangen', effektiverSchutz: eff, text: 'Abgefangen: -1 Schutz und -1 WK.' };
  }
  if (h.haertegrad && h.schutz === 0 && h.delta >= h.t - 1) {
    return { kind: 'verletzung', effektiverSchutz: 0, text: 'Härtegrad: Verletzung (Schock: -1 WK).' };
  }
  if (eff > 0) return { kind: 'schutz', effektiverSchutz: eff, text: '-1 Schutz.' };
  return { kind: 'wk', effektiverSchutz: eff, text: '-1 Willenskraft.' };
}
