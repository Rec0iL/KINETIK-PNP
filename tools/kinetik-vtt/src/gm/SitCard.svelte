<script lang="ts">
  import { rules, OUTCOME_LABEL, GIFT, GIFT_LEVELS, MAX_GIFT_DELAY, type GiftLevel, type ZoneKey } from '../rules';
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
  const pcName = $derived(player?.character?.name || player?.name || 'Spieler');
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
    return `Abstand ${m.cells.toFixed(1).replace('.0', '')} Felder (${m.units.toFixed(1).replace('.0', '')} ${scene.grid.unit})`;
  });

  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const zones = rules.tabellen.zonen;
  const statusLabel: Record<Situation['status'], string> = {
    planned: 'geplant', released: 'freigegeben', rolled: 'bereit zur Abwicklung', resolved: 'abgewickelt', cancelled: 'verworfen',
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
    <b>{sit.kind === 'defend' ? `${npc?.name ?? 'Gegner'} → ${pcName}` : sit.kind === 'attack' ? `${pcName} → ${npc?.name ?? '?'}` : pcName}</b>
    <span class="chip" class:accent={sit.kind === 'attack'} class:danger={sit.kind === 'defend'}>{KIND_LABEL[sit.kind]}</span>
    <span class="chip amber">{statusLabel[sit.status]}</span>
    {#if sit.bullet}<span class="chip accent" title={sit.bullet.option ? BT_LABEL[sit.bullet.option] : 'Spieler wählt noch'}>Bullet Time{sit.bullet.option ? `: ${sit.bullet.option === 'zone' ? 'Zone' : sit.bullet.option === 'ep' ? '+1 EP' : '+1 Mom.'}` : ' …'}</span>{/if}
  </header>

  {#if sit.technique}<p class="tech">„{sit.technique}“ <span class="dim">({rules.tabellen.attribute.find((a) => a.key === sit.attr)?.name ?? sit.attr}{sit.moveName ? ` · Move ${sit.moveName}` : ''})</span></p>{/if}
  {#if distance}<small class="dim">{distance}</small>{/if}

  {#if sit.kind === 'attack' || sit.kind === 'defend'}
    {#if tagPool.length}
      <div class="tags">
        <span class="lbl">Tags {sit.kind === 'attack' ? 'des Gegners' : 'des Spielers'}</span>
        {#each tagPool as t (t.name)}
          <button class="chip tg" class:on={sit.tagsUsed.includes(t.name)} class:big={t.size === 'gross'} onclick={() => toggleTag(t.name)} disabled={!editable} title={t.size === 'gross' ? 'groß +2' : 'klein +1'}>{t.name} {t.size === 'gross' ? '+2' : '+1'}</button>
        {/each}
      </div>
    {/if}
    <div class="row mods">
      <label class="s">Erleichtern / Erschweren<Stepper bind:value={sit.mod} min={-9} max={9} label="Modifikator" disabled={!editable} /></label>
      <input class="reason" bind:value={sit.modReason} placeholder="Grund (z.B. Deckung, Dunkelheit)" aria-label="Grund" disabled={!editable} />
    </div>
    {#if sit.kind === 'defend'}
      <label class="s">Angreifer (Überzahl)<Stepper bind:value={sit.attackers} min={1} max={10} label="Angreifer" disabled={!editable && sit.status !== 'released'} /></label>
    {/if}
    {#if sit.area}<p class="dim"><span class="chip accent">{sit.area === 'flaeche' ? 'Fläche' : 'Mehrere Ziele'}</span> weitere Ziele würfeln einzeln (3.14)</p>{/if}
    <div class="row gift">
      <label class="s">Gift<select value={sit.gift?.level ?? ''} onchange={(e) => setGiftLevel(e.currentTarget.value)} disabled={sit.status === 'resolved' || sit.status === 'cancelled'} aria-label="Gift">
        <option value="">kein Gift</option>
        {#each GIFT_LEVELS as l}<option value={l}>{GIFT[l].label} (MW {GIFT[l].mw})</option>{/each}
      </select></label>
      {#if sit.gift}
        <label class="s">Verzögerung<Stepper bind:value={sit.gift.delay} min={0} max={MAX_GIFT_DELAY} label="Verzögerung in Runden" /></label>
        <label class="check"><input type="checkbox" bind:checked={sit.gift.ignoresSchutz} /> Schutz ignoriert</label>
      {/if}
    </div>
    <div class="rolls">
      <span class:ok={!!sit.pRoll}>{pcName}: {sit.pRoll ? `${sit.pRoll.dice + sit.pRoll.bonus + sit.pRoll.mod} (2W6 ${sit.pRoll.dice}, ${fmt(sit.pRoll.bonus)}${sit.pRoll.mod ? `, ${fmt(sit.pRoll.mod)}` : ''})` : `wartet · Bonus ${fmt(pcBonus)}, Mod. ${fmt(pMod)}`}</span>
      <span class:ok={!!sit.nRoll}>{npc?.name ?? 'Gegner'}: {sit.nRoll ? `${sit.nRoll.dice + sit.nRoll.bonus + sit.nRoll.mod} (2W6 ${sit.nRoll.dice}, ${fmt(sit.nRoll.bonus)}${sit.nRoll.mod ? `, ${fmt(sit.nRoll.mod)}` : ''})` : `wartet · Bonus ${fmt(npc?.bonus ?? 0)}, Mod. ${fmt(nMod)}`}</span>
    </div>
  {/if}

  {#if sit.result}
    <p class="res"><b>{OUTCOME_LABEL[sit.result.outcome]}</b> <span class="dim">Δ {sit.result.delta > 0 ? '+' : ''}{sit.result.delta}{sit.result.heldenSchwelle ? ' · Helden-Schwelle' : ''}{sit.result.limited ? ' · Außer Reichweite' : ''}{sit.hero ? ' · Heldenhafte Gegenwehr' : ''}</span></p>
  {/if}

  {#if sit.proposal && sit.status === 'rolled'}
    <ul class="prop">
      {#each sit.proposal as it (it.id)}
        <li class:off={!it.on}>
          <label class="check"><input type="checkbox" checked={it.on} onchange={(e) => toggleItem(it, e.currentTarget.checked)} /> {it.label}</label>
          {#if hasZone(it.effect)}
            <select bind:value={it.effect.zone} aria-label="Zone">{#each zones as z}<option value={z.key as ZoneKey}>{z.kurz}</option>{/each}</select>
          {/if}
          {#if it.effect.k === 'goonOut'}
            <div class="toks">
              {#each groupTokens(it.effect.npcId) as t (t.id)}
                <button class="chip tg" class:on={it.effect.tokenIds.includes(t.id)} onclick={() => toggleToken(it.effect as Extract<Effect, { k: 'goonOut' }>, t.id)}>{t.name}</button>
              {/each}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <footer class="row">
    {#if sit.status === 'planned'}
      <button class="btn sm primary" onclick={() => releaseSit(sit.id)}>Freigeben</button>
    {/if}
    {#if (sit.kind === 'attack' || sit.kind === 'defend') && (sit.status === 'released' || sit.status === 'planned') && npc && !sit.nRoll}
      <button class="btn sm amber" onclick={() => rollNpcFor(sit.id)}>{npc.name} würfeln {fmt((npc?.bonus ?? 0) + nMod)}</button>
    {/if}
    {#if sit.status === 'released' && !sit.pRoll && (sit.kind === 'attack' || sit.kind === 'defend') && absent}
      <button class="btn sm" onclick={() => rollPlayerFor(sit.id)}>Für {pcName} würfeln</button>
    {/if}
    {#if (sit.kind === 'attack' || sit.kind === 'defend') && !sit.bullet && ['planned', 'released', 'rolled'].includes(sit.status)}
      <button class="btn sm" onclick={() => grantBullet(sit.id)} disabled={!canGrantBulletTime(combat, sit.playerId)} title="Höchstens einmal pro Spieler und Runde (3.9)">Bullet Time</button>
    {/if}
    {#if sit.status === 'rolled'}
      <button class="btn sm primary" onclick={() => applySit(sit.id)}>Anwenden</button>
      {#if sit.result}<button class="btn sm ghost" onclick={() => refreshProposal(sit.id)} title="Vorschlag neu berechnen (setzt die Häkchen zurück)">Neu berechnen</button>{/if}
    {/if}
    {#if sit.status !== 'resolved' && sit.status !== 'cancelled'}
      <span class="spacer"></span>
      <button class="btn sm ghost danger" onclick={() => cancelSit(sit.id)}>Verwerfen</button>
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
