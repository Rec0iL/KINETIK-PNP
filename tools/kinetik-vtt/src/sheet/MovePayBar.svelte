<script lang="ts">
  import { costLabel } from '../rules';
  import type { Character, Move } from '../model/character';
  import { affordability, confirmPending, dismissPending, pendingFor } from './moveUse.svelte';
  import { t } from '../i18n';

  let { char, move }: { char: Character; move: Move } = $props();
  const p = $derived(pendingFor(char, move));
  const a = $derived(affordability(char, move));
</script>

{#if p}
  <div class="pay" role="status">
    <span>{t('sheet.pay.roll')} <b>{p.total}</b>{t('sheet.pay.payNow')}</span>
    <b class="cost">{costLabel(a)}</b>
    <span class="spacer"></span>
    <button class="btn sm primary" onclick={() => confirmPending(char, move)} disabled={!a.ok} title={a.ok ? '' : a.reason}>{t('sheet.pay.confirm')}</button>
    <button class="btn sm" onclick={dismissPending}>{t('sheet.pay.dismiss')}</button>
  </div>
{/if}

<style>
  .pay { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin: 0.3rem 0 0.5rem; padding: 0.5rem 0.7rem; background: var(--accent-2-soft); border-left: 3px solid var(--accent-2); font-size: 0.92rem; }
  .cost { font: 400 1.3rem var(--font-display); letter-spacing: 0.05em; color: var(--accent); }
</style>
