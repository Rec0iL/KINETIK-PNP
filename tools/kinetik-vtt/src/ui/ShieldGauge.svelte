<script lang="ts">
  let { current = $bindable(0), max = $bindable(0), warnAbove = 3 }: { current: number; max: number; warnAbove?: number } = $props();

  const cid = `sfill-${Math.random().toString(36).slice(2, 8)}`;
  const fill = $derived(max > 0 ? Math.max(0, Math.min(1, current / max)) : 0);

  function setCur(v: number) { current = Math.max(0, Math.min(max, v)); }
  function setMax(v: number) {
    max = Math.max(0, Math.min(9, v));
    if (current > max) current = max;
  }
</script>

<div class="shield" class:over={max > warnAbove} role="group" aria-label="Schutz">
  <svg viewBox="0 0 100 120" aria-hidden="true">
    <defs>
      <clipPath id={cid}><rect x="0" y={120 - 120 * fill} width="100" height={120 * fill} /></clipPath>
    </defs>
    <path class="body" d="M50 4 L92 18 V58 C92 88 70 108 50 116 C30 108 8 88 8 58 V18 Z" />
    <path class="level" clip-path="url(#{cid})" d="M50 4 L92 18 V58 C92 88 70 108 50 116 C30 108 8 88 8 58 V18 Z" />
    <path class="rim" d="M50 4 L92 18 V58 C92 88 70 108 50 116 C30 108 8 88 8 58 V18 Z" />
    <path class="inner" d="M50 14 L82 25 V57 C82 80 66 97 50 104 C34 97 18 80 18 57 V25 Z" />
  </svg>
  <div class="nums">
    <div class="n">
      <button type="button" class="ar" onclick={() => setCur(current + 1)} disabled={current >= max} aria-label="Aktueller Schutz erhöhen">▲</button>
      <b>{current}</b>
      <button type="button" class="ar" onclick={() => setCur(current - 1)} disabled={current <= 0} aria-label="Aktueller Schutz verringern">▼</button>
    </div>
    <span class="slash">/</span>
    <div class="n m">
      <button type="button" class="ar" onclick={() => setMax(max + 1)} disabled={max >= 9} aria-label="Maximalen Schutz erhöhen">▲</button>
      <b>{max}</b>
      <button type="button" class="ar" onclick={() => setMax(max - 1)} disabled={max <= 0} aria-label="Maximalen Schutz verringern">▼</button>
    </div>
  </div>
</div>

<style>
  .shield { position: relative; width: 190px; height: 200px; --c: var(--accent); }
  .shield.over { --c: var(--warn); }
  svg { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 0 14px color-mix(in srgb, var(--c) 40%, transparent)); }
  .body { fill: rgba(0, 0, 0, 0.55); }
  .level { fill: color-mix(in srgb, var(--c) 38%, transparent); transition: all 0.4s; }
  .rim { fill: none; stroke: var(--c); stroke-width: 3; stroke-linejoin: round; }
  .inner { fill: none; stroke: var(--c); stroke-width: 0.8; opacity: 0.4; stroke-dasharray: 3 3; }
  .nums { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 0.15rem; padding-bottom: 14px; }
  .n { display: grid; justify-items: center; }
  b { font: 400 3.4rem/1 var(--font-display); color: var(--ink-strong); text-shadow: 0 0 12px color-mix(in srgb, var(--c) 60%, transparent); min-width: 0.7em; text-align: center; }
  .m b { color: var(--ink-dim); }
  .slash { font: 400 3rem/1 var(--font-display); color: var(--c); }
  .ar { background: none; border: 0; color: var(--c); cursor: pointer; font-size: 0.85rem; line-height: 1; padding: 4px 9px; opacity: 0.9; }
  .ar:hover:not(:disabled) { opacity: 1; transform: scale(1.3); }
  .ar:disabled { opacity: 0.18; cursor: default; }
</style>
