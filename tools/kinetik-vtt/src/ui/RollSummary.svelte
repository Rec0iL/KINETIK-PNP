<script lang="ts">
  import { PROBE_LABEL, OUTCOME_LABEL } from '../rules';
  import type { RollRecord } from '../dice/roller.svelte';
  import DiceFace from '../dice/DiceFace.svelte';

  let { r, animate = true, size = 46 }: { r: RollRecord; animate?: boolean; size?: number } = $props();
</script>

<div class="sum">
  <div class="dice">
    {#each r.dice as d, i}<DiceFace value={d.value} sides={d.sides} {size} {animate} delay={i * 90} />{:else}<span class="chip">Tisch</span>{/each}
  </div>
  <div class="txt">
    <div class="line"><span class="who">{r.who}</span><span class="dim">{r.label}</span></div>
    <div class="line"><span class="dim mono">{r.formula}</span></div>
  </div>
  <div class="tot">
    <span class="n">{r.total}</span>
    {#if r.mw}<span class="chip" class:accent={r.result === 'erfolg'} class:amber={r.result === 'preis'} class:danger={r.result === 'fehlschlag'}>{PROBE_LABEL[r.result!]} <small>(MW {r.mw})</small></span>{/if}
    {#if r.clash}<span class="chip" class:danger={r.clash.outcome === 'konter' || r.clash.outcome === 'perfekterKonter'} class:accent={r.clash.outcome === 'dominanz'}>{OUTCOME_LABEL[r.clash.outcome]} Δ{r.clash.delta > 0 ? '+' : ''}{r.clash.delta}</span>{/if}
    {#if r.secret}<span class="chip amber">geheim</span>{/if}
  </div>
</div>

<style>
  .sum { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
  .dice { display: flex; gap: 6px; min-width: 40px; }
  .txt { flex: 1; min-width: 120px; display: grid; gap: 1px; }
  .line { display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
  .who { font: 600 0.95rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-strong); }
  .tot { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .n { font: 400 2.6rem/1 var(--font-display); color: var(--accent-2); text-shadow: 0 0 14px var(--accent-2-soft); min-width: 1.4em; text-align: right; }
</style>
