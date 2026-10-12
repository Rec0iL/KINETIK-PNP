<script lang="ts">
  import {
    rules, actionBonus, probeChance, resolveClash, resolveHit, OUTCOME_LABEL, parseFormula,
    type AttrKey, type ClashResult,
  } from '../rules';
  import type { Snippet } from 'svelte';
  import type { Character } from '../model/character';
  import type { PlayerInfo } from '../net/protocol';
  import { computeSheet } from '../model/sheet';
  import {
    rollLog, roll2d6, rollManual, rollFormula, clearLog, linkClash, type RollRecord,
  } from '../dice/roller.svelte';
  import { settings } from '../lib/settings.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import RollSummary from '../ui/RollSummary.svelte';
  import { t, fmtNumber } from '../i18n';

  let { char, isGm = false, canSecret = false, who: whoProp = '', party = [], entryActions }: {
    char?: Character; isGm?: boolean; canSecret?: boolean; who?: string; party?: PlayerInfo[]; entryActions?: Snippet<[RollRecord]>;
  } = $props();
  let secret = $state(false);

  type Mode = 'probe' | 'clash' | 'free';
  let mode = $state<Mode>('probe');

  const who = $derived(whoProp || settings.displayName || char?.name || (isGm ? t('sheet.roll.gm') : t('sheet.roll.player')));
  const attrs = rules.tabellen.attribute;
  const sheet = $derived(char ? computeSheet(char) : undefined);

  // --- gemeinsame Auswahl: Attribut + Titel ---
  let attr = $state<AttrKey>('fluss');
  let titleId = $state('none');
  let mod = $state(0);
  let manualBonus = $state(0);

  const title = $derived(char?.titles.find((t) => t.id === titleId));
  const bonus = $derived(
    char
      ? actionBonus(char.attributes, attr, title ? [title] : [])
      : manualBonus,
  );
  const optionBonus = (id: string) => {
    if (!char) return 0;
    const ti = char.titles.find((x) => x.id === id);
    return actionBonus(char.attributes, attr, ti ? [ti] : []);
  };
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));

  // --- Probe ---
  let mw = $state(0);
  let tableDice = $state(false);
  let sum = $state(7);
  let last = $state<RollRecord | null>(null);
  const chance = $derived(mw ? probeChance(bonus + mod, mw) : null);
  const label = $derived(`${attrs.find((a) => a.key === attr)!.name}${title ? ` (${title.name})` : ''}`);

  function doRoll() {
    last = tableDice
      ? rollManual({ who, characterId: char?.id, label, bonus, mod, mw: mw || undefined, sum, secret })
      : roll2d6({ who, characterId: char?.id, label, bonus, mod, mw: mw || undefined, secret });
  }

  // --- Clash ---
  let role = $state<'attacker' | 'defender'>('attacker');
  let oppName = $state(t('sheet.roll.opponent'));
  let oppBonus = $state(2);
  let oppMod = $state(0);
  let oppPlayer = $state(false);
  let oppManual = $state(false);
  let oppSum = $state(7);
  let hero = $state(false);
  let clash = $state<{ me: RollRecord; opp: RollRecord; res: ClashResult; role: 'attacker' | 'defender' } | null>(null);
  let schutz = $state(0);
  let durchschlag = $state(1);
  let ignoriert = $state(false);

  function doClash() {
    const me = roll2d6({ who, characterId: char?.id, label: `Clash: ${label}`, bonus, mod, kind: 'clash', secret });
    const meSum = me.dice[0].value + me.dice[1].value;
    const opp = oppManual
      ? rollManual({ who: oppName, label: 'Clash', bonus: oppBonus, mod: oppMod, sum: oppSum, kind: 'clash', secret })
      : roll2d6({ who: oppName, label: 'Clash', bonus: oppBonus, mod: oppMod, kind: 'clash', secret });
    const oppDice = oppManual ? oppSum : opp.dice[0].value + opp.dice[1].value;
    const meSide = { dice: meSum, bonus, mod, isPlayer: !isGm };
    const oppSide = { dice: oppDice, bonus: oppBonus, mod: oppMod, isPlayer: oppPlayer };
    const res = resolveClash({
      attacker: role === 'attacker' ? meSide : oppSide,
      defender: role === 'attacker' ? oppSide : meSide,
      heldenhafteGegenwehr: hero,
    });
    const linked = linkClash(me, opp, res);
    clash = { me, opp: linked, res, role };
  }

  const hit = $derived.by(() => {
    if (!clash) return null;
    const r = clash.res;
    const attackerHits = r.outcome === 'dominanz' || r.outcome === 'schlagabtausch';
    const dominant = r.outcome === 'dominanz' || r.outcome === 'perfekterKonter';
    const t = attackerHits ? r.tA : r.tV;
    const delta = attackerHits ? r.delta : -r.delta;
    return {
      attackerHits,
      res: resolveHit({ outcome: r.outcome, delta, t, schutz, durchschlag, schutzIgnoriert: ignoriert }),
      dominant,
    };
  });

  const meRewards = $derived(clash && clash.res.rewards && clash.res.rewards.side === clash.role ? clash.res.rewards : null);
  function applyRewards() {
    if (!char || !meRewards || !sheet) return;
    char.resources.momentum = Math.min(sheet.momentumCap.value, char.resources.momentum + meRewards.momentum);
    if (meRewards.energie) char.resources.energie = Math.min(sheet.energieMax.value, char.resources.energie + meRewards.energie);
    if (meRewards.wk) char.resources.wk = Math.min(sheet.wkMax.value, char.resources.wk + meRewards.wk);
  }
  function payHero() {
    if (!char) return;
    if (char.resources.momentum < 3) { alert(t('sheet.roll.heroCost')); return; }
    char.resources.momentum -= 3;
    hero = true;
  }

  // --- Frei ---
  let formula = $state('2d6');
  let freeLabel = $state('');
  let freeError = $state('');
  const quick = ['d4', 'd6', '2d6', 'd8', 'd10', 'd12', 'd20', 'd100'];
  function doFree(f = formula) {
    try {
      parseFormula(f);
      freeError = '';
      formula = f;
      last = rollFormula({ who, characterId: char?.id, label: freeLabel, formula: f, secret });
    } catch (e) {
      freeError = (e as Error).message;
    }
  }

  const filteredLog = $derived(rollLog.entries.slice(0, 40));
