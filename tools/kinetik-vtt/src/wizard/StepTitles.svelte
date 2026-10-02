<script lang="ts">
  import { rules, meisterschaft, type AttrKey } from '../rules';
  import { newTitle, type Character } from '../model/character';
  import { creationReport } from '../model/sheet';
  import { TITLE_TEMPLATES, DOMAIN_SUGGESTIONS } from './templates';
  import Stepper from '../ui/Stepper.svelte';
  import TagInput from '../ui/TagInput.svelte';

  let { char }: { char: Character } = $props();
  const report = $derived(creationReport(char));
  const attrs = rules.tabellen.attribute;
  const startMax = $derived(report.stufe.startLevelMax);

  function addTemplate(i: number) {
    const t = TITLE_TEMPLATES[i];
    char.titles.push(newTitle({ name: t.name, level: 1, startedAtLevel: 1, domains: [...t.domains], leadAttrs: [...t.lead] as [AttrKey, AttrKey] }));
  }
  const addBlank = () => char.titles.push(newTitle({ startedAtLevel: 1, level: 1, name: 'Neuer Titel' }));
  function remove(id: string) {
    char.titles = char.titles.filter((t) => t.id !== id);
    for (const m of char.moves) if (m.titleId === id) m.titleId = undefined;
  }
  function toggleDomain(t: (typeof char.titles)[number], d: string) {
    t.domains = t.domains.includes(d) ? t.domains.filter((x) => x !== d) : [...t.domains, d];
  }
  const remaining = $derived(report.titleBudget - report.titleLevels);
</script>

<div class="stack">
  <p class="dim intro">Titel sind das Training und die Erfahrung deiner Figur (z.B. <em>Ex-Hitman</em>, <em>SWAT-Operator</em>). Jeder Titel hat ein <b>Level</b> (daraus folgt die Meisterschaft M = Level ÷ 2, abgerundet), eine <b>Domäne</b> aus 3 bis 5 Bereichen und <b>zwei Leitattribute</b>. Nur der Titel, der eine Aktion abdeckt, gibt dafür Bonus.</p>

  <div class="budget" class:over={remaining < 0}>
    <span>Titel-Level verteilt</span><b>{report.titleLevels} / {report.titleBudget}</b>
    <small class="dim">{remaining >= 0 ? `${remaining} übrig` : `${-remaining} zu viel`} · höchstens Level {startMax} je Titel</small>
  </div>

  <div>
    <h3>Vorlagen</h3>
    <div class="tpl">
      {#each TITLE_TEMPLATES as t, i}<button class="chip" onclick={() => addTemplate(i)} title={`${t.text}: ${t.domains.join(', ')}`}>+ {t.name}</button>{/each}
      <button class="chip amber" onclick={addBlank}>+ Eigener Titel</button>
    </div>
    <small class="dim">Vorlagen sind nur Ausgangspunkte. Name, Domäne und Leitattribute sind frei änderbar.</small>
  </div>

  {#each char.titles as t (t.id)}
    {@const m = meisterschaft(t.level)}
    {@const domWarn = t.domains.length < 3 || t.domains.length > 5}
    <section class="panel flat title">
      <div class="row">
        <label class="field grow">Titel<input bind:value={t.name} /></label>
        <label class="field">Level<Stepper value={t.level} min={1} max={10} warn={t.level > startMax} label="Level" onchange={(v) => { t.level = v; t.startedAtLevel = v; }} /></label>
        <div class="m"><span class="lbl">Meisterschaft</span><b>{m}</b></div>
        <button class="btn sm icon danger" onclick={() => remove(t.id)} aria-label="Titel entfernen">🗑</button>
      </div>
      {#if t.level >= 4}<p class="note">Level {t.level} bringt Attributswachstum mit: +1 auf ein Leitattribut zusätzlich zum Budget (siehe Attribute).</p>{/if}
      <label class="field">Domäne ({t.domains.length}, empfohlen 3 bis 5)<TagInput bind:values={t.domains} label="Domäne" /></label>
      {#if domWarn}<p class="warn">Ein Titel hat 3 bis 5 Domänen.</p>{/if}
      <div class="sug">
        {#each DOMAIN_SUGGESTIONS.filter((d) => !t.domains.includes(d)).slice(0, 14) as d}<button class="chip" onclick={() => toggleDomain(t, d)}>+ {d}</button>{/each}
      </div>
      <div class="row">
        <label class="field">Leitattribut 1
          <select bind:value={t.leadAttrs[0]}>{#each attrs as a}<option value={a.key}>{a.name}</option>{/each}</select>
        </label>
        <label class="field">Leitattribut 2
          <select bind:value={t.leadAttrs[1]}>{#each attrs as a}<option value={a.key}>{a.name}</option>{/each}</select>
        </label>
        {#if t.leadAttrs[0] === t.leadAttrs[1]}<span class="warn">Zwei verschiedene Leitattribute wählen.</span>{/if}
      </div>
    </section>
  {:else}
    <p class="dim">Noch kein Titel. Wähle eine Vorlage oder lege einen eigenen an.</p>
  {/each}
</div>

<style>
  .intro { margin: 0; }
  .budget { display: flex; gap: 0.8rem; align-items: baseline; flex-wrap: wrap; padding: 0.6rem 0.8rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .budget b { font: 400 1.9rem/1 var(--font-display); color: var(--accent); }
  .budget.over { border-left-color: var(--danger); }
  .budget.over b { color: var(--danger); }
  .tpl, .sug { display: flex; flex-wrap: wrap; gap: 5px; margin: 0.4rem 0; }
  .tpl .chip, .sug .chip { cursor: pointer; }
  .tpl .chip:hover, .sug .chip:hover { border-color: var(--accent); color: var(--accent); }
  .title { border-left: 3px solid var(--accent); display: grid; gap: 0.6rem; }
  .grow { flex: 1; min-width: 180px; }
  .m { display: grid; justify-items: center; }
  .m b { font: 400 2rem/1 var(--font-display); color: var(--accent-2); }
  .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .note { margin: 0; color: var(--accent-2); font-size: 0.9rem; }
  .warn { color: var(--warn); margin: 0; font-size: 0.88rem; }
</style>
