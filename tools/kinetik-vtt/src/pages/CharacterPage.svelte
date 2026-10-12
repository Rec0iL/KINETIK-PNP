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
  import Creation from '../sheet/Creation.svelte';
  import RollDock from '../sheet/RollDock.svelte';
  import { t } from '../i18n';

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
    { key: 'ueber', label: t('pages.characterPage.tabOverview') },
    { key: 'koerper', label: t('pages.characterPage.tabBody') },
    { key: 'moves', label: t('pages.characterPage.tabMoves') },
    { key: 'ausruestung', label: t('pages.characterPage.tabGear') },
    { key: 'tags', label: t('pages.characterPage.tabTags') },
    { key: 'notizen', label: t('pages.characterPage.tabNotes') },
    { key: 'erschaffung', label: t('pages.characterPage.tabCreation') },
  ] as const;
  type Tab = (typeof tabs)[number]['key'];

  const TAB_KEY = 'kinetik.tab';
  let tab = $state<Tab>((() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY);
      return tabs.some((x) => x.key === saved) ? (saved as Tab) : 'ueber';
    } catch { return 'ueber'; }
  })());
  $effect(() => { try { sessionStorage.setItem(TAB_KEY, tab); } catch { /* ignorieren */ } });
  const pct = (v: number, m: number) => (m > 0 ? Math.max(0, Math.min(100, (v / m) * 100)) : 0);
</script>

{#if !library.ready}
  <p class="dim">{t('pages.common.loading')}</p>
{:else if !char || !sheet}
  <section class="panel stack">
    <h2>{t('pages.common.notFound')}</h2>
    <p class="dim">{t('pages.characterPage.notFoundText')}</p>
    <div class="row"><a class="btn primary" href="#/charaktere">{t('pages.common.toCharacters')}</a></div>
  </section>
{:else}
  <div class="sticky">
  <div class="bar">
    <a class="btn sm ghost" href="#/charaktere">{t('pages.characterPage.backToList')}</a>
    <div class="who">
      <b>{char.name}</b>{#if char.alias}<span class="dim"> {t('pages.common.quoted', { text: char.alias })}</span>{/if}
    </div>
    <div class="mini" title={t('pages.common.energy')}>
      <span>{t('pages.common.energyShort')}</span><div class="b"><i style:width="{pct(char.resources.energie, sheet.energieMax.value)}%"></i></div><b>{char.resources.energie}/{sheet.energieMax.value}</b>
    </div>
    <div class="mini amber" title={t('pages.common.willpower')}>
      <span>{t('pages.common.willpowerShort')}</span><div class="b"><i style:width="{pct(char.resources.wk, sheet.wkMax.value)}%"></i></div><b>{char.resources.wk}/{sheet.wkMax.value}</b>
    </div>
    <div class="mini mom" title={t('pages.characterPage.momentum')}><span>{t('pages.characterPage.momentumShort')}</span><b>{char.resources.momentum}/{sheet.momentumCap.value}</b></div>
    <span class="spacer"></span>
    <button class="btn sm" onclick={() => downloadJson(exportCharacter($state.snapshot(char)), fileNameFor(char))}>{t('pages.common.exportJson')}</button>
  </div>

  <div class="tabs" role="tablist" aria-label={t('pages.common.sheet')}>
    {#each tabs as tb}
      <button role="tab" aria-selected={tab === tb.key} onclick={() => (tab = tb.key)}>{tb.label}{#if tb.key === 'erschaffung' && char.draft}<span class="dot" title={t('pages.characterPage.creationDraft')}></span>{/if}</button>
    {/each}
  </div>
  </div>

  <div class="content" role="tabpanel">
    {#if tab === 'ueber'}<Overview {char} ontab={(k) => (tab = k as Tab)} />
    {:else if tab === 'koerper'}<Body {char} />
    {:else if tab === 'moves'}<Moves {char} />
    {:else if tab === 'ausruestung'}<Gear {char} />
    {:else if tab === 'tags'}<Tags {char} />
    {:else if tab === 'notizen'}<Notes {char} />
    {:else if tab === 'erschaffung'}<Creation {char} />
    {/if}
  </div>

  <RollDock {char} />
{/if}

<style>
  /* Kopfleiste und Reiter bleiben unter dem App-Kopf stehen, auch beim Scrollen. */
  .sticky { position: sticky; top: var(--hdr, 54px); z-index: 40; margin: 0 -0.6rem; padding: 0.55rem 0.6rem 0; background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); }
  .sticky .tabs { border-bottom: 0; }
  .dot { display: inline-block; width: 7px; height: 7px; margin-left: 0.5em; border-radius: 50%; background: var(--accent-2); box-shadow: 0 0 6px var(--accent-2); vertical-align: middle; }
  .bar { display: flex; align-items: center; gap: 0.9rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
  .who b { font: 400 1.7rem var(--font-display); letter-spacing: 0.06em; color: var(--ink-strong); }
  .mini { display: flex; align-items: center; gap: 0.4rem; font: 600 0.78rem var(--font-head); letter-spacing: 0.12em; color: var(--ink-dim); --c: var(--accent); }
  .mini.amber { --c: var(--accent-2); }
  .mini b { font: 500 0.82rem var(--font-mono); color: var(--ink); }
  .mini .b { width: 70px; height: 8px; background: var(--track-bg); border: 1px solid var(--line-strong); }
  .mini i { display: block; height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); transition: width 0.4s; }
  .mom b { color: var(--accent-2); }
  .content { padding-top: 1rem; }
</style>
