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
    const t = rules.moves.moves.find((x) => x.id === id);
    const m = moveFromTemplate(id, { level: t?.minLevel ?? 1 });
    if (m) add(m);
  }
  function duplicate() {
    if (idx < 0) return;
    const copy: Move = JSON.parse(JSON.stringify($state.snapshot(moveLibrary.moves[idx])));
    copy.id = uid();
    copy.name += ' (Kopie)';
    add(copy);
  }
  function remove() {
    if (idx < 0 || !confirm('Move aus der Bibliothek löschen?')) return;
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
        errors.push(`${f.name}: ${err instanceof ImportError ? err.message : 'Lesefehler'}`);
      }
    }
    input.value = '';
    message = [n ? `${n} Move(s) importiert.` : '', ...errors].filter(Boolean).join(' ');
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
    message = `„${copy.name}“ zu ${c.name} hinzugefügt.`;
  }
  const short = (m: Move) => {
    const ev = evaluateMove(m);
    return `${ev.ep} EP · ${costLabel(moveCost(m, Math.max(level, ev.minLevel)))}`;
  };
</script>

<section class="head">
  <div>
    <span class="kicker">Regeln 5.1 bis 5.4</span>
    <h1>Move-Builder</h1>
  </div>
  <div class="row">
    <button class="btn primary" onclick={() => add(blankMove({ level: 1 }))}>+ Neuer Move</button>
    <button class="btn" onclick={() => fileInput?.click()}>Importieren</button>
    <button class="btn" onclick={() => downloadJson(exportMoves($state.snapshot(moveLibrary.moves)), 'kinetik-moves.json')} disabled={!moveLibrary.moves.length}>Alle exportieren</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" multiple class="sr-only" onchange={onFiles} />
  </div>
</section>
{#if message}<p class="panel flat banner">{message} <button class="btn sm ghost" onclick={() => (message = '')}>OK</button></p>{/if}

<div class="layout">
  <aside class="stack">
    <section class="panel">
      <h2>Meine Moves <span class="chip">{moveLibrary.moves.length}</span></h2>
      <ul class="list">
        {#each moveLibrary.moves as m (m.id)}
          <li><button class:on={m.id === selectedId} onclick={() => select(m.id)}><b>{m.name}</b><small class="dim">{short(m)}</small></button></li>
        {:else}
          <li class="dim">Noch nichts gespeichert. Starte mit „Neuer Move“ oder einer Vorlage.</li>
        {/each}
      </ul>
    </section>
    <section class="panel">
      <h2>Vorlagen (5.2)</h2>
      <ul class="list">
        {#each rules.moves.moves as t}
          <li><button onclick={() => fromTemplate(t.id)} title={t.text}><b>{t.name}</b><small class="dim">{t.ep} EP · {t.titel}</small></button></li>
        {/each}
      </ul>
    </section>
  </aside>

  <div>
    {#if idx >= 0}
      <section class="panel">
        <MoveEditor bind:move={moveLibrary.moves[idx]} bind:level levelEditable />
        <div class="row foot">
          <button class="btn sm" onclick={duplicate}>Duplizieren</button>
          <button class="btn sm" onclick={() => downloadJson({ kinetik: 'move', schemaVersion: 1, rulesVersion: rules.tabellen.rules_version, move: $state.snapshot(moveLibrary.moves[idx]) }, `kinetik-move-${moveLibrary.moves[idx].name.toLowerCase().replace(/\W+/g, '-')}.json`)}>Export JSON</button>
          <button class="btn sm amber" onclick={openSend} disabled={!library.characters.length}>Zu Charakter hinzufügen</button>
          <span class="spacer"></span>
          <button class="btn sm danger" onclick={remove}>Löschen</button>
        </div>
      </section>
    {:else}
      <section class="panel stack">
        <h2>So funktioniert es</h2>
        <ol class="dim">
          <li><b>Domäne:</b> Titel, Attribut und Technik müssen zusammenpassen.</li>
          <li><b>Effekte:</b> Ein normaler Angriff kostet 0 EP, alles darüber wird mit Effekten aus dem Katalog bezahlt. Effekte außerhalb des Katalogs schätzt der SL (klein 1, mittel 2, groß 3 EP).</li>
          <li><b>Abzüge:</b> Vorbedingung, Risiko, Setup-Runde oder einmal pro Szene, je −1 EP, höchstens −2.</li>
          <li><b>Kosten:</b> Bis 3 EP in Energie (EP − Meisterschaft, mindestens 1 ab 3 EP), ab 4 EP in Momentum plus 1 Energie.</li>
        </ol>
        <p class="dim">Der Builder rechnet live, lässt aber jede Zahl überschreiben. Hausregeln und SL-Entscheidungen haben immer Vorrang.</p>
      </section>
    {/if}
  </div>
</div>

<Dialog bind:open={sendOpen} title="Zu Charakter hinzufügen">
  <div class="stack">
    <label class="field">Charakter
      <select bind:value={sendChar}>{#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}</select>
    </label>
    <label class="field">Titel
      <select bind:value={sendTitle}><option value="">— keiner —</option>{#each sendTitles as t}<option value={t.id}>{t.name} (L{t.level})</option>{/each}</select>
    </label>
    <div class="row"><button class="btn primary" onclick={doSend}>Hinzufügen</button><button class="btn" onclick={() => (sendOpen = false)}>Abbrechen</button></div>
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
