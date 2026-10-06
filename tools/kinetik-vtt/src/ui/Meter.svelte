<script lang="ts">
  import type { Snippet } from 'svelte';
  let {
    label,
    value = $bindable(0),
    max,
    tone = 'accent',
    min = 0,
    quick = [-1, 1],
    maxSlot,
    onchange,
  }: {
    label: string; value: number; max: number; tone?: 'accent' | 'amber' | 'danger'; min?: number;
    quick?: number[]; maxSlot?: Snippet; onchange?: (v: number) => void;
  } = $props();

  const pct = $derived(max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0);
  const low = $derived(max > 0 && value / max <= 0.25);

  function add(d: number) {
    const n = Math.max(min, Math.min(max, value + d));
    if (n !== value) { value = n; onchange?.(n); }
  }
</script>

<div class="meter {tone}" class:low>
  <div class="head">
    <span class="lbl">{label}</span>
    <span class="num"><b>{value}</b><span class="slash">/</span>{#if maxSlot}{@render maxSlot()}{:else}{max}{/if}</span>
  </div>
  <div class="track" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={min} aria-valuemax={max}>
    <div class="fill" style:width="{pct}%"></div>
    <div class="ticks">{#each Array(Math.max(0, Math.min(max, 20))) as _, i}<i style:left="{((i + 1) / max) * 100}%"></i>{/each}</div>
  </div>
  <div class="btns">
    {#each quick as d}
      <button type="button" class="btn sm" onclick={() => add(d)} disabled={(d < 0 && value <= min) || (d > 0 && value >= max)}>{d > 0 ? '+' : '−'}{Math.abs(d)}</button>
    {/each}
  </div>
</div>

<style>
  .meter { display: grid; gap: 0.4rem; --c: var(--accent); }
  .amber { --c: var(--accent-2); }
  .danger { --c: var(--danger); }
  .head { display: flex; justify-content: space-between; align-items: baseline; }
  .lbl { font: 600 0.8rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .num { font: 400 1.6rem/1 var(--font-display); letter-spacing: 0.04em; color: var(--ink-strong); }
  .num b { color: var(--c); font-weight: 400; text-shadow: 0 0 12px color-mix(in srgb, var(--c) 50%, transparent); }
  .slash { color: var(--ink-dim); margin: 0 0.12em; }
  .track { position: relative; height: 14px; background: var(--track-bg); border: 1px solid var(--line-strong); clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 100%, 0 100%); }
  .fill { height: 100%; background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, #000), var(--c)); box-shadow: 0 0 14px color-mix(in srgb, var(--c) 60%, transparent); transition: width 0.45s cubic-bezier(0.2, 0.8, 0.2, 1); }
  .ticks { position: absolute; inset: 0; pointer-events: none; }
  .ticks i { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(0, 0, 0, 0.55); }
  .low .fill { animation: pulse 1.1s infinite alternate; }
  @keyframes pulse { to { filter: brightness(1.5); } }
  .btns { display: flex; gap: 4px; flex-wrap: wrap; }
</style>
