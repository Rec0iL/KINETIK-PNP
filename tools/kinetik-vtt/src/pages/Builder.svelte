<script lang="ts">
  import { untrack } from 'svelte';
  import { rules, costLabel, evaluateMove, moveCost } from '../rules';
  import { uid, type Move } from '../model/character';
  import { moveLibrary, saveMoveLibrary } from '../store/moves.svelte';
  import { library, saveCharacter } from '../store/characters.svelte';
  import { blankMove, moveFromTemplate } from '../sheet/moveTemplates';
  import { downloadJson, exportMoves, parseMoveImport, ImportError } from '../model/io';
  import MoveEditor from '../sheet/MoveEditor.svelte';
  import Dialog from '../ui/Dialog.svelte';
  import { t, tn } from '../i18n';

  let selectedId = $state<string | null>(null);
  let level = $state(1);
  let message = $state('');
  let fileInput = $state<HTMLInputElement>();
  let sendOpen = $state(false);
  let sendChar = $state('');
  let sendTitle = $state('');

  const idx = $derived(moveLibrary.moves.findIndex((m) => m.id === selectedId));
  const sendTitles = $derived(library.characters.find((c) => c.id === sendChar)?.titles ?? []);

  // Autosave der Bibliothek bei jeder Änderung.
  let first = true;
  $effect(() => {
    JSON.stringify($state.snapshot(moveLibrary.moves));
    if (first) { first = false; return; }
    untrack(() => saveMoveLibrary());
  });

  function select(id: string) {
    selectedId = id;
    const m = moveLibrary.moves.find((x) => x.id === id);
    if (m?.learnedAtLevel) level = Math.max(1, Math.min(10, m.learnedAtLevel));
  }
  function add(m: Move) {
    moveLibrary.moves.unshift(m);
    select(m.id);
  }
  function fromTemplate(id: string) {
    const tpl = rules.moves.moves.find((x) => x.id === id);
    const m = moveFromTemplate(id, { level: tpl?.minLevel ?? 1 });
    if (m) add(m);
  }
  function duplicate() {
    if (idx < 0) return;
    const copy: Move = JSON.parse(JSON.stringify($state.snapshot(moveLibrary.moves[idx])));
    copy.id = uid();
    copy.name += t('pages.builder.copySuffix');
    add(copy);
  }
  function remove() {
    if (idx < 0 || !confirm(t('pages.builder.confirmDelete'))) return;
    moveLibrary.moves.splice(idx, 1);
    selectedId = null;
  }
  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    let n = 0;
    const errors: string[] = [];
    for (const f of [...(input.files ?? [])]) {
      try {
        for (const m of parseMoveImport(await f.text())) { moveLibrary.moves.unshift(m); n++; }
      } catch (err) {
        errors.push(`${f.name}: ${err instanceof ImportError ? err.message : t('pages.common.readError')}`);
      }
    }
    input.value = '';
    message = [n ? tn('pages.builder.imported', n) : '', ...errors].filter(Boolean).join(' ');
  }
  function openSend() {
    sendChar = library.characters[0]?.id ?? '';
    sendTitle = '';
    sendOpen = true;
  }
  function doSend() {
    const c = library.characters.find((x) => x.id === sendChar);
    if (!c || idx < 0) return;
    const copy: Move = JSON.parse(JSON.stringify($state.snapshot(moveLibrary.moves[idx])));
    copy.id = uid();
    copy.titleId = sendTitle || undefined;
    c.moves.push(copy);
    c.updated = Date.now();
    saveCharacter(c);
    sendOpen = false;
    message = t('pages.builder.added', { move: copy.name, char: c.name });
  }
  const short = (m: Move) => {
    const ev = evaluateMove(m);
    return `${ev.ep} EP · ${costLabel(moveCost(m, Math.max(level, ev.minLevel)))}`;
  };
</script>

<section class="head">
  <div>
    <span class="kicker">{t('pages.builder.kicker')}</span>
    <h1>{t('pages.builder.title')}</h1>
  </div>
  <div class="row">
    <button class="btn primary" onclick={() => add(blankMove({ level: 1 }))}>{t('pages.builder.newMove')}</button>
    <button class="btn" onclick={() => fileInput?.click()}>{t('pages.builder.import')}</button>
    <button class="btn" onclick={() => downloadJson(exportMoves($state.snapshot(moveLibrary.moves)), 'kinetik-moves.json')} disabled={!moveLibrary.moves.length}>{t('pages.common.exportAll')}</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" multiple class="sr-only" onchange={onFiles} />
  </div>
