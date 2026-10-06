<script lang="ts">
  import type { PlayerInfo } from '../net/protocol';
  import type { Snippet } from 'svelte';
  import { portraitPlaceholder } from '../lib/art';

  let { p, me = false, onopen, children }: { p: PlayerInfo; me?: boolean; onopen?: () => void; children?: Snippet } = $props();
  const v = $derived(p.vitals);
  const pct = (a: number, m: number) => (m > 0 ? Math.max(0, Math.min(100, (a / m) * 100)) : 0);
</script>

<article class="pc panel flat" class:off={!p.connected} class:me>
  <div class="pic">{#if p.portrait}<img src={p.portrait} alt="" />{:else}<img class="ph" src={portraitPlaceholder()} alt="" />{/if}</div>
  <div class="main">
    <div class="row top">
      <b class="nm">{p.characterName || p.name}</b>{#if p.alias}<span class="dim">„{p.alias}“</span>{/if}
      <span class="spacer"></span>
      <span class="chip" class:accent={p.connected} title={p.local ? 'Lokaler Spieler (SL pflegt den Bogen)' : p.connected ? 'verbunden' : 'getrennt'}>{p.local ? 'lokal' : p.connected ? 'online' : 'offline'}</span>
    </div>
    <small class="dim">{p.name}{p.titles ? ` · ${p.titles}` : ''}</small>
    {#if v}
      <div class="bars">
        <div class="b" title={`Energie ${v.energie}/${v.energieMax}`}><span>E</span><div class="t"><i style:width="{pct(v.energie, v.energieMax)}%"></i></div><em>{v.energie}/{v.energieMax}</em></div>
        <div class="b amber" title={`Willenskraft ${v.wk}/${v.wkMax}`}><span>WK</span><div class="t"><i style:width="{pct(v.wk, v.wkMax)}%"></i></div><em>{v.wk}/{v.wkMax}</em></div>
      </div>
      <div class="chips">
        <span class="chip amber" title="Momentum">M {v.momentum}/{v.momentumCap}</span>
        {#if v.schutzMax}<span class="chip" title="Schutz">S {v.schutz}/{v.schutzMax}</span>{/if}
        {#if v.injuries}<span class="chip danger" title="Verletzungen">{v.injuries} Verl.</span>{/if}
        {#if v.sterbend}<span class="chip danger">sterbend</span>{/if}
        {#if v.poisons?.length}<span class="chip danger" title="Vergiftet">Gift</span>{/if}
        {#if v.ausgepumpt}<span class="chip danger">ausgepumpt</span>{/if}
        {#if v.gebrochen}<span class="chip danger">gebrochen</span>{/if}
        {#each v.tags as t}<span class="chip" class:amber={t.size === 'gross'}>{t.name}</span>{/each}
      </div>
    {:else}
      <small class="dim">Keine Details sichtbar.</small>
    {/if}
    {#if onopen && v}<div class="row"><button class="btn sm" onclick={onopen}>Bogen ansehen</button></div>{/if}
    {@render children?.()}
  </div>
</article>

<style>
  .pc { display: grid; grid-template-columns: 64px 1fr; gap: 0.8rem; padding: 0.7rem; border-left: 3px solid var(--accent); }
  .pc.me { border-left-color: var(--accent-2); }
  .pc.off { opacity: 0.6; border-left-color: var(--line-strong); }
  .pic { width: 64px; height: 82px; background: linear-gradient(160deg, var(--accent-soft), var(--track-bg)); border: 1px solid var(--line-strong); display: grid; place-items: center; overflow: hidden; }
  .pic img { width: 100%; height: 100%; object-fit: cover; }
  .pic img.ph { opacity: 0.55; filter: saturate(0.6); }
  .main { display: grid; gap: 0.35rem; min-width: 0; align-content: start; }
  .top { flex-wrap: nowrap; gap: 0.4rem; }
  .nm { font: 400 1.4rem var(--font-display); letter-spacing: 0.05em; color: var(--ink-strong); }
  .bars { display: grid; gap: 4px; }
  .b { display: grid; grid-template-columns: 24px 1fr 52px; gap: 6px; align-items: center; font: 600 0.72rem var(--font-head); letter-spacing: 0.1em; color: var(--ink-dim); --c: var(--accent); }
  .b.amber { --c: var(--accent-2); }
  .t { height: 8px; background: var(--track-bg); border: 1px solid var(--line-strong); }
  .t i { display: block; height: 100%; background: var(--c); box-shadow: 0 0 8px var(--c); transition: width 0.4s; }
  em { font: normal 500 0.78rem var(--font-mono); color: var(--ink); text-align: right; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; }
</style>