</script>

<div class="stack">
  <section class="panel">
    <div class="tabs" role="tablist" aria-label={t('sheet.roll.modeAria')}>
      <button role="tab" aria-selected={mode === 'probe'} onclick={() => (mode = 'probe')}>{t('sheet.roll.check')}</button>
      <button role="tab" aria-selected={mode === 'clash'} onclick={() => (mode = 'clash')}>{t('sheet.roll.clashCalc')}</button>
      <button role="tab" aria-selected={mode === 'free'} onclick={() => (mode = 'free')}>{t('sheet.roll.free')}</button>
    </div>

    {#if canSecret}
      <label class="check secret"><input type="checkbox" bind:checked={secret} /> {t('sheet.roll.secret')}</label>
    {/if}

    {#if mode !== 'free'}
      <div class="row sel">
        <label class="field">{t('sheet.common.attribute')}
          <select bind:value={attr}>{#each attrs as a}<option value={a.key}>{a.name}{char ? ` (${fmt(char.attributes[a.key as AttrKey])})` : ''}</option>{/each}</select>
        </label>
        {#if char}
          <label class="field">{t('sheet.roll.titleCovers')}
            <select bind:value={titleId}>
              <option value="none">{t('sheet.roll.noTitle', { b: fmt(optionBonus('none')) })}</option>
              {#each char.titles as ti}<option value={ti.id}>{ti.name} ({fmt(optionBonus(ti.id))})</option>{/each}
            </select>
          </label>
        {:else}
          <label class="field">Bonus<Stepper bind:value={manualBonus} min={-5} max={20} label="Bonus" /></label>
        {/if}
        <label class="field">{t('sheet.roll.modifier')}<Stepper bind:value={mod} min={-9} max={9} label={t('sheet.roll.modifier')} /></label>
        <div class="bonus"><span class="lbl">{t('sheet.roll.totalBonus')}</span><b>{fmt(bonus + mod)}</b></div>
      </div>
    {/if}

    {#if mode === 'probe'}
      <div class="row sel">
        <label class="field">{t('sheet.roll.difficulty')}
          <select bind:value={mw}>
            <option value={0}>{t('sheet.roll.noDc')}</option>
            {#each rules.tabellen.mw as m}<option value={m.mw}>{t('sheet.roll.dcOption', { name: m.name, mw: m.mw })}</option>{/each}
            {#each rules.tabellen.wachsamkeit.filter((w) => w.mw === 7 || w.mw === 9 || w.mw === 11) as w}<option disabled>{t('sheet.roll.alertOption', { name: w.name, mw: w.mw })}</option>{/each}
          </select>
        </label>
        <label class="check"><input type="checkbox" bind:checked={tableDice} /> {t('sheet.roll.tableDice')}</label>
        {#if tableDice}<label class="field">{t('sheet.roll.diceSum')}<Stepper bind:value={sum} min={2} max={12} label={t('sheet.roll.diceSum')} /></label>{/if}
        <button class="btn primary roll" onclick={doRoll}>{tableDice ? t('sheet.roll.enter') : t('sheet.common.roll')}</button>
      </div>
      {#if chance}
        <p class="dim chance">
          {t('sheet.roll.chanceDc', { mw })} <b>{t('sheet.roll.pct', { n: fmtNumber(Math.round(chance.success * 100)) })}</b>{t('sheet.roll.chanceCost')} <b>{t('sheet.roll.pct', { n: fmtNumber(Math.round(chance.price * 100)) })}</b>
          {#if mw <= bonus + mod + 2}· <span class="chip accent">{t('sheet.roll.autoSuccess')}</span>{/if}
        </p>
      {/if}
    {/if}

    {#if mode === 'clash'}
      <div class="clash">
        <div class="side">
          <h3>{t('sheet.roll.mySide')}</h3>
          <div class="row">
            <label class="check"><input type="radio" bind:group={role} value="attacker" /> {t('sheet.roll.iAttack')}</label>
            <label class="check"><input type="radio" bind:group={role} value="defender" /> {t('sheet.roll.iDefend')}</label>
          </div>
          <small class="dim">{t('sheet.roll.whoRoll', { who, b: fmt(bonus + mod) })}</small>
        </div>
        <div class="side">
          <h3>{t('sheet.roll.opponent')}</h3>
          <div class="row">
            {#if party.length}
              <label class="field">{t('sheet.roll.takePlayer')}
                <select onchange={(e) => { const p = party.find((x) => x.id === e.currentTarget.value); if (p?.vitals) { oppName = p.characterName || p.name; oppBonus = p.vitals.bonus[attr]; oppPlayer = true; } }}>
                  <option value="">—</option>
                  {#each party.filter((p) => p.vitals) as p}<option value={p.id}>{p.characterName || p.name} ({p.vitals!.bonus[attr] > 0 ? '+' : ''}{p.vitals!.bonus[attr]})</option>{/each}
                </select>
              </label>
            {/if}
            <label class="field">{t('sheet.common.name')}<input bind:value={oppName} /></label>
            <label class="field">Bonus<Stepper bind:value={oppBonus} min={-3} max={20} label={t('sheet.roll.oppBonus')} /></label>
            <label class="field">{t('sheet.roll.modShort')}<Stepper bind:value={oppMod} min={-9} max={9} label={t('sheet.roll.oppMod')} /></label>
          </div>
          <div class="row">
            <label class="check"><input type="checkbox" bind:checked={oppPlayer} /> {t('sheet.roll.isPc')}</label>
            <label class="check"><input type="checkbox" bind:checked={oppManual} /> {t('sheet.roll.enterRoll')}</label>
            {#if oppManual}<Stepper bind:value={oppSum} min={2} max={12} label={t('sheet.roll.oppSum')} />{/if}
          </div>
        </div>
      </div>
      <div class="row">
        <label class="check"><input type="checkbox" bind:checked={hero} /> {t('sheet.roll.hero')}</label>
        {#if char && !hero}<button class="btn sm" onclick={payHero}>{t('sheet.roll.payHero')}</button>{/if}
        <span class="spacer"></span>
        <button class="btn primary roll" onclick={doClash}>{t('sheet.roll.rollClash')}</button>
      </div>

      {#if clash}
        {@const r = clash.res}
        <div class="result">
          <div class="outcome" class:good={(clash.role === 'attacker' && (r.outcome === 'dominanz' || r.outcome === 'schlagabtausch')) || (clash.role === 'defender' && (r.outcome === 'perfekterKonter' || r.outcome === 'konter'))}>
            <span class="o">{OUTCOME_LABEL[r.outcome]}</span>
            <span class="d">Δ {r.delta > 0 ? '+' : ''}{r.delta}</span>
          </div>
          <div class="row"><RollSummary r={clash.me} /></div>
          <div class="row"><RollSummary r={clash.opp} /></div>
          <div class="chips">
            <span class="chip">{t('sheet.roll.totals', { a: r.attackerTotal, d: r.defenderTotal })}</span>
            <span class="chip">T(A) {r.tA} · T(V) {r.tV}</span>
            {#if r.heldenSchwelle}<span class="chip accent">{t('sheet.roll.heroThreshold')}</span>{/if}
            {#if r.limited}<span class="chip danger">{t('sheet.roll.outOfReach', { o: OUTCOME_LABEL[r.rawOutcome] })}</span>{/if}
            {#if r.noRoll}<span class="chip danger">{t('sheet.roll.noRoll', { gap: r.gap })}</span>{/if}
            {#if r.marker}<span class="chip amber">{t('sheet.roll.marker', { to: r.marker === clash.role ? t('sheet.roll.toMe') : t('sheet.roll.toOpp') })}</span>{/if}
          </div>
          {#if r.rewards}
            <p class="reward">
              {r.rewards.side === clash.role ? t('sheet.roll.youGain') : t('sheet.roll.oppGains')}: {t('sheet.roll.rewardMomentum', { n: r.rewards.momentum })}{#if r.rewards.energie}{t('sheet.roll.rewardEnergy', { n: r.rewards.energie })}{/if}{#if r.rewards.wk}{t('sheet.roll.rewardWp', { n: r.rewards.wk })}{/if}
              <small class="dim">{t('sheet.roll.rewardNote')}</small>
              {#if meRewards && char}<button class="btn sm amber" onclick={applyRewards}>{t('sheet.roll.apply')}</button>{/if}
            </p>
          {/if}
          {#if hit}
            <div class="hit">
              <h3>{t('sheet.roll.hitEffect', { who: hit.attackerHits ? t('sheet.roll.attackerHits') : t('sheet.roll.defenderHits') })}</h3>
              <div class="row">
                <label class="field">{t('sheet.roll.targetProt')}<Stepper bind:value={schutz} min={0} max={9} label={t('sheet.roll.targetProt')} /></label>
                <label class="field">{t('sheet.common.penetration')}<Stepper bind:value={durchschlag} min={0} max={5} label={t('sheet.common.penetration')} /></label>
                <label class="check"><input type="checkbox" bind:checked={ignoriert} /> {t('sheet.roll.ignored')}</label>
              </div>
              <p class="verdict"><b>{hit.res.text}</b> <small class="dim">{t('sheet.roll.effProt', { n: hit.res.effektiverSchutz })}</small></p>
              {#if r.outcome === 'schlagabtausch'}<small class="dim">{t('sheet.roll.exchangeNote')}</small>{/if}
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if mode === 'free'}
      <div class="row sel">
        <label class="field grow">{t('sheet.roll.formula')}<input bind:value={formula} placeholder={t('sheet.roll.formulaPlaceholder')} onkeydown={(e) => e.key === 'Enter' && doFree()} aria-label={t('sheet.roll.formulaAria')} /></label>
        <label class="field grow">{t('sheet.roll.freeLabel')}<input bind:value={freeLabel} placeholder={t('sheet.roll.freeLabelPlaceholder')} /></label>
        <button class="btn primary roll" onclick={() => doFree()}>{t('sheet.common.roll')}</button>
      </div>
      <div class="row quick">{#each quick as q}<button class="btn sm" onclick={() => doFree(q)}>{q}</button>{/each}</div>
      {#if freeError}<p class="warn">{freeError}</p>{/if}
    {/if}

    {#if last && mode !== 'clash'}
      {#key last.id}
        <div class="last"><RollSummary r={last} size={58} /></div>
      {/key}
    {/if}
  </section>

  <section class="panel">
    <div class="row"><h2>{t('sheet.roll.log')}</h2><span class="spacer"></span><button class="btn sm danger" onclick={() => confirm(t('sheet.roll.confirmClear')) && clearLog()} disabled={!rollLog.entries.length}>{t('sheet.roll.clear')}</button></div>
    <div class="log">
      {#each filteredLog as r (r.id)}
        <div class="entry"><RollSummary {r} animate={false} size={34} />{@render entryActions?.(r)}</div>
      {:else}
        <p class="dim">{t('sheet.roll.nothingYet')}</p>
      {/each}
    </div>
  </section>
</div>

<style>
  .sel { margin-top: 1rem; align-items: end; }
  .grow { flex: 1; min-width: 180px; }
  .bonus { display: grid; gap: 2px; padding: 0 0.6rem; }
  .bonus b { font: 400 2rem/1 var(--font-display); color: var(--accent-2); }
  .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink-dim); }
  .check { display: flex; align-items: center; gap: 0.4em; font-size: 0.92rem; }
  .roll { min-width: 150px; min-height: 48px; font-size: 1.05rem; }
  .chance { margin: 0.6rem 0 0; }
  .secret { margin-top: 0.8rem; color: var(--accent-2); }
  .last { margin-top: 1rem; padding: 0.8rem; background: var(--raised); border-left: 3px solid var(--accent-2); }
  .clash { display: grid; grid-template-columns: 1fr 1.6fr; gap: 1rem; margin: 1rem 0 0.7rem; }
  .side { display: grid; gap: 0.5rem; align-content: start; padding: 0.7rem; background: var(--raised); border: 1px solid var(--line); }
  .result { display: grid; gap: 0.7rem; margin-top: 1rem; padding: 0.9rem; background: var(--raised); border-left: 3px solid var(--accent); }
  .outcome { display: flex; align-items: baseline; gap: 1rem; }
  .outcome .o { font: 400 2.6rem/1 var(--font-display); letter-spacing: 0.05em; color: var(--danger); text-shadow: var(--hard-shadow); }
  .outcome.good .o { color: var(--accent); }
  .outcome .d { font: 500 1.3rem var(--font-mono); color: var(--ink-dim); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .reward { margin: 0; }
  .hit { padding-top: 0.7rem; border-top: 1px solid var(--line); display: grid; gap: 0.5rem; }
  .verdict { margin: 0; font-size: 1.05rem; }
  .warn { color: var(--danger); margin: 0.5rem 0 0; }
  .log { display: grid; gap: 0.3rem; max-height: 480px; overflow: auto; margin-top: 0.6rem; }
  .entry { padding: 0.4rem 0.6rem; border-bottom: 1px solid var(--line); }
  @media (max-width: 760px) { .clash { grid-template-columns: 1fr; } }
</style>
