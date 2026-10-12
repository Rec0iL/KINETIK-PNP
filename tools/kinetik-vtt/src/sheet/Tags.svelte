<script lang="ts">
  import { rules, tagLabel } from '../rules';
  import { t } from '../i18n';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import Poisons from './Poisons.svelte';

  let { char }: { char: Character } = $props();
  const sheet = $derived(computeSheet(char));
  let custom = $state('');
  let size = $state<'klein' | 'gross'>('klein');

  function add(name: string, sz: 'klein' | 'gross', permanent = false) {
    const n = name.trim();
    if (!n) return;
    char.tags.push({ id: uid(), name: n, size: sz, permanent });
  }
  function addCustom() { add(custom, size); custom = ''; }
  function flip(id: string) {
    const i = char.tags.findIndex((tg) => tg.id === id);
    if (i < 0) return;
    if (char.tags[i].size === 'gross') { alert(t('sheet.tags.flipMajor')); return; }
    if (confirm(t('sheet.tags.flipConfirm'))) char.tags.splice(i, 1);
  }
  const tagLists = rules.tags;
</script>

<div class="stack">
  <Poisons {char} />
  <section class="panel">
    <div class="row"><h2>{t('sheet.tags.againstMe')}</h2><span class="spacer"></span>
      <span class="chip" class:danger={sheet.tagBonus >= 3} class:accent={sheet.tagBonus < 3}>{t('sheet.tags.oppBonus', { n: sheet.tagBonus, max: rules.tabellen.tags.stapelMax })}</span>
    </div>
    <p class="dim hint">{t('sheet.tags.hint')}</p>
    <div class="row add">
      <input bind:value={custom} placeholder={t('sheet.tags.customPlaceholder')} onkeydown={(e) => e.key === 'Enter' && addCustom()} aria-label={t('sheet.common.tagName')} />
      <select bind:value={size} aria-label={t('sheet.common.size')}><option value="klein">{t('sheet.tags.minorOpt')}</option><option value="gross">{t('sheet.tags.majorOpt')}</option></select>
      <button class="btn sm primary" onclick={addCustom}>{t('sheet.tags.addTag')}</button>
    </div>
    <div class="quick">
      {#each tagLists.klein as n}<button class="chip" onclick={() => add(n, 'klein')}>+ {n}</button>{/each}
      {#each tagLists.gross as n}<button class="chip amber" onclick={() => add(n, 'gross')}>+ {n}</button>{/each}
    </div>
    <div class="list">
      {#each char.tags as tg, i (tg.id)}
        <div class="tag" class:big={tg.size === 'gross'}>
          <span class="chip" class:amber={tg.size === 'gross'}>{tg.size === 'gross' ? t('sheet.tags.majorChip') : t('sheet.tags.minorChip')}</span>
          <input class="nm" value={tagLabel(tg.name)} oninput={(e) => (tg.name = e.currentTarget.value)} aria-label={t('sheet.common.name')} />
          <input class="nt" bind:value={tg.note} placeholder={t('sheet.common.note')} aria-label={t('sheet.common.note')} />
          <label class="check" title={t('sheet.tags.permanentTitle')}><input type="checkbox" bind:checked={tg.permanent} /> {t('sheet.tags.permanent')}</label>
          <button class="btn sm" onclick={() => flip(tg.id)} title={t('sheet.tags.flipTitle')}>{t('sheet.tags.flip')}</button>
          <button class="btn sm icon danger" onclick={() => char.tags.splice(i, 1)} aria-label={t('sheet.common.remove')}>✕</button>
        </div>
      {:else}
        <p class="dim">{t('sheet.common.noTagsActive')}</p>
      {/each}
    </div>
  </section>

  <section class="panel">
    <div class="row"><h2>{t('sheet.tags.disadvantages')}</h2><span class="spacer"></span><button class="btn sm" onclick={() => char.disadvantages.push({ id: uid(), text: '' })}>{t('sheet.tags.addDisadv')}</button></div>
    {#each char.disadvantages as d, i (d.id)}
      <div class="row inj"><input bind:value={d.text} placeholder={t('sheet.tags.disadvPlaceholder')} /><button class="btn sm icon danger" onclick={() => char.disadvantages.splice(i, 1)} aria-label={t('sheet.common.remove')}>✕</button></div>
    {:else}
      <p class="dim">{t('sheet.tags.noDisadv')}</p>
    {/each}
  </section>
</div>

<style>
  .hint { font-size: 0.85rem; margin: 0.6rem 0; }
  .add { margin-bottom: 0.6rem; flex-wrap: nowrap; }
  .add select { width: auto; }
  .quick { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 0.9rem; }
  .quick .chip { cursor: pointer; }
  .quick .chip:hover { border-color: var(--accent); color: var(--accent); }
  .list { display: grid; gap: 0.4rem; }
  .tag { display: flex; gap: 0.5rem; align-items: center; padding: 0.4rem 0.6rem; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent); flex-wrap: wrap; }
  .tag.big { border-left-color: var(--accent-2); }
  .nm { flex: 1 1 140px; font-weight: 600; }
  .nt { flex: 2 1 160px; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.85rem; color: var(--ink-dim); }
  .inj { flex-wrap: nowrap; margin-top: 0.4rem; }
</style>
