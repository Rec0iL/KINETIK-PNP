<script lang="ts">
  import { rules, OUTCOME_LABEL, GIFT, GIFT_LEVELS, MAX_GIFT_DELAY, tagLabel, type GiftLevel, type ZoneKey } from '../rules';
  import { t, tn, fmtNumber } from '../i18n';
  import {
    gm, activeScene, releaseSit, cancelSit, rollNpcFor, rollPlayerFor, grantBullet, refreshProposal, applySit, sitEditable, partyFor,
  } from '../net/gm.svelte';
  import { BT_LABEL, KIND_LABEL, canGrantBulletTime, npcRollMod, npcTags, playerRollMod, type Effect, type ProposalItem, type Situation } from './situation';
  import { measure } from '../map/mapstate';
  import { tagSize } from './combat';
  import Stepper from '../ui/Stepper.svelte';

  let { sit }: { sit: Situation } = $props();

  const combat = $derived(gm.session!.combat);
  const npc = $derived(sit.npcId ? combat.npcs.find((n) => n.id === sit.npcId) ?? null : null);
  const player = $derived(gm.session!.players.find((p) => p.id === sit.playerId));
  const pcName = $derived(player?.character?.name || player?.name || t('gm.common.player'));
  const party = $derived(partyFor(null));
  const editable = $derived(sitEditable(sit));
  const attackOnNpc = $derived(sit.kind === 'attack');
  /** Tags, die der Angreifer ausnutzen kann: Tags des Gegners (Angriff) bzw. des Spielers (Verteidigung). */
  const tagPool = $derived(
    sit.kind === 'attack' && npc ? npcTags(npc)
      : sit.kind === 'defend' && player?.character ? player.character.tags.map((t) => ({ name: t.name, size: t.size })) : [],
  );
  const pMod = $derived(playerRollMod(sit, npc));
  const nMod = $derived(npc ? npcRollMod(sit, combat, player?.character?.tags.map((t) => ({ name: t.name, size: t.size })) ?? []) : 0);
  const pcBonus = $derived(party.find((p) => p.id === sit.playerId)?.vitals?.bonus[sit.attr] ?? 0);
  const absent = $derived(!!player && (player.local || !player.connected));
  const scene = $derived(activeScene());

  const distance = $derived.by(() => {
    if (!scene || !sit.npcId) return '';
    const pc = scene.tokens.find((t) => t.playerId === sit.playerId);
    const near = scene.tokens.filter((t) => t.npcId === sit.npcId && !t.out)
      .sort((a, b) => (pc ? Math.hypot(a.x - pc.x, a.y - pc.y) - Math.hypot(b.x - pc.x, b.y - pc.y) : 0))[0];
    if (!pc || !near) return '';
    const m = measure(scene.grid, [pc.x, pc.y], [near.x, near.y]);
    const one = (v: number) => fmtNumber(v, { maximumFractionDigits: 1 });
    return tn('gm.sitcard.distance', m.cells, { n: one(m.cells), units: one(m.units), unit: scene.grid.unit });
  });

  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const rolled = (r: { dice: number; bonus: number; mod: number }) =>
    t('gm.sitcard.rolled', { total: r.dice + r.bonus + r.mod, dice: r.dice, bonus: fmt(r.bonus), mod: r.mod ? `, ${fmt(r.mod)}` : '' });
  const zones = rules.tabellen.zonen;
  const statusLabel: Record<Situation['status'], string> = {
    planned: t('gm.sitcard.status.planned'), released: t('gm.sitcard.status.released'), rolled: t('gm.sitcard.status.rolled'),
    resolved: t('gm.sitcard.status.resolved'), cancelled: t('gm.sitcard.status.cancelled'),
  };

  function toggleTag(name: string) {
    if (!editable) return;
    const i = sit.tagsUsed.indexOf(name);
    if (i >= 0) sit.tagsUsed.splice(i, 1);
    else sit.tagsUsed.push(name);
  }
  function setGiftLevel(v: string) {
    if (!v) { sit.gift = undefined; return; }
    sit.gift = { level: v as GiftLevel, delay: sit.gift?.delay ?? 0, ignoresSchutz: sit.gift?.ignoresSchutz ?? false };
  }
  function toggleItem(it: ProposalItem, on: boolean) {
    it.on = on;
    if (on && it.group) for (const o of sit.proposal ?? []) if (o !== it && o.group === it.group) o.on = false;
  }
  const hasZone = (e: Effect): e is Extract<Effect, { k: 'pcHit' | 'npcHit' }> => (e.k === 'pcHit' || e.k === 'npcHit') && e.hit === 'verletzung';
  const groupTokens = (npcId: string) => scene?.tokens.filter((t) => t.npcId === npcId && !t.out) ?? [];
  function toggleToken(e: Extract<Effect, { k: 'goonOut' }>, id: string) {
    const i = e.tokenIds.indexOf(id);
    if (i >= 0) e.tokenIds.splice(i, 1);
    else e.tokenIds.push(id);
  }
