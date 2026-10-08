<script lang="ts">
  import {
    rules, effectDef, effectEp, isStar, evaluateMove, moveCost, costLabel, meisterschaft, epCap, TIER_LABEL, minLevelForEp,
    giftOfEffects, GIFT, MAX_GIFT_DELAY, type MoveEffect,
  } from '../rules';
  import type { Move } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';

  let {
    move = $bindable(),
    level = $bindable(1),
    titles = [],
    levelEditable = false,
  }: {
    move: Move;
    level?: number;
    titles?: { id: string; name: string; level: number }[];
    /** Im eigenständigen Builder wählt man das Level selbst. */
    levelEditable?: boolean;
  } = $props();

  const attrs = rules.tabellen.attribute;
  const catalog = rules.epKatalog.effekte;
  const deductions = rules.epKatalog.abzuege;

  const ev = $derived(evaluateMove(move));
  const base = $derived(moveCost(move, level));
  const cost = $derived(
    move.costOverride
      ? { ...base, energie: move.costOverride.energie ?? base.energie, momentum: move.costOverride.momentum ?? base.momentum }
      : base,
  );
  const m = $derived(meisterschaft(level));
  const byLevel = $derived(Array.from({ length: 10 }, (_, i) => ({ level: i + 1, cost: moveCost(move, i + 1) })));
  const hasStar = $derived(ev.starEp > 0);
  const legendary = $derived(ev.tier === 'legendaer');

  let pick = $state('zone');
  const gift = $derived(giftOfEffects(move.effects.map((e) => e.id)));

  function addEffect(id: string) {
    const def = effectDef(id);
    if (!def) return;
    move.effects.push({ id });
  }
  function removeEffect(i: number) {
    move.effects.splice(i, 1);
  }
  function toggleDeduction(id: string, on: boolean) {
    move.deductions = on ? [...move.deductions, id] : move.deductions.filter((d) => d !== id);
  }
  function togglePrice(name: string, on: boolean) {
    const cur = move.prices ?? [];
    move.prices = on ? [...cur, name] : cur.filter((p) => p !== name);
  }
  const eName = (e: MoveEffect) => effectDef(e.id)?.name ?? e.id;
</script>

