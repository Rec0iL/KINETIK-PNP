<script lang="ts">
  import { gm, approve, deny, kick, removePlayer, setPlayerShare, sendToast, partyFor, updateLocalCharacter } from '../net/gm.svelte';
  import type { Visibility } from '../net/protocol';
  import PartyCard from '../ui/PartyCard.svelte';
  import QuickActions from './QuickActions.svelte';
  import SheetViewer from '../sheet/SheetViewer.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import { t } from '../i18n';

  let viewId = $state<string | null>(null);
  let actionsId = $state<string | null>(null);
  let toastText = $state('');
  let viewOpen = $state(false);

  const infos = $derived(gm.session ? partyFor(null) : []);
  const viewPlayer = $derived(gm.session?.players.find((p) => p.id === viewId));
  const shareLabel: Record<string, string> = {
    '': t('gm.players.shareDefault'), party: t('gm.visibility.party'), private: t('gm.visibility.private'), open: t('gm.visibility.open'),
  };

  function openSheet(id: string) { viewId = id; viewOpen = true; }
</script>

{#if gm.pending.length}
  <section class="panel pending">
    <h2>{t('gm.players.requests')}</h2>
    {#each gm.pending as p (p.id)}
      <div class="row">
        <b>{p.name}</b><span class="spacer"></span>
        <button class="btn sm primary" onclick={() => approve(p.id)}>{t('gm.players.approve')}</button>
        <button class="btn sm danger" onclick={() => deny(p.id)}>{t('gm.players.deny')}</button>
      </div>
    {/each}
  </section>
{/if}

<div class="grid cards">
  {#each infos as p (p.id)}
    {@const gp = gm.session!.players.find((x) => x.id === p.id)!}
    <PartyCard {p} onopen={gp.character ? () => openSheet(p.id) : undefined}>
      {#if actionsId === p.id}
        <QuickActions playerId={p.id} onlocal={() => updateLocalCharacter(p.id)} />
      {/if}
      <div class="row acts">
        <button class="btn sm" class:primary={actionsId === p.id} onclick={() => (actionsId = actionsId === p.id ? null : p.id)} disabled={!gp.character}>{t('gm.players.quickActions')}</button>
        <select value={gp.share ?? ''} onchange={(e) => setPlayerShare(p.id, (e.currentTarget.value || undefined) as Visibility | undefined)} title={t('gm.players.shareTitle')} aria-label={t('gm.players.visibility')}>
          {#each Object.entries(shareLabel) as [k, l]}<option value={k}>{k ? t('gm.players.visibleAs', { label: l }) : l}</option>{/each}
        </select>
        <span class="spacer"></span>
        {#if gp.local}<button class="btn sm danger icon" onclick={() => confirm(t('gm.players.confirmRemoveLocal')) && removePlayer(p.id)} aria-label={t('gm.common.remove')}>🗑</button>
        {:else}<button class="btn sm danger" onclick={() => confirm(t('gm.players.confirmKick', { name: p.name })) && kick(p.id)}>{t('gm.common.remove')}</button>{/if}
      </div>
      {#if !gp.local && p.connected}
        <div class="row">
          <input bind:value={toastText} placeholder={t('gm.players.messagePlaceholder')} aria-label={t('gm.players.message')} onkeydown={(e) => { if (e.key === 'Enter' && toastText.trim()) { sendToast(p.id, toastText.trim()); toastText = ''; } }} />
          <button class="btn sm" onclick={() => { if (toastText.trim()) { sendToast(p.id, toastText.trim()); toastText = ''; } }}>{t('gm.common.send')}</button>
        </div>
      {/if}
    </PartyCard>
  {:else}
    <p class="dim empty">{t('gm.players.empty')}</p>
  {/each}
</div>

<Dialog bind:open={viewOpen} title={viewPlayer?.character?.name ?? t('gm.players.sheet')} wide>
  {#if viewPlayer?.character}
    <SheetViewer char={viewPlayer.character} editable={!!viewPlayer.local} />
    {#if !viewPlayer.local}<p class="dim">{t('gm.players.remoteHint')}</p>{/if}
  {/if}
</Dialog>

<style>
  .pending { border-color: var(--accent-2); margin-bottom: 1rem; }
  .cards { grid-template-columns: repeat(auto-fill, minmax(min(340px, 100%), 1fr)); }
  .acts { margin-top: 0.3rem; flex-wrap: wrap; }
  .acts select { width: auto; min-height: 30px; padding: 0.2em 0.4em; font-size: 0.85rem; }
  .row input { min-height: 30px; padding: 0.2em 0.5em; }
  .empty { grid-column: 1 / -1; }
</style>
