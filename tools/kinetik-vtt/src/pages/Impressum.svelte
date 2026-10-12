<script lang="ts">
  import { operator, REPO_URL } from '../lib/legal';
  import Reveal from '../ui/Reveal.svelte';
  import Copyright from '../ui/Copyright.svelte';
  import { t, getLocale } from '../i18n';
</script>

<section class="stack wrap" lang="de">
  <span class="kicker">KINETIK</span>
  <h1>Impressum</h1>
  {#if getLocale() !== 'de'}<p class="panel notice" lang="en">{t('legal.notice')}</p>{/if}

  {#if operator}
    {@const people = operator.partner ? [operator, operator.partner] : [operator]}
    <section class="panel">
      <h2>Angaben gemäß § 5 DDG</h2>
      {#each people as p, n}
        <p class="addr">
          {#if operator.partner}<small class="dim role">{n === 0 ? 'Projekt und Inhalte' : 'Domain und Server'}</small><br />{/if}
          {p.name}<br />
          {p.street}<br />
          {p.city}
        </p>
      {/each}
    </section>

    <section class="panel">
      <h2>Kontakt</h2>
      {#each people as p}
        {#if operator.partner}<p class="who">{p.name}</p>{/if}
        <p class="dim">E-Mail: <Reveal value={p.emailB64} kind="mail" /></p>
        {#if p.phoneB64}<p class="dim">Telefon: <Reveal value={p.phoneB64} kind="tel" /></p>{/if}
      {/each}
    </section>

    <section class="panel">
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p class="dim">{operator.name}{operator.partner ? ` und ${operator.partner.name}` : ''}, Anschrift wie oben.</p>
    </section>
  {:else}
    <section class="panel">
      <h2>Keine Betreiberangaben in diesem Build</h2>
      <p class="dim">Diese Fassung von KINETIK wurde ohne Betreiberangaben gebaut. Wer die App selbst veröffentlicht, ist für das eigene Impressum verantwortlich: <code>tools/kinetik-vtt/legal.example.json</code> nach <code>legal.local.json</code> kopieren, ausfüllen und neu bauen. Die Datei gehört nicht ins Repository.</p>
    </section>
  {/if}

  <section class="panel">
    <h2>Haftung für Inhalte und Links</h2>
    <p class="dim">KINETIK ist ein nicht kommerzielles Hobbyprojekt. Die Inhalte (Regelwerk, Charakterbogen, Spielhilfen) sind mit Sorgfalt erstellt, für Richtigkeit und Vollständigkeit gibt es keine Gewähr. Auf verlinkte Seiten Dritter haben wir keinen Einfluss, für deren Inhalte sind die jeweiligen Betreiber verantwortlich. Bei Hinweisen auf Rechtsverstöße entfernen wir betroffene Inhalte oder Links umgehend.</p>
  </section>

  <section class="panel">
    <h2>Urheberrecht und Lizenz</h2>
    <p class="dim">Regeltext, Regeldaten und Bilder stehen unter <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.de" target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a> (nicht kommerziell, Namensnennung, Weitergabe unter gleichen Bedingungen). Der Quellcode der App steht unter der MIT-Lizenz. Quellen und Details: <a href={REPO_URL} target="_blank" rel="noreferrer">github.com/Rec0iL/KINETIK-PNP</a>. Die Bilder sind mit einem KI-Bildmodell erzeugt, siehe <a href="#/credits">Credits</a>.</p>
  </section>

  <p class="dim"><a href="#/datenschutz">Datenschutzerklärung</a> · <a href="#/credits">Credits</a></p>
  <Copyright />
</section>

<style>
  .wrap { max-width: 760px; }
  .addr { line-height: 1.6; }
  .who { margin-top: 0.8rem; font-weight: 600; }
  .role { letter-spacing: 0.08em; text-transform: uppercase; }
</style>
