<script lang="ts">
  import { player, leaveRound } from '../net/player.svelte';
  import { gm } from '../net/gm.svelte';
  import { router } from '../lib/router.svelte';
  import { formatCode } from '../net/protocol';

  const playerOn = $derived(player.status === 'connected' || player.status === 'reconnecting' || player.status === 'pending');
  const gmOn = $derived(gm.status === 'open');
</script>

{#if playerOn}
  <div class="bar" class:warn={player.status !== 'connected'}>
    <span class="dot"></span>
    <span class="txt">
      {#if player.status === 'connected'}Runde von <b>{player.gmName}</b>
      {:else if player.status === 'pending'}Warte auf SL …
      {:else}Verbindung wird wiederhergestellt …{/if}
    </span>
    {#if player.status === 'connected' && player.latency}<span class="dim mono">{player.latency} ms</span>{/if}
    <span class="spacer"></span>
    {#if router.route.name !== 'round'}<a class="btn sm" href="#/runde">Zur Runde</a>{/if}
    <button class="btn sm ghost" onclick={() => confirm('Runde verlassen?') && leaveRound()}>Verlassen</button>
  </div>
{:else if gmOn && router.route.name !== 'gm'}
  <div class="bar gm">
    <span class="dot"></span>
    <span class="txt">Du hostest eine Runde <b class="mono">{formatCode(gm.session?.code ?? '')}</b></span>
    <span class="spacer"></span>
    <a class="btn sm" href="#/sl">Zum SL-Dashboard</a>
  </div>
{/if}

<style>
  .bar { display: flex; align-items: center; gap: 0.7rem; padding: 0.35rem max(16px, 3vw); background: var(--accent-soft); border-bottom: 1px solid var(--accent-line); font-size: 0.9rem; }
  .bar.warn { background: var(--accent-2-soft); border-color: var(--accent-2); }
  .bar.gm { background: var(--accent-2-soft); border-color: var(--accent-2); }
  .dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 8px var(--ok); animation: blink 2s infinite; }
  .warn .dot { background: var(--accent-2); box-shadow: 0 0 8px var(--accent-2); }
  @keyframes blink { 50% { opacity: 0.4; } }
  .mono { font-family: var(--font-mono); }
</style>
