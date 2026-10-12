<script lang="ts">
  import { resolveClash, OUTCOME_LABEL } from '../rules';
  import { linkClash, rollManual, roll2d6, type RollRecord } from '../dice/roller.svelte';
  import type { PlayerInfo } from '../net/protocol';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';

  let { roll, party, gmName }: { roll: RollRecord; party: PlayerInfo[]; gmName: string } = $props();

  let open = $state(false);
  let name = $state(t('gm.common.enemy'));
  let bonus = $state(2);
  let mod = $state(0);
  let playerAttacks = $state(true);
  let hero = $state(false);
  let manual = $state(false);
  let sum = $state(7);
  let result = $state<{ label: string; delta: number; text: string } | null>(null);

  const playerSum = $derived(roll.total - roll.bonus - roll.mod);

  function answer() {
    const npc = manual
      ? rollManual({ who: name, label: t('gm.clash.answerTo', { who: roll.who }), bonus, mod, sum, kind: 'clash' })
      : roll2d6({ who: name, label: t('gm.clash.answerTo', { who: roll.who }), bonus, mod, kind: 'clash' });
    const npcSum = manual ? sum : npc.dice[0].value + npc.dice[1].value;
    const pSide = { dice: playerSum, bonus: roll.bonus, mod: roll.mod, isPlayer: true };
    const nSide = { dice: npcSum, bonus, mod, isPlayer: false };
    const res = resolveClash({
      attacker: playerAttacks ? pSide : nSide,
      defender: playerAttacks ? nSide : pSide,
      heldenhafteGegenwehr: hero,
    });
    linkClash(roll, npc, res);
    result = {
      label: OUTCOME_LABEL[res.outcome],
      delta: res.delta,
      text: res.noRoll ? t('gm.clash.noRoll') : res.limited ? t('gm.clash.limited') : res.heldenSchwelle ? t('gm.clash.heroThreshold') : '',
    };
  }
</script>

{#if !roll.clashWith && !roll.clash}
  <div class="ca">
    {#if !open}
      <button class="btn sm" onclick={() => (open = true)}>{t('gm.clash.against')}</button>
    {:else}
      <div class="form">
        <div class="row">
          <label class="field">{t('gm.common.enemy')}<input bind:value={name} /></label>
          <label class="field">{t('gm.common.bonus')}<Stepper bind:value={bonus} min={-3} max={20} label={t('gm.clash.enemyBonus')} /></label>
          <label class="field">{t('gm.clash.modShort')}<Stepper bind:value={mod} min={-9} max={9} label={t('gm.common.modifier')} /></label>
        </div>
        <div class="row">
          <label class="check"><input type="radio" bind:group={playerAttacks} value={true} /> {t('gm.clash.attacks', { who: roll.who })}</label>
          <label class="check"><input type="radio" bind:group={playerAttacks} value={false} /> {t('gm.clash.defends', { who: roll.who })}</label>
          <label class="check"><input type="checkbox" bind:checked={hero} /> {t('gm.common.heroicResistance')}</label>
          <label class="check"><input type="checkbox" bind:checked={manual} /> {t('gm.clash.manual')}</label>
          {#if manual}<Stepper bind:value={sum} min={2} max={12} label={t('gm.clash.sum')} />{/if}
        </div>
        <div class="row"><button class="btn sm primary" onclick={answer}>{manual ? t('gm.clash.evaluate') : t('gm.clash.rollEvaluate')}</button><button class="btn sm ghost" onclick={() => (open = false)}>{t('gm.clash.cancel')}</button></div>
      </div>
    {/if}
  </div>
{:else if result}
  <p class="res"><b>{result.label}</b> <span class="dim">Δ {result.delta > 0 ? '+' : ''}{result.delta}</span> {result.text}</p>
{/if}

<style>
  .ca { margin-top: 0.4rem; }
  .form { display: grid; gap: 0.5rem; padding: 0.6rem; background: var(--raised); border-left: 3px solid var(--accent-2); }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.9rem; }
  .res { margin: 0.3rem 0 0; }
  .res b { color: var(--accent-2); font-family: var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
</style>
