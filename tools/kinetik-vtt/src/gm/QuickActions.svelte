<script lang="ts">
  import { rules, tagLabel, type ZoneKey } from '../rules';
  import { t } from '../i18n';
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
    { name: t('gm.quick.energy'), items: [-3, -2, -1, 1, 2].map((d) => btn(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, { op: 'add', key: 'energie', delta: d })) },
    { name: t('gm.quick.wp'), items: [-3, -2, -1, 1, 2].map((d) => btn(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, { op: 'add', key: 'wk', delta: d })) },
    { name: t('gm.quick.momentum'), items: [-1, 1].map((d) => btn(`${d > 0 ? '+' : '−'}1`, { op: 'add', key: 'momentum', delta: d })) },
    { name: t('gm.quick.protection'), items: [-1, 1].map((d) => btn(`${d > 0 ? '+' : '−'}1`, { op: 'add', key: 'schutz', delta: d })) },
  ];
</script>

<div class="qa">
  {#each rows as r}
    <div class="row"><span class="lbl">{r.name}</span>{#each r.items as b}<button class="btn sm" onclick={() => go(b.op)}>{b.label}</button>{/each}</div>
  {/each}
  <div class="row">
    <span class="lbl">{t('gm.quick.injury')}</span>
    <select bind:value={zone} aria-label={t('gm.common.zone')}>{#each rules.tabellen.zonen as z}<option value={z.key}>{z.kurz}</option>{/each}</select>
    <input bind:value={injuryText} placeholder={t('gm.quick.description')} aria-label={t('gm.quick.description')} />
    <button class="btn sm danger" onclick={() => { go({ op: 'injury', zone, text: injuryText }); injuryText = ''; }}>+</button>
    <button class="btn sm" onclick={() => go({ op: 'heal', zone })} title={t('gm.quick.healTitle')}>{t('gm.quick.heal')}</button>
  </div>
  <div class="row">
    <span class="lbl">{t('gm.quick.kill')}</span>
    <button class="btn sm danger" onclick={() => go({ op: 'dying', why: 'gnadenstoss' })} title={t('gm.quick.coupTitle')}>{t('gm.quick.coup')}</button>
  </div>
  <div class="row">
    <span class="lbl">{t('gm.quick.tag')}</span>
    <input bind:value={tagName} placeholder={t('gm.common.tagExample', { tag: tagLabel('Am Boden') })} list="tag-suggest" aria-label={t('gm.quick.tag')} />
    <select bind:value={tagSize} aria-label={t('gm.quick.size')}><option value="klein">{t('gm.quick.minor')}</option><option value="gross">{t('gm.quick.major')}</option></select>
    <button class="btn sm" onclick={() => { if (tagName.trim()) { go({ op: 'tag', name: tagName.trim(), size: tagSize }); tagName = ''; } }}>+</button>
    <button class="btn sm" onclick={() => { if (tagName.trim()) { go({ op: 'untag', name: tagName.trim() }); tagName = ''; } }} title={t('gm.quick.untagTitle')}>{t('gm.common.remove')}</button>
    <datalist id="tag-suggest">{#each [...rules.tags.klein, ...rules.tags.gross] as tg}<option value={tg}></option>{/each}</datalist>
  </div>
</div>

<style>
  .qa { display: grid; gap: 0.4rem; }
  .row { flex-wrap: nowrap; gap: 4px; }
  .lbl { width: 78px; flex: none; font: 600 0.72rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  select { width: auto; min-height: 30px; padding: 0.2em 0.4em; }
  input { min-height: 30px; padding: 0.2em 0.5em; min-width: 0; }
</style>