<div class="editor">
  <div class="top">
    <label class="field grow">Name<input bind:value={move.name} placeholder="z.B. Roundhouse-Kick" /></label>
    <label class="field">Attribut
      <select bind:value={move.attr}>{#each attrs as a}<option value={a.key}>{a.name}</option>{/each}</select>
    </label>
    {#if titles.length}
      <label class="field">Titel
        <select bind:value={move.titleId}>
          <option value={undefined}>— keiner —</option>
          {#each titles as t}<option value={t.id}>{t.name} (L{t.level})</option>{/each}
        </select>
      </label>
    {/if}
    {#if levelEditable}
      <label class="field">Titel-Level<Stepper bind:value={level} min={1} max={10} label="Titel-Level" /></label>
    {/if}
    <label class="field">Gelernt auf Level<Stepper value={move.learnedAtLevel ?? level} min={0} max={10} onchange={(v) => (move.learnedAtLevel = v)} label="Gelernt auf Level" /></label>
  </div>
  {#if gift}
    <div class="row giftrow">
      <span class="chip danger">Gift: {GIFT[gift].label}</span>
      <label class="field">Wirkt nach (Runden, kostet nichts)<Stepper value={move.giftDelay ?? 0} min={0} max={MAX_GIFT_DELAY} onchange={(v) => (move.giftDelay = v)} label="Verzögerung in Runden" /></label>
      <small class="dim">{GIFT[gift].text}. Wirkt nur, wenn der Treffer den Körper erreicht (Schutz 0 oder Verletzung). Gegenmittel MW {GIFT[gift].mw}.</small>
    </div>
  {/if}
  <label class="field">Beschreibung der Technik<textarea rows="2" bind:value={move.text} placeholder="Was passiert, wann wirkt es, Vorbedingungen"></textarea></label>

  <div class="cols">
    <section class="col">
      <h3>Effekte</h3>
      {#if !move.effects.length}<p class="dim">Ein normaler Angriff kostet 0 EP. Alles darüber wird mit Effekten bezahlt.</p>{/if}
      {#each move.effects as e, i}
        <div class="eff" class:star={isStar(e)}>
          <span class="en">{eName(e)}{#if isStar(e)}<b class="starmark" title="Sondereffekt: kein Meisterschaftsrabatt">★</b>{/if}</span>
          <input class="lab" bind:value={e.label} placeholder="Zusatz (z.B. Am Boden)" aria-label="Zusatz" />
          {#if effectDef(e.id) && 'frei' in effectDef(e.id)!}
            <Stepper value={effectEp(e)} min={0} max={8} onchange={(v) => (e.ep = v)} label="EP" />
          {:else}
            <span class="chip accent">{effectEp(e) >= 0 ? '+' : ''}{effectEp(e)} EP</span>
          {/if}
          <button class="btn sm icon danger" onclick={() => removeEffect(i)} aria-label="Effekt entfernen">✕</button>
        </div>
      {/each}
      <div class="row add">
        <select bind:value={pick} aria-label="Effekt wählen">
          <optgroup label="+1 EP">{#each catalog.filter((c) => c.ep === 1 && !('frei' in c) && !('stern' in c)) as c}<option value={c.id}>{c.name}</option>{/each}</optgroup>
          <optgroup label="+2 EP">{#each catalog.filter((c) => c.ep === 2 && !('frei' in c) && !('stern' in c)) as c}<option value={c.id}>{c.name}</option>{/each}</optgroup>
          <optgroup label="★ Sondereffekte">{#each catalog.filter((c) => 'stern' in c) as c}<option value={c.id}>{c.name} (+{c.ep})</option>{/each}</optgroup>
          <optgroup label="Frei (SL schätzt: 1 / 2 / 3 EP)">{#each catalog.filter((c) => 'frei' in c) as c}<option value={c.id}>{c.name}</option>{/each}</optgroup>
        </select>
        <button class="btn sm primary" onclick={() => addEffect(pick)}>+ Effekt</button>
      </div>

      <h3 class="mt">Abzüge <small class="dim">(je −1 EP, höchstens −{rules.epKatalog.abzugMax})</small></h3>
      <div class="ded">
        {#each deductions as d}
          <label class="check" title={'text' in d ? (d.text as string) : ''}>
            <input type="checkbox" checked={move.deductions.includes(d.id)} onchange={(e) => toggleDeduction(d.id, e.currentTarget.checked)} />
            {d.name}
          </label>
        {/each}
      </div>
      {#if ev.rawEp > 0 && move.deductions.length > rules.epKatalog.abzugMax}<p class="warn">Mehr als {rules.epKatalog.abzugMax} Abzüge zählen nicht.</p>{/if}
    </section>

    <section class="col read">
      <h3>Bewertung</h3>
      <div class="ep">
        <span class="big">{ev.ep}</span><span class="dim">EP</span>
        <span class="chip" class:amber={ev.tier !== 'energie'}>{TIER_LABEL[ev.tier]}</span>
      </div>
      <div class="sum dim">
        {ev.normalEp} normal{#if ev.starEp} + {ev.starEp}★{/if}{#if ev.deduction} − {ev.deduction} Abzug{/if}
        {#if move.epOverride !== undefined}· manuell überschrieben{/if}
      </div>
      <div class="costline">
        <span class="lbl">Kosten auf Level {level} (M {m})</span>
        <b class="cost">{costLabel(cost)}</b>
        {#if cost.mastered}<span class="chip accent">gemeistert</span>{/if}
      </div>
      <div class="chips">
        <span class="chip" class:danger={base.levelTooLow}>Mindestlevel {ev.minLevel}</span>
        <span class="chip" class:danger={ev.ep > epCap(m)}>EP-Deckel {epCap(m)}</span>
      </div>
      {#each base.notes as n}<p class="warn">{n}</p>{/each}
      {#each ev.conflicts as c}<p class="warn">{c}</p>{/each}
      {#if base.levelTooLow}<p class="warn">Der Titel ist zu niedrig für diesen Move (Level {ev.minLevel} nötig).</p>{/if}

      {#if hasStar}
        <label class="field">★-EP bezahlen mit
          <select bind:value={move.starPayment}>
            <option value={undefined}>Energie (voll, kein Rabatt)</option>
            <option value="momentum">Momentum (1 je angefangene 2 ★-EP)</option>
          </select>
        </label>
      {/if}
      {#if ev.ep > rules.epKatalog.kosten.energieMoveMaxEp && !legendary}
        <label class="check"><input type="checkbox" bind:checked={move.masteredByGM} /> Vom SL für gemeistert erklärt (Muskelgedächtnis)</label>
        <small class="dim">Automatisch gemeistert, sobald der Titel {rules.epKatalog.kosten.gemeistertLevelAbstand} Level über „gelernt auf“ steht.</small>
      {/if}
      <details class="over">
        <summary>Hausregel: Werte überschreiben</summary>
        <div class="row">
          <label class="check"><input type="checkbox" checked={move.epOverride !== undefined} onchange={(e) => (move.epOverride = e.currentTarget.checked ? ev.ep : undefined)} /> EP manuell</label>
          {#if move.epOverride !== undefined}<Stepper bind:value={move.epOverride} min={0} max={12} label="EP" />{/if}
        </div>
        <div class="row">
          <label class="check"><input type="checkbox" checked={!!move.costOverride} onchange={(e) => (move.costOverride = e.currentTarget.checked ? { energie: base.energie, momentum: base.momentum } : undefined)} /> Kosten manuell</label>
          {#if move.costOverride}
            <span class="dim">Energie</span><Stepper value={move.costOverride.energie ?? 0} min={0} max={20} onchange={(v) => (move.costOverride!.energie = v)} label="Energie" />
            <span class="dim">Momentum</span><Stepper value={move.costOverride.momentum ?? 0} min={0} max={9} onchange={(v) => (move.costOverride!.momentum = v)} label="Momentum" />
          {/if}
        </div>
      </details>

      {#if legendary}
        <h3 class="mt">Preise (1 bis 2)</h3>
        <div class="prices">
          {#each rules.tabellen.legendaerePreise as p}
            <label class="check" title={p.text}><input type="checkbox" checked={move.prices?.includes(p.name)} onchange={(e) => togglePrice(p.name, e.currentTarget.checked)} /> {p.name}</label>
          {/each}
        </div>
        {#if !(move.prices?.length)}<p class="warn">Ein legendärer Move hat immer mindestens einen Preis.</p>{/if}
      {/if}
    </section>
  </div>

  <div class="bylevel">
    <span class="lbl">Kosten nach Titel-Level</span>
    <div class="lvgrid">
      {#each byLevel as r}
        <button type="button" class="lv" class:cur={r.level === level} class:locked={r.level < minLevelForEp(ev.ep)} disabled={!levelEditable} onclick={() => (level = r.level)}>
          <b>L{r.level}</b><span>{r.level < minLevelForEp(ev.ep) ? '–' : costLabel(r.cost)}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .editor { display: grid; gap: 0.9rem; }
  .top { display: flex; gap: 0.7rem; flex-wrap: wrap; align-items: end; }
  .grow { flex: 1; min-width: 200px; }
  .cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.1rem; }
  .col { display: grid; gap: 0.5rem; align-content: start; }
  .read { padding: 0.8rem; background: var(--raised); border: 1px solid var(--line); border-top: 2px solid var(--accent-2); }
  .eff { display: flex; gap: 0.5rem; align-items: center; padding: 0.35rem 0.5rem; background: var(--raised); border: 1px solid var(--line); flex-wrap: wrap; }
  .eff.star { border-color: var(--accent-2); }
  .en { flex: 1 1 140px; font-weight: 600; }
  .lab { flex: 1 1 130px; min-height: 30px; padding: 0.2em 0.5em; }
  .starmark { color: var(--accent-2); margin-left: 0.3em; }
  .add { display: flex; gap: 0.5rem; margin-top: 0.3rem; flex-wrap: nowrap; }
  .mt { margin-top: 0.8rem; }
  .ded, .prices { display: flex; flex-wrap: wrap; gap: 0.4rem 1rem; }
  .check { display: flex; align-items: center; gap: 0.4em; font-size: 0.92rem; }
  .ep { display: flex; align-items: baseline; gap: 0.5rem; }
  .big { font: 400 3.2rem/1 var(--font-display); color: var(--accent-2); text-shadow: var(--hard-shadow); }
  .sum { font-size: 0.85rem; }
  .costline { display: grid; gap: 0.1rem; }
  .lbl { font: 600 0.74rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .cost { font: 400 1.7rem var(--font-display); letter-spacing: 0.04em; color: var(--accent); }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .warn { color: var(--warn); font-size: 0.86rem; margin: 0; }
  .over { font-size: 0.9rem; }
  .over summary { cursor: pointer; color: var(--ink-dim); }
  .over[open] { display: grid; gap: 0.5rem; }
  .bylevel { display: grid; gap: 0.4rem; }
  .lvgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(84px, 100%), 1fr)); gap: 4px; }
  .lv { display: grid; text-align: center; padding: 0.3rem 0.2rem; background: var(--raised); border: 1px solid var(--line); font: inherit; color: inherit; font-size: 0.82rem; }
  .lv:not(:disabled) { cursor: pointer; }
  .lv b { font: 600 0.78rem var(--font-head); letter-spacing: 0.1em; color: var(--accent-2); }
  .lv.cur { border-color: var(--accent); background: var(--accent-soft); }
  .lv.locked { opacity: 0.4; }
  @media (max-width: 760px) { .cols { grid-template-columns: 1fr; } }
</style>
