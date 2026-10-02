<script lang="ts">
  import { rules } from '../rules';
  import { newCharacter, type CustomStufe, type Stufe } from '../model/character';
  import { addCharacter } from '../store/characters.svelte';
  import { navigate } from '../lib/router.svelte';
  import { openRulebook } from '../rulebook/rulebook.svelte';
  import Stepper from '../ui/Stepper.svelte';

  let step = $state<1 | 2>(1);
  let stufe = $state<Stufe>('kino');
  let custom = $state<CustomStufe>({ attributBudget: 4, titelBudget: 4, startLevelMax: 3 });

  const options = $derived([
    ...rules.tabellen.kampagnenstufen.map((s) => ({
      key: s.key as Stufe, name: s.name, standard: 'standard' in s, attr: s.attributBudget, titel: s.titelBudget, max: s.startLevelMax,
      text: ({ strasse: 'Bodenständig: Straßenkämpfer, Cops, Söldner.', kino: 'Der Standard: filmische Helden mit Talent und Training.', legende: 'Veteranen und Mythen, die schon ganze Armeen aufgemischt haben.' } as Record<string, string>)[s.key] ?? '',
    })),
    { key: 'custom' as Stufe, name: 'Eigene', standard: false, attr: custom.attributBudget, titel: custom.titelBudget, max: custom.startLevelMax, text: 'Der Tisch legt Budgets und Start-Level selbst fest.' },
  ]);

  function create(mode: 'wizard' | 'manual') {
    const c = addCharacter(newCharacter({ stufe, customStufe: { ...custom }, draft: true }));
    navigate(mode === 'wizard' ? `/wizard/${c.id}/1` : `/charakter/${c.id}`);
  }
</script>

<section class="wrap">
  <span class="kicker">Neuer Charakter · Schritt {step} von 2</span>
  <h1>{step === 1 ? 'Kampagnenstartstufe' : 'Wie erschaffen?'}</h1>

  {#if step === 1}
    <p class="dim lead">Wie stark sind die Figuren am Anfang? Das bestimmt, wie viele Attributspunkte und Titel-Level du bei der Erschaffung verteilen darfst. Die Stufe legt der Tisch fest, sie gilt nur für den Start. Danach wächst die Figur über Titel-Level.</p>
    <div class="opts">
      {#each options as o (o.key)}
        <button class="opt panel" class:on={stufe === o.key} onclick={() => (stufe = o.key)} aria-pressed={stufe === o.key}>
          <h2>{o.name}{#if o.standard}<span class="chip accent">Standard</span>{/if}</h2>
          <p class="dim">{o.text}</p>
          <dl>
            <div><dt>Attribute</dt><dd>{o.attr}</dd></div>
            <div><dt>Titel-Level</dt><dd>{o.titel}</dd></div>
            <div><dt>Max. je Titel</dt><dd>{o.max}</dd></div>
          </dl>
        </button>
      {/each}
    </div>

    {#if stufe === 'custom'}
      <section class="panel custom">
        <h3>Eigene Budgets</h3>
        <div class="row">
          <label class="field">Attribut-Budget<Stepper bind:value={custom.attributBudget} min={0} max={20} label="Attribut-Budget" /></label>
          <label class="field">Titel-Level-Budget<Stepper bind:value={custom.titelBudget} min={0} max={40} label="Titel-Level-Budget" /></label>
          <label class="field">Max. Start-Level je Titel<Stepper bind:value={custom.startLevelMax} min={1} max={10} label="Max. Start-Level" /></label>
        </div>
        <small class="dim">Du kannst die Stufe und die Budgets später im Bogen unter „Charaktererschaffung“ ändern.</small>
      </section>
    {/if}

    <div class="row">
      <a class="btn ghost" href="#/charaktere">Abbrechen</a>
      <button class="btn sm" onclick={() => openRulebook('sec-2-4-charaktererschaffung')}>Regeln 2.4 lesen</button>
      <span class="spacer"></span>
      <button class="btn primary" onclick={() => (step = 2)}>Weiter</button>
    </div>
  {:else}
    <p class="dim lead">Der Assistent führt dich Schritt für Schritt durch Konzept, Titel, Attribute, Moves und Ausrüstung und achtet auf die Budgets. Manuell bekommst du gleich den leeren Bogen.</p>
    <div class="opts two">
      <button class="opt panel big" onclick={() => create('wizard')}>
        <h2>Assistent <span class="chip accent">empfohlen</span></h2>
        <p class="dim">Strukturiert in sechs Schritten, mit Erklärungen, Beispielen aus dem Regelwerk und Live-Budget. Du kannst jederzeit zum Bogen wechseln.</p>
        <ol class="dim"><li>Konzept</li><li>Titel</li><li>Attribute</li><li>Moves</li><li>Ausrüstung</li><li>Abschluss</li></ol>
      </button>
      <button class="opt panel big" onclick={() => create('manual')}>
        <h2>Manuell</h2>
        <p class="dim">Der leere Charakterbogen, alles frei ausfüllbar. Für Erfahrene und für Figuren, die du schon im Kopf hast. Budget-Hinweise erscheinen unten im Bogen.</p>
      </button>
    </div>
    <div class="row">
      <button class="btn ghost" onclick={() => (step = 1)}>← Zurück</button>
      <span class="chip">Stufe: {options.find((o) => o.key === stufe)?.name}</span>
    </div>
  {/if}
</section>

<style>
  .wrap { display: grid; gap: 1.1rem; max-width: 1000px; }
  .lead { max-width: 70ch; margin: 0; }
  .opts { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.9rem; }
  .opts.two { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
  .opt { text-align: left; cursor: pointer; display: grid; gap: 0.5rem; align-content: start; color: var(--ink); font: inherit; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s; }
  .opt:hover { transform: translateY(-3px); border-color: var(--accent); }
  .opt.on { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--glow); }
  .opt h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.1rem; letter-spacing: 0.06em; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .opt p { margin: 0; }
  dl { display: grid; gap: 4px; margin: 0.3rem 0 0; }
  dl div { display: flex; justify-content: space-between; border-bottom: 1px solid var(--line); padding: 2px 0; }
  dt { font: 600 0.75rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  dd { margin: 0; font: 400 1.4rem/1 var(--font-display); color: var(--accent-2); }
  .big { min-height: 230px; padding: 1.3rem; }
  ol { margin: 0; padding-left: 1.2em; columns: 2; }
  .custom { display: grid; gap: 0.6rem; }
</style>
