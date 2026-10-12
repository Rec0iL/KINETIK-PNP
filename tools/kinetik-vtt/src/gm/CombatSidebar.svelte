<script lang="ts">
  import { rules, ATTR_KEYS, describePoison, GIFT, tagLabel, type AttrKey, type NpcType } from '../rules';
  import { t } from '../i18n';
  import { gm, partyFor, answerMove, advanceRound, gmAttack, gmPlan } from '../net/gm.svelte';
  import { startCombat, endCombat, otherSide, npcStatus, roughState, ROUGH_LABEL, type Side } from './combat';
  import { isOpen, KIND_LABEL, type SitKind } from './situation';
  import { patchPlayer } from '../net/gm.svelte';
  import SitCard from './SitCard.svelte';

  /** Im Kampf-Tab stehen Runde, Marker und Spielerliste schon links: hier nur Bewegung, Situationen und Gegner-Angriffe. */
  let { situationsOnly = false }: { situationsOnly?: boolean } = $props();
  const combat = $derived(gm.session!.combat);
  const party = $derived(partyFor(null).filter((p) => p.vitals));
  const sideName = (s: Side) => (s === 'players' ? t('gm.common.sidePlayers') : t('gm.common.sideEnemies'));
  const open = $derived(combat.situations.filter((s) => isOpen(s)));
  const closed = $derived(combat.situations.filter((s) => !isOpen(s) && s.round === combat.round).slice(-4).reverse());
  const nameOf = (id: string) => party.find((p) => p.id === id)?.characterName || party.find((p) => p.id === id)?.name || id;
  const npcName = (id: string | null) => combat.npcs.find((n) => n.id === id)?.name ?? '';

  let ambush = $state<'' | Side>('');
  let attackFrom = $state<Record<string, string>>({});
  let formPlayer = $state('');
  let formKind = $state<SitKind>('attack');
  let formTarget = $state('');
  let formAttr = $state<AttrKey>('gewalt');
  let formText = $state('');
  let formOpen = $state(false);

  function start() { startCombat(combat, { ambush: ambush || undefined }); }
  function end() {
    if (!confirm(t('gm.common.confirmEnd'))) return;
    for (const p of gm.session!.players) if (p.character) patchPlayer(p.id, [{ op: 'set', key: 'momentum', value: 0 }]);
    endCombat(combat);
  }
  function createForPlayer() {
    const pid = formPlayer || party[0]?.id;
    if (!pid) return;
    gmPlan(pid, {
      kind: formKind, npcId: formKind === 'attack' ? (formTarget || combat.npcs[0]?.id || null) : null, attr: formAttr, technique: formText, moveName: '', tagsUsed: [],
    });
    formText = '';
    formOpen = false;
  }
  const types = rules.npc.leiter;
  const typeName = (ty: NpcType) => types.find((x) => x.key === ty)?.name ?? ty;
</script>

