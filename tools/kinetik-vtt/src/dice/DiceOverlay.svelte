<script lang="ts">
  import { onRollShown, type RollRecord } from './roller.svelte';
  import { settings } from '../lib/settings.svelte';
  import { PROBE_LABEL, OUTCOME_LABEL } from '../rules';
  import Cube from './Cube.svelte';
  import DiceFace from './DiceFace.svelte';

  interface Shown { key: number; r: RollRecord }
  let shown = $state<Shown[]>([]);
  let n = 0;

  $effect(() => {
    return onRollShown((r) => {
      if (!settings.dice3d) return;
      const key = ++n;
      shown.push({ key, r });
      if (shown.length > 3) shown.shift();
      setTimeout(() => { shown = shown.filter((s) => s.key !== key); }, 4800 + r.dice.length * 100);
    });
  });
</script>

<div class="overlay" aria-hidden="true">
  {#each shown as s (s.key)}
    <div class="group">
      <div class="dice">
        {#each s.r.dice as d, i}
          {#if d.sides === 6}<Cube value={d.value} size={74} delay={i * 110} />
          {:else}<DiceFace value={d.value} sides={d.sides} size={64} delay={i * 110} />{/if}
        {/each}
      </div>
      <div class="badge">
        <span class="who">{s.r.who}</span>
        <span class="lbl">{s.r.label}</span>
        <span class="tot">{s.r.total}</span>
        {#if s.r.mw}<span class="res" class:ok={s.r.result === 'erfolg'} class:mid={s.r.result === 'preis'} class:bad={s.r.result === 'fehlschlag'}>{PROBE_LABEL[s.r.result!]}</span>{/if}
        {#if s.r.clash}<span class="res" class:ok={s.r.clash.outcome === 'dominanz'} class:bad={s.r.clash.outcome === 'perfekterKonter'}>{OUTCOME_LABEL[s.r.clash.outcome]}</span>{/if}
        {#if s.r.secret}<span class="res mid">geheim</span>{/if}
      </div>
    </div>
  {/each}
</div>

<style>
  .overlay { position: fixed; inset: 0; z-index: 150; pointer-events: none; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 1.5rem; padding-bottom: 12vh; }
  .group { display: grid; justify-items: center; gap: 1.1rem; animation: out 0.5s ease-in 4.3s forwards; }
  .dice { display: flex; gap: 1.2rem; min-height: 90px; align-items: center; }
  .badge { display: flex; align-items: baseline; gap: 0.7rem; flex-wrap: wrap; justify-content: center; padding: 0.5rem 1.2rem; background: rgba(5, 8, 12, 0.82); border: 1px solid var(--accent-line); box-shadow: var(--glow); backdrop-filter: blur(6px); opacity: 0; animation: pop 0.4s ease-out 1.5s forwards; }
  .who { font: 600 0.95rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-strong); }
  .lbl { color: var(--ink-dim); font-size: 0.9rem; }
  .tot { font: 400 3rem/1 var(--font-display); color: var(--accent-2); text-shadow: var(--hard-shadow); }
  .res { font: 600 0.85rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; padding: 0.25em 0.6em; border: 1px solid var(--line-strong); color: var(--ink); }
  .res.ok { color: var(--ok); border-color: var(--ok); }
  .res.mid { color: var(--accent-2); border-color: var(--accent-2); }
  .res.bad { color: var(--danger); border-color: var(--danger); }
  @keyframes pop { from { opacity: 0; transform: translateY(10px) scale(0.9); } to { opacity: 1; transform: none; } }
  @keyframes out { to { opacity: 0; transform: translateY(-14px); } }
  @media (prefers-reduced-motion: reduce) { .badge { animation-delay: 0s; } .group { animation-delay: 3s; } }
</style>
