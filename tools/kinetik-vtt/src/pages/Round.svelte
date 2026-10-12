<script lang="ts">
  import { player, leaveRound, setActiveCharacter, viewPlayer, sendMapOps, sendMoveRequest } from '../net/player.svelte';
  import { applyMapOp, isRevealed, type MapOp } from '../map/mapstate';
  import { addPing } from '../map/pings.svelte';
  import MapView, { type Tool, type Ghost } from '../map/MapView.svelte';
  import CombatPlan from './CombatPlan.svelte';
  import { ROUGH_LABEL } from '../gm/combat';
  import { library, getCharacter } from '../store/characters.svelte';
  import { navigate } from '../lib/router.svelte';
  import { formatCode } from '../net/protocol';
  import PartyCard from '../ui/PartyCard.svelte';
  import RollPanel from '../sheet/RollPanel.svelte';
  import SheetViewer from '../sheet/SheetViewer.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import { assetUrl, requestAsset, assets } from '../net/assets.svelte';
  import type { Handout } from '../net/protocol';
  import { tagLabel } from '../rules';
  import { t, fmtNumber } from '../i18n';

  const mine = $derived(getCharacter(player.characterId));
  const vis = $derived(player.state?.visibility ?? 'party');
  let viewOpen = $state(false);
  let handoutOpen = $state(false);
  let shownHandout = $state<Handout | null>(null);
  let handoutUrl = $state('');
  let handoutErr = $state('');

  async function openHandout(h: Handout) {
    shownHandout = h;
    handoutUrl = '';
    handoutErr = '';
    handoutOpen = true;
    if (h.kind === 'image' && h.hash) {
      try { await requestAsset(h.hash); handoutUrl = (await assetUrl(h.hash)) ?? ''; } catch (e) { handoutErr = (e as Error).message; }
    }
  }
  const combat = $derived(player.state?.combat ?? null);
  const nameOf = (id: string) => player.party.find((p) => p.id === id)?.characterName || player.party.find((p) => p.id === id)?.name || id;
  let mapTool = $state<Tool>('move');
  let mapView = $state<{ fit: () => void }>();
  let mapHidden = $state(false);
  let target = $state<string | null>(null);
  let selTok = $state<string | null>(null);

  // Gegner, die man anklicken kann: sichtbar (nicht im Nebel), nicht ausgeschaltet, mit Kampf-NPC verknüpft.
  const targetTokens = $derived(
    combat?.active && player.map
      ? player.map.tokens.filter((t) => t.npcId && !t.out && combat.enemies.some((e) => e.id === t.npcId && !e.out) && isRevealed(player.map!, t.x, t.y)).map((t) => t.id)
      : [],
  );
  $effect(() => {
    const t = player.map?.tokens.find((k) => k.id === selTok);
    if (t?.npcId && targetTokens.includes(t.id)) target = t.npcId;
  });
  const ghosts = $derived<Ghost[]>(
    player.pendingMove
      ? (() => {
          const tok = player.map?.tokens.find((k) => k.id === player.pendingMove!.tokenId);
          return tok ? [{ id: 'mine', from: { x: tok.x, y: tok.y }, to: { x: player.pendingMove!.x, y: player.pendingMove!.y }, color: tok.color, label: t('pages.round.waitGm'), size: tok.size }] : [];
        })()
      : [],
  );

  function mapOps(ops: MapOp[]) {
    const m = player.map;
    if (!m) return;
    const out: MapOp[] = [];
    for (const op of ops) {
      if (op.op === 'ping') { addPing(op.x, op.y, player.name, op.color); out.push({ ...op, who: player.name }); }
      else if (op.op === 'tokmove') {
        const t = m.tokens.find((x) => x.id === op.id);
        if (t?.playerId !== player.playerId) continue;
        // Im Kampf bewegt der SL: das Ziehen ist nur eine Anfrage.
        if (combat?.active) sendMoveRequest(op.id, op.x, op.y);
        else { applyMapOp(m, op); out.push(op); }
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
  const visText = { party: t('pages.round.visParty'), private: t('pages.round.visPrivate'), open: t('pages.round.visOpen') };
</script>

{#if player.status === 'idle'}
  <p class="dim">{t('pages.round.notConnected')}</p>
{:else}
  <section class="head">
    <div>
      <span class="kicker">{t('pages.round.kicker', { code: formatCode(player.code) })}</span>
      <h1>{player.gmName || t('pages.round.titleFallback')}</h1>
    </div>
    <div class="row">
      {#if mine}<a class="btn primary" href={`#/charakter/${mine.id}`}>{t('pages.round.openSheet')}</a>{/if}
      <button class="btn" onclick={() => confirm(t('pages.round.confirmLeave')) && (leaveRound(), navigate('/beitreten'))}>{t('pages.common.leave')}</button>
    </div>
  </section>

  {#if player.status !== 'connected'}
    <p class="panel flat banner">{player.status === 'pending' ? t('pages.common.waitGm') : t('pages.round.reconnecting', { error: player.error })}</p>
  {/if}

  {#if combat?.active}
    <section class="panel combat">
      <div class="row">
        <h2>{t('pages.round.combatTitle', { round: combat.round })}</h2><span class="spacer"></span>
        <span class="chip" class:accent={combat.side === 'players'} class:danger={combat.side === 'enemies'}>{t('pages.round.turn', { side: combat.side === 'players' ? t('pages.round.sidePlayers') : t('pages.round.sideEnemies') })}</span>
        <span class="chip amber" title={t('pages.round.markerTitle')}>{t('pages.round.marker', { where: combat.marker === 'players' ? t('pages.round.markerUs') : t('pages.round.markerEnemies') })}</span>
      </div>
      <div class="row who">
        {#each player.party as p}
          <span class="chip" class:accent={!combat.done.includes(p.id)} title={combat.bedraengnis[p.id] ? t('pages.round.pressure', { n: combat.bedraengnis[p.id] }) : ''}>{p.characterName || p.name}{combat.done.includes(p.id) ? ' ✓' : ''}{combat.bedraengnis[p.id] ? ` · ${t('pages.round.pressureShort', { n: combat.bedraengnis[p.id] })}` : ''}</span>
        {/each}
      </div>
      {#if combat.enemies.length}
        <div class="row who">
          {#each combat.enemies as e}<span class="chip" class:danger={!e.out} title={e.tags.map((tg) => tagLabel(tg.name)).join(', ')}>{#if e.img}<img class="av" src={e.img} alt="" />{/if}{e.name} · {ROUGH_LABEL[e.state]}{e.tags.length ? ` · ${e.tags.map((tg) => tagLabel(tg.name)).join(', ')}` : ''}</span>{/each}
        </div>
      {/if}
    </section>
  {/if}

  <CombatPlan char={mine ?? null} bind:target />

  {#if player.map}
    <section class="panel mapsec">
      <div class="row">
        <h2>{t('pages.round.mapTitle', { name: player.map.name })}</h2><span class="spacer"></span>
        <button class="btn sm" class:primary={mapTool === 'move'} onclick={() => (mapTool = 'move')} title={t('pages.round.moveTitle')}>{t('pages.round.move')}</button>
        <button class="btn sm" class:primary={mapTool === 'ping'} onclick={() => (mapTool = 'ping')}>{t('pages.round.ping')}</button>
        <button class="btn sm" class:primary={mapTool === 'measure'} onclick={() => (mapTool = 'measure')}>{t('pages.round.measure')}</button>
        <button class="btn sm" onclick={() => mapView?.fit()}>{t('pages.round.fit')}</button>
        <button class="btn sm ghost" onclick={() => (mapHidden = !mapHidden)}>{mapHidden ? t('pages.round.show') : t('pages.round.hide')}</button>
      </div>
      {#if !mapHidden}
        <div class="stage"><MapView bind:this={mapView} map={player.map} role="player" myPlayerId={player.playerId} tool={mapTool} pingColor={myColor} {ghosts} requestMoves={!!combat?.active} highlight={targetTokens} bind:selected={selTok} onops={mapOps} /></div>
      {/if}
    </section>
  {/if}

  <div class="layout">
    <div class="stack">
      <section class="panel">
        <div class="row"><h2>{t('pages.round.party')}</h2><span class="spacer"></span><span class="chip">{visText[vis]}</span></div>
        <div class="party">
          {#each player.party as p (p.id)}
            <PartyCard {p} me={p.id === player.playerId} onopen={vis === 'open' && p.id !== player.playerId ? () => openView(p.id) : undefined} />
          {:else}
            <p class="dim">{t('pages.round.partyEmpty')}</p>
          {/each}
        </div>
      </section>

      {#if player.handouts.length}
        <section class="panel">
          <h2>{t('pages.round.handouts')}</h2>
          <ul class="hl">
            {#each player.handouts as h (h.id)}
              <li><button class="btn sm" onclick={() => openHandout(h)}>{h.kind === 'image' ? '🖼' : '📄'} {h.title}</button></li>
            {/each}
          </ul>
        </section>
      {/if}

      {#if player.state?.notes}
        <section class="panel"><h2>{t('pages.round.gmNotes')}</h2><div class="notes">{player.state.notes}</div></section>
      {/if}

      <section class="panel">
        <h2>{t('pages.round.myChar')}</h2>
        <label class="field">{t('pages.common.sheet')}
          <select value={player.characterId} onchange={(e) => setActiveCharacter(e.currentTarget.value)}>
            {#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}
            <option value="">{t('pages.round.noSheet')}</option>
          </select>
        </label>
        <small class="dim">{t('pages.round.syncNote')}</small>
      </section>
    </div>

    <div>
      <RollPanel char={mine} canSecret party={[]} />
    </div>
  </div>
{/if}

<Dialog bind:open={handoutOpen} title={shownHandout?.title ?? t('pages.round.handout')} wide>
  {#if shownHandout?.kind === 'image'}
    {#if handoutUrl}<img class="ho" src={handoutUrl} alt={shownHandout.title} />
    {:else if handoutErr}<p class="err">{handoutErr}</p>
    {:else}<p class="dim">{t('pages.round.transferring')} {shownHandout.hash && assets.progress[shownHandout.hash] ? fmtNumber(Math.round((assets.progress[shownHandout.hash].loaded / Math.max(1, assets.progress[shownHandout.hash].total)) * 100) / 100, { style: 'percent' }) : ''}</p>{/if}
  {:else}
    <div class="notes">{shownHandout?.text}</div>
  {/if}
</Dialog>

<Dialog bind:open={viewOpen} title={player.view?.character?.name ?? t('pages.common.sheet')} wide>
  {#if player.view?.character}
    <SheetViewer char={player.view.character} />
  {:else}
    <p class="dim">{t('pages.round.loadingSheet')}</p>
  {/if}
</Dialog>

<style>
  .chip .av { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; object-position: top; vertical-align: -6px; margin-right: 6px; border: 1px solid var(--danger); }
  .head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .banner { margin: 0 0 1rem; border-color: var(--accent-2); }
  .layout { display: grid; grid-template-columns: minmax(min(300px, 100%), 1fr) minmax(320px, 1.3fr); gap: 1rem; align-items: start; }
  .mapsec { margin-bottom: 1rem; display: grid; gap: 0.6rem; }
  .stage { height: min(60vh, 640px); min-height: 300px; }
  .combat { margin-bottom: 1rem; border-color: var(--danger); display: grid; gap: 0.6rem; }
  .who { gap: 6px; }
  .hl { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .ho { max-width: 100%; max-height: 75vh; display: block; margin: 0 auto; }
  .err { color: var(--danger); }
  .party { display: grid; gap: 0.6rem; margin-top: 0.6rem; }
  .notes { white-space: pre-wrap; }
  @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
</style>
