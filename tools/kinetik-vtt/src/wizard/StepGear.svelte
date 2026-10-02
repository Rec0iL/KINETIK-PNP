<script lang="ts">
  import type { Character } from '../model/character';
  import { ARMOR_PRESETS } from './templates';
  import ShieldGauge from '../ui/ShieldGauge.svelte';
  import Gear from '../sheet/Gear.svelte';

  let { char }: { char: Character } = $props();

  function pick(i: number) {
    const a = ARMOR_PRESETS[i];
    char.resources.schutz.type = a.max ? a.name : '';
    char.resources.schutz.max = a.max;
    char.resources.schutz.current = a.max;
  }
</script>

<div class="stack">
  <p class="dim intro">Schutz ist kontextabhängig (ein ballistischer Anzug hilft gegen Kugeln, nicht gegen einen Tritt) und liegt zwischen 0 und 3. Er hebt die Schwelle für Verletzungen an und nutzt sich bei Treffern ab. Waffen bringen ein Profil mit, der Titel bestimmt das Können.</p>

  <section class="panel flat">
    <h2>Schutz</h2>
    <div class="row">
      <ShieldGauge bind:current={char.resources.schutz.current} bind:max={char.resources.schutz.max} />
      <div class="stack grow">
        <div class="presets">{#each ARMOR_PRESETS as a, i}<button class="chip" onclick={() => pick(i)}>{a.name} · {a.max}</button>{/each}</div>
        <label class="field">Art / Kontext<textarea rows="2" bind:value={char.resources.schutz.type} placeholder="z.B. Verdecktes Kevlar, gegen Kugeln und Schnitte"></textarea></label>
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
