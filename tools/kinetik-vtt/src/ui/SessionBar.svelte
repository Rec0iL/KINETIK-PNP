<script lang="ts">
  import { player, leaveRound } from '../net/player.svelte';
  import { gm } from '../net/gm.svelte';
  import { router } from '../lib/router.svelte';
  import { formatCode } from '../net/protocol';
  import { t } from '../i18n';

  const playerOn = $derived(player.status === 'connected' || player.status === 'reconnecting' || player.status === 'pending');
  const gmOn = $derived(gm.status === 'open');
</script>

{#if playerOn}
  <div class="bar" class:warn={player.status !== 'connected'}>
    <span class="dot"></span>
    <span class="txt">
      {#if player.status === 'connected'}{t('ui.sessionBar.roundOf')} <b>{player.gmName}</b>
      {:else if player.status === 'pending'}{t('ui.sessionBar.waitingForGm')}
      {:else}{t('ui.sessionBar.reconnecting')}{/if}
    </span>
    {#if player.status === 'connected' && player.latency}<span class="dim mono">{player.latency} ms</span>{/if}
    <span class="spacer"></span>
    {#if router.route.name !== 'round'}<a class="btn sm" href="#/runde">{t('ui.sessionBar.toRound')}</a>{/if}
    <button class="btn sm ghost" onclick={() => confirm(t('ui.sessionBar.leaveConfirm')) && leaveRound()}>{t('ui.sessionBar.leave')}</button>
  </div>
{:else if gmOn && router.route.name !== 'gm'}
  <div class="bar gm">
    <span class="dot"></span>
    <span class="txt">{t('ui.sessionBar.hosting')} <b class="mono">{formatCode(gm.session?.code ?? '')}</b></span>
    <span class="spacer"></span>
    <a class="btn sm" href="#/sl">{t('ui.sessionBar.toDashboard')}</a>
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
