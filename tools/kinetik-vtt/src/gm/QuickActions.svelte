<script lang="ts">
  import { rules, type ZoneKey } from '../rules';
  import { patchPlayer } from '../net/gm.svelte';
  import type { PatchOp } from '../net/protocol';

  let { playerId, onlocal }: { playerId: string; onlocal?: () => void } = $props();

  let zone = $state<ZoneKey>('torso');
  let injuryText = $state('');
  let tagName = $state('');
  let tagSize = $state<'klein' | 'gross'>('klein');

  function go(...ops: PatchOp[]) {
    if (patchPlayer(playerId, ops)) onlocal?.();
  }
  const btn = (label: string, op: PatchOp, tone = '') => ({ label, op, tone });
  const rows = [
    { name: 'Energie', items: [-3, -2, -1, 1, 2].map((d) => btn(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, { op: 'add', key: 'energie', delta: d })) },
    { name: 'WK', items: [-3, -2, -1, 1, 2].map((d) => btn(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, { op: 'add', key: 'wk', delta: d })) },
    { name: 'Momentum', items: [-1, 1].map((d) => btn(`${d > 0 ? '+' : '−'}1`, { op: 'add', key: 'momentum', delta: d })) },
    { name: 'Schutz', items: [-1, 1].map((d) => btn(`${d > 0 ? '+' : '−'}1`, { op: 'add', key: 'schutz', delta: d })) },
  ];
</script>

<div class="qa">
  {#each rows as r}
    <div class="row"><span class="lbl">{r.name}</span>{#each r.items as b}<button class="btn sm" onclick={() => go(b.op)}>{b.label}</button>{/each}</div>
  {/each}
  <div class="row">
    <span class="lbl">Verletzung</span>
    <select bind:value={zone} aria-label="Zone">{#each rules.tabellen.zonen as z}<option value={z.key}>{z.kurz}</option>{/each}</select>
    <input bind:value={injuryText} placeholder="Beschreibung" aria-label="Beschreibung" />
    <button class="btn sm danger" onclick={() => { go({ op: 'injury', zone, text: injuryText }); injuryText = ''; }}>+</button>
    <button class="btn sm" onclick={() => go({ op: 'heal', zone })} title="Letzte Verletzung dieser Zone heilen">Heilen</button>
  </div>
  <div class="row">
    <span class="lbl">Tag</span>
    <input bind:value={tagName} placeholder="z.B. Am Boden" list="tag-suggest" aria-label="Tag" />
    <select bind:value={tagSize} aria-label="Größe"><option value="klein">klein</option><option value="gross">groß</option></select>
    <button class="btn sm" onclick={() => { if (tagName.trim()) { go({ op: 'tag', name: tagName.trim(), size: tagSize }); tagName = ''; } }}>+</button>
    <button class="btn sm" onclick={() => { if (tagName.trim()) { go({ op: 'untag', name: tagName.trim() }); tagName = ''; } }} title="Tag mit diesem Namen entfernen">Entfernen</button>
    <datalist id="tag-suggest">{#each [...rules.tags.klein, ...rules.tags.gross] as t}<option value={t}></option>{/each}</datalist>
  </div>
</div>

<style>
  .qa { display: grid; gap: 0.4rem; }
  .row { flex-wrap: nowrap; gap: 4px; }
  .lbl { width: 78px; flex: none; font: 600 0.72rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  select { width: auto; min-height: 30px; padding: 0.2em 0.4em; }
  input { min-height: 30px; padding: 0.2em 0.5em; min-width: 0; }
</style>
