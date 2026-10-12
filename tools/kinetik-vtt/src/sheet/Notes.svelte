<script lang="ts">
  import { uid, type Character } from '../model/character';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
  let sel = $state('');

  const current = $derived(char.notes.find((n) => n.id === sel) ?? char.notes[0]);

  function add() {
    const n = { id: uid(), title: t('sheet.notes.newNote'), text: '' };
    char.notes.push(n);
    sel = n.id;
  }
  function remove(id: string) {
    if (!confirm(t('sheet.notes.confirmDelete'))) return;
    char.notes = char.notes.filter((n) => n.id !== id);
    sel = char.notes[0]?.id ?? '';
  }
</script>

<div class="stack">
  <section class="panel notes">
    <div class="side">
      <div class="row"><h2>{t('sheet.notes.notes')}</h2><span class="spacer"></span><button class="btn sm primary" onclick={add}>+</button></div>
      <ul>
        {#each char.notes as n (n.id)}
          <li><button class:on={current?.id === n.id} onclick={() => (sel = n.id)}>{n.title || t('sheet.notes.untitled')}</button></li>
        {/each}
      </ul>
    </div>
    <div class="main">
      {#if current}
        <div class="row">
          <input class="ttl" bind:value={current.title} aria-label={t('sheet.notes.titleAria')} />
          <button class="btn sm icon danger" onclick={() => remove(current.id)} aria-label={t('sheet.notes.delete')}>✕</button>
        </div>
        <textarea bind:value={current.text} rows="16" placeholder={t('sheet.notes.textPlaceholder')} aria-label={t('sheet.notes.textAria')}></textarea>
      {:else}
        <p class="dim">{t('sheet.notes.empty')}</p>
      {/if}
    </div>
  </section>

  <section class="panel">
    <div class="row"><h2>{t('sheet.notes.customFields')}</h2><span class="spacer"></span><button class="btn sm" onclick={() => char.customFields.push({ id: uid(), label: '', value: '' })}>{t('sheet.notes.addField')}</button></div>
    <p class="dim hint">{t('sheet.notes.fieldsHint')}</p>
    {#each char.customFields as f, i (f.id)}
      <div class="row cf">
        <input class="l" bind:value={f.label} placeholder={t('sheet.notes.label')} aria-label={t('sheet.notes.label')} />
        <input class="v" bind:value={f.value} placeholder={t('sheet.notes.value')} aria-label={t('sheet.notes.value')} />
        <button class="btn sm icon danger" onclick={() => char.customFields.splice(i, 1)} aria-label={t('sheet.common.remove')}>✕</button>
      </div>
    {/each}
  </section>
</div>

<style>
  .notes { display: grid; grid-template-columns: 200px 1fr; gap: 1rem; }
  .side ul { list-style: none; padding: 0; margin: 0.5rem 0 0; display: grid; gap: 2px; }
  .side li button { width: 100%; text-align: left; background: transparent; border: 0; border-left: 2px solid transparent; color: var(--ink-dim); padding: 0.5em 0.7em; cursor: pointer; font: inherit; }
  .side li button:hover { color: var(--ink); background: var(--raised); }
  .side li button.on { color: var(--accent); border-left-color: var(--accent); background: var(--accent-soft); }
  .main { display: grid; gap: 0.6rem; align-content: start; }
  .ttl { font: 600 1.1rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
  textarea { font-size: 0.98rem; }
  .hint { font-size: 0.85rem; margin: 0.4rem 0; }
  .cf { flex-wrap: nowrap; margin-top: 0.4rem; }
  .cf .l { flex: 1; }
  .cf .v { flex: 2; }
  @media (max-width: 700px) { .notes { grid-template-columns: 1fr; } }
</style>
