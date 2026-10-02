<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { rulebook, closeRulebook, rbUrl, plainText, type RbChapter } from './rulebook.svelte';

  let scroller = $state<HTMLDivElement>();
  let query = $state('');
  let navOpen = $state(false);

  const data = $derived(rulebook.data);
  const q = $derived(query.trim().toLowerCase());

  interface Hit { id: string; chapter: string; title: string; snippet: string }
  // Index einmal bauen, wenn die Daten da sind.
  const index = $derived.by(() => {
    if (!data) return [] as { id: string; chapter: string; title: string; text: string }[];
    return data.chapters.flatMap((c) => [
      { id: c.id, chapter: chapterLabel(c), title: chapterLabel(c), text: plainText(c.html) },
      ...c.sections.map((s) => ({ id: s.id, chapter: chapterLabel(c), title: s.title, text: plainText(s.html) })),
    ]);
  });
  const hits = $derived.by<Hit[]>(() => {
    if (q.length < 2) return [];
    const out: Hit[] = [];
    for (const e of index) {
      const t = e.text.toLowerCase();
      const i = t.indexOf(q);
      const inTitle = e.title.toLowerCase().includes(q);
      if (i < 0 && !inTitle) continue;
      const from = Math.max(0, i - 50);
      out.push({ id: e.id, chapter: e.chapter, title: e.title, snippet: i < 0 ? '' : (from ? '…' : '') + e.text.slice(from, i + q.length + 90) + '…' });
      if (out.length >= 30) break;
    }
    return out;
  });

  function chapterLabel(c: RbChapter) {
    return c.number ? `${c.number}. ${c.title}` : c.title;
  }

  async function goTo(id: string) {
    query = '';
    navOpen = false;
    await tick();
    const el = scroller?.querySelector<HTMLElement>(`[id="rb-${id}"]`);
    if (el && scroller) {
      const top = el.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
      scroller.scrollTop = top - 8;
    }
  }

  // Sprung von außen (z.B. aus dem Charakter-Assistenten)
  $effect(() => {
    rulebook.jump;
    const t = untrack(() => rulebook.target);
    if (!t || !data) return;
    untrack(() => { void tick().then(() => setTimeout(() => goTo(t), 60)); });
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && rulebook.open) closeRulebook();
  }
  const showCover = $derived(!!data?.cover);
</script>

<svelte:window onkeydown={onKey} />

