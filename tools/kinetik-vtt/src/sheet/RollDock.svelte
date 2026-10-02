<script lang="ts">
  import type { Character } from '../model/character';
  import { rollLog } from '../dice/roller.svelte';
  import RollPanel from './RollPanel.svelte';

  let { char }: { char: Character } = $props();

  const KEY = 'kinetik.rolldock';
  interface Saved { open: boolean; x: number | null; y: number | null }
  function load(): Saved {
    try { return { open: false, x: null, y: null, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { open: false, x: null, y: null }; }
  }
  const saved = load();
  let open = $state(saved.open);
  let x = $state<number | null>(saved.x);
  let y = $state<number | null>(saved.y);
  let box = $state<HTMLDivElement>();

  $effect(() => {
    const snap = { open, x, y };
    try { localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* ignorieren */ }
  });

  const last = $derived(rollLog.entries[0]);

  // Verschieben am Kopf: Position in Pixeln, innerhalb des Fensters gehalten.
  let drag: { dx: number; dy: number } | null = null;
  function clamp() {
    if (!box || x === null || y === null) return;
    const r = box.getBoundingClientRect();
    x = Math.max(8, Math.min(window.innerWidth - r.width - 8, x));
    y = Math.max(8, Math.min(window.innerHeight - Math.min(r.height, 60) - 8, y));
  }
  function down(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    const r = box!.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    x = e.clientX - drag.dx;
    y = e.clientY - drag.dy;
    clamp();
  }
  const up = () => { drag = null; };
  const reset = () => { x = null; y = null; };

  const style = $derived(x !== null && y !== null ? `left:${x}px;top:${y}px;right:auto;bottom:auto;` : '');
</script>

<svelte:window onresize={clamp} />

<div class="dock" class:open bind:this={box} {style}>
  {#if open}
    <div class="head" onpointerdown={down} onpointermove={move} onpointerup={up} onpointercancel={up} role="toolbar" tabindex="-1" aria-label="Würfel-Fenster, am Kopf verschiebbar">
      <span class="grip" aria-hidden="true">⠿</span>
      <b>Würfeln</b>
      <span class="spacer"></span>
      {#if x !== null}<button class="btn sm icon ghost" onclick={reset} title="Zurück an die Ecke" aria-label="Position zurücksetzen">⌖</button>{/if}
      <button class="btn sm icon ghost" onclick={() => (open = false)} aria-label="Würfel-Fenster einklappen" title="Einklappen">▾</button>
    </div>
    <div class="body"><RollPanel {char} /></div>
  {:else}
    <button class="pill" onclick={() => (open = true)} aria-expanded="false" title="Würfel öffnen">
      <span class="die" aria-hidden="true">⚄</span>
      <span class="lbl">Würfeln</span>
      {#if last}<span class="tot">{last.total}</span>{/if}
    </button>
  {/if}
</div>

<style>
  .dock { position: fixed; right: 16px; bottom: 16px; z-index: 120; }
  .pill {
    display: inline-flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1.1rem; cursor: pointer;
    background: var(--accent); color: var(--accent-ink); border: 1px solid var(--accent); box-shadow: var(--hard-shadow), var(--glow);
    font: 600 1rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase;
    clip-path: polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%);
    transition: transform 0.12s, filter 0.15s;
  }
  .pill:hover { transform: translateY(-2px); filter: brightness(1.1); }
  .die { font-size: 1.5rem; line-height: 1; }
  .tot { font: 400 1.5rem/1 var(--font-display); background: var(--accent-ink); color: var(--accent-2); padding: 0.1em 0.45em; }
  .open { width: min(480px, calc(100vw - 16px)); display: grid; grid-template-rows: auto 1fr; max-height: min(78vh, 760px); background: var(--panel-solid); border: 1px solid var(--accent-line); box-shadow: 0 10px 40px rgba(0, 0, 0, 0.65), var(--glow); }
  .head { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem 0.35rem 0.7rem; background: var(--accent-soft); border-bottom: 1px solid var(--accent-line); cursor: grab; touch-action: none; user-select: none; }
  .head:active { cursor: grabbing; }
  .head b { font: 400 1.4rem var(--font-display); letter-spacing: 0.1em; color: var(--accent); }
  .grip { color: var(--ink-dim); }
  .body { overflow-y: auto; overscroll-behavior: contain; padding: 0.5rem; }
  .body :global(.stack) { gap: 0.6rem; }
  .body :global(.log) { max-height: 260px; }
  @media (max-width: 640px) { .dock.open { left: 8px !important; right: 8px !important; top: auto !important; bottom: 8px !important; width: auto; } }
</style>