<aside class="side">
  {#if !situationsOnly || !combat.active}
  <section class="panel">
    <div class="row">
      <h2>{t('gm.common.combat')}</h2>
      {#if combat.active}<span class="chip accent">{t('gm.common.round', { n: combat.round })}</span>{:else}<span class="chip">{t('gm.common.noCombat')}</span>{/if}
    </div>
    {#if !combat.active}
      <div class="row">
        <select bind:value={ambush} aria-label={t('gm.common.ambush')}><option value="">{t('gm.sidebar.startNormal')}</option><option value="players">{t('gm.sidebar.startPlayers')}</option><option value="enemies">{t('gm.sidebar.startEnemies')}</option></select>
        <button class="btn sm primary" onclick={start}>{t('gm.common.startCombat')}</button>
      </div>
    {:else}
      <div class="row">
        <span class="lbl">{t('gm.sidebar.marker')}</span>
        <div class="seg">
          <button class:on={combat.marker === 'players'} onclick={() => (combat.marker = 'players')}>{t('gm.common.sidePlayers')}</button>
          <button class:on={combat.marker === 'enemies'} onclick={() => (combat.marker = 'enemies')}>{t('gm.common.sideEnemies')}</button>
        </div>
      </div>
      <div class="row">
        <span class="lbl">{t('gm.common.onTurn')}</span><b class="turn" class:en={combat.side === 'enemies'}>{sideName(combat.side)}</b>
        <span class="spacer"></span>
        <button class="btn sm" onclick={() => (combat.side = otherSide(combat.side))}>{t('gm.sidebar.sideDone')}</button>
      </div>
      <div class="row">
        <button class="btn sm primary" onclick={advanceRound} title={t('gm.common.nextRoundTitle')}>{t('gm.common.nextRound')}</button>
        <label class="check"><input type="checkbox" bind:checked={combat.autoRelease} /> {t('gm.sidebar.autoRelease')}</label>
        <span class="spacer"></span>
        <button class="btn sm danger" onclick={end}>{t('gm.sidebar.end')}</button>
      </div>
    {/if}
  </section>
  {/if}

  {#if combat.active}
    {#if combat.moveRequests.length}
      <section class="panel">
        <h2>{t('gm.sidebar.movement')}</h2>
        {#each combat.moveRequests as r (r.id)}
          <div class="row mv">
            <span><b>{r.name}</b> {t('gm.sidebar.wantsToMove')}</span><span class="spacer"></span>
            <button class="btn sm primary" onclick={() => answerMove(r.id, true)}>{t('gm.sidebar.ok')}</button>
            <button class="btn sm ghost danger" onclick={() => answerMove(r.id, false)}>{t('gm.sidebar.no')}</button>
          </div>
        {/each}
        <small class="dim">{t('gm.sidebar.ghostHint')}</small>
      </section>
    {/if}

    <section class="panel">
      <div class="row"><h2>{t('gm.sidebar.situations')}</h2><span class="spacer"></span><button class="btn sm" onclick={() => (formOpen = !formOpen)}>{formOpen ? t('gm.sidebar.close') : t('gm.sidebar.actionForPlayer')}</button></div>
      {#if formOpen}
        <div class="form">
          <select bind:value={formPlayer} aria-label={t('gm.common.player')}>{#each party as p}<option value={p.id}>{p.characterName || p.name}</option>{/each}</select>
          <select bind:value={formKind} aria-label={t('gm.sidebar.kind')}><option value="attack">{KIND_LABEL.attack}</option><option value="breath">{KIND_LABEL.breath}</option><option value="gather">{KIND_LABEL.gather}</option></select>
          {#if formKind === 'attack'}<select bind:value={formTarget} aria-label={t('gm.sidebar.target')}>{#each combat.npcs.filter((n) => !npcStatus(n).out) as n}<option value={n.id}>{n.name}</option>{/each}</select>
            <select bind:value={formAttr} aria-label={t('gm.sidebar.attribute')}>{#each ATTR_KEYS as a}<option value={a}>{rules.tabellen.attribute.find((x) => x.key === a)?.name}</option>{/each}</select>{/if}
          <input bind:value={formText} placeholder={t('gm.sidebar.technique')} aria-label={t('gm.sidebar.technique')} />
          <button class="btn sm primary" onclick={createForPlayer}>{t('gm.sidebar.create')}</button>
        </div>
      {/if}
      <div class="sits">
        {#each open as s (s.id)}<SitCard sit={s} />{:else}<p class="dim">{t('gm.sidebar.noSituations')}</p>{/each}
        {#each closed as s (s.id)}<SitCard sit={s} />{/each}
      </div>
    </section>

    {#if !situationsOnly}
    <section class="panel">
      <h2>{t('gm.sidebar.players')}</h2>
      {#each party as p (p.id)}
        {@const v = p.vitals!}
        <div class="pl" class:done={combat.done[p.id]}>
          <label class="check"><input type="checkbox" checked={!!combat.done[p.id]} onchange={(e) => (combat.done[p.id] = e.currentTarget.checked)} /> <b>{p.characterName || p.name}</b></label>
          <span class="chip">{t('gm.sidebar.energyChip', { cur: v.energie, max: v.energieMax })}</span><span class="chip">{t('gm.sidebar.wpChip', { n: v.wk })}</span><span class="chip">{t('gm.sidebar.momentumChip', { n: v.momentum })}</span>
          {#if combat.bedraengnis[p.id]}<span class="chip amber">{t('gm.common.pressureShort', { n: combat.bedraengnis[p.id] })}</span>{/if}
          {#if combat.bulletTime[p.id] === combat.round}<span class="chip accent">{t('gm.sidebar.bulletUsed')}</span>{/if}
          {#if combat.exposed[p.id]}<span class="chip danger" title={t('gm.sidebar.exposedTitle')}>{t('gm.sidebar.exposed')}</span>{/if}
          {#each v.poisons as pz}<span class="chip danger" title={t('gm.common.poison')}>{t('gm.common.poisonChip', { level: GIFT[pz.level].label })}{pz.delay ? ` (${pz.delay})` : ''}</span>{/each}
        </div>
      {:else}<p class="dim">{t('gm.common.noSheets')}</p>{/each}
    </section>
    {/if}

    <section class="panel">
      <h2>{t('gm.sidebar.enemies')}</h2>
      {#each combat.npcs as n (n.id)}
        {@const st = npcStatus(n)}
        <div class="en" class:out={st.out}>
          <div class="row">
            <b>{n.name}{n.type === 'goon' ? ` (${n.count})` : ''}</b><span class="chip">{typeName(n.type)}</span>
            <span class="chip" class:danger={st.out}>{ROUGH_LABEL[roughState(n)]}</span>
            {#each n.tags as tg}<span class="chip amber">{tagLabel(tg)}</span>{/each}
            {#each n.poisons ?? [] as pz (pz.id)}<span class="chip danger" title={describePoison(pz)}>{t('gm.common.poisonChip', { level: GIFT[pz.level].label })}{pz.delay ? ` (${pz.delay})` : ''}</span>{/each}
            {#if combat.done[n.id]}<span class="chip">{t('gm.common.acted')}</span>{/if}
          </div>
          {#if !st.out && party.length}
            <div class="row atk">
              <select aria-label={t('gm.sidebar.attackTarget')} value={attackFrom[n.id] ?? party[0].id} onchange={(e) => (attackFrom[n.id] = e.currentTarget.value)}>{#each party as p}<option value={p.id}>{p.characterName || p.name}</option>{/each}</select>
              <button class="btn sm danger" onclick={() => gmAttack(attackFrom[n.id] ?? party[0].id, n.id)}>{t('gm.sidebar.attacks')}</button>
            </div>
          {/if}
        </div>
      {:else}<p class="dim">{t('gm.sidebar.noEnemies')}</p>{/each}
    </section>
  {/if}
</aside>

<style>
  .side { display: grid; gap: 0.8rem; align-content: start; min-width: 0; }
  .side h2 { margin: 0; }
  .side .panel { display: grid; gap: 0.6rem; }
  .lbl { font: 600 0.7rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .seg { display: flex; }
  .seg button { padding: 0.35em 0.9em; font: 600 0.9rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; background: var(--raised); border: 1px solid var(--line-strong); color: var(--ink-dim); cursor: pointer; }
  .seg button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .seg button:nth-child(2).on { background: var(--danger); border-color: var(--danger); color: #1a0008; }
  .turn { font: 400 1.6rem/1 var(--font-display); color: var(--accent); letter-spacing: 0.06em; }
  .turn.en { color: var(--danger); }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.88rem; }
  .mv { padding: 3px 0; border-bottom: 1px solid var(--line); }
  .form { display: grid; gap: 4px; padding: 0.5rem; background: var(--raised); }
  .form select, .form input { min-height: 32px; }
  .sits { display: grid; gap: 0.6rem; }
  .pl { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; padding: 0.3rem 0; border-bottom: 1px solid var(--line); }
  .pl.done { opacity: 0.5; }
  .en { display: grid; gap: 4px; padding: 0.35rem 0; border-bottom: 1px solid var(--line); }
  .en.out { opacity: 0.5; }
  .atk select { width: auto; min-height: 30px; padding: 0.15em 0.4em; }
  .row { flex-wrap: wrap; }
</style>
