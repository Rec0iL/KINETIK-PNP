<script lang="ts">
  import { rules, costLabel, TIER_LABEL } from '../rules';
  import type { Character } from '../model/character';
  import { viewMove, moveRollBonus } from '../model/sheet';
  import { roll2d6 } from '../dice/roller.svelte';
  import { settings } from '../lib/settings.svelte';

  let { char, ontab }: { char: Character; ontab?: (tab: string) => void } = $props();

  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const attrName = (k: string) => rules.tabellen.attribute.find((a) => a.key === k)?.name ?? k;

  function roll(m: Character['moves'][number]) {
    roll2d6({ who: settings.displayName || char.name, characterId: char.id, kind: 'move', label: m.name, bonus: moveRollBonus(char, m) });
  }
</script>

<section class="panel">
  <div class="row head">
    <h2>Moves</h2><span class="chip">{char.moves.length}</span><span class="spacer"></span>
    {#if ontab}<button class="btn sm" onclick={() => ontab('moves')}>Moves verwalten</button>{/if}
  </div>
  {#each char.moves as m (m.id)}
    {@const v = viewMove(char, m)}
    <details class="move">
      <summary>
        <span class="name">{m.name}</span>
        {#if v.titleName}<span class="chip">{v.titleName}</span>{/if}
        <span class="chip accent">{attrName(m.attr)}</span>
        <span class="chip amber">{v.evaluation.ep} EP</span>
        {#if v.cost.mastered}<span class="chip accent">gemeistert</span>{/if}
        {#if v.cost.levelTooLow}<span class="chip danger" title="Titel-Level unter dem Mindestlevel">Level {v.evaluation.minLevel} nötig</span>{/if}
        <span class="spacer"></span>
        <span class="cost">{costLabel(v.cost)}</span>
        <button class="btn sm primary" onclick={(e) => { e.preventDefault(); roll(m); }} title={`2W6 ${fmt(moveRollBonus(char, m))}`}>Würfeln {fmt(moveRollBonus(char, m))}</button>
      </summary>
      <div class="detail">
        <small class="dim">{TIER_LABEL[v.evaluation.tier]}</small>
        {#if m.text}<p>{m.text}</p>{/if}
        {#if m.prices?.length}<p class="dim">Preise: {m.prices.join(', ')}</p>{/if}
      </div>
    </details>
  {:else}
    <p class="dim">Noch keine Moves. Lege sie im Reiter „Moves“ an oder nimm Beispiele aus dem Regelwerk.</p>
  {/each}
</section>

<style>
  .head { margin-bottom: 0.4rem; }
  .move { border-bottom: 1px solid var(--line); }
  .move summary { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; padding: 0.5rem 0.2rem; cursor: pointer; list-style: none; }
  .move summary::-webkit-details-marker { display: none; }
  .move summary::before { content: '▸'; color: var(--accent-2); }
  .move[open] summary::before { content: '▾'; }
  .name { font: 600 1.05rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-strong); }
  .cost { font: 400 1.3rem var(--font-display); letter-spacing: 0.05em; color: var(--accent); }
  .detail { padding: 0 0.2rem 0.6rem 1.2rem; }
  .detail p { margin: 0.3rem 0; font-size: 0.93rem; }
</style>
