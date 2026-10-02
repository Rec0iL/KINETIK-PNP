<script lang="ts">
  import { rollLog } from '../dice/roller.svelte';
  import RollSummary from './RollSummary.svelte';
  import { router } from '../lib/router.svelte';

  let shownId = $state('');
  let visible = $state(false);
  let timer: ReturnType<typeof setTimeout>;
  let initial = true;

  const latest = $derived(rollLog.entries[0]);

  $effect(() => {
    const r = latest;
    if (!r) return;
    if (initial) { initial = false; shownId = r.id; return; }
    if (r.id === shownId) return;
    shownId = r.id;
    // Auf der Würfel-Seite zeigt das Panel das Ergebnis selbst.
    visible = true;
    clearTimeout(timer);
    timer = setTimeout(() => (visible = false), 6000);
  });
</script>

{#if visible && latest && router.route.name !== 'dice'}
  {#key latest.id}
    <div class="toast panel" role="status">
      <button class="x btn sm icon ghost" onclick={() => (visible = false)} aria-label="Schließen">✕</button>
      <RollSummary r={latest} size={44} />
    </div>
  {/key}
{/if}

<style>
  .toast { position: fixed; right: 16px; bottom: 16px; z-index: 200; max-width: min(520px, calc(100vw - 32px)); background: var(--panel-solid); border-color: var(--accent); box-shadow: var(--glow); animation: in 0.25s ease-out; }
  .x { position: absolute; top: 2px; right: 2px; }
  @keyframes in { from { transform: translateY(20px); opacity: 0; } }
</style>