</script>

<article class="sit" class:done={sit.status === 'resolved' || sit.status === 'cancelled'} class:def={sit.kind === 'defend'}>
  <header>
    <b>{sit.kind === 'defend' ? `${npc?.name ?? t('gm.common.enemy')} → ${pcName}` : sit.kind === 'attack' ? `${pcName} → ${npc?.name ?? '?'}` : pcName}</b>
    <span class="chip" class:accent={sit.kind === 'attack'} class:danger={sit.kind === 'defend'}>{KIND_LABEL[sit.kind]}</span>
    <span class="chip amber">{statusLabel[sit.status]}</span>
    {#if sit.bullet}<span class="chip accent" title={sit.bullet.option ? BT_LABEL[sit.bullet.option] : t('gm.sitcard.btPending')}>Bullet Time{sit.bullet.option ? `: ${sit.bullet.option === 'zone' ? t('gm.sitcard.btZone') : sit.bullet.option === 'ep' ? t('gm.sitcard.btEp') : t('gm.sitcard.btMomentum')}` : ' …'}</span>{/if}
  </header>

  {#if sit.technique}<p class="tech">{t('gm.sitcard.technique', { text: sit.technique })} <span class="dim">({rules.tabellen.attribute.find((a) => a.key === sit.attr)?.name ?? sit.attr}{sit.moveName ? t('gm.sitcard.withMove', { name: sit.moveName }) : ''})</span></p>{/if}
  {#if distance}<small class="dim">{distance}</small>{/if}

  {#if sit.kind === 'attack' || sit.kind === 'defend'}
    {#if tagPool.length}
      <div class="tags">
        <span class="lbl">{sit.kind === 'attack' ? t('gm.sitcard.tagsOfEnemy') : t('gm.sitcard.tagsOfPlayer')}</span>
        {#each tagPool as tg (tg.name)}
          <button class="chip tg" class:on={sit.tagsUsed.includes(tg.name)} class:big={tg.size === 'gross'} onclick={() => toggleTag(tg.name)} disabled={!editable} title={tg.size === 'gross' ? t('gm.sitcard.tagMajor') : t('gm.sitcard.tagMinor')}>{tagLabel(tg.name)} {tg.size === 'gross' ? '+2' : '+1'}</button>
        {/each}
      </div>
    {/if}
    <div class="row mods">
      <label class="s">{t('gm.sitcard.easeHinder')}<Stepper bind:value={sit.mod} min={-9} max={9} label={t('gm.common.modifier')} disabled={!editable} /></label>
      <input class="reason" bind:value={sit.modReason} placeholder={t('gm.sitcard.reasonPlaceholder')} aria-label={t('gm.sitcard.reason')} disabled={!editable} />
    </div>
    {#if sit.kind === 'defend'}
      <label class="s">{t('gm.sitcard.attackers')}<Stepper bind:value={sit.attackers} min={1} max={10} label={t('gm.sitcard.attackersShort')} disabled={!editable && sit.status !== 'released'} /></label>
    {/if}
    {#if sit.area}<p class="dim"><span class="chip accent">{sit.area === 'flaeche' ? t('gm.sitcard.area') : t('gm.sitcard.multi')}</span> {t('gm.sitcard.areaHint')}</p>{/if}
    <div class="row gift">
      <label class="s">{t('gm.common.poison')}<select value={sit.gift?.level ?? ''} onchange={(e) => setGiftLevel(e.currentTarget.value)} disabled={sit.status === 'resolved' || sit.status === 'cancelled'} aria-label={t('gm.common.poison')}>
        <option value="">{t('gm.sitcard.noPoison')}</option>
        {#each GIFT_LEVELS as l}<option value={l}>{t('gm.sitcard.poisonOption', { label: GIFT[l].label, mw: GIFT[l].mw })}</option>{/each}
      </select></label>
      {#if sit.gift}
        <label class="s">{t('gm.common.delay')}<Stepper bind:value={sit.gift.delay} min={0} max={MAX_GIFT_DELAY} label={t('gm.common.delayRounds')} /></label>
        <label class="check"><input type="checkbox" bind:checked={sit.gift.ignoresSchutz} /> {t('gm.sitcard.ignoresProtection')}</label>
      {/if}
    </div>
    <div class="rolls">
      <span class:ok={!!sit.pRoll}>{pcName}: {sit.pRoll ? rolled(sit.pRoll) : t('gm.sitcard.waiting', { bonus: fmt(pcBonus), mod: fmt(pMod) })}</span>
      <span class:ok={!!sit.nRoll}>{npc?.name ?? t('gm.common.enemy')}: {sit.nRoll ? rolled(sit.nRoll) : t('gm.sitcard.waiting', { bonus: fmt(npc?.bonus ?? 0), mod: fmt(nMod) })}</span>
    </div>
  {/if}

  {#if sit.result}
    <p class="res"><b>{OUTCOME_LABEL[sit.result.outcome]}</b> <span class="dim">Δ {sit.result.delta > 0 ? '+' : ''}{sit.result.delta}{sit.result.heldenSchwelle ? t('gm.sitcard.heroThreshold') : ''}{sit.result.limited ? t('gm.sitcard.outOfReach') : ''}{sit.hero ? t('gm.sitcard.heroic') : ''}</span></p>
  {/if}

  {#if sit.proposal && sit.status === 'rolled'}
    <ul class="prop">
      {#each sit.proposal as it (it.id)}
        <li class:off={!it.on}>
          <label class="check"><input type="checkbox" checked={it.on} onchange={(e) => toggleItem(it, e.currentTarget.checked)} /> {it.label}</label>
          {#if hasZone(it.effect)}
            <select bind:value={it.effect.zone} aria-label={t('gm.common.zone')}>{#each zones as z}<option value={z.key as ZoneKey}>{z.kurz}</option>{/each}</select>
          {/if}
          {#if it.effect.k === 'goonOut'}
            <div class="toks">
              {#each groupTokens(it.effect.npcId) as tok (tok.id)}
                <button class="chip tg" class:on={it.effect.tokenIds.includes(tok.id)} onclick={() => toggleToken(it.effect as Extract<Effect, { k: 'goonOut' }>, tok.id)}>{tok.name}</button>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <footer class="row">
    {#if sit.status === 'planned'}
      <button class="btn sm primary" onclick={() => releaseSit(sit.id)}>{t('gm.sitcard.release')}</button>
    {/if}
    {#if (sit.kind === 'attack' || sit.kind === 'defend') && (sit.status === 'released' || sit.status === 'planned') && npc && !sit.nRoll}
      <button class="btn sm amber" onclick={() => rollNpcFor(sit.id)}>{t('gm.sitcard.rollNpc', { name: npc.name, mod: fmt((npc?.bonus ?? 0) + nMod) })}</button>
    {/if}
    {#if sit.status === 'released' && !sit.pRoll && (sit.kind === 'attack' || sit.kind === 'defend') && absent}
      <button class="btn sm" onclick={() => rollPlayerFor(sit.id)}>{t('gm.sitcard.rollFor', { name: pcName })}</button>
    {/if}
    {#if (sit.kind === 'attack' || sit.kind === 'defend') && !sit.bullet && ['planned', 'released', 'rolled'].includes(sit.status)}
      <button class="btn sm" onclick={() => grantBullet(sit.id)} disabled={!canGrantBulletTime(combat, sit.playerId)} title={t('gm.sitcard.bulletTitle')}>Bullet Time</button>
    {/if}
    {#if sit.status === 'rolled'}
      <button class="btn sm primary" onclick={() => applySit(sit.id)}>{t('gm.sitcard.apply')}</button>
      {#if sit.result}<button class="btn sm ghost" onclick={() => refreshProposal(sit.id)} title={t('gm.sitcard.recalcTitle')}>{t('gm.sitcard.recalc')}</button>{/if}
    {/if}
    {#if sit.status !== 'resolved' && sit.status !== 'cancelled'}
      <span class="spacer"></span>
      <button class="btn sm ghost danger" onclick={() => cancelSit(sit.id)}>{t('gm.sitcard.discard')}</button>
    {/if}
  </footer>
</article>

<style>
  .sit { display: grid; gap: 0.5rem; padding: 0.7rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .sit.def { border-left-color: var(--danger); }
  .sit.done { opacity: 0.55; }
  header { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
  header b { font: 600 1rem var(--font-head); letter-spacing: 0.06em; text-transform: uppercase; }
  .tech { margin: 0; font-size: 0.92rem; }
  .lbl { font: 600 0.68rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); margin-right: 0.3rem; }
  .tags, .toks { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .tg { cursor: pointer; background: transparent; }
  .tg.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
  .tg.big.on { background: var(--accent-2-soft); border-color: var(--accent-2); color: var(--accent-2); }
  .mods, .gift { align-items: end; gap: 0.6rem; flex-wrap: wrap; }
  .s { display: grid; gap: 3px; font: 600 0.68rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  .reason { flex: 1; min-width: 140px; min-height: 32px; }
  .gift select { width: auto; min-height: 32px; padding: 0.2em 0.4em; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.88rem; }
  .rolls { display: grid; gap: 2px; font-size: 0.88rem; color: var(--ink-dim); }
  .rolls .ok { color: var(--ink); }
  .res { margin: 0; }
  .res b { color: var(--accent-2); font: 600 1.05rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
  .prop { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
  .prop li { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; padding: 3px 0; border-bottom: 1px solid var(--line); }
  .prop li.off { opacity: 0.55; }
  .prop select { width: auto; min-height: 28px; padding: 0.1em 0.4em; }
  footer { gap: 0.4rem; flex-wrap: wrap; }
</style>
