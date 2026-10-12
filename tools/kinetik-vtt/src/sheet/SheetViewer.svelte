<script lang="ts">
  import type { Character } from '../model/character';
  import Overview from './Overview.svelte';
  import Body from './Body.svelte';
  import Moves from './Moves.svelte';
  import Gear from './Gear.svelte';
  import Tags from './Tags.svelte';
  import Notes from './Notes.svelte';
  import { t } from '../i18n';

  let { char, editable = false }: { char: Character; editable?: boolean } = $props();

  const tabs = ['overview', 'body', 'moves', 'gear', 'tags', 'notes'] as const;
  const tabLabel: Record<(typeof tabs)[number], string> = {
    overview: t('sheet.viewer.overview'), body: t('sheet.viewer.body'), moves: t('sheet.viewer.moves'),
    gear: t('sheet.viewer.gear'), tags: t('sheet.viewer.tags'), notes: t('sheet.viewer.notes'),
  };
  let tab = $state<(typeof tabs)[number]>('overview');
</script>

<div class="viewer">
  <div class="tabs" role="tablist">
    {#each tabs as k}<button role="tab" aria-selected={tab === k} onclick={() => (tab = k)}>{tabLabel[k]}</button>{/each}
  </div>
  {#if !editable}<p class="chip amber ro">{t('sheet.viewer.readOnly')}</p>{/if}
  <fieldset disabled={!editable}>
    {#if tab === 'overview'}<Overview {char} />
    {:else if tab === 'body'}<Body {char} />
    {:else if tab === 'moves'}<Moves {char} />
    {:else if tab === 'gear'}<Gear {char} />
    {:else if tab === 'tags'}<Tags {char} />
    {:else}<Notes {char} />{/if}
  </fieldset>
</div>

<style>
  .viewer { display: grid; gap: 0.8rem; }
  fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
  .ro { justify-self: start; }
</style>
