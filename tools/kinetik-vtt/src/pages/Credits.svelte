<script lang="ts">
  import { catalog } from '../music/catalog.svelte';
</script>

<section class="stack wrap">
  <span class="kicker">KINETIK</span>
  <h1>Credits</h1>

  <section class="panel">
    <h2>Musik</h2>
    <p class="dim">{catalog.note || 'Alle mitgelieferten Titel: Kevin MacLeod (incompetech.com), Creative Commons Namensnennung 4.0.'}</p>
    <ul class="list">
      {#each catalog.tracks as t}
        <li>
          „{t.title}“ {t.artist} (<a href="https://incompetech.com" target="_blank" rel="noreferrer">incompetech.com</a>)<br />
          <small class="dim">Licensed under Creative Commons: By Attribution 4.0 License, <a href={t.licenseUrl} target="_blank" rel="noreferrer">creativecommons.org/licenses/by/4.0</a>. Für die App neu kodiert (MP3, 80 kbps).</small>
        </li>
      {/each}
    </ul>
  </section>

  <section class="panel">
    <h2>Grafiken</h2>
    <p class="dim">Die Bilder dieser App (Startseite, Kartenmotive, Beispielkarte, Porträt-Platzhalter) wurden mit dem KI-Bildmodell Krea 2 in ComfyUI erzeugt, mit den Prompts aus <code>scripts/gen_web_assets.py</code>.</p>
  </section>

  <section class="panel">
    <h2>Schriften</h2>
    <p class="dim">Barlow, Barlow Condensed, Bebas Neue, Oswald, Press Start 2P, Silkscreen, VT323, Big Shoulders, Special Elite, Tektur, Noto Serif SC, Bangers, Rye, Arvo, Shippori Mincho, Zen Kaku Gothic New und Courier Prime (Google Fonts), SIL Open Font License 1.1.</p>
  </section>

  <section class="panel">
    <h2>Lizenz</h2>
    <p class="dim">Regeltext, Regeldaten und Bilder: <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (nicht kommerziell). Quellcode der App: MIT. Quelle und Details: <a href="https://github.com/Rec0iL/KINETIK-PNP" target="_blank" rel="noreferrer">github.com/Rec0iL/KINETIK-PNP</a>.</p>
  </section>

  <section class="panel">
    <h2>Software</h2>
    <p class="dim">Svelte, Vite, PeerJS (WebRTC), idb-keyval. Alle unter MIT-ähnlichen Lizenzen. Das Regelwerk KINETIK und diese App gehören zum selben Projekt.</p>
  </section>
</section>

<style>
  .wrap { max-width: 760px; }
  .list { padding-left: 1.1em; display: grid; gap: 0.6rem; }
</style>
