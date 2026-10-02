<script lang="ts">
  import { toasts, dismissToast } from './toasts.svelte';
</script>

<div class="toasts" aria-live="polite">
  {#each toasts.list as t (t.id)}
    <div class="t {t.kind}" role="status">
      <span>{t.text}</span>
      <button onclick={() => dismissToast(t.id)} aria-label="Schließen">✕</button>
    </div>
  {/each}
</div>

<style>
  .toasts { position: fixed; top: 64px; right: 16px; z-index: 300; display: grid; gap: 8px; width: min(380px, calc(100vw - 32px)); pointer-events: none; }
  .t { pointer-events: auto; display: flex; gap: 0.6rem; align-items: start; padding: 0.7rem 0.9rem; background: var(--panel-solid); border: 1px solid var(--line-strong); border-left: 4px solid var(--accent); box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5); animation: in 0.25s ease-out; }
  .t.warn { border-left-color: var(--warn); }
  .t.good { border-left-color: var(--ok); }
  .t.danger { border-left-color: var(--danger); }
  .t span { flex: 1; }
  .t button { background: none; border: 0; color: var(--ink-dim); cursor: pointer; }
  @keyframes in { from { transform: translateX(30px); opacity: 0; } }
</style>
