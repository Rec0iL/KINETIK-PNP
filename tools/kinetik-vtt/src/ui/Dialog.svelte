<script lang="ts">
  import type { Snippet } from 'svelte';
  let { open = $bindable(false), title, children, wide = false }: { open: boolean; title: string; children: Snippet; wide?: boolean } = $props();
  let el = $state<HTMLDialogElement>();

  $effect(() => {
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  });
</script>

<dialog bind:this={el} class:wide onclose={() => (open = false)} onclick={(e) => { if (e.target === el) open = false; }}>
  <div class="panel flat inner">
    <div class="row head">
      <h2>{title}</h2>
      <span class="spacer"></span>
      <button type="button" class="btn sm icon ghost" onclick={() => (open = false)} aria-label="Schließen">✕</button>
    </div>
    {@render children()}
  </div>
</dialog>

<style>
  dialog { border: 0; padding: 0; background: transparent; color: var(--ink); max-width: min(560px, 94vw); width: 100%; margin: auto; }
  dialog.wide { max-width: min(900px, 96vw); }
  dialog::backdrop { background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(3px); }
  .inner { background: var(--panel-solid); border: 1px solid var(--accent-line); box-shadow: var(--glow); max-height: 90vh; overflow: auto; }
  .head { margin-bottom: 0.8rem; }
</style>
