<script lang="ts">
  import { gm, approve, deny, kick, removePlayer, setPlayerShare, sendToast, partyFor, updateLocalCharacter } from '../net/gm.svelte';
  import type { Visibility } from '../net/protocol';
  import PartyCard from '../ui/PartyCard.svelte';
  import QuickActions from './QuickActions.svelte';
  import SheetViewer from '../sheet/SheetViewer.svelte';
  import Dialog from '../ui/Dialog.svelte';

  let viewId = $state<string | null>(null);
  let actionsId = $state<string | null>(null);
  let toastText = $state('');
  let viewOpen = $state(false);

  const infos = $derived(gm.session ? partyFor(null) : []);
  const viewPlayer = $derived(gm.session?.players.find((p) => p.id === viewId));
  const shareLabel: Record<string, string> = { '': 'Standard der Runde', party: 'Gruppenleiste', private: 'Privat', open: 'Offen' };

  function openSheet(id: string) { viewId = id; viewOpen = true; }
</script>

{#if gm.pending.length}
  <section class="panel pending">
    <h2>Beitrittsanfragen</h2>
    {#each gm.pending as p (p.id)}
      <div class="row">
        <b>{p.name}</b><span class="spacer"></span>
        <button class="btn sm primary" onclick={() => approve(p.id)}>Annehmen</button>
        <button class="btn sm danger" onclick={() => deny(p.id)}>Ablehnen</button>
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
        <button class="btn sm" class:primary={actionsId === p.id} onclick={() => (actionsId = actionsId === p.id ? null : p.id)} disabled={!gp.character}>Schnell-Aktionen</button>
        <select value={gp.share ?? ''} onchange={(e) => setPlayerShare(p.id, (e.currentTarget.value || undefined) as Visibility | undefined)} title="Wie sehen andere Spieler diesen Bogen?" aria-label="Sichtbarkeit">
          {#each Object.entries(shareLabel) as [k, l]}<option value={k}>{k ? `Sichtbar: ${l}` : l}</option>{/each}
        </select>
        <span class="spacer"></span>
        {#if gp.local}<button class="btn sm danger icon" onclick={() => confirm('Lokalen Spieler entfernen?') && removePlayer(p.id)} aria-label="Entfernen">🗑</button>
        {:else}<button class="btn sm danger" onclick={() => confirm(`${p.name} aus der Runde entfernen?`) && kick(p.id)}>Entfernen</button>{/if}
      </div>
      {#if !gp.local && p.connected}
        <div class="row">
          <input bind:value={toastText} placeholder="Nachricht an Spieler" aria-label="Nachricht" onkeydown={(e) => { if (e.key === 'Enter' && toastText.trim()) { sendToast(p.id, toastText.trim()); toastText = ''; } }} />
          <button class="btn sm" onclick={() => { if (toastText.trim()) { sendToast(p.id, toastText.trim()); toastText = ''; } }}>Senden</button>
        </div>
      {/if}
    </PartyCard>
  {:else}
    <p class="dim empty">Noch keine Spieler. Gib den Raumcode weiter oder füge einen lokalen Spieler hinzu (Einstellungen).</p>
  {/each}
</div>

<Dialog bind:open={viewOpen} title={viewPlayer?.character?.name ?? 'Bogen'} wide>
  {#if viewPlayer?.character}
    <SheetViewer char={viewPlayer.character} editable={!!viewPlayer.local} />
    {#if !viewPlayer.local}<p class="dim">Änderungen am Bogen eines verbundenen Spielers machst du über die Schnell-Aktionen. So bleibt der Spieler Herr seines Bogens.</p>{/if}
  {/if}
</Dialog>

<style>
  .pending { border-color: var(--accent-2); margin-bottom: 1rem; }
  .cards { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); }
  .acts { margin-top: 0.3rem; flex-wrap: wrap; }
  .acts select { width: auto; min-height: 30px; padding: 0.2em 0.4em; font-size: 0.85rem; }
  .row input { min-height: 30px; padding: 0.2em 0.5em; }
  .empty { grid-column: 1 / -1; }
</style>
