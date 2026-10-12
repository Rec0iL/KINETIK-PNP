<script lang="ts">
  import { ATTR_KEYS, GIFT, GIFT_LEVELS, MAX_GIFT_DELAY, antidoteMw, antidoteWorks, describePoison, newPoison, rules, type AttrKey, type GiftLevel } from '../rules';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import { applyPatch } from '../model/patch';
  import { cureOps, tickCharacter } from '../gm/poison';
  import { roll2d6 } from '../dice/roller.svelte';
  import { settings } from '../lib/settings.svelte';
  import { player } from '../net/player.svelte';
  import { pushToast } from '../ui/toasts.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
  const sheet = $derived(computeSheet(char));
  const list = $derived(char.poisons ?? []);
  /** In einer Runde tickt der SL das Gift am Rundenende, allein am Bogen geht es per Knopf. */
  const inRound = $derived(player.status === 'connected');

  const fmt = (v: number) => (v >= 0 ? `+${v}` : `−${Math.abs(v)}`);
  let attr = $state<AttrKey>('fokus');
  let mod = $state(0);
  let level = $state<GiftLevel>('schwach');
  let delay = $state(0);
  let adding = $state(false);

  function antidote(id: string) {
    const p = list.find((x) => x.id === id);
    if (!p) return;
    const rec = roll2d6({
      who: settings.displayName || char.name, characterId: char.id, label: t('sheet.poisons.antidoteLabel', { label: GIFT[p.level].label }), bonus: sheet.basicBonus[attr], mod, mw: antidoteMw(p), kind: 'probe',
    });
    if (antidoteWorks(rec.result, rec.auto)) {
      applyPatch(char, cureOps(char, id), { autoShock: false });
      pushToast(t('sheet.poisons.cured'), 'good');
    } else pushToast(rec.result === 'preis' ? t('sheet.poisons.costly') : t('sheet.poisons.failed'), 'warn');
  }
  function tick() {
    const r = tickCharacter(char);
    applyPatch(char, r.ops, { autoShock: settings.autoShock });
    for (const n of r.notes) pushToast(n, 'warn', 6000);
  }
  function add() {
    char.poisons = [...list, newPoison(uid(), level, delay, t('sheet.poisons.byHand'))];
    adding = false;
  }
</script>

{#if list.length || adding}
  <section class="panel poison">
    <div class="row head"><h2>{t('sheet.poisons.title')}</h2><span class="spacer"></span>
      {#if list.length && !inRound}<button class="btn sm" onclick={tick} title={t('sheet.poisons.tickTitle')}>{t('sheet.poisons.tick')}</button>{/if}
    </div>
    {#each list as p (p.id)}
      <div class="p">
        <span class="chip danger">{describePoison(p)}</span>
        <small class="dim">{t('sheet.poisons.antidoteNote', { text: GIFT[p.level].text, mw: antidoteMw(p) })}</small>
        <div class="row">
          <select bind:value={attr} aria-label={t('sheet.poisons.attrAria')}>{#each ATTR_KEYS as a}<option value={a}>{rules.tabellen.attribute.find((x) => x.key === a)?.name}</option>{/each}</select>
          <Stepper bind:value={mod} min={-9} max={9} label={t('sheet.poisons.modAria')} />
          <button class="btn sm primary" onclick={() => antidote(p.id)}>{t('sheet.poisons.rollAntidote', { b: fmt(sheet.basicBonus[attr] + mod) })}</button>
          <button class="btn sm ghost danger" onclick={() => (char.poisons = list.filter((x) => x.id !== p.id))} aria-label={t('sheet.poisons.remove')}>✕</button>
        </div>
      </div>
    {/each}
    {#if adding}
      <div class="row">
        <select bind:value={level} aria-label={t('sheet.poisons.levelAria')}>{#each GIFT_LEVELS as l}<option value={l}>{GIFT[l].label}</option>{/each}</select>
        <Stepper bind:value={delay} min={0} max={MAX_GIFT_DELAY} label={t('sheet.common.delayRounds')} />
        <button class="btn sm primary" onclick={add}>+</button>
        <button class="btn sm ghost" onclick={() => (adding = false)}>{t('sheet.poisons.cancel')}</button>
      </div>
    {/if}
  </section>
{:else}
  <button class="btn sm ghost addp" onclick={() => (adding = true)}>{t('sheet.poisons.add')}</button>
{/if}

<style>
  .poison { border-color: var(--danger); display: grid; gap: 0.6rem; }
  .head h2 { color: var(--danger); margin: 0; }
  .p { display: grid; gap: 4px; padding: 0.4rem 0; border-top: 1px solid var(--line); }
  .row { gap: 0.4rem; flex-wrap: wrap; align-items: center; }
  select { width: auto; min-height: 30px; padding: 0.15em 0.4em; }
  .addp { justify-self: start; }
</style>
