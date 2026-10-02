<script lang="ts">
  import { epCap, meisterschaft, minLevelForEp } from '../rules';
  import type { Character } from '../model/character';
  import Moves from '../sheet/Moves.svelte';

  let { char }: { char: Character } = $props();
</script>

<div class="stack">
  <p class="dim intro">Moves sind die Signature-Techniken deiner Figur. Ein normaler Angriff kostet 0 EP, alles darüber wird mit Effektpunkten (EP) aus dem Katalog bezahlt. Bis 3 EP zahlst du Energie (EP − Meisterschaft), ab 4 EP Momentum plus 1 Energie. Es gibt keine Obergrenze für die Anzahl, für den Start reichen <b>ein bis drei</b> Moves. Wähle Beispiele aus dem Regelwerk oder baue eigene.</p>

  {#if char.titles.length}
    <div class="caps">
      {#each char.titles as t (t.id)}
        {@const m = meisterschaft(t.level)}
        <div class="cap"><b>{t.name}</b><span>Level {t.level}, M {m}</span><span class="chip amber">EP-Deckel {epCap(m)}</span>
          <small class="dim">4 EP ab Level {minLevelForEp(4)}, 5 EP ab {minLevelForEp(5)}</small></div>
      {/each}
    </div>
  {:else}
    <p class="warn">Du hast noch keinen Titel. Moves gehören zu einem Titel und nutzen dessen Meisterschaft. Gehe zurück zu „Titel“.</p>
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
