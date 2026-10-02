<script lang="ts">
  import { getCharacter, library } from '../store/characters.svelte';
  import { useAutosave } from '../store/autosave.svelte';
  import { scheduleSheet } from '../net/player.svelte';
  import { downloadJson, exportCharacter, fileNameFor } from '../model/io';
  import { computeSheet } from '../model/sheet';
  import Overview from '../sheet/Overview.svelte';
  import Body from '../sheet/Body.svelte';
  import Moves from '../sheet/Moves.svelte';
  import Gear from '../sheet/Gear.svelte';
  import Tags from '../sheet/Tags.svelte';
  import Notes from '../sheet/Notes.svelte';
  import RollPanel from '../sheet/RollPanel.svelte';

  let { id }: { id: string } = $props();

  const char = $derived(getCharacter(id));
  const sheet = $derived(char ? computeSheet(char) : undefined);
  useAutosave(() => char);
  // Bogen an den SL übertragen, wenn dieser Charakter in einer Runde aktiv ist.
  $effect(() => {
    if (!char) return;
    $state.snapshot(char);
    scheduleSheet(char);
  });

  const tabs = [
    { key: 'ueber', label: 'Übersicht' },
    { key: 'koerper', label: 'Körper' },
    { key: 'moves', label: 'Moves' },
    { key: 'ausruestung', label: 'Ausrüstung' },
    { key: 'tags', label: 'Tags & Nachteile' },
    { key: 'notizen', label: 'Notizen' },
    { key: 'wuerfel', label: 'Würfeln' },
  ] as const;
  type Tab = (typeof tabs)[number]['key'];

  const TAB_KEY = 'kinetik.tab';
  let tab = $state<Tab>((() => { try { return (sessionStorage.getItem(TAB_KEY) as Tab) || 'ueber'; } catch { return 'ueber'; } })());
  $effect(() => { try { sessionStorage.setItem(TAB_KEY, tab); } catch { /* ignorieren */ } });
  const pct = (v: number, m: number) => (m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);
</script>

{#if !library.ready}
  <p class="dim">Lade …</p>
{:else if !char || !sheet}
  <section class="panel stack">
    <h2>Charakter nicht gefunden</h2>
    <p class="dim">Dieser Charakter existiert in diesem Browser nicht (mehr). Über den Import kannst du eine JSON-Sicherung zurückholen.</p>
    <div class="row"><a class="btn primary" href="#/charaktere">Zu den Charakteren</a></div>
  </section>
{:else}
  <div class="bar">
    <a class="btn sm ghost" href="#/charaktere">← Charaktere</a>
    <div class="who">
      <b>{char.name}</b>{#if char.alias}<span class="dim"> „{char.alias}“</span>{/if}
    </div>
    <div class="mini" title="Energie">
      <span>E</span><div class="b"><i style:width="{pct(char.resources.energie, sheet.energieMax.value)}%"></i></div><b>{char.resources.energie}/{sheet.energieMax.value}</b>
    </div>
    <div class="mini amber" title="Willenskraft">
      <span>WK</span><div class="b"><i style:width="{pct(char.resources.wk, sheet.wkMax.value)}%"></i></div><b>{char.resources.wk}/{sheet.wkMax.value}</b>
    </div>
    <div class="mini mom" title="Momentum"><span>M</span><b>{char.resources.momentum}/{sheet.momentumCap.value}</b></div>
    <span class="spacer"></span>
    <button class="btn sm" onclick={() => downloadJson(exportCharacter($state.snapshot(char)), fileNameFor(char))}>Export JSON</button>
  </div>

  <div class="tabs" role="tablist" aria-label="Bogen">
    {#each tabs as t}
      <button role="tab" aria-selected={tab === t.key} onclick={() => (tab = t.key)}>{t.label}</button>
    {/each}
  </div>

  <div class="content" role="tabpanel">
    {#if tab === 'ueber'}<Overview {char} />
    {:else if tab === 'koerper'}<Body {char} />
    {:else if tab === 'moves'}<Moves {char} />
    {:else if tab === 'ausruestung'}<Gear {char} />
    {:else if tab === 'tags'}<Tags {char} />
    {:else if tab === 'notizen'}<Notes {char} />
    {:else}<RollPanel {char} />{/if}
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-bottom: 0.8rem; }
  .who b { font: 400 1.7rem var(--font-display); letter-spacing: 0.06em; color: var(--ink-strong); }
  .mini { display: flex; align-items: center; gap: 0.4rem; font: 600 0.78rem var(--font-head); letter-spacing: 0.12em; color: var(--ink-dim); --c: var(--accent); }
  .mini.amber { --c: var(--accent-2); }
  .mini b { font: 500 0.82rem var(--font-mono); color: var(--ink); }
  .mini .b { width: 70px; height: 8px; background: rgba(0, 0, 0, 0.5); border: 1px solid var(--line-strong); }
  .mini i { display: block; height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); transition: width 0.4s; }
  .mom b { color: var(--accent-2); }
  .content { padding-top: 1rem; }
</style>
