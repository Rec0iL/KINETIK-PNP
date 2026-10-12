<script lang="ts">
  import type { Character } from '../model/character';
  import { ARMOR_PRESETS } from './templates';
  import ShieldGauge from '../ui/ShieldGauge.svelte';
  import Gear from '../sheet/Gear.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();

  function pick(i: number) {
    const a = ARMOR_PRESETS[i];
    char.resources.schutz.type = a.max ? a.name : '';
    char.resources.schutz.max = a.max;
    char.resources.schutz.current = a.max;
  }
</script>

<div class="stack">
  <p class="dim intro">{t('wizard.gear.intro')}</p>

  <section class="panel flat">
    <h2>{t('wizard.common.schutz')}</h2>
    <div class="row">
      <ShieldGauge bind:current={char.resources.schutz.current} bind:max={char.resources.schutz.max} />
      <div class="stack grow">
        <div class="presets">{#each ARMOR_PRESETS as a, i}<button class="chip" onclick={() => pick(i)}>{a.name} · {a.max}</button>{/each}</div>
        <label class="field">{t('wizard.gear.type')}<textarea rows="2" bind:value={char.resources.schutz.type} placeholder={t('wizard.gear.typePh')}></textarea></label>
      </div>
    </div>
  </section>

  <Gear {char} />
</div>

<style>
  .intro { margin: 0; }
  .grow { flex: 1; min-width: 220px; }
  .presets { display: flex; flex-wrap: wrap; gap: 5px; }
  .presets .chip { cursor: pointer; text-align: left; }
  .presets .chip:hover { border-color: var(--accent); color: var(--accent); }
</style>
