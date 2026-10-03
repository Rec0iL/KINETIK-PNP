<script lang="ts">
  import { router } from './lib/router.svelte';
  import { theme, applyTheme, THEMES, type ThemeKey } from './lib/theme.svelte';
  import { t, type Key } from './i18n';
  import Home from './pages/Home.svelte';
  import Placeholder from './pages/Placeholder.svelte';
  import Characters from './pages/Characters.svelte';
  import Builder from './pages/Builder.svelte';
  import Join from './pages/Join.svelte';
  import Round from './pages/Round.svelte';
  import Gm from './pages/Gm.svelte';
  import SessionBar from './ui/SessionBar.svelte';
  import Toasts from './ui/Toasts.svelte';
  import CharacterPage from './pages/CharacterPage.svelte';
  import RollPanel from './sheet/RollPanel.svelte';
  import RollToast from './ui/RollToast.svelte';
  import DiceOverlay from './dice/DiceOverlay.svelte';
  import MusicRunner from './music/MusicRunner.svelte';
  import MusicBar from './music/MusicBar.svelte';
  import Credits from './pages/Credits.svelte';
  import CreateStart from './pages/CreateStart.svelte';
  import Wizard from './pages/Wizard.svelte';
  import Rulebook from './rulebook/Rulebook.svelte';
  import { rulebook, toggleRulebook } from './rulebook/rulebook.svelte';
  import { loadCatalog } from './music/catalog.svelte';
  import { loadLibrary } from './store/characters.svelte';
  import { loadMoveLibrary } from './store/moves.svelte';
  import { resumeFromSession } from './net/player.svelte';
  import { resumeHostIfActive } from './net/gm.svelte';
  import { loadAssetIndex } from './net/assets.svelte';
  import { RULES_VERSION } from './rules';
  import { settings } from './lib/settings.svelte';

  let headerEl = $state<HTMLElement>();
  // Höhe des App-Kopfs als CSS-Variable, damit mitscrollende Leisten (Charakterbogen) genau darunter einrasten.
  $effect(() => {
    if (!headerEl) return;
    const set = () => document.documentElement.style.setProperty('--hdr', `${headerEl!.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(headerEl);
    return () => ro.disconnect();
  });

  loadLibrary().then(() => resumeFromSession());
  loadAssetIndex().then(() => resumeHostIfActive());
  loadMoveLibrary();
  loadCatalog();

  const nav: { href: string; key: Key; names: string[] }[] = [
    { href: '#/', key: 'nav.home', names: ['home'] },
    { href: '#/charaktere', key: 'nav.characters', names: ['characters', 'character', 'create', 'wizard'] },
    { href: '#/builder', key: 'nav.builder', names: ['builder'] },
    { href: '#/wuerfel', key: 'nav.dice', names: ['dice'] },
    { href: '#/beitreten', key: 'nav.join', names: ['join', 'round'] },
    { href: '#/sl', key: 'nav.gm', names: ['gm'] },
  ];
</script>

<header class="top" bind:this={headerEl}>
  <a class="brand" href="#/" aria-label={t('app.name')}>
    <span class="mark">K</span><span class="word">KINETIK</span>
  </a>
  <nav aria-label="Hauptnavigation">
    {#each nav as item}
      <a href={item.href} aria-current={item.names.includes(router.route.name) ? 'page' : undefined}>{t(item.key)}</a>
    {/each}
  </nav>
  <button class="btn sm rbbtn" class:on={rulebook.open} onclick={toggleRulebook} aria-pressed={rulebook.open} title="Regelwerk lesen">📖 <span class="rbl">Regelwerk</span></button>
  <button class="btn sm icon dicebtn" class:on={settings.dice3d} onclick={() => (settings.dice3d = !settings.dice3d)} title={settings.dice3d ? '3D-Würfel aus' : '3D-Würfel an'} aria-pressed={settings.dice3d} aria-label="3D-Würfel">⚄</button>
  <label class="theme">
    <span class="sr-only">{t('theme.label')}</span>
    <select value={theme.current} onchange={(e) => applyTheme(e.currentTarget.value as ThemeKey)} aria-label={t('theme.label')}>
      {#each THEMES as k}
        <option value={k}>{t(`theme.${k}` as Key)}</option>
      {/each}
    </select>
  </label>
</header>

<SessionBar />

<main class:wide={router.route.name === 'gm'}>
  {#if router.route.name === 'home'}
    <Home />
  {:else if router.route.name === 'characters'}
    <Characters />
  {:else if router.route.name === 'character'}
    {#key router.route.params.id}<CharacterPage id={router.route.params.id} />{/key}
  {:else if router.route.name === 'builder'}
    <Builder />
  {:else if router.route.name === 'dice'}
    <span class="kicker">Spieler</span>
    <h1 class="pagetitle">Würfel</h1>
    <RollPanel />
  {:else if router.route.name === 'create'}
    <CreateStart />
  {:else if router.route.name === 'wizard'}
    {#key router.route.params.id}<Wizard id={router.route.params.id} step={Number(router.route.params.step) || 1} />{/key}
  {:else if router.route.name === 'join'}
    <Join />
  {:else if router.route.name === 'round'}
    <Round />
  {:else if router.route.name === 'gm'}
    <Gm />
  {:else}
    {#if router.route.name === 'credits'}<Credits />{:else}<Placeholder title="404" />{/if}
  {/if}
</main>

<Rulebook />
<MusicRunner />
<MusicBar />
<RollToast />
<DiceOverlay />
<Toasts />

<footer class="foot">
  <span>KINETIK · Regelwerk v{RULES_VERSION}</span>
  <a href="#/credits">{t('nav.credits')}</a>
</footer>

<style>
  .top {
    position: sticky; top: 0; z-index: 50;
    display: flex; align-items: center; gap: 1.2rem; padding: 0.55rem max(16px, 3vw);
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.35));
    border-bottom: 1px solid var(--line); backdrop-filter: blur(10px);
  }
  .brand { display: flex; align-items: center; gap: 0.6rem; color: var(--ink-strong); text-decoration: none; }
  .brand:hover { text-decoration: none; }
  .mark {
    display: grid; place-items: center; width: 34px; height: 34px;
    font: 400 1.7rem/1 var(--font-display); color: var(--accent-ink); background: var(--accent);
    clip-path: polygon(0 0, 100% 0, 100% 70%, 70% 100%, 0 100%); box-shadow: var(--hard-shadow);
  }
  .word { font: 400 1.7rem/1 var(--font-display); letter-spacing: 0.14em; }
  nav { display: flex; gap: 0.2rem; flex: 1; overflow-x: auto; scrollbar-width: none; }
  nav a {
    padding: 0.55em 0.9em; color: var(--ink-dim); text-decoration: none; white-space: nowrap;
    font: 600 0.9rem/1 var(--font-head); letter-spacing: 0.12em; text-transform: uppercase;
    border-bottom: 2px solid transparent;
  }
  nav a:hover { color: var(--ink); }
  nav a[aria-current='page'] { color: var(--accent); border-bottom-color: var(--accent); }
  .rbbtn { font-weight: 600; }
  .rbbtn.on { color: var(--accent); border-color: var(--accent-line); background: var(--accent-soft); }
  @media (max-width: 760px) { .rbl { display: none; } }
  .dicebtn { font-size: 1.1rem; color: var(--ink-dim); }
  .dicebtn.on { color: var(--accent); border-color: var(--accent-line); }
  .theme select { width: auto; min-height: 34px; padding: 0.3em 0.6em; font: 600 0.8rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .pagetitle { margin-bottom: 1rem; }
  main { padding: 1.4rem max(16px, 3vw) 3rem; max-width: 1280px; margin: 0 auto; }
  /* SL-Dashboard: die volle Breite nutzen (Widescreen und Ultrawide), die Karte braucht den Platz. */
  main.wide { max-width: none; padding-inline: max(16px, 1.2vw); padding-top: 1rem; padding-bottom: 1.5rem; }
  .foot { display: flex; justify-content: space-between; padding: 1rem max(16px, 3vw); color: var(--ink-dim); font: 600 0.75rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; border-top: 1px solid var(--line); }
  @media (max-width: 640px) {
    .word { display: none; }
    .top { gap: 0.5rem; }
  }
</style>
