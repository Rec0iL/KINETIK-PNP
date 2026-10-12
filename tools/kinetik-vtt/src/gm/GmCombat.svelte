<script lang="ts">
    import { rules, TAG, isTag, tagLabel, ueberzahlBonus, newPoison, describePoison, antidoteMw, GIFT, GIFT_LEVELS, MAX_GIFT_DELAY, type GiftLevel, type NpcType, type ZoneKey } from '../rules';
  import { gm, patchPlayer, partyFor, advanceRound, poisonRound, gmMapOps } from '../net/gm.svelte';
  import { imageToDataUrl, shrinkDataUrl } from '../lib/image';
  import { pushToast } from '../ui/toasts.svelte';
  import {
    startCombat, endCombat, otherSide, bedraengnisHit, newNpc, npcNormalHit, npcInjury, npcStatus, type Npc, type Side,
  } from './combat';
  import { roll2d6 } from '../dice/roller.svelte';
  import { uid } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';
  import TagInput from '../ui/TagInput.svelte';

  const combat = $derived(gm.session!.combat);
  const party = $derived(partyFor(null));
  const gmName = $derived(gm.session!.state.gmName);

  let newType = $state<NpcType>('elite');
  let newName = $state('');
  let newCount = $state(3);
  let ambush = $state<'' | Side>('');
  let attackers = $state(1);
  let hurtZone = $state<ZoneKey>('torso');
  let secret = $state(false);
  let giftLevel = $state<GiftLevel>('stark');
  let giftDelay = $state(0);

  const types = rules.npc.leiter;
  const sideName = (s: Side) => (s === 'players' ? t('gm.common.sidePlayers') : t('gm.common.sideEnemies'));

  function start() { startCombat(combat, { ambush: ambush || undefined }); }
  function end() {
    if (!confirm(t('gm.common.confirmEnd'))) return;
    for (const p of gm.session!.players) if (p.character) patchPlayer(p.id, [{ op: 'set', key: 'momentum', value: 0 }]);
    endCombat(combat);
  }
  function setMarker(s: Side) { combat.marker = s; }
  function sideDone() { combat.side = otherSide(combat.side); }

  function addNpc() {
    const n = newNpc(uid(), newType, newName.trim() || undefined, newCount);
    combat.npcs.push(n);
    newName = '';
  }
  // Porträt: große Variante für die Karte, kleine für Token und Spieleransicht. Vorhandene Token ziehen mit.
  let portraitInput = $state<HTMLInputElement>();
  let portraitFor: Npc | null = null;
  function pickPortrait(n: Npc) { portraitFor = n; portraitInput?.click(); }
  async function onPortrait(e: Event & { currentTarget: HTMLInputElement }) {
    const f = e.currentTarget.files?.[0];
    const n = portraitFor;
    e.currentTarget.value = '';
    if (!f || !n) return;
    try {
      n.img = await imageToDataUrl(f, 256);
      n.token = await shrinkDataUrl(n.img, 96);
      syncTokenImages(n);
    } catch { pushToast(t('gm.combat.imageUnreadable'), 'warn'); }
  }
  function clearPortrait(n: Npc) { n.img = undefined; n.token = undefined; syncTokenImages(n); }
  function syncTokenImages(n: Npc) {
    for (const sc of gm.session!.scenes) {
      const ops = sc.tokens.filter((t) => t.npcId === n.id).map((t) => ({ op: 'tok' as const, token: { ...$state.snapshot(t), img: n.token } }));
      if (ops.length) gmMapOps(sc.id, ops);
    }
  }
  function addMove(n: Npc) { n.moves = [...(n.moves ?? []), { name: '', text: '' }]; }
  function removeMove(n: Npc, i: number) { n.moves = (n.moves ?? []).filter((_, j) => j !== i); }

  function removeNpc(id: string) { combat.npcs = combat.npcs.filter((n) => n.id !== id); delete combat.done[id]; }

  function goonHit(playerId: string) {
    const p = gm.session!.players.find((x) => x.id === playerId);
    if (!p?.character) return;
    const r = bedraengnisHit(combat.bedraengnis[playerId] ?? 0);
    combat.bedraengnis[playerId] = r.counter;
    if (r.result === 'erster') {
      patchPlayer(playerId, [{ op: 'add', key: p.character.resources.schutz.current > 0 ? 'schutz' : 'wk', delta: -1 }]);
    } else {
      patchPlayer(playerId, [{ op: 'injury', zone: hurtZone, text: t('gm.sit.why.goons') }]);
    }
  }
  const playerWins = (id: string) => { combat.bedraengnis[id] = 0; };

  function rollNpc(n: Npc) {
    roll2d6({ who: n.name, label: t('gm.combat.rollLabel', { type: n.type }), bonus: n.bonus + ueberzahlBonus(attackers), kind: 'attr', secret });
  }
  function hit(n: Npc) { npcNormalHit(n); }
  function addGift(n: Npc) { n.poisons = [...(n.poisons ?? []), newPoison(uid(), giftLevel, giftDelay, t('gm.combat.gmSource'))]; }
  function cure(n: Npc, id: string) {
    n.poisons = (n.poisons ?? []).filter((p) => p.id !== id);
    if (!n.poisons.some((p) => p.level === 'laehm')) n.tags = n.tags.filter((t) => !isTag(t, TAG.paralyzed));
  }
  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const defaultsOf = (t: NpcType) => types.find((x) => x.key === t)!;
