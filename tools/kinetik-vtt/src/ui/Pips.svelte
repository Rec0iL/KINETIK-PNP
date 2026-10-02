<script lang="ts">
  let { label, value = $bindable(0), cap, onchange }: { label: string; value: number; cap: number; onchange?: (v: number) => void } = $props();

  function set(n: number) {
    const v = value === n ? n - 1 : n; // erneuter Klick auf das letzte Feld nimmt eins weg
    value = Math.max(0, Math.min(cap, v));
    onchange?.(value);
  }
</script>

<div class="pips">
  <div class="head">
    <span class="lbl">{label}</span>
    <span class="num"><b>{value}</b><span class="slash">/</span>{cap}</span>
  </div>
  <div class="row" role="group" aria-label={label}>
    {#each Array(Math.max(cap, value)) as _, i}
      <button
        type="button" class="pip" class:on={i < value} class:over={i >= cap}
        onclick={() => set(i + 1)} aria-label={`${label} ${i + 1}`} aria-pressed={i < value}
      ></button>
    {/each}
    <button type="button" class="btn sm" onclick={() => { value = 0; onchange?.(0); }} disabled={value === 0}>0</button>
  </div>
</div>

<style>
  .pips { display: grid; gap: 0.5rem; }
  .head { display: flex; justify-content: space-between; align-items: baseline; }
  .lbl { font: 600 0.8rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); }
  .num { font: 400 1.6rem/1 var(--font-display); letter-spacing: 0.04em; }
  .num b { color: var(--accent-2); font-weight: 400; }
  .slash { color: var(--ink-dim); margin: 0 0.12em; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .pip {
    width: 30px; height: 30px; cursor: pointer; padding: 0; background: rgba(0, 0, 0, 0.45);
    border: 2px solid var(--accent-2); transform: rotate(45deg) scale(0.82);
    transition: background 0.2s, box-shadow 0.2s, transform 0.2s;
  }
  .pip:hover { transform: rotate(45deg) scale(0.92); }
  .pip.on { background: var(--accent-2); box-shadow: 0 0 14px var(--accent-2); transform: rotate(45deg) scale(0.95); }
  .pip.over { border-style: dashed; }
</style>
