<script lang="ts">
  import { rules, ATTR_KEYS } from '../rules';
  import type { Character } from '../model/character';
  import { computeSheet, creationReport, viewMove } from '../model/sheet';
  import { costLabel } from '../rules';

  let { char }: { char: Character } = $props();
  const sheet = $derived(computeSheet(char));
  const report = $derived(creationReport(char));
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const defs = rules.tabellen.attribute;

  const checks = $derived([
    { ok: !!char.name.trim() && char.name !== 'Neuer Charakter', text: 'Name vergeben' },
    { ok: char.titles.length > 0, text: 'Mindestens ein Titel' },
    { ok: char.titles.every((t) => t.domains.length >= 3 && t.domains.length <= 5), text: 'Jeder Titel hat 3 bis 5 Domänen' },
    { ok: report.hints.length === 0, text: report.hints.length ? report.hints.join(' ') : 'Budgets und Startmaximum eingehalten' },
    { ok: char.moves.length > 0, text: 'Mindestens ein Move' },
  ]);
</script>

<div class="stack">
  <p class="dim intro">Zum Schluss: kurz prüfen. Mit „Fertig“ füllt der Bogen Energie, Willenskraft und Schutz auf das Maximum, setzt Momentum auf 0 und schließt die Erschaffung ab. Hinweise sind keine Sperre: Hausregeln und Absprachen mit dem SL gehen vor.</p>

  <section class="panel flat sum">
    <div class="id">
      <h2>{char.name}{#if char.alias} <span class="dim">„{char.alias}“</span>{/if}</h2>
      {#if char.concept}<p class="dim">{char.concept}</p>{/if}
      <div class="chips">{#each char.titles as t}<span class="chip accent">{t.name} L{t.level}</span>{/each}</div>
    </div>
    <div class="stats">
      <div><span class="lbl">Energie</span><b>{sheet.energieMax.value}</b></div>
      <div><span class="lbl">Willenskraft</span><b>{sheet.wkMax.value}</b></div>
      <div><span class="lbl">Momentum-Deckel</span><b>{sheet.momentumCap.value}</b></div>
      <div><span class="lbl">Schutz</span><b>{char.resources.schutz.max}</b></div>
    </div>
    <div class="attrs">{#each defs as d}<span class="chip">{d.kurz} <b>{fmt(char.attributes[d.key as (typeof ATTR_KEYS)[number]])}</b></span>{/each}</div>
    {#if char.moves.length}
      <ul class="moves">{#each char.moves as m (m.id)}{@const v = viewMove(char, m)}<li><b>{m.name}</b> <span class="dim">{v.evaluation.ep} EP · {costLabel(v.cost)}</span></li>{/each}</ul>
    {/if}
    {#if char.weapons.length}<div class="chips">{#each char.weapons as w}<span class="chip">{w.name}</span>{/each}</div>{/if}
  </section>

  <ul class="checks">
    {#each checks as c}<li class:ok={c.ok}><span>{c.ok ? '✓' : '!'}</span> {c.text}</li>{/each}
  </ul>
</div>

<style>
  .intro { margin: 0; }
  .sum { display: grid; gap: 0.9rem; border-left: 3px solid var(--accent-2); }
  .id h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.2rem; letter-spacing: 0.05em; }
  .id p { margin: 0.2rem 0 0.5rem; }
  .chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.6rem; }
  .stats div { display: grid; padding: 0.4rem 0.6rem; background: var(--raised); }
  .stats b { font: 400 2rem/1 var(--font-display); color: var(--accent-2); }
  .lbl { font: 600 0.7rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  .attrs .chip b { color: var(--accent); margin-left: 0.3em; }
  .moves { margin: 0; padding-left: 1.1em; }
  .checks { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .checks li { display: flex; gap: 0.6rem; align-items: baseline; padding: 0.4rem 0.6rem; background: var(--raised); border-left: 3px solid var(--warn); }
  .checks li.ok { border-left-color: var(--ok); }
  .checks span { font-weight: 700; color: var(--warn); }
  .checks li.ok span { color: var(--ok); }
</style>
