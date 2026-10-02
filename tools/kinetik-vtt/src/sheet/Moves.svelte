<script lang="ts">
  import { rules, costLabel, TIER_LABEL } from '../rules';
  import type { Character, Move } from '../model/character';
  import { viewMove, moveRollBonus } from '../model/sheet';
  import { blankMove, moveFromTemplate } from './moveTemplates';
  import { roll2d6 } from '../dice/roller.svelte';
  import { settings } from '../lib/settings.svelte';
  import MoveEditor from './MoveEditor.svelte';
  import { uid } from '../model/character';

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
    if (!confirm('Move löschen?')) return;
    char.moves = char.moves.filter((m) => m.id !== id);
    if (openId === id) openId = null;
  }
  function duplicate(m: Move) {
    const copy: Move = JSON.parse(JSON.stringify($state.snapshot(m)));
    copy.id = uid();
    copy.name += ' (Kopie)';
    char.moves.push(copy);
  }
  function rollMove(m: Move) {
    roll2d6({
      who: settings.displayName || char.name, characterId: char.id, kind: 'move',
      label: m.name, bonus: moveRollBonus(char, m),
    });
  }
  const fmt = (n: number) => (n > 0 ? `+${n}` : String(n));
  const titleOpts = $derived(char.titles.map((t) => ({ id: t.id, name: t.name, level: t.level })));
</script>

<div class="stack">
  <section class="panel">
    <div class="row">
      <h2>Moves</h2><span class="chip">{char.moves.length}</span>
      <span class="spacer"></span>
      <input class="search" bind:value={query} placeholder="Suchen…" aria-label="Moves suchen" />
    </div>
    <div class="row adds">
      <button class="btn primary sm" onclick={addBlank}>+ Neuer Move</button>
      <select bind:value={template} aria-label="Vorlage wählen">
        <option value="">Beispiel-Move aus 5.2 …</option>
        {#each rules.moves.moves as t}<option value={t.id}>{t.name} ({t.ep} EP, {t.titel})</option>{/each}
      </select>
      <button class="btn sm" onclick={addTemplate} disabled={!template}>Hinzufügen</button>
      <a class="btn sm ghost" href="#/builder">Zum Move-Builder</a>
    </div>
    {#if !char.titles.length}<p class="warn">Lege zuerst einen Titel an, damit Moves Meisterschaft und Kosten bekommen.</p>{/if}
  </section>

  {#each filtered as m (m.id)}
    {@const v = viewMove(char, m)}
    <section class="panel move" class:open={openId === m.id}>
      <div class="row head">
        <button class="name" onclick={() => (openId = openId === m.id ? null : m.id)} aria-expanded={openId === m.id}>
          <span class="caret">{openId === m.id ? '▾' : '▸'}</span> {m.name}
        </button>
        {#if v.titleName}<span class="chip">{v.titleName}</span>{/if}
        <span class="chip accent">{rules.tabellen.attribute.find((a) => a.key === m.attr)?.name}</span>
        <span class="chip amber">{v.evaluation.ep} EP</span>
        <span class="chip">{TIER_LABEL[v.evaluation.tier]}</span>
        {#if v.cost.mastered}<span class="chip accent">gemeistert</span>{/if}
        {#if v.cost.levelTooLow}<span class="chip danger" title="Titel-Level unter dem Mindestlevel">Level {v.evaluation.minLevel} nötig</span>{/if}
        <span class="spacer"></span>
        <span class="cost">{costLabel(v.cost)}</span>
        <button class="btn sm primary" onclick={() => rollMove(m)} title={`2W6 ${fmt(moveRollBonus(char, m))}`}>Würfeln {fmt(moveRollBonus(char, m))}</button>
      </div>
      {#if openId !== m.id && m.text}<p class="dim txt">{m.text}</p>{/if}
      {#if openId === m.id}
        <MoveEditor bind:move={char.moves[char.moves.findIndex((x) => x.id === m.id)]} level={v.level} titles={titleOpts} />
        <div class="row foot">
          <button class="btn sm" onclick={() => duplicate(m)}>Duplizieren</button>
          <button class="btn sm danger" onclick={() => remove(m.id)}>Löschen</button>
        </div>
      {/if}
    </section>
  {:else}
    <p class="dim">Keine Moves{query ? ' gefunden' : ' angelegt'}.</p>
  {/each}
</div>

<style>
  .adds { margin-top: 0.7rem; }
  .adds select { width: auto; max-width: 320px; }
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
