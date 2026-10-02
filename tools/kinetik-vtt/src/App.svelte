<script lang="ts">
  import { router } from './lib/router.svelte';
  import { theme, applyTheme, THEMES, type ThemeKey } from './lib/theme.svelte';
  import { t, type Key } from './i18n';
  import Home from './pages/Home.svelte';
  import Placeholder from './pages/Placeholder.svelte';
  import Characters from './pages/Characters.svelte';
  import CharacterPage from './pages/CharacterPage.svelte';
  import RollPanel from './sheet/RollPanel.svelte';
  import RollToast from './ui/RollToast.svelte';
  import { loadLibrary } from './store/characters.svelte';
  import { RULES_VERSION } from './rules';

  loadLibrary();

  const nav: { href: string; key: Key; names: string[] }[] = [
    { href: '#/', key: 'nav.home', names: ['home'] },
    { href: '#/charaktere', key: 'nav.characters', names: ['characters', 'character'] },
    { href: '#/builder', key: 'nav.builder', names: ['builder'] },
    { href: '#/wuerfel', key: 'nav.dice', names: ['dice'] },
    { href: '#/sl', key: 'nav.gm', names: ['gm'] },
  ];
</script>

<header class="top">
  <a class="brand" href="#/" aria-label={t('app.name')}>
    <span class="mark">K</span><span class="word">KINETIK</span>
  </a>
  <nav aria-label="Hauptnavigation">
    {#each nav as item}
      <a href={item.href} aria-current={item.names.includes(router.route.name) ? 'page' : undefined}>{t(item.key)}</a>
    {/each}
  </nav>
  <label class="theme">
    <span class="sr-only">{t('theme.label')}</span>
    <select value={theme.current} onchange={(e) => applyTheme(e.currentTarget.value as ThemeKey)} aria-label={t('theme.label')}>
      {#each THEMES as k}
        <option value={k}>{t(`theme.${k}` as Key)}</option>
      {/each}
    </select>
  </label>
</header>

<main>
  {#if router.route.name === 'home'}
    <Home />
  {:else if router.route.name === 'characters'}
    <Characters />
  {:else if router.route.name === 'character'}
    {#key router.route.params.id}<CharacterPage id={router.route.params.id} />{/key}
  {:else if router.route.name === 'dice'}
    <span class="kicker">Spieler</span>
    <h1 class="pagetitle">Würfel</h1>
    <RollPanel />
  {:else if router.route.name === 'notfound'}
    <Placeholder title="404" />
  {:else}
    <Placeholder title={t(`nav.${{ characters: 'characters', character: 'characters', builder: 'builder', dice: 'dice', gm: 'gm', credits: 'credits' }[router.route.name] as 'characters'}` as Key)} />
  {/if}
</main>

<RollToast />

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
  .theme select { width: auto; min-height: 34px; padding: 0.3em 0.6em; font: 600 0.8rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .pagetitle { margin-bottom: 1rem; }
  main { padding: 1.4rem max(16px, 3vw) 3rem; max-width: 1280px; margin: 0 auto; }
  .foot { display: flex; justify-content: space-between; padding: 1rem max(16px, 3vw); color: var(--ink-dim); font: 600 0.75rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; border-top: 1px solid var(--line); }
  @media (max-width: 640px) {
    .word { display: none; }
    .top { gap: 0.5rem; }
  }
</style>
