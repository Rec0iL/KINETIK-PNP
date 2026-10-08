<script lang="ts">
  import { t, type Key } from '../i18n';
  import { art } from '../lib/art';
  import { openRulebook, rbCover } from '../rulebook/rulebook.svelte';
  import RulebookDownload from '../rulebook/RulebookDownload.svelte';

  const cards: { href: string; title: Key; text: Key; cta: Key; accent: 'cyan' | 'amber'; soon?: boolean; no: string; art: string }[] = [
    { href: '#/charaktere', title: 'home.player.title', text: 'home.player.text', cta: 'home.player.cta', accent: 'cyan', no: '01', art: 'card-player' },
    { href: '#/beitreten', title: 'home.join.title', text: 'home.join.text', cta: 'home.join.cta', accent: 'cyan', no: '02', art: 'card-join' },
    { href: '#/sl', title: 'home.gm.title', text: 'home.gm.text', cta: 'home.gm.cta', accent: 'amber', no: '03', art: 'card-gm' },
    { href: '#/builder', title: 'home.builder.title', text: 'home.builder.text', cta: 'home.builder.cta', accent: 'cyan', no: '04', art: 'card-builder' },
  ];
</script>

<div class="herobg" style:--img="url({art('hero')})" aria-hidden="true"></div>
<section class="hero">
  <span class="kicker">{t('app.kicker')}</span>
  <h1 class="glitch" data-text={t('app.name')}>{t('app.name')}</h1>
  <p class="tag">{t('app.tagline')}</p>
</section>

<section class="cards">
  {#each cards as c}
    <a class="card panel" class:amber={c.accent === 'amber'} href={c.href} style:--img="url({art(c.art)})">
      <span class="bg" aria-hidden="true"></span>
      <span class="no">{c.no}</span>
      <h2>{t(c.title)}</h2>
      <p class="dim">{t(c.text)}</p>
      <span class="btn" class:primary={c.accent === 'cyan'} class:amber={c.accent === 'amber'}>
        {t(c.cta)}
      </span>
      {#if c.soon}<span class="chip amber soon">{t('home.soon')}</span>{/if}
    </a>
  {/each}

  <!-- Fünfter Menüpunkt: das Regelwerk lesen oder als PDF laden (Look wählbar). Keine Verlinkung als Ganzes, hier stecken zwei Schaltflächen drin. -->
  <div class="card panel rb" style:--img="url({rbCover()})">
    <span class="bg" aria-hidden="true"></span>
    <span class="no">05</span>
    <h2>{t('home.rb.title')}</h2>
    <p class="dim">{t('home.rb.text')}</p>
    <div class="row actions">
      <button type="button" class="btn primary" onclick={() => openRulebook()}>{t('home.rb.read')}</button>
      <RulebookDownload variant="button" label={t('home.rb.pdf')} />
    </div>
  </div>
</section>

<style>
  .herobg {
    position: absolute; left: 0; right: 0; top: 0; height: min(78vh, 760px); z-index: -1; pointer-events: none;
    background: var(--img) center 30% / cover no-repeat; opacity: 0.55;
    -webkit-mask-image: linear-gradient(to bottom, #000 35%, transparent 100%); mask-image: linear-gradient(to bottom, #000 35%, transparent 100%);
  }
  :global(main) { position: relative; }
  .hero { padding: clamp(2rem, 8vw, 5rem) 0 2.2rem; display: grid; gap: 0.9rem; justify-items: start; }
  .hero h1 { font-size: var(--hero-size); letter-spacing: 0.06em; line-height: 0.85; }
  .tag { font: 500 1.2rem var(--font-head); letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-dim); margin: 0; }

  .glitch { position: relative; display: inline-block; }
  .glitch::before, .glitch::after {
    content: attr(data-text); position: absolute; inset: 0; pointer-events: none;
    text-shadow: none; opacity: 0.8;
  }
  .glitch::before { color: var(--accent); transform: translate(-3px, 0); clip-path: inset(0 0 62% 0); animation: glitch-a 5.5s infinite steps(1); }
  .glitch::after { color: var(--accent-2); transform: translate(3px, 0); clip-path: inset(58% 0 0 0); animation: glitch-b 7s infinite steps(1); }
  @keyframes glitch-a {
    0%, 92%, 100% { transform: translate(0, 0); clip-path: inset(0 0 100% 0); }
    93% { transform: translate(-6px, 0); clip-path: inset(10% 0 55% 0); }
    95% { transform: translate(5px, 0); clip-path: inset(40% 0 30% 0); }
    97% { transform: translate(-3px, 0); clip-path: inset(0 0 70% 0); }
  }
  @keyframes glitch-b {
    0%, 88%, 100% { transform: translate(0, 0); clip-path: inset(100% 0 0 0); }
    89% { transform: translate(6px, 0); clip-path: inset(60% 0 10% 0); }
    92% { transform: translate(-5px, 0); clip-path: inset(30% 0 40% 0); }
    94% { transform: translate(3px, 0); clip-path: inset(75% 0 0 0); }
  }

  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.1rem; }
  .bg { position: absolute; inset: 0; z-index: -1; background: linear-gradient(to top, var(--panel-solid) 12%, var(--card-fade-a) 70%, var(--card-fade-b)), var(--img) center / cover no-repeat; opacity: 0.9; pointer-events: none; }
  .card { display: grid; isolation: isolate; gap: 0.7rem; align-content: start; color: var(--ink); text-decoration: none; min-height: 250px; padding: 1.3rem; transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s; }
  .card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: var(--glow); text-decoration: none; }
  .card.amber::before, .card.amber::after { border-color: var(--accent-2); }
  .card.amber:hover { border-color: var(--accent-2); box-shadow: 0 0 18px rgba(255, 184, 0, 0.25); }
  .card h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.3rem; letter-spacing: 0.06em; text-shadow: var(--hard-shadow); }
  .card .btn { justify-self: start; margin-top: auto; }
  /* Regelwerk-Karte (05): über die ganze Breite unter den vier, Titelbild des Regelwerks dahinter, Schaltflächen nebeneinander */
  .card.rb { grid-column: 1 / -1; min-height: 0; padding-block: 1.3rem; }
  .card.rb:hover { transform: none; }
  .card.rb p { max-width: 62ch; margin: 0; }
  .card.rb .actions { display: flex; flex-wrap: wrap; gap: 0.6rem; margin-top: 0.4rem; }
  .card.rb .actions :global(.btn) { margin-top: 0; }
  .card.rb .bg { background: linear-gradient(to right, var(--panel-solid) 28%, var(--card-fade-a) 62%, var(--card-fade-b)), var(--img) center 28% / cover no-repeat; }
  .no { font: 500 0.8rem var(--font-mono); color: var(--accent-2); letter-spacing: 0.2em; }
  .soon { position: absolute; top: 0.9rem; right: 1rem; }
</style>
