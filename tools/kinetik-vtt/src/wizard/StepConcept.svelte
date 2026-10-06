<script lang="ts">
  import type { Character } from '../model/character';
  import { imageToDataUrl } from '../lib/image';
  import { portraitPlaceholder } from '../lib/art';

  let { char }: { char: Character } = $props();

  async function onPortrait(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!f) return;
    try { char.portrait = await imageToDataUrl(f); } catch { alert('Das Bild konnte nicht gelesen werden.'); }
  }
</script>

<div class="grid2">
  <div class="stack">
    <p class="dim intro">Fang bei der Figur an, nicht bei den Zahlen: Wer ist sie, was treibt sie an, wo kommt sie her? Titel und Attribute folgen daraus. Ein Satz reicht.</p>
    <label class="field">Name<input bind:value={char.name} placeholder="z.B. Jin Yamada" /></label>
    <div class="row">
      <label class="field grow">Alias / Spitzname<input bind:value={char.alias} placeholder="z.B. Ghost" /></label>
      <label class="field grow">Spieler<input bind:value={char.player} /></label>
    </div>
    <label class="field">Konzept in einem Satz<textarea rows="3" bind:value={char.concept} placeholder="z.B. Ehemaliger Auftragskiller der Triaden, der nach einem letzten Job untergetaucht ist."></textarea></label>
    <label class="field">Setting / Power-Scale (optional)<input bind:value={char.setting} placeholder="z.B. Moderne Welt, Level 10 = John Wick" /></label>
    <small class="dim">Das Titel-Level misst den Rang innerhalb des Settings, nicht eine absolute Stärke. Frag den Tisch, wie hoch die Decke der Welt liegt.</small>
  </div>
  <label class="portrait" title="Bild wählen">
    {#if char.portrait}<img src={char.portrait} alt="Porträt" />{:else}<img class="ph" src={portraitPlaceholder()} alt="" /><span>Porträt wählen (optional)</span>{/if}
    <input type="file" accept="image/*" onchange={onPortrait} class="sr-only" />
  </label>
</div>

<style>
  .grid2 { display: grid; grid-template-columns: 1fr 200px; gap: 1.2rem; align-items: start; }
  .intro { margin: 0; }
  .grow { flex: 1; min-width: 150px; }
  .portrait { position: relative; width: 200px; height: 250px; border: 1px dashed var(--line-strong); display: grid; place-items: end center; cursor: pointer; overflow: hidden; background: var(--field-bg); font: 600 0.78rem var(--font-head); letter-spacing: 0.15em; text-transform: uppercase; color: var(--ink); }
  .portrait:hover { border-color: var(--accent); }
  .portrait img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .portrait img.ph { opacity: 0.45; filter: saturate(0.6); }
  .portrait span { position: relative; padding: 0.5rem; text-shadow: 0 1px 4px #000; }
  @media (max-width: 700px) { .grid2 { grid-template-columns: 1fr; } .portrait { width: 140px; height: 175px; } }
</style>
