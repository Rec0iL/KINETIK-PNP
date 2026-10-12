<script lang="ts">
  import { rules, tagLabel } from '../rules';
  import { t } from '../i18n';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';

  let { char, ontab }: { char: Character; ontab?: (tab: string) => void } = $props();
  const sheet = $derived(computeSheet(char));
  let name = $state('');
  let size = $state<'klein' | 'gross'>('klein');

  function add(n: string, sz: 'klein' | 'gross' = size) {
    const nm = n.trim();
    if (!nm) return;
    char.tags.push({ id: uid(), name: nm, size: sz });
    name = '';
  }
  // Kennungen der Schnell-Tags; gespeichert und angezeigt wird der Name in der Sprache der App.
  const quick = ['Am Boden', 'Geblendet', 'Entwaffnet', 'Benommen'].map(tagLabel);
</script>

<section class="panel tags">
  <div class="row head">
    <h2>Tags</h2><span class="spacer"></span>
    <span class="chip" class:danger={sheet.tagBonus >= 3} class:accent={sheet.tagBonus < 3} title={t('sheet.tags.sumTitle', { max: rules.tabellen.tags.stapelMax })}>{t('sheet.tags.oppPlus', { n: sheet.tagBonus })}</span>
  </div>

  <div class="list">
    {#each char.tags as tg, i (tg.id)}
      <div class="tag" class:big={tg.size === 'gross'}>
        <button class="sz" onclick={() => (tg.size = tg.size === 'klein' ? 'gross' : 'klein')} title={t('sheet.tags.sizeTitle')}>{tg.size === 'gross' ? '+2' : '+1'}</button>
        <input value={tagLabel(tg.name)} oninput={(e) => (tg.name = e.currentTarget.value)} aria-label={t('sheet.common.tagName')} />
        <button class="btn sm icon ghost danger" onclick={() => char.tags.splice(i, 1)} aria-label={t('sheet.tags.removeTag')}>✕</button>
      </div>
    {:else}
      <p class="dim none">{t('sheet.common.noTagsActive')}</p>
    {/each}
  </div>

  <div class="add">
    <input bind:value={name} placeholder={t('sheet.tags.addPlaceholder')} aria-label={t('sheet.tags.newAria')} onkeydown={(e) => e.key === 'Enter' && add(name)} />
    <select bind:value={size} aria-label={t('sheet.common.size')}><option value="klein">{t('sheet.tags.minor')}</option><option value="gross">{t('sheet.tags.major')}</option></select>
    <button class="btn sm primary" onclick={() => add(name)} disabled={!name.trim()}>+</button>
  </div>
  <div class="quick">{#each quick as q}<button class="chip" onclick={() => add(q, 'klein')}>+ {q}</button>{/each}</div>
  {#if ontab}<button class="more" onclick={() => ontab('tags')}>{t('sheet.tags.more')}</button>{/if}
</section>

<style>
  .head { margin-bottom: 0.5rem; }
  .list { display: grid; gap: 4px; }
  .tag { display: flex; gap: 4px; align-items: center; padding: 3px 4px; background: var(--raised); border-left: 3px solid var(--accent); }
  .tag.big { border-left-color: var(--accent-2); }
  .tag input { flex: 1; min-width: 0; min-height: 28px; padding: 0.15em 0.4em; border-color: transparent; background: transparent; font-weight: 600; }
  .tag input:focus { background: var(--field-bg); }
  .sz { min-width: 2.2em; background: var(--accent-soft); border: 1px solid var(--accent-line); color: var(--accent); font: 700 0.8rem var(--font-mono); cursor: pointer; padding: 0.25em 0.3em; }
  .big .sz { background: var(--accent-2-soft); border-color: var(--accent-2); color: var(--accent-2); }
  .none { margin: 0.2rem 0; font-size: 0.9rem; }
  .add { display: flex; gap: 4px; margin-top: 0.6rem; }
  .add input { flex: 1; min-width: 0; min-height: 32px; padding: 0.2em 0.5em; }
  .add select { width: auto; min-height: 32px; padding: 0.2em 0.4em; }
  .quick { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.5rem; }
  .quick .chip { cursor: pointer; }
  .quick .chip:hover { border-color: var(--accent); color: var(--accent); }
  .more { background: none; border: 0; color: var(--accent); cursor: pointer; font: inherit; font-size: 0.85rem; padding: 0.6rem 0 0; text-align: left; }
  .more:hover { text-decoration: underline; }
</style>
