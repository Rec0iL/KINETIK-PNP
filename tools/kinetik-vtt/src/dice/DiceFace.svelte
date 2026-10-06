<script lang="ts">
  let { value, sides = 6, size = 52, animate = true, delay = 0 }: { value: number; sides?: number; size?: number; animate?: boolean; delay?: number } = $props();

  // Augen-Positionen eines W6 auf einem 3x3-Raster
  const PIPS: Record<number, number[]> = {
    1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8],
  };
</script>

<span class="die" class:animate style:--s="{size}px" style:--d="{delay}ms" class:d6={sides === 6} title={`W${sides}: ${value}`}>
  {#if sides === 6 && PIPS[value]}
    <span class="grid">{#each Array(9) as _, i}<i class:on={PIPS[value].includes(i)}></i>{/each}</span>
  {:else}
    <span class="num">{value}</span><span class="sd">W{sides}</span>
  {/if}
</span>

<style>
  .die {
    display: inline-grid; place-items: center; width: var(--s); height: var(--s); position: relative;
    background: linear-gradient(145deg, var(--die-a), var(--die-b));
    border: 2px solid var(--accent); box-shadow: 0 0 14px var(--accent-soft), inset 0 0 12px rgba(0, 0, 0, 0.6);
    border-radius: var(--die-radius); color: var(--accent);
  }
  .d6 { border-radius: var(--die-radius); }
  .animate { animation: tumble 0.75s cubic-bezier(0.2, 0.8, 0.2, 1) var(--d) both; }
  @keyframes tumble {
    0% { transform: translateY(-40px) rotate(-360deg) scale(0.4); opacity: 0; }
    55% { transform: translateY(4px) rotate(20deg) scale(1.08); opacity: 1; }
    100% { transform: none; }
  }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); width: 70%; height: 70%; gap: 2px; }
  .grid i { display: block; border-radius: 50%; margin: 12%; }
  .grid i.on { background: var(--die-pip); box-shadow: 0 0 6px var(--accent); }
  .num { font: 400 calc(var(--s) * 0.5)/1 var(--font-display); color: var(--die-pip); }
  .sd { position: absolute; bottom: 2px; right: 4px; font: 600 0.55rem var(--font-mono); opacity: 0.6; }
</style>
