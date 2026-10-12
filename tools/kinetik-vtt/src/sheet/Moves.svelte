<script lang="ts">
  import { rules, costLabel, TIER_LABEL } from '../rules';
  import type { Character, Move } from '../model/character';
  import { viewMove, moveRollBonus } from '../model/sheet';
  import { blankMove, moveFromTemplate } from './moveTemplates';
  import { settings } from '../lib/settings.svelte';
  import { affordability, rollMove } from './moveUse.svelte';
  import MovePayBar from './MovePayBar.svelte';
  import MoveEditor from './MoveEditor.svelte';
  import { uid } from '../model/character';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();

  let openId = $state<string | null>(null);
  let query = $state('');
  let template = $state('');

  const filtered = $derived(
    char.moves.filter((m) => !query || `${m.name} ${m.text}`.toLowerCase().includes(query.toLowerCase())),
  );
  const defaultTitle = $derived(char.titles[0]);

  function add(m: Move) {
    char.moves.push(m);
    openId = m.id;
  }
  function addBlank() {
    add(blankMove({ titleId: defaultTitle?.id, level: defaultTitle?.level }));
  }
  function addTemplate() {
    const m = moveFromTemplate(template, { titleId: defaultTitle?.id, level: defaultTitle?.level });
    if (m) { add(m); template = ''; }
  }
  function remove(id: string) {
    if (!confirm(t('sheet.moves.confirmDelete'))) return;
    char.moves = char.moves.filter((m) => m.id !== id);
    if (openId === id) openId = null;
  }
  function duplicate(m: Move) {
    const copy: Move = JSON.parse(JSON.stringify($state.snapshot(m)));
    copy.id = uid();
    copy.name += t('sheet.moves.copySuffix');
    char.moves.push(copy);
  }
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const titleOpts = $derived(char.titles.map((t) => ({ id: t.id, name: t.name, level: t.level })));
</script>

<div class="stack">
  <section class="panel">
    <div class="row">
      <h2>Moves</h2><span class="chip">{char.moves.length}</span>
      <span class="spacer"></span>
      <input class="search" bind:value={query} placeholder={t('sheet.moves.searchPlaceholder')} aria-label={t('sheet.moves.searchAria')} />
    </div>
    <div class="row adds">
      <button class="btn primary sm" onclick={addBlank}>{t('sheet.moves.newMove')}</button>
      <select bind:value={template} aria-label={t('sheet.moves.templateAria')}>
        <option value="">{t('sheet.moves.templatePick')}</option>
        {#each rules.moves.moves as tm}<option value={tm.id}>{tm.name} ({tm.ep} EP, {tm.titel})</option>{/each}
      </select>
      <button class="btn sm" onclick={addTemplate} disabled={!template}>{t('sheet.common.add')}</button>
      <a class="btn sm ghost" href="#/builder">{t('sheet.moves.toBuilder')}</a>
      <label class="auto" title={t('sheet.common.autoPayTitle')}><input type="checkbox" bind:checked={settings.autoPayMoves} /> {t('sheet.moves.autoPayLong')}</label>
    </div>
    {#if !char.titles.length}<p class="warn">{t('sheet.moves.needTitle')}</p>{/if}
  </section>

  {#each filtered as m (m.id)}
    {@const v = viewMove(char, m)}
    {@const a = affordability(char, m)}
    <section class="panel move" class:open={openId === m.id}>
      <div class="row head">
        <button class="name" onclick={() => (openId = openId === m.id ? null : m.id)} aria-expanded={openId === m.id}>
          <span class="caret">{openId === m.id ? '▾' : '▸'}</span> {m.name}
        </button>
        {#if v.titleName}<span class="chip">{v.titleName}</span>{/if}
        <span class="chip accent">{rules.tabellen.attribute.find((a) => a.key === m.attr)?.name}</span>
        <span class="chip amber">{v.evaluation.ep} EP</span>
        <span class="chip">{TIER_LABEL[v.evaluation.tier]}</span>
        {#if v.cost.mastered}<span class="chip accent">{t('sheet.common.mastered')}</span>{/if}
        {#if v.cost.levelTooLow}<span class="chip danger" title={t('sheet.common.levelBelowMin')}>{t('sheet.common.levelNeeded', { n: v.evaluation.minLevel })}</span>{/if}
        <span class="spacer"></span>
        <span class="cost">{costLabel(v.cost)}</span>
        <button class="btn sm primary" onclick={() => rollMove(char, m)} disabled={!a.ok} title={a.ok ? t('sheet.common.roll2d6', { b: fmt(moveRollBonus(char, m)) }) : a.reason}>{t('sheet.common.rollBonus', { b: fmt(moveRollBonus(char, m)) })}</button>
      </div>
      <MovePayBar {char} move={m} />
      {#if openId !== m.id && m.text}<p class="dim txt">{m.text}</p>{/if}
      {#if openId === m.id}
        <MoveEditor bind:move={char.moves[char.moves.findIndex((x) => x.id === m.id)]} level={v.level} titles={titleOpts} />
        <div class="row foot">
          <button class="btn sm" onclick={() => duplicate(m)}>{t('sheet.moves.duplicate')}</button>
          <button class="btn sm danger" onclick={() => remove(m.id)}>{t('sheet.moves.delete')}</button>
        </div>
      {/if}
    </section>
  {:else}
    <p class="dim">{query ? t('sheet.moves.noneFound') : t('sheet.moves.noneYet')}</p>
  {/each}
</div>

<style>
  .adds { margin-top: 0.7rem; }
  .auto { display: flex; gap: 0.4em; align-items: center; font-size: 0.85rem; color: var(--ink-dim); cursor: pointer; }
  .adds select { width: auto; max-width: min(320px, 100%); }
  .search { max-width: 220px; }
  .warn { color: var(--warn); margin: 0.6rem 0 0; }
  .move { border-left: 3px solid var(--line-strong); }
  .move.open { border-left-color: var(--accent); }
  .head { gap: 0.4rem; }
  .name { background: none; border: 0; color: var(--ink-strong); font: 600 1.15rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer; text-align: left; padding: 0.2em 0; }
  .name:hover { color: var(--accent); }
  .caret { color: var(--accent-2); }
  .cost { font: 400 1.4rem var(--font-display); letter-spacing: 0.05em; color: var(--accent); }
  .txt { margin: 0.4rem 0 0; font-size: 0.92rem; }
  .foot { margin-top: 0.8rem; padding-top: 0.7rem; border-top: 1px solid var(--line); }
</style>
