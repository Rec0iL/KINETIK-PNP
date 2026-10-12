<script lang="ts">
  import { epCap, meisterschaft, minLevelForEp } from '../rules';
  import type { Character } from '../model/character';
  import Moves from '../sheet/Moves.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
</script>

<div class="stack">
  <p class="dim intro">{t('wizard.moves.intro1')}<b>{t('wizard.moves.intro2')}</b>{t('wizard.moves.intro3')}</p>

  {#if char.titles.length}
    <div class="caps">
      {#each char.titles as ti (ti.id)}
        {@const m = meisterschaft(ti.level)}
        <div class="cap"><b>{ti.name}</b><span>{t('wizard.moves.levelMastery', { level: ti.level, m })}</span><span class="chip amber">{t('wizard.moves.epCap', { cap: epCap(m) })}</span>
          <small class="dim">{t('wizard.moves.minLevels', { a: minLevelForEp(4), b: minLevelForEp(5) })}</small></div>
      {/each}
    </div>
  {:else}
    <p class="warn">{t('wizard.moves.noTitle')}</p>
  {/if}

  <Moves {char} />
</div>

<style>
  .intro { margin: 0; }
  .caps { display: flex; flex-wrap: wrap; gap: 0.6rem; }
  .cap { display: grid; gap: 2px; padding: 0.5rem 0.8rem; background: var(--raised); border-left: 3px solid var(--accent-2); }
  .cap b { font: 600 1rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; }
  .warn { color: var(--warn); margin: 0; }
</style>
