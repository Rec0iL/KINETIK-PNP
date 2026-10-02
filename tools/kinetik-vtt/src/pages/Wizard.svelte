<script lang="ts">
  import { getCharacter, library } from '../store/characters.svelte';
  import { useAutosave } from '../store/autosave.svelte';
  import { navigate } from '../lib/router.svelte';
  import { openRulebook } from '../rulebook/rulebook.svelte';
  import { computeSheet, creationReport } from '../model/sheet';
  import { WIZARD_STEPS } from '../wizard/templates';
  import StepConcept from '../wizard/StepConcept.svelte';
  import StepTitles from '../wizard/StepTitles.svelte';
  import StepAttributes from '../wizard/StepAttributes.svelte';
  import StepMoves from '../wizard/StepMoves.svelte';
  import StepGear from '../wizard/StepGear.svelte';
  import StepFinish from '../wizard/StepFinish.svelte';

  let { id, step }: { id: string; step: number } = $props();

  const char = $derived(getCharacter(id));
  useAutosave(() => char);

  const idx = $derived(Math.max(0, Math.min(WIZARD_STEPS.length - 1, step - 1)));
  const current = $derived(WIZARD_STEPS[idx]);
  const report = $derived(char ? creationReport(char) : null);
  const last = $derived(idx === WIZARD_STEPS.length - 1);

  const go = (n: number) => { navigate(`/wizard/${id}/${n}`); window.scrollTo({ top: 0 }); };

  function finish() {
    if (!char) return;
    const s = computeSheet(char);
    char.resources.energie = s.energieMax.value;
    char.resources.wk = s.wkMax.value;
    char.resources.schutz.current = char.resources.schutz.max;
    char.resources.momentum = 0;
    char.draft = false;
    navigate(`/charakter/${char.id}`);
  }
  const fmt = (spent: number, budget: number) => `${spent} / ${budget}`;
</script>

{#if !library.ready}
  <p class="dim">Lade …</p>
{:else if !char || !report}
  <section class="panel stack"><h2>Charakter nicht gefunden</h2><a class="btn primary" href="#/charaktere">Zu den Charakteren</a></section>
{:else}
  <header class="top">
    <div>
      <span class="kicker">Charakter-Assistent · {report.stufe.name}</span>
      <h1>{current.title}</h1>
      <p class="dim sub">{current.text}</p>
    </div>
    <div class="row">
      <button class="btn sm" onclick={() => openRulebook(current.rule)}>📖 Regeln zu diesem Schritt</button>
      <a class="btn sm ghost" href={`#/charakter/${char.id}`}>Zum Bogen wechseln</a>
    </div>
  </header>

  <nav class="rail" aria-label="Schritte">
    {#each WIZARD_STEPS as s, i (s.key)}
      <button class:on={i === idx} class:done={i < idx} onclick={() => go(i + 1)} aria-current={i === idx ? 'step' : undefined}>
        <span class="n">{i + 1}</span><span class="t">{s.title}</span>
      </button>
    {/each}
  </nav>

  <div class="budgets">
    <span class="b" class:over={report.attributesOver}>Attribute <b>{fmt(report.attributesSpent, report.attributesBudget)}</b></span>
    <span class="b" class:over={report.titleLevels > report.titleBudget}>Titel-Level <b>{fmt(report.titleLevels, report.titleBudget)}</b></span>
    <span class="b">Max. Start-Level <b>{report.stufe.startLevelMax}</b></span>
  </div>

  <section class="panel step">
    {#key current.key}
      {#if current.key === 'concept'}<StepConcept {char} />
      {:else if current.key === 'titles'}<StepTitles {char} />
      {:else if current.key === 'attributes'}<StepAttributes {char} />
      {:else if current.key === 'moves'}<StepMoves {char} />
      {:else if current.key === 'gear'}<StepGear {char} />
      {:else}<StepFinish {char} />{/if}
    {/key}
  </section>

  <footer class="nav">
    <button class="btn" onclick={() => go(idx)} disabled={idx === 0}>← Zurück</button>
    <span class="spacer"></span>
    {#if last}
      <button class="btn primary" onclick={finish}>Fertig, zum Bogen</button>
    {:else}
      <button class="btn primary" onclick={() => go(idx + 2)}>Weiter →</button>
    {/if}
  </footer>
{/if}

<style>
  .top { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .sub { margin: 0.3rem 0 0; }
  .rail { display: flex; gap: 4px; overflow-x: auto; margin-bottom: 0.8rem; }
  .rail button { flex: 1; min-width: 96px; display: flex; gap: 0.5rem; align-items: center; padding: 0.55rem 0.7rem; background: var(--raised); border: 1px solid var(--line); border-bottom: 3px solid var(--line-strong); color: var(--ink-dim); cursor: pointer; font: inherit; }
  .rail button:hover { color: var(--ink); }
  .rail button.done { border-bottom-color: var(--accent); }
  .rail button.on { color: var(--ink-strong); border-bottom-color: var(--accent-2); background: var(--accent-soft); }
  .rail .n { font: 400 1.4rem/1 var(--font-display); color: var(--accent-2); }
  .rail .t { font: 600 0.85rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .budgets { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
  .b { padding: 0.3rem 0.7rem; background: var(--raised); border: 1px solid var(--line); font: 600 0.78rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-dim); }
  .b b { color: var(--accent); font-family: var(--font-mono); margin-left: 0.4em; }
  .b.over, .b.over b { color: var(--danger); border-color: var(--danger); }
  .step { min-height: 320px; }
  .nav { display: flex; gap: 0.6rem; margin-top: 1rem; position: sticky; bottom: 0; padding: 0.7rem 0; background: linear-gradient(to top, var(--bg) 60%, transparent); z-index: 5; }
  @media (max-width: 640px) { .rail .t { display: none; } .rail button { min-width: 0; justify-content: center; } }
</style>