</section>
{#if message}<p class="panel flat banner">{message} <button class="btn sm ghost" onclick={() => (message = '')}>OK</button></p>{/if}

<div class="layout">
  <aside class="stack">
    <section class="panel">
      <h2>{t('pages.builder.myMoves')} <span class="chip">{moveLibrary.moves.length}</span></h2>
      <ul class="list">
        {#each moveLibrary.moves as m (m.id)}
          <li><button class:on={m.id === selectedId} onclick={() => select(m.id)}><b>{m.name}</b><small class="dim">{short(m)}</small></button></li>
        {:else}
          <li class="dim">{t('pages.builder.empty')}</li>
        {/each}
      </ul>
    </section>
    <section class="panel">
      <h2>{t('pages.builder.templates')}</h2>
      <ul class="list">
        {#each rules.moves.moves as tpl}
          <li><button onclick={() => fromTemplate(tpl.id)} title={tpl.text}><b>{tpl.name}</b><small class="dim">{tpl.ep} EP · {tpl.titel}</small></button></li>
        {/each}
      </ul>
    </section>
  </aside>

  <div>
    {#if idx >= 0}
      <section class="panel">
        <MoveEditor bind:move={moveLibrary.moves[idx]} bind:level levelEditable />
        <div class="row foot">
          <button class="btn sm" onclick={duplicate}>{t('pages.common.duplicate')}</button>
          <button class="btn sm" onclick={() => downloadJson({ kinetik: 'move', schemaVersion: 1, rulesVersion: rules.tabellen.rules_version, move: $state.snapshot(moveLibrary.moves[idx]) }, `kinetik-move-${moveLibrary.moves[idx].name.toLowerCase().replace(/\W+/g, '-')}.json`)}>{t('pages.common.exportJson')}</button>
          <button class="btn sm amber" onclick={openSend} disabled={!library.characters.length}>{t('pages.builder.addToChar')}</button>
          <span class="spacer"></span>
          <button class="btn sm danger" onclick={remove}>{t('pages.common.delete')}</button>
        </div>
      </section>
    {:else}
      <section class="panel stack">
        <h2>{t('pages.builder.howTitle')}</h2>
        <ol class="dim">
          <li><b>{t('pages.builder.howDomainLabel')}</b> {t('pages.builder.howDomain')}</li>
          <li><b>{t('pages.builder.howEffectsLabel')}</b> {t('pages.builder.howEffects')}</li>
          <li><b>{t('pages.builder.howDeductionsLabel')}</b> {t('pages.builder.howDeductions')}</li>
          <li><b>{t('pages.builder.howCostLabel')}</b> {t('pages.builder.howCost')}</li>
        </ol>
        <p class="dim">{t('pages.builder.howNote')}</p>
      </section>
    {/if}
  </div>
</div>

<Dialog bind:open={sendOpen} title={t('pages.builder.addToChar')}>
  <div class="stack">
    <label class="field">{t('pages.builder.character')}
      <select bind:value={sendChar}>{#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}</select>
    </label>
    <label class="field">{t('pages.builder.titleField')}
      <select bind:value={sendTitle}><option value="">{t('pages.builder.noTitle')}</option>{#each sendTitles as ti}<option value={ti.id}>{ti.name} (L{ti.level})</option>{/each}</select>
    </label>
    <div class="row"><button class="btn primary" onclick={doSend}>{t('pages.builder.add')}</button><button class="btn" onclick={() => (sendOpen = false)}>{t('pages.common.cancel')}</button></div>
  </div>
</Dialog>

<style>
  .head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .banner { margin: 0 0 1rem; }
  .layout { display: grid; grid-template-columns: 290px 1fr; gap: 1rem; align-items: start; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 340px; overflow: auto; }
  .list button { width: 100%; display: grid; text-align: left; background: transparent; border: 0; border-left: 2px solid transparent; padding: 0.4em 0.6em; cursor: pointer; color: var(--ink); font: inherit; }
  .list button:hover { background: var(--raised); }
  .list button.on { border-left-color: var(--accent); background: var(--accent-soft); color: var(--accent); }
  .list b { font-weight: 600; }
  .foot { margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid var(--line); }
  ol { padding-left: 1.2em; display: grid; gap: 0.4rem; }
  @media (max-width: 860px) { .layout { grid-template-columns: 1fr; } }
</style>
