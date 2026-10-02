<script lang="ts">
  import type { Derived } from '../model/sheet';

  let {
    derived,
    formula = '',
    label = '',
    onset,
  }: { derived: Derived; formula?: string; label?: string; onset: (v: number | undefined) => void } = $props();

  let editing = $state(false);
  let draft = $state(0);

  function start() {
    draft = derived.value;
    editing = true;
  }
  function commit() {
    editing = false;
    if (draft === derived.rule) onset(undefined);
    else onset(Math.round(draft));
  }
</script>

<span class="ov" class:overridden={derived.overridden}>
  {#if editing}
    <input
      type="number" bind:value={draft} aria-label={label}
      onblur={commit}
      onkeydown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') editing = false; }}
      {@attach (el) => el.focus()}
    />
  {:else}
    <button type="button" class="val" onclick={start} title={`${formula ? formula + '\n' : ''}Klicken zum Überschreiben${derived.overridden ? `\nRegelwert: ${derived.rule}` : ''}`}>
      {derived.value}{#if derived.overridden}<sup>✎</sup>{/if}
    </button>
    {#if derived.overridden}
      <button type="button" class="reset" onclick={() => onset(undefined)} title={`Zurück auf Regelwert (${derived.rule})`} aria-label="Zurücksetzen">↺</button>
    {/if}
  {/if}
</span>

<style>
  .ov { display: inline-flex; align-items: baseline; gap: 0.2em; }
  .val { background: none; border: 0; color: inherit; font: inherit; cursor: text; padding: 0 0.15em; border-bottom: 1px dashed var(--line-strong); }
  .val:hover { border-bottom-color: var(--accent); color: var(--accent); }
  .overridden .val { color: var(--accent-2); border-bottom-color: var(--accent-2); }
  sup { font-size: 0.55em; }
  .reset { background: none; border: 0; color: var(--accent-2); cursor: pointer; font-size: 0.9em; padding: 0 0.2em; }
  input { width: 4em; min-height: 28px; padding: 0.1em 0.3em; text-align: center; }
</style>