</script>

<div class="stack">
  <section class="panel head">
    <div class="row">
      <h2>{t('gm.common.combat')}</h2>
      {#if combat.active}<span class="chip accent">{t('gm.common.round', { n: combat.round })}</span>{:else}<span class="chip">{t('gm.common.noCombat')}</span>{/if}
      <span class="spacer"></span>
      <button class="btn sm" onclick={poisonRound} title={t('gm.combat.poisonRoundTitle')}>{t('gm.combat.poisonRound')}</button>
      {#if !combat.active}
        <select bind:value={ambush} aria-label={t('gm.common.ambush')}><option value="">{t('gm.combat.startNormal')}</option><option value="players">{t('gm.combat.startPlayers')}</option><option value="enemies">{t('gm.combat.startEnemies')}</option></select>
        <button class="btn primary" onclick={start}>{t('gm.common.startCombat')}</button>
      {:else}
        <button class="btn primary" onclick={advanceRound} title={t('gm.common.nextRoundTitle')}>{t('gm.common.nextRound')}</button>
        <button class="btn danger" onclick={end}>{t('gm.combat.endCombat')}</button>
      {/if}
    </div>

    {#if combat.active}
      <div class="sides">
        <div class="marker">
          <span class="lbl">{t('gm.combat.markerAt')}</span>
          <div class="seg">
            <button class:on={combat.marker === 'players'} onclick={() => setMarker('players')}>{t('gm.combat.markerPlayers')}</button>
            <button class:on={combat.marker === 'enemies'} onclick={() => setMarker('enemies')}>{t('gm.combat.markerEnemies')}</button>
          </div>
          <small class="dim">{t('gm.combat.markerHint')}</small>
        </div>
        <div class="acting">
          <span class="lbl">{t('gm.common.onTurn')}</span>
          <b class="turn" class:en={combat.side === 'enemies'}>{sideName(combat.side)}</b>
          <button class="btn sm" onclick={sideDone}>{t('gm.combat.sideDone', { side: sideName(otherSide(combat.side)) })}</button>
        </div>
      </div>
    {/if}
  </section>

  <div class="cols">
    <section class="panel">
      <h2>{t('gm.combat.pcs')}</h2>
      <div class="row hz"><span class="dim">{t('gm.combat.pressureZone')}</span>
        <select bind:value={hurtZone} aria-label={t('gm.common.zone')}>{#each rules.tabellen.zonen as z}<option value={z.key}>{z.kurz}</option>{/each}</select>
      </div>
      {#each party.filter((p) => p.vitals) as p (p.id)}
        <div class="part" class:done={combat.done[p.id]}>
          <label class="check"><input type="checkbox" checked={!!combat.done[p.id]} onchange={(e) => (combat.done[p.id] = e.currentTarget.checked)} disabled={!combat.active} /> <b>{p.characterName || p.name}</b></label>
          <span class="chip amber" title={t('gm.common.pressure')}>{t('gm.common.pressureShort', { n: combat.bedraengnis[p.id] ?? 0 })}</span>
          <span class="spacer"></span>
          <button class="btn sm" onclick={() => goonHit(p.id)} title={t('gm.combat.goonHitTitle')}>{t('gm.combat.goonHit')}</button>
          <button class="btn sm" onclick={() => playerWins(p.id)} title={t('gm.combat.winTitle')}>{t('gm.combat.win')}</button>
        </div>
      {:else}
        <p class="dim">{t('gm.common.noSheets')}</p>
      {/each}
      <label class="check opt"><input type="checkbox" bind:checked={combat.showEnemies} /> {t('gm.combat.showEnemies')}</label>
    </section>

    <section class="panel">
      <h2>{t('gm.combat.addEnemies')}</h2>
      <div class="row">
        <select bind:value={newType} aria-label={t('gm.common.type')}>{#each types as ty}<option value={ty.key}>{t('gm.common.typeOption', { name: ty.name, n: ty.bonusMax })}</option>{/each}</select>
        <input bind:value={newName} placeholder={t('gm.common.nameOptional')} aria-label={t('gm.common.name')} />
        {#if newType === 'goon'}<Stepper bind:value={newCount} min={1} max={20} label={t('gm.common.count')} />{/if}
        <button class="btn primary" onclick={addNpc}>{t('gm.common.addEnemy')}</button>
      </div>
      <div class="row ueber">
        <span class="dim">{t('gm.combat.outnumbering')}</span>
        <Stepper bind:value={attackers} min={1} max={10} label={t('gm.combat.attackers')} />
        <span class="chip accent">{t('gm.combat.bonusChip', { n: ueberzahlBonus(attackers) })}</span>
        <label class="check"><input type="checkbox" bind:checked={secret} /> {t('gm.combat.secretRolls')}</label>
      </div>
    </section>
  </div>

  <div class="npcs">
    {#each combat.npcs as n (n.id)}
      {@const st = npcStatus(n)}
      <article class="panel npc" class:out={st.out} class:hid={n.hidden}>
        <div class="row">
          <button class="av" onclick={() => pickPortrait(n)} title={n.img ? t('gm.combat.portraitChange') : t('gm.combat.portraitAdd')} aria-label={t('gm.combat.portrait')}>
            {#if n.img}<img src={n.img} alt="" />{:else}<span>＋</span>{/if}
          </button>
          <input class="nm" bind:value={n.name} aria-label={t('gm.common.name')} />
          <span class="chip">{defaultsOf(n.type).name}</span>
          {#if st.out}<span class="chip danger" title={st.reason}>{t('gm.common.takenOut')}</span>{/if}
          {#if n.hidden}<span class="chip amber">{t('gm.common.hidden')}</span>{/if}
          <span class="spacer"></span>
          <label class="check"><input type="checkbox" checked={!!combat.done[n.id]} onchange={(e) => (combat.done[n.id] = e.currentTarget.checked)} disabled={!combat.active} /> {t('gm.common.acted')}</label>
        </div>
        {#if st.out}<small class="dim">{st.reason}</small>{/if}
        <div class="stats">
          <label class="s">{t('gm.combat.level')}<Stepper bind:value={n.level} min={0} max={10} label={t('gm.combat.level')} /></label>
          <label class="s">{t('gm.common.bonus')}<Stepper bind:value={n.bonus} min={-3} max={20} label={t('gm.common.bonus')} /></label>
          {#if n.type === 'goon'}
            <label class="s">{t('gm.combat.members')}<Stepper bind:value={n.count} min={0} max={30} label={t('gm.combat.members')} /></label>
          {:else}
            <label class="s">{t('gm.combat.protection')}<span class="pair"><Stepper bind:value={n.schutz} min={0} max={9} label={t('gm.combat.protection')} /><span class="dim">/</span><Stepper bind:value={n.schutzMax} min={0} max={9} label={t('gm.combat.protectionMax')} /></span></label>
            <label class="s">{t('gm.combat.wp')}<span class="pair"><Stepper bind:value={n.wk} min={0} max={n.wkMax} label={t('gm.combat.wp')} /><span class="dim">/</span><Stepper bind:value={n.wkMax} min={0} max={30} label={t('gm.combat.wpMax')} /></span></label>
            <label class="s">{t('gm.combat.energy')}<span class="pair"><Stepper bind:value={n.energie} min={-30} max={n.energieMax} label={t('gm.combat.energy')} /><span class="dim">/</span><Stepper bind:value={n.energieMax} min={0} max={30} label={t('gm.combat.energyMax')} /></span></label>
          {/if}
        </div>
        {#if n.type !== 'goon'}
          <div class="zones">
            {#each rules.tabellen.zonen as z}
              {@const c = n.injuries[z.key as ZoneKey] ?? 0}
              <span class="z" class:bad={c >= z.felder}>
                <button class="btn sm icon ghost" onclick={() => { n.injuries[z.key as ZoneKey] = Math.max(0, c - 1); }} disabled={!c} aria-label={t('gm.combat.healZone', { zone: z.kurz })}>−</button>
                <span>{z.kurz} {c}/{z.felder}</span>
                <button class="btn sm icon ghost" onclick={() => npcInjury(n, z.key as ZoneKey)} disabled={c >= z.felder} aria-label={t('gm.combat.hurtZone', { zone: z.kurz })}>+</button>
              </span>
            {/each}
          </div>
        {/if}
        <label class="field">{t('gm.combat.tags')}<TagInput bind:values={n.tags} label={t('gm.combat.tags')} placeholder={t('gm.common.tagExample', { tag: tagLabel('Am Boden') })} /></label>
        {#if n.type !== 'goon'}
          <div class="gift">
            {#each n.poisons ?? [] as pz (pz.id)}
              <div class="row gp">
                <span class="chip danger">{describePoison(pz)}</span><span class="spacer"></span>
                <button class="btn sm" onclick={() => cure(n, pz.id)} title={t('gm.combat.cureTitle')}>{t('gm.combat.cure', { n: antidoteMw(pz) })}</button>
              </div>
            {/each}
            <div class="row gp">
              <select bind:value={giftLevel} aria-label={t('gm.combat.poisonLevel')}>{#each GIFT_LEVELS as l}<option value={l}>{GIFT[l].label}</option>{/each}</select>
              <Stepper bind:value={giftDelay} min={0} max={MAX_GIFT_DELAY} label={t('gm.common.delayRounds')} />
              <button class="btn sm danger" onclick={() => addGift(n)}>{t('gm.combat.addPoison')}</button>
            </div>
          </div>
        {/if}
        <label class="field">{t('gm.combat.note')}<input bind:value={n.note} placeholder={t('gm.combat.notePlaceholder')} /></label>
        <details class="moves" open={!!n.moves?.length}>
          <summary>{t('gm.combat.moves', { n: n.moves?.length ?? 0 })}{#if n.img}<button class="btn sm ghost" onclick={(e) => { e.preventDefault(); clearPortrait(n); }} title={t('gm.combat.portraitRemove')}>{t('gm.combat.portraitRemove')}</button>{/if}</summary>
          {#each n.moves ?? [] as m, i}
            <div class="mv">
              <div class="row"><input class="mvn" bind:value={m.name} placeholder={t('gm.common.name')} aria-label={t('gm.combat.moveName')} /><button class="btn sm icon ghost" onclick={() => removeMove(n, i)} aria-label={t('gm.combat.moveRemove')}>×</button></div>
              <textarea bind:value={m.text} rows="2" placeholder={t('gm.combat.movePlaceholder')} aria-label={t('gm.combat.moveEffect')}></textarea>
            </div>
          {/each}
          <button class="btn sm" onclick={() => addMove(n)}>{t('gm.combat.addMove')}</button>
        </details>
        <div class="row">
          <button class="btn sm primary" onclick={() => rollNpc(n)} title={t('gm.combat.rollTitle')}>{t('gm.combat.roll', { mod: fmt(n.bonus + ueberzahlBonus(attackers)) })}</button>
          <button class="btn sm" onclick={() => hit(n)} title={n.type === 'goon' ? t('gm.combat.goonFallsTitle') : t('gm.combat.hitTitle')}>{n.type === 'goon' ? t('gm.combat.goonFalls') : t('gm.combat.hit')}</button>
          <label class="check"><input type="checkbox" bind:checked={n.hidden} /> {t('gm.common.hidden')}</label>
          <span class="spacer"></span>
          <button class="btn sm danger" onclick={() => removeNpc(n.id)}>{t('gm.common.remove')}</button>
        </div>
      </article>
    {/each}
  </div>
  {#if !combat.npcs.length}<p class="dim">{t('gm.combat.empty')}</p>{/if}
</div>

<input type="file" accept="image/*" bind:this={portraitInput} onchange={onPortrait} hidden />

<style>
  .head .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
  .head select { width: auto; max-width: 340px; }
  .lbl { display: block; font: 600 0.74rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 0.3rem; }
  .seg { display: flex; margin-bottom: 0.4rem; }
  .seg button { flex: 1; padding: 0.7em; font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; background: var(--raised); border: 1px solid var(--line-strong); color: var(--ink-dim); cursor: pointer; }
  .seg button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); box-shadow: var(--hard-shadow); }
  .seg button:nth-child(2).on { background: var(--danger); border-color: var(--danger); color: #1a0008; }
  .turn { font: 400 2.8rem/1 var(--font-display); color: var(--accent); letter-spacing: 0.06em; display: block; margin-bottom: 0.4rem; }
  .turn.en { color: var(--danger); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .part { display: flex; gap: 0.5rem; align-items: center; padding: 0.45rem 0.2rem; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .part.done { opacity: 0.5; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.92rem; }
  .opt { margin-top: 0.6rem; color: var(--ink-dim); }
  .hz { margin-bottom: 0.4rem; }
  .hz select { width: auto; min-height: 30px; padding: 0.2em 0.4em; }
  .ueber { margin-top: 0.7rem; }
  .npcs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(380px, 100%), 1fr)); gap: 1rem; }
  .npc { display: grid; gap: 0.6rem; border-left: 3px solid var(--danger); }
  .npc.out { opacity: 0.55; }
  .npc.hid { border-left-style: dashed; }
  .nm { font: 400 1.5rem var(--font-display); letter-spacing: 0.05em; flex: 1; min-width: 120px; }
  .av { width: 56px; height: 56px; flex: none; padding: 0; border: 1px solid var(--line); background: var(--raised); color: var(--ink-dim); font-size: 1.4rem; cursor: pointer; overflow: hidden; }
  .av img { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
  .av:hover { border-color: var(--accent); }
  .moves { border: 1px solid var(--line); padding: 0.3rem 0.5rem; }
  .moves summary { cursor: pointer; font: 600 0.78rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); display: flex; justify-content: space-between; align-items: center; }
  .mv { display: grid; gap: 4px; margin: 0.4rem 0; }
  .mvn { flex: 1; font-weight: 600; }
  .mv textarea { width: 100%; resize: vertical; }
  .stats { display: flex; gap: 0.8rem; flex-wrap: wrap; }
  .s { display: grid; gap: 3px; font: 600 0.7rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .pair { display: flex; align-items: center; gap: 4px; }
  .gift { display: grid; gap: 4px; }
  .gp { flex-wrap: wrap; }
  .gp select { width: auto; min-height: 30px; padding: 0.15em 0.4em; }
  .zones { display: flex; flex-wrap: wrap; gap: 4px; }
  .z { display: inline-flex; align-items: center; gap: 2px; font: 600 0.78rem var(--font-head); letter-spacing: 0.06em; text-transform: uppercase; padding: 0 2px; border: 1px solid var(--line); }
  .z.bad { border-color: var(--danger); color: var(--danger); }
  @media (max-width: 900px) { .cols, .head .sides { grid-template-columns: 1fr; } }
</style>
