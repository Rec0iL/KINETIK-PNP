<script lang="ts">
  import { resolveClash, OUTCOME_LABEL } from '../rules';
  import { linkClash, rollManual, roll2d6, type RollRecord } from '../dice/roller.svelte';
  import type { PlayerInfo } from '../net/protocol';
  import Stepper from '../ui/Stepper.svelte';

  let { roll, party, gmName }: { roll: RollRecord; party: PlayerInfo[]; gmName: string } = $props();

  let open = $state(false);
  let name = $state('Gegner');
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
      ? rollManual({ who: name, label: `Antwort auf ${roll.who}`, bonus, mod, sum, kind: 'clash' })
      : roll2d6({ who: name, label: `Antwort auf ${roll.who}`, bonus, mod, kind: 'clash' });
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
      text: res.noRoll ? 'Lücke ≥ 8: nicht würfeln, der Überlegene erzählt.' : res.limited ? 'Außer Reichweite: Ergebnis gedeckelt.' : res.heldenSchwelle ? 'Helden-Schwelle gilt.' : '',
    };
  }
</script>

{#if !roll.clashWith && !roll.clash}
  <div class="ca">
    {#if !open}
      <button class="btn sm" onclick={() => (open = true)}>Clash dagegen</button>
    {:else}
      <div class="form">
        <div class="row">
          <label class="field">Gegner<input bind:value={name} /></label>
          <label class="field">Bonus<Stepper bind:value={bonus} min={-3} max={20} label="Gegner-Bonus" /></label>
          <label class="field">Mod.<Stepper bind:value={mod} min={-9} max={9} label="Modifikator" /></label>
        </div>
        <div class="row">
          <label class="check"><input type="radio" bind:group={playerAttacks} value={true} /> {roll.who} greift an</label>
          <label class="check"><input type="radio" bind:group={playerAttacks} value={false} /> {roll.who} verteidigt</label>
          <label class="check"><input type="checkbox" bind:checked={hero} /> Heldenhafte Gegenwehr</label>
          <label class="check"><input type="checkbox" bind:checked={manual} /> Wurf eintragen</label>
          {#if manual}<Stepper bind:value={sum} min={2} max={12} label="Augensumme" />{/if}
        </div>
        <div class="row"><button class="btn sm primary" onclick={answer}>{manual ? 'Auswerten' : 'Würfeln und auswerten'}</button><button class="btn sm ghost" onclick={() => (open = false)}>Abbrechen</button></div>
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
