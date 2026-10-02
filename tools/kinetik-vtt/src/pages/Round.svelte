<script lang="ts">
  import { player, leaveRound, setActiveCharacter, viewPlayer, sendMapOps } from '../net/player.svelte';
  import { applyMapOp, type MapOp } from '../map/mapstate';
  import { addPing } from '../map/pings.svelte';
  import MapView, { type Tool } from '../map/MapView.svelte';
  import { library, getCharacter } from '../store/characters.svelte';
  import { navigate } from '../lib/router.svelte';
  import { formatCode } from '../net/protocol';
  import PartyCard from '../ui/PartyCard.svelte';
  import RollPanel from '../sheet/RollPanel.svelte';
  import SheetViewer from '../sheet/SheetViewer.svelte';
  import Dialog from '../ui/Dialog.svelte';

  const mine = $derived(getCharacter(player.characterId));
  const vis = $derived(player.state?.visibility ?? 'party');
  let viewOpen = $state(false);
  let mapTool = $state<Tool>('move');
  let mapView = $state<{ fit: () => void }>();
  let mapHidden = $state(false);

  function mapOps(ops: MapOp[]) {
    const m = player.map;
    if (!m) return;
    const out: MapOp[] = [];
    for (const op of ops) {
      if (op.op === 'ping') { addPing(op.x, op.y, player.name, op.color); out.push({ ...op, who: player.name }); }
      else if (op.op === 'tokmove') {
        const t = m.tokens.find((x) => x.id === op.id);
        if (t?.playerId === player.playerId) { applyMapOp(m, op); out.push(op); }
      }
    }
    if (out.length) sendMapOps(out);
  }
  const myColor = $derived(player.map?.tokens.find((t) => t.playerId === player.playerId)?.color ?? '#ffb800');

  $effect(() => {
    if (player.status === 'idle') navigate('/beitreten');
  });
  $effect(() => {
    if (!viewOpen && player.view) viewPlayer(null);
  });
  function openView(id: string) {
    viewPlayer(id);
    viewOpen = true;
  }
  const visText = { party: 'Gruppenleiste (nur Werte)', private: 'Privat (nur der SL sieht Bögen)', open: 'Offen (alle Bögen lesbar)' };
</script>

{#if player.status === 'idle'}
  <p class="dim">Nicht verbunden.</p>
{:else}
  <section class="head">
    <div>
      <span class="kicker">Runde {formatCode(player.code)}</span>
      <h1>{player.gmName || 'Runde'}</h1>
    </div>
    <div class="row">
      {#if mine}<a class="btn primary" href={`#/charakter/${mine.id}`}>Meinen Bogen öffnen</a>{/if}
      <button class="btn" onclick={() => confirm('Runde verlassen?') && (leaveRound(), navigate('/beitreten'))}>Verlassen</button>
    </div>
  </section>

  {#if player.status !== 'connected'}
    <p class="panel flat banner">{player.status === 'pending' ? 'Warte auf die Bestätigung des SL …' : `Verbindung wird wiederhergestellt … ${player.error}`}</p>
  {/if}

  {#if player.map}
    <section class="panel mapsec">
      <div class="row">
        <h2>Karte: {player.map.name}</h2><span class="spacer"></span>
        <button class="btn sm" class:primary={mapTool === 'move'} onclick={() => (mapTool = 'move')} title="Eigenen Token ziehen, Karte verschieben (Doppelklick = Ping)">Bewegen</button>
        <button class="btn sm" class:primary={mapTool === 'ping'} onclick={() => (mapTool = 'ping')}>Ping</button>
        <button class="btn sm" class:primary={mapTool === 'measure'} onclick={() => (mapTool = 'measure')}>Messen</button>
        <button class="btn sm" onclick={() => mapView?.fit()}>Einpassen</button>
        <button class="btn sm ghost" onclick={() => (mapHidden = !mapHidden)}>{mapHidden ? 'Zeigen' : 'Ausblenden'}</button>
      </div>
      {#if !mapHidden}
        <div class="stage"><MapView bind:this={mapView} map={player.map} role="player" myPlayerId={player.playerId} tool={mapTool} pingColor={myColor} onops={mapOps} /></div>
      {/if}
    </section>
  {/if}

  <div class="layout">
    <div class="stack">
      <section class="panel">
        <div class="row"><h2>Gruppe</h2><span class="spacer"></span><span class="chip">{visText[vis]}</span></div>
        <div class="party">
          {#each player.party as p (p.id)}
            <PartyCard {p} me={p.id === player.playerId} onopen={vis === 'open' && p.id !== player.playerId ? () => openView(p.id) : undefined} />
          {:else}
            <p class="dim">Noch niemand sichtbar.</p>
          {/each}
        </div>
      </section>

      {#if player.state?.notes}
        <section class="panel"><h2>Notizen des SL</h2><div class="notes">{player.state.notes}</div></section>
      {/if}

      <section class="panel">
        <h2>Mein Charakter in dieser Runde</h2>
        <label class="field">Bogen
          <select value={player.characterId} onchange={(e) => setActiveCharacter(e.currentTarget.value)}>
            {#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}
            <option value="">Ohne Bogen</option>
          </select>
        </label>
        <small class="dim">Dein Bogen wird bei jeder Änderung an den SL übertragen. Änderungen des SL (z.B. Schaden) erscheinen bei dir mit einer Meldung.</small>
      </section>
    </div>

    <div>
      <RollPanel char={mine} canSecret party={[]} />
    </div>
  </div>
{/if}

<Dialog bind:open={viewOpen} title={player.view?.character?.name ?? 'Bogen'} wide>
  {#if player.view?.character}
    <SheetViewer char={player.view.character} />
  {:else}
    <p class="dim">Wird geladen … Der SL hat den Bogen eventuell nicht freigegeben.</p>
  {/if}
</Dialog>

<style>
  .head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .banner { margin: 0 0 1rem; border-color: var(--accent-2); }
  .layout { display: grid; grid-template-columns: minmax(300px, 1fr) minmax(320px, 1.3fr); gap: 1rem; align-items: start; }
  .mapsec { margin-bottom: 1rem; display: grid; gap: 0.6rem; }
  .stage { height: min(60vh, 640px); min-height: 300px; }
  .party { display: grid; gap: 0.6rem; margin-top: 0.6rem; }
  .notes { white-space: pre-wrap; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
