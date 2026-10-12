<script lang="ts">
  import { ATTR_KEYS, GIFT, OUTCOME_LABEL, areaOfEffects, giftOfEffects, rules, tagLabel, type AttrKey, type ZoneKey } from '../rules';
  import type { Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import { player, sendPlan, cancelPlan, sendBulletChoice } from '../net/player.svelte';
  import { roll2d6, rollLog } from '../dice/roller.svelte';
  import { settings } from '../lib/settings.svelte';
  import { pushToast } from '../ui/toasts.svelte';
  import { BT_LABEL, KIND_LABEL, type BtOption, type PlayerSituation } from '../gm/situation';
  import { ROUGH_LABEL } from '../gm/combat';
  import { moveUse } from '../sheet/moveUse.svelte';
  import MovePayBar from '../sheet/MovePayBar.svelte';
  import { t, tn } from '../i18n';

  let { char, target = $bindable(null) }: { char: Character | null; target: string | null } = $props();

  const combat = $derived(player.state?.combat ?? null);
  const sheet = $derived(char ? computeSheet(char) : null);
  const enemies = $derived(combat?.enemies.filter((e) => !e.out) ?? []);
  const enemy = $derived(enemies.find((e) => e.id === target) ?? null);
  const mine = $derived(player.sits.filter((s) => s.status !== 'cancelled'));
  const busy = $derived(mine.some((s) => s.kind !== 'defend' && s.round === combat?.round && s.status !== 'resolved'));
  const acted = $derived(!!combat?.done.includes(player.playerId));
  const attrName = (a: AttrKey) => rules.tabellen.attribute.find((x) => x.key === a)?.name ?? a;
  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const enemyName = (id: string | null) => combat?.enemies.find((e) => e.id === id)?.name ?? t('pages.combatPlan.enemy');

  let kind = $state<'attack' | 'breath' | 'gather'>('attack');
  let attr = $state<AttrKey>('gewalt');
  let technique = $state('');
  let moveId = $state('');
  let tagsUsed = $state<string[]>([]);

  const move = $derived(char?.moves.find((m) => m.id === moveId) ?? null);
  const gift = $derived(move ? giftOfEffects(move.effects.map((e) => e.id)) : null);
  const area = $derived(move ? areaOfEffects(move.effects.map((e) => e.id)) : null);
  const tagBonus = $derived.by(() => {
    if (!enemy) return 0;
    let s = 0;
    let l = 0;
    for (const tg of enemy.tags) if (tagsUsed.includes(tg.name)) { if (tg.size === 'gross') l++; else s++; }
    return Math.min(rules.tabellen.tags.stapelMax, s * rules.tabellen.tags.klein + l * rules.tabellen.tags.gross);
  });
  $effect(() => { target; tagsUsed = []; });
  $effect(() => { if (move) attr = move.attr; });

  function toggleTag(n: string) {
    const i = tagsUsed.indexOf(n);
    if (i >= 0) tagsUsed.splice(i, 1);
    else tagsUsed.push(n);
  }
  function send() {
    if (kind === 'attack' && !enemy) return;
    sendPlan({
      kind, npcId: kind === 'attack' ? target : null, attr, technique: technique.trim(), moveName: move?.name ?? '',
      tagsUsed: kind === 'attack' ? [...tagsUsed] : [], gift: gift && kind === 'attack' ? { level: gift, delay: move?.giftDelay ?? 0 } : undefined,
      area: area && kind === 'attack' ? area : undefined,
    });
    technique = '';
    tagsUsed = [];
  }

  // ---- Würfeln (nach der Freigabe) ----
  let defAttr = $state<AttrKey>('fluss');
  let hero = $state(false);
  function rollSit(s: PlayerSituation) {
    if (!char || !sheet) return;
    const a = s.kind === 'defend' ? defAttr : s.attr;
    if (hero && s.kind === 'defend') {
      if (char.resources.momentum < 3) { pushToast(t('pages.combatPlan.heroCost'), 'warn'); return; }
      char.resources.momentum -= 3;
    }
    roll2d6({
      who: settings.displayName || char.name, characterId: char.id, kind: 'clash', bonus: sheet.basicBonus[a], mod: s.rollMod, sit: s.id,
      hero: hero && s.kind === 'defend' ? true : undefined,
      label: `${KIND_LABEL[s.kind]}: ${s.kind === 'defend' ? t('pages.combatPlan.rollAgainst', { name: enemyName(s.npcId) }) : s.technique || enemyName(s.npcId)}`,
    });
    hero = false;
  }
  let zone = $state<ZoneKey>('torso');
  const choose = (s: PlayerSituation, o: BtOption) => sendBulletChoice(s.id, o, o === 'zone' ? zone : undefined);

  // ---- Move einsetzen (nach dem Wurf, 3.12) ----
  let payMove = $state('');
  function useMove(s: PlayerSituation) {
    if (!char || !payMove) return;
    const rec = rollLog.entries.find((r) => r.sit === s.id && r.characterId === char.id);
    moveUse.pending = { charId: char.id, moveId: payMove, total: rec?.total ?? 0 };
  }
  const statusText: Record<PlayerSituation['status'], string> = {
    planned: t('pages.combatPlan.statusPlanned'), released: t('pages.combatPlan.statusReleased'), rolled: t('pages.combatPlan.statusRolled'), resolved: t('pages.combatPlan.statusResolved'), cancelled: '',
  };
</script>

{#if combat?.active}
  <section class="panel plan">
    <div class="row">
      <h2>{t('pages.combatPlan.myAction')}</h2><span class="spacer"></span>
      {#if acted}<span class="chip">{t('pages.combatPlan.acted')}</span>{/if}
    </div>

    {#if !char || !sheet}
      <p class="dim">{t('pages.combatPlan.noSheet')}</p>
    {:else if busy || acted}
      <p class="dim">{t('pages.combatPlan.oneAction')}</p>
    {:else}
      <div class="kinds">
        <button class="chip" class:on={kind === 'attack'} onclick={() => (kind = 'attack')}>{t('pages.combatPlan.kindAttack')}</button>
        <button class="chip" class:on={kind === 'breath'} onclick={() => (kind = 'breath')} title={t('pages.combatPlan.breathTitle')}>{t('pages.combatPlan.breath')}</button>
        <button class="chip" class:on={kind === 'gather'} onclick={() => (kind = 'gather')} title={t('pages.combatPlan.gatherTitle')}>{t('pages.combatPlan.gather')}</button>
      </div>
      {#if kind === 'attack'}
        <label class="field">{t('pages.combatPlan.target')}
          <select bind:value={target}>
            <option value={null}>{t('pages.combatPlan.targetNone')}</option>
            {#each enemies as e}<option value={e.id}>{e.name} · {ROUGH_LABEL[e.state]}</option>{/each}
          </select>
        </label>
        {#if enemy}
          <div class="tags">
            <span class="lbl">{t('pages.combatPlan.enemyTags')}</span>
            {#each enemy.tags as tg (tg.name)}
              <button class="chip tg" class:on={tagsUsed.includes(tg.name)} class:big={tg.size === 'gross'} onclick={() => toggleTag(tg.name)}>{tagLabel(tg.name)} {tg.size === 'gross' ? '+2' : '+1'}</button>
            {:else}<span class="dim">{t('pages.combatPlan.none')}</span>{/each}
            {#if tagBonus}<span class="chip accent">+{tagBonus}</span>{/if}
          </div>
        {/if}
        <div class="row">
          <label class="field grow">{t('pages.combatPlan.technique')}<input bind:value={technique} placeholder={t('pages.combatPlan.techniquePh')} /></label>
          <label class="field">{t('pages.combatPlan.attribute')}
            <select bind:value={attr}>{#each ATTR_KEYS as a}<option value={a}>{attrName(a)} {fmt(sheet.basicBonus[a])}</option>{/each}</select>
          </label>
        </div>
        <label class="field">{t('pages.combatPlan.markMove')}
          <select bind:value={moveId}><option value="">{t('pages.combatPlan.noMove')}</option>{#each char.moves as m}<option value={m.id}>{m.name}</option>{/each}</select>
        </label>
        {#if area}<small class="dim"><span class="chip accent">{area === 'flaeche' ? t('pages.combatPlan.area') : t('pages.combatPlan.multi')}</span> {t('pages.combatPlan.areaNote')}</small>{/if}
        {#if gift}<small class="dim"><span class="chip danger">{t('pages.combatPlan.poison', { level: GIFT[gift].label })}</span> {tn('pages.combatPlan.poisonDelay', move?.giftDelay ?? 0)} {t('pages.combatPlan.poisonNote')}</small>{/if}
      {:else}
        <small class="dim">{kind === 'breath' ? t('pages.combatPlan.breathInfo') : t('pages.combatPlan.gatherInfo')} {t('pages.combatPlan.nextClash')}</small>
      {/if}
      <div class="row"><button class="btn primary" onclick={send} disabled={kind === 'attack' && !enemy}>{t('pages.combatPlan.send')}</button></div>
    {/if}
  </section>

  {#if mine.length}
    <section class="panel plan">
      <h2>{t('pages.combatPlan.situations')}</h2>
      {#each mine as s (s.id)}
        <article class="sit" class:def={s.kind === 'defend'}>
          <header>
            <b>{s.kind === 'defend' ? t('pages.combatPlan.attacksYou', { name: enemyName(s.npcId) }) : s.kind === 'attack' ? t('pages.combatPlan.attackOn', { name: enemyName(s.npcId) }) : KIND_LABEL[s.kind]}</b>
            <span class="chip amber">{statusText[s.status]}</span>
          </header>
          {#if s.technique}<p class="tech">{t('pages.common.quoted', { text: s.technique })} <span class="dim">({attrName(s.attr)}{s.moveName ? ` · ${s.moveName}` : ''})</span></p>{/if}
          {#if s.tagsUsed.length}<small class="dim">{t('pages.combatPlan.tagsUsed', { tags: s.tagsUsed.map(tagLabel).join(', ') })}</small>{/if}
          {#if s.mod || s.modReason}<small class="mod" class:neg={s.mod < 0}>{s.mod > 0 ? t('pages.combatPlan.modEasier') : s.mod < 0 ? t('pages.combatPlan.modHarder') : t('pages.combatPlan.modNote')} {s.mod ? fmt(s.mod) : ''} {s.modReason}</small>{/if}
          {#if s.gift}<small class="dim"><span class="chip danger">{t('pages.combatPlan.poison', { level: GIFT[s.gift.level].label })}</span></small>{/if}

          {#if s.bullet}
            <div class="bt">
              <b>Bullet Time!</b>
              {#if s.bullet.option}
                <span>{BT_LABEL[s.bullet.option]}{s.bullet.zone ? ` (${rules.tabellen.zonen.find((z) => z.key === s.bullet?.zone)?.kurz})` : ''}</span>
              {:else}
                <div class="row">
                  <button class="btn sm primary" onclick={() => choose(s, 'zone')}>{t('pages.combatPlan.zoneChoice')}</button>
                  <select bind:value={zone} aria-label={t('pages.combatPlan.zone')}>{#each rules.tabellen.zonen as z}<option value={z.key as ZoneKey}>{z.kurz}</option>{/each}</select>
                  <button class="btn sm primary" onclick={() => choose(s, 'ep')}>+1 EP</button>
                  <button class="btn sm primary" onclick={() => choose(s, 'momentum')}>+1 Momentum</button>
                </div>
              {/if}
            </div>
          {/if}

          {#if (s.kind === 'attack' || s.kind === 'defend') && s.status === 'released' && !s.rolled && char && sheet}
            {#if s.kind === 'defend'}
              <div class="row">
                <label class="field">{t('pages.combatPlan.defendWith')}
                  <select bind:value={defAttr}>{#each ATTR_KEYS as a}<option value={a}>{attrName(a)} {fmt(sheet.basicBonus[a])}</option>{/each}</select>
                </label>
                <label class="check"><input type="checkbox" bind:checked={hero} /> {t('pages.combatPlan.heroCheck')}</label>
              </div>
            {/if}
            <button class="btn primary" onclick={() => rollSit(s)}>{t('pages.combatPlan.roll')} {fmt(sheet.basicBonus[s.kind === 'defend' ? defAttr : s.attr])}{s.rollMod ? ` ${fmt(s.rollMod)}` : ''}</button>
          {:else if s.rolled && !s.summary}
            <small class="dim">{t('pages.combatPlan.rolledWait')}</small>
          {/if}

          {#if s.summary}
            <p class="res"><b>{OUTCOME_LABEL[s.summary.outcome]}</b> <span class="dim">Δ {s.summary.delta > 0 ? '+' : ''}{s.summary.delta}{s.summary.note ? ` · ${s.summary.note}` : ''}</span></p>
            {#if s.kind === 'attack' && char && s.summary.outcome !== 'konter' && s.summary.outcome !== 'perfekterKonter'}
              <div class="row">
                <select bind:value={payMove} aria-label={t('pages.combatPlan.useMove')}><option value="">{t('pages.combatPlan.useMoveOption')}</option>{#each char.moves as m}<option value={m.id}>{m.name}</option>{/each}</select>
                <button class="btn sm" onclick={() => useMove(s)} disabled={!payMove}>{t('pages.combatPlan.pickMove')}</button>
              </div>
              {#each char.moves.filter((m) => m.id === payMove) as m (m.id)}<MovePayBar {char} move={m} />{/each}
            {/if}
          {/if}

          {#if (s.status === 'planned' || s.status === 'released') && !s.rolled && s.kind !== 'defend'}
            <button class="btn sm ghost danger" onclick={() => cancelPlan(s.id)}>{t('pages.combatPlan.withdraw')}</button>
          {/if}
        </article>
      {/each}
    </section>
  {/if}
{/if}

<style>
  .plan { display: grid; gap: 0.6rem; margin-bottom: 1rem; border-color: var(--accent); }
  .kinds { display: flex; gap: 6px; flex-wrap: wrap; }
  .kinds .chip { cursor: pointer; padding: 0.5em 0.9em; }
  .chip.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent); }
  .tags { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .tg { cursor: pointer; background: transparent; }
  .tg.big.on { background: var(--accent-2-soft); border-color: var(--accent-2); color: var(--accent-2); }
  .lbl { font: 600 0.68rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .grow { flex: 1; min-width: 180px; }
  .row { gap: 0.6rem; flex-wrap: wrap; align-items: end; }
  .sit { display: grid; gap: 0.5rem; padding: 0.7rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .sit.def { border-left-color: var(--danger); }
  header { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
  header b { font: 600 1rem var(--font-head); letter-spacing: 0.06em; text-transform: uppercase; }
  .tech { margin: 0; }
  .mod { color: var(--accent); }
  .mod.neg { color: var(--danger); }
  .bt { display: grid; gap: 0.4rem; padding: 0.5rem; background: var(--accent-2-soft); border-left: 3px solid var(--accent-2); }
  .bt b { font: 600 1.1rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-2); }
  .res { margin: 0; }
  .res b { color: var(--accent-2); font: 600 1.1rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.9rem; }
  select { width: auto; min-height: 32px; padding: 0.2em 0.4em; }
  .field select { width: 100%; }
</style>
