<script lang="ts">
  import type { Character } from '../model/character';
  import Overview from './Overview.svelte';
  import Body from './Body.svelte';
  import Moves from './Moves.svelte';
  import Gear from './Gear.svelte';
  import Tags from './Tags.svelte';
  import Notes from './Notes.svelte';

  let { char, editable = false }: { char: Character; editable?: boolean } = $props();

  const tabs = ['Übersicht', 'Körper', 'Moves', 'Ausrüstung', 'Tags', 'Notizen'] as const;
  let tab = $state<(typeof tabs)[number]>('Übersicht');
</script>

<div class="viewer">
  <div class="tabs" role="tablist">
    {#each tabs as t}<button role="tab" aria-selected={tab === t} onclick={() => (tab = t)}>{t}</button>{/each}
  </div>
  {#if !editable}<p class="chip amber ro">Nur lesen</p>{/if}
  <fieldset disabled={!editable}>
    {#if tab === 'Übersicht'}<Overview {char} />
    {:else if tab === 'Körper'}<Body {char} />
    {:else if tab === 'Moves'}<Moves {char} />
    {:else if tab === 'Ausrüstung'}<Gear {char} />
    {:else if tab === 'Tags'}<Tags {char} />
    {:else}<Notes {char} />{/if}
  </fieldset>
</div>

<style>
  .viewer { display: grid; gap: 0.8rem; }
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  .ro { justify-self: start; }
</style>
