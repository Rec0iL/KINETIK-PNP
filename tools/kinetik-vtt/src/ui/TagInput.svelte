<script lang="ts">
  let { values = $bindable([]), placeholder = 'Hinzufügen (Enter)', label = '' }: { values: string[]; placeholder?: string; label?: string } = $props();
  let draft = $state('');

  function add() {
    const parts = draft.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) values = [...values, ...parts.filter((p) => !values.includes(p))];
    draft = '';
  }
</script>

<div class="ti" aria-label={label || undefined}>
  {#each values as v, i (v)}
    <span class="chip accent">{v}<button type="button" onclick={() => (values = values.filter((_, j) => j !== i))} aria-label={`${v} entfernen`}>×</button></span>
  {/each}
  <input
    bind:value={draft} {placeholder} aria-label={label || placeholder}
    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !draft && values.length) values = values.slice(0, -1); }}
    onblur={add}
  />
</div>

<style>
  .ti { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; padding: 4px; background: rgba(0, 0, 0, 0.35); border: 1px solid var(--line); min-height: 38px; }
  .ti:focus-within { border-color: var(--accent); }
  .ti input { flex: 1; min-width: 9em; border: 0; background: transparent; min-height: 28px; padding: 0.2em 0.4em; }
  .ti input:focus { box-shadow: none; }
  .chip button { background: none; border: 0; color: inherit; cursor: pointer; padding: 0 0 0 0.2em; font-size: 1.1em; line-height: 1; }
  .chip button:hover { color: var(--danger); }
</style>
