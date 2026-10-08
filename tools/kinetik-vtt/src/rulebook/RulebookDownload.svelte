<script lang="ts">
  // Download des Regelwerks als PDF: Auswahl des Looks in einem Aufklappmenü. Dasselbe Regelwerk, nur anders gestaltet.
  // Das Menü ist ein Popover (liegt im Top-Layer): so wird es weder von Karten mit abgeschnittenen Ecken noch vom
  // scrollenden Regelwerk-Panel beschnitten, schließt bei Klick daneben und mit Escape von selbst.
  import { rulebook, rbPdfs, loadRulebook } from './rulebook.svelte';
  import { t } from '../i18n';

  /** drawer: kompakter Titel mit Pfeil (Kopfleiste des Regelwerks), button: normale Schaltfläche (Startseite) */
  let { variant = 'button', label = 'PDF herunterladen' }: { variant?: 'drawer' | 'button'; label?: string } = $props();

  const pdfs = $derived(rbPdfs());
  const version = $derived(rulebook.data?.version ?? '');
  let pop = $state<HTMLElement>();
  let trigger = $state<HTMLElement>();
  let open = $state(false);
  const fmtSize = (b: number) => `${(b / 1048576).toFixed(1).replace('.', ',')} MB`;

  // Die Liste der PDFs steht in rulebook.json. Das Regelwerk lädt sonst erst, wenn es geöffnet wird: nur die Startseite braucht
  // die Liste sofort, die Kopfleiste im Regelwerk erst, wenn es offen ist (dann ist es ohnehin geladen).
  $effect(() => { if (variant === 'button') void loadRulebook(); });

  function toggle() {
    if (!pop || !trigger) return;
    if (open) { pop.hidePopover(); return; }
    // Position unter dem Auslöser, im Fenster gehalten
    const r = trigger.getBoundingClientRect();
    const w = Math.min(340, innerWidth - 24);
    pop.style.width = `${w}px`;
    pop.style.left = `${Math.max(12, Math.min(r.left, innerWidth - w - 12))}px`;
    const below = innerHeight - r.bottom;
    pop.style.top = below > 360 || below > r.top ? `${r.bottom + 6}px` : 'auto';
    pop.style.bottom = below > 360 || below > r.top ? 'auto' : `${innerHeight - r.top + 6}px`;
    pop.showPopover();
  }
</script>

<div class="dlmenu {variant}">
  {#if pdfs.length > 1}
    <button bind:this={trigger} type="button" class={variant === 'drawer' ? 'dl' : 'btn'} aria-haspopup="menu" aria-expanded={open} onclick={toggle} title="Regelwerk als PDF herunterladen, Look wählen">
      <svg viewBox="0 0 24 24" width={variant === 'drawer' ? 22 : 18} height={variant === 'drawer' ? 22 : 18} aria-hidden="true"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {#if variant === 'drawer'}<b>Regelwerk</b><small>v{version}</small>{:else}<span>{label}</span>{/if}
      <span class="caret" aria-hidden="true">▾</span>
      <span class="sr-only">Look wählen</span>
    </button>
    <div bind:this={pop} class="dlpop" popover="auto" role="menu" aria-label="Regelwerk als PDF herunterladen, Look wählen" ontoggle={(e) => (open = (e as ToggleEvent).newState === 'open')}>
      <p class="dlhead">PDF · Look wählen</p>
      <p class="dlnote">Es ist immer dasselbe Regelwerk (v{version}). Nur Gestaltung, Schrift und Bilder unterscheiden sich.</p>
      {#each pdfs as p (p.key)}
        <a role="menuitem" class="dlitem" class:cur={p.current} href={p.href} download={p.filename} onclick={() => pop?.hidePopover()}>
          <span class="nm">{t(`theme.${p.key}`)}{#if p.key === 'noir'}<small>Standard</small>{/if}</span>
          <span class="meta">{#if p.current}<em>aktiv</em>{/if}{#if p.size}<span>{fmtSize(p.size)}</span>{/if}</span>
        </a>
      {/each}
    </div>
  {:else if pdfs.length === 1}
    <a class={variant === 'drawer' ? 'dl' : 'btn'} href={pdfs[0].href} download={pdfs[0].filename} title="Regelwerk als PDF herunterladen">
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      {#if variant === 'drawer'}<b>Regelwerk</b><small>v{version}</small>{:else}<span>{label}</span>{/if}
    </a>
  {:else if variant === 'drawer'}
    <b class="plain">Regelwerk</b>{#if version}<small class="dim">v{version}</small>{/if}
  {/if}
</div>

<style>
  .dlmenu { position: relative; display: inline-flex; }
  .caret { font-size: 0.8em; opacity: 0.8; transition: transform 0.15s; }
  [aria-expanded='true'] .caret { transform: rotate(180deg); }

  /* Variante Kopfleiste des Regelwerks */
  .drawer .plain { font: 400 1.6rem var(--font-display); letter-spacing: 0.1em; color: var(--accent); }
  .dl { appearance: none; background: none; font: inherit; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5rem; color: var(--accent); text-decoration: none; padding: 0.15rem 0.5rem 0.15rem 0.3rem; margin-left: -0.3rem; border: 1px solid transparent; transition: background 0.15s, border-color 0.15s; }
  .dl:hover, .dl[aria-expanded='true'] { background: var(--accent-soft); border-color: var(--accent-line); text-decoration: none; }
  .dl b { font: 400 1.6rem var(--font-display); letter-spacing: 0.1em; color: var(--accent); }
  .dl small { color: var(--ink-dim); font-size: 0.8rem; }
  .dl svg { flex: none; }

  /* Variante Schaltfläche (Startseite) */
  .button .btn { gap: 0.55em; }

  /* Menü */
  .dlpop { position: fixed; inset: auto; margin: 0; padding: 0.35rem; color: var(--ink); background: var(--panel-solid); border: 1px solid var(--accent-line); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.5); max-height: calc(100vh - 24px); overflow-y: auto; }
  .dlpop:popover-open { display: grid; gap: 2px; animation: pop 0.14s ease-out; }
  @keyframes pop { from { opacity: 0; transform: translateY(-4px); } }
  .dlhead { margin: 0; padding: 0.35rem 0.6rem 0.25rem; font: 600 0.72rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .dlnote { margin: 0 0 0.2rem; padding: 0 0.6rem 0.5rem; font-size: 0.8rem; line-height: 1.35; color: var(--ink-dim); border-bottom: 1px solid var(--line); }
  .dlitem { display: flex; justify-content: space-between; align-items: baseline; gap: 0.8rem; padding: 0.5rem 0.6rem; color: var(--ink); text-decoration: none; border-left: 3px solid transparent; }
  .dlitem:hover { background: var(--accent-soft); color: var(--accent); text-decoration: none; }
  .dlitem.cur { border-left-color: var(--accent); background: var(--accent-soft); }
  .dlitem .nm { font: 600 0.95rem var(--font-head); letter-spacing: 0.06em; }
  .dlitem .nm small { margin-left: 0.6em; font: 400 0.75rem var(--font-body); letter-spacing: 0; color: var(--ink-dim); }
  .dlitem .meta { display: inline-flex; gap: 0.6rem; align-items: baseline; font-size: 0.78rem; color: var(--ink-dim); white-space: nowrap; }
  .dlitem .meta em { font-style: normal; font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
</style>