{#if rulebook.open}
  <button class="scrim" onclick={closeRulebook} aria-label="Regelwerk schließen" tabindex="-1"></button>
{/if}

<aside class="rb" class:open={rulebook.open} class:wide={rulebook.wide} aria-label="Regelwerk" aria-hidden={!rulebook.open}>
  <header>
    <div class="titlebar">
      {#if data?.pdf}
        <a class="dl" href={rbUrl(data.pdf)} download={`KINETIK_Regelwerk_v${data.version}.pdf`} title="Regelwerk als PDF herunterladen">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <b>Regelwerk</b><small>v{data.version}</small>
          <span class="sr-only">als PDF herunterladen</span>
        </a>
      {:else}
        <b>Regelwerk</b>{#if data}<small class="dim">v{data.version}</small>{/if}
      {/if}
      <span class="spacer"></span>
      <button class="btn sm icon ghost" onclick={() => (navOpen = !navOpen)} aria-expanded={navOpen} aria-label="Inhaltsverzeichnis" title="Inhaltsverzeichnis">☰</button>
      <button class="btn sm icon ghost" onclick={() => (rulebook.wide = !rulebook.wide)} aria-label={rulebook.wide ? 'Schmaler' : 'Breiter'} title={rulebook.wide ? 'Schmaler' : 'Breiter'}>{rulebook.wide ? '⇥' : '⇤'}</button>
      <button class="btn sm icon ghost" onclick={closeRulebook} aria-label="Schließen">✕</button>
    </div>
    <input type="search" bind:value={query} placeholder="Suchen … (z.B. Dominanz, Schutz, MW)" aria-label="Im Regelwerk suchen" />
  </header>

  <div class="body" bind:this={scroller}>
    {#if rulebook.loading && !data}<p class="dim pad">Lädt …</p>{/if}
    {#if rulebook.error}<p class="err pad">{rulebook.error}</p>{/if}

    {#if q.length >= 2}
      <div class="pad results">
        <h3>{hits.length} Treffer</h3>
        {#each hits as h (h.id)}
          <button class="hit" onclick={() => goTo(h.id)}><b>{h.title}</b>{#if h.snippet}<small class="dim">{h.snippet}</small>{/if}</button>
        {:else}
          <p class="dim">Nichts gefunden.</p>
        {/each}
      </div>
    {:else if data}
      {#if navOpen}
        <nav class="toc pad" aria-label="Inhalt">
          {#each data.chapters as c (c.id)}
            <button class="ch" onclick={() => goTo(c.id)}>{chapterLabel(c)}</button>
            {#each c.sections as s (s.id)}<button class="sc" onclick={() => goTo(s.id)}>{s.title}</button>{/each}
          {/each}
        </nav>
      {/if}

      {#if showCover}
        <div class="cover" style:--img="url({rbUrl(data.cover!)})">
          <span class="kicker">Cinematic Action Roleplaying</span>
          <h1>KINETIK</h1>
          <div class="rbcontent">{@html data.intro}</div>
          {#if data.pdf}<a class="btn sm" href={rbUrl(data.pdf)} download>PDF herunterladen</a>{/if}
        </div>
      {/if}

      {#each data.chapters as c (c.id)}
        <article class="chapter" id={`rb-${c.id}`}>
          <div class="banner" style:--img={c.image ? `url(${rbUrl(c.image)})` : 'none'}>
            {#if c.number}<span class="no">Kapitel {c.number}</span>{:else if c.appendix}<span class="no">Anhang</span>{/if}
            <h2>{c.title}</h2>
            {#if c.subtitle}<span class="sub">{c.subtitle}</span>{/if}
          </div>
          <div class="rbcontent pad">
            {@html c.html}
            {#if c.fill && !c.sections.length}<img class="fill" src={rbUrl(c.fill)} alt="" loading="lazy" />{/if}
          </div>
          {#each c.sections as s (s.id)}
            <section class="sec" id={`rb-${s.id}`}>
              {#if s.image}<img class="secimg" src={rbUrl(s.image)} alt="" loading="lazy" />{/if}
              <h3>{s.title}</h3>
              <div class="rbcontent">{@html s.html}</div>
              {#if s.fill}<img class="fill" src={rbUrl(s.fill)} alt="" loading="lazy" />{/if}
            </section>
          {/each}
        </article>
      {/each}
    {/if}
  </div>
</aside>

<style>
  .scrim { position: fixed; inset: 0; z-index: 240; background: rgba(0, 0, 0, 0.45); border: 0; cursor: default; animation: fade 0.2s; }
  @keyframes fade { from { opacity: 0; } }
  .rb {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 250; width: min(560px, 100vw); display: flex; flex-direction: column;
    background: color-mix(in srgb, var(--bg) 94%, #000); border-left: 1px solid var(--accent-line); box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
    transform: translateX(105%); transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1), width 0.25s; visibility: hidden;
  }
  .rb.open { transform: none; visibility: visible; }
  .rb.wide { width: min(980px, 100vw); }
  header { padding: 0.6rem 0.8rem; border-bottom: 1px solid var(--line); background: var(--panel-solid); display: grid; gap: 0.5rem; }
  .titlebar { display: flex; align-items: center; gap: 0.3rem; }
  .titlebar b { font: 400 1.6rem var(--font-display); letter-spacing: 0.1em; color: var(--accent); }
  .dl { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--accent); text-decoration: none; padding: 0.15rem 0.5rem 0.15rem 0.3rem; margin-left: -0.3rem; border: 1px solid transparent; transition: background 0.15s, border-color 0.15s; }
  .dl:hover { background: var(--accent-soft); border-color: var(--accent-line); text-decoration: none; }
  .dl small { color: var(--ink-dim); font-size: 0.8rem; }
  .dl svg { flex: none; }
  .body { flex: 1; overflow-y: auto; overscroll-behavior: contain; }
  .pad { padding: 1rem 1.2rem; }
  .err { color: var(--danger); }

  .cover { padding: 2.5rem 1.4rem 1.4rem; background: linear-gradient(to top, var(--bg), rgba(8, 10, 14, 0.55)), var(--img) center / cover; display: grid; gap: 0.6rem; justify-items: start; }
  .cover h1 { font-size: 4.5rem; }

  .banner { position: relative; padding: 3.6rem 1.4rem 1rem; background: linear-gradient(to top, var(--bg) 6%, rgba(8, 10, 14, 0.25) 70%), var(--img) center / cover, var(--bg-2); border-top: 2px solid var(--accent); }
  .banner .no { font: 600 0.8rem var(--font-head); letter-spacing: 0.3em; text-transform: uppercase; color: var(--accent-2); }
  .banner h2 { font-family: var(--font-display); font-weight: 400; font-size: 2.8rem; letter-spacing: 0.06em; line-height: 1; text-shadow: var(--hard-shadow); margin-top: 0.2rem; }
  .banner .sub { color: var(--ink-dim); font-size: 0.95rem; }
  .sec { padding: 0.4rem 1.2rem 1.2rem; }
  .sec h3 { font-size: 1.3rem; margin: 1rem 0 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--accent-line); }
  .secimg, .fill { width: 100%; max-height: 220px; object-fit: cover; display: block; margin: 0.6rem 0; border: 1px solid var(--line); }
  .fill { max-height: 180px; opacity: 0.9; }

  .toc { display: grid; gap: 2px; border-bottom: 1px solid var(--line); background: var(--panel-solid); }
  .toc button { text-align: left; background: none; border: 0; color: var(--ink); font: inherit; cursor: pointer; padding: 0.3em 0.4em; }
  .toc button:hover { background: var(--accent-soft); color: var(--accent); }
  .toc .ch { font: 600 0.95rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 0.5rem; color: var(--accent-2); }
  .toc .sc { padding-left: 1.2em; color: var(--ink-dim); font-size: 0.92rem; }

  .results .hit { display: grid; gap: 2px; width: 100%; text-align: left; padding: 0.55rem 0.6rem; margin-bottom: 4px; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent); color: var(--ink); cursor: pointer; font: inherit; }
  .results .hit:hover { border-color: var(--accent); }

  /* Inhalt im Stil des PDFs */
  .rbcontent { font-size: 0.97rem; line-height: 1.55; }
  .rbcontent :global(p) { margin: 0 0 0.7em; }
  .rbcontent :global(h4), .rbcontent :global(h5) { font-size: 1.05rem; color: var(--accent); margin: 1rem 0 0.4rem; }
  .rbcontent :global(strong) { color: var(--ink-strong); }
  .rbcontent :global(em) { color: #d7dce4; }
  .rbcontent :global(ul), .rbcontent :global(ol) { padding-left: 1.3em; margin: 0 0 0.8em; }
  .rbcontent :global(li) { margin: 0.2em 0; }
  .rbcontent :global(hr) { border: 0; border-top: 1px solid var(--line); margin: 1rem 0; }
  .rbcontent :global(blockquote) { margin: 0.8em 0; padding: 0.2em 0.9em; border-left: 3px solid var(--accent-2); color: var(--ink-dim); }
  .rbcontent :global(code) { font-family: var(--font-mono); font-size: 0.9em; background: var(--raised); padding: 0 0.3em; }
  .rbcontent :global(.tablewrap) { overflow-x: auto; margin: 0.8em 0; }
  .rbcontent :global(table) { width: 100%; border-collapse: collapse; border-top: 2px solid var(--accent); font-size: 0.9rem; }
  .rbcontent :global(th) { font: 600 0.78rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); text-align: left; padding: 0.45em 0.6em; border-bottom: 1px solid var(--accent-line); }
  .rbcontent :global(td) { padding: 0.45em 0.6em; border-bottom: 1px solid var(--line); vertical-align: top; }
  .rbcontent :global(tr:nth-child(even) td) { background: rgba(255, 255, 255, 0.025); }
  .rbcontent :global(figure) { margin: 1rem 0; }
  .rbcontent :global(figure img) { max-width: 100%; display: block; margin: 0 auto; }
  .rbcontent :global(figcaption) { text-align: center; font-size: 0.8rem; color: var(--ink-dim); margin-top: 0.3rem; }
  .rbcontent :global(a) { color: var(--accent); }
  @media (prefers-reduced-motion: reduce) { .rb { transition: none; } }
</style>
