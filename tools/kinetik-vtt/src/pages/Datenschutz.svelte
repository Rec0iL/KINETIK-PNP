<script lang="ts">
  import { operator } from '../lib/legal';
  const SITE_URL_HOST = 'kinetik.redneck-design.de';
  import Reveal from '../ui/Reveal.svelte';
  import Copyright from '../ui/Copyright.svelte';
  import { t, getLocale } from '../i18n';
</script>

<section class="stack wrap" lang="de">
  <span class="kicker">KINETIK</span>
  <h1>Datenschutzerklärung</h1>
  {#if getLocale() !== 'de'}<p class="panel notice" lang="en">{t('legal.notice')}</p>{/if}

  <section class="panel">
    <h2>Kurzfassung</h2>
    <p class="dim">KINETIK braucht kein Konto, setzt keine Cookies und enthält keine Statistik, Werbung oder Tracker. Charaktere und Einstellungen bleiben in deinem Browser. Daten verlassen dein Gerät nur, wenn du eine Mehrspieler-Runde hostest oder ihr beitrittst, und dann auf dem Weg, der unten steht.</p>
  </section>

  <section class="panel">
    <h2>Verantwortlicher</h2>
    {#if operator}
      {#each operator.partner ? [operator, operator.partner] : [operator] as p}
        <p class="dim">
          {p.name}, {p.street}, {p.city}<br />
          E-Mail: <Reveal value={p.emailB64} kind="mail" />
        </p>
      {/each}
      {#if operator.partner}
        <p class="dim"><b>Aufgabenverteilung:</b> Den Webserver unter {SITE_URL_HOST} betreiben {operator.partner.name} und {operator.name} gemeinsam: {operator.partner.name} hat ihn gemietet und ist Vertragspartner des Hosters, beide administrieren ihn und teilen sich die Kosten. Für die App und ihre Inhalte ist {operator.name} zuständig. Anfragen zu deinen Daten kannst du an eine der beiden Adressen richten, wir leiten sie untereinander weiter. Deine Rechte kannst du gegenüber beiden geltend machen.</p>
      {/if}
    {:else}
      <p class="dim">In diesem Build sind keine Betreiberangaben hinterlegt, siehe <a href="#/impressum">Impressum</a>.</p>
    {/if}
  </section>

  <section class="panel">
    <h2>Aufruf der Seite (Hosting)</h2>
    <p class="dim">Die App ist unter zwei Adressen mit demselben Inhalt erreichbar. Beim Aufruf verarbeitet der jeweilige Webserver technisch notwendige Daten wie deine IP-Adresse, Datum und Uhrzeit, die angeforderte Datei und Browserangaben, um die Seite auszuliefern und missbräuchliche Zugriffe abzuwehren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung und Sicherheit der Seite).</p>
    <ul class="list">
      <li><b>{SITE_URL_HOST}</b>: eigener Webserver bei der Contabo GmbH (München) als Auftragsverarbeiter, Standort in der EU. Die Server-Logfiles werden nach 7 Tagen gelöscht. Die Inhalte werden dort aus dem GitHub-Repository der App übernommen und ausgeliefert.{#if operator?.hosting} {operator.hosting}{/if}</li>
      <li><b>rec0il.github.io</b>: GitHub Pages (GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA). Auf die Protokolle von GitHub haben wir keinen Zugriff. GitHub nimmt nach eigenen Angaben am EU-US Data Privacy Framework teil; Näheres in der <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer">Datenschutzerklärung von GitHub</a>.</li>
    </ul>
    <p class="dim">Schriften, Bilder, Musik und alle Programmdateien liegen auf demselben Server, über den du die App aufrufst. Es werden keine Schriften, Skripte oder Bilder von anderen Anbietern nachgeladen.</p>
  </section>

  <section class="panel">
    <h2>Speicherung im Browser</h2>
    <p class="dim">Die App legt Daten ausschließlich lokal in deinem Browser ab (localStorage, sessionStorage, IndexedDB) und über einen Service Worker einen Cache für die Offline-Nutzung. Das sind deine Charaktere und Moves, Einstellungen (Look, Lautstärke, Servereinträge), das Würfelprotokoll, Handouts und eine zufällig erzeugte Spieler-Kennung für Runden. Diese Daten werden nicht an uns übertragen. Die Speicherung ist für die von dir gewünschte Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst sie jederzeit in den Browsereinstellungen unter „Websitedaten“ löschen.</p>
  </section>

  <section class="panel">
    <h2>Mehrspieler-Runden</h2>
    <p class="dim">Nur wenn du eine Runde als Spielleiter hostest oder einer Runde beitrittst, baut die App über WebRTC Verbindungen auf. Dabei gilt:</p>
    <ul class="list">
      <li><b>Vermittlungsserver:</b> Zum Verbindungsaufbau meldet sich dein Browser bei einem PeerJS-Vermittlungsserver (Standard: der öffentliche Server von peerjs.com). Der Server sieht deine IP-Adresse und den Raumcode, aber keine Spielinhalte. Betreiber und Standort des Servers liegen außerhalb unseres Einflusses, er kann sich außerhalb der EU befinden. Du kannst in den Einstellungen („Erweitert“) einen eigenen Server eintragen.</li>
      <li><b>STUN/TURN:</b> Um eine Direktverbindung zu finden, fragt dein Browser STUN-Server (Standard: stun.l.google.com von Google LLC, USA) nach seiner öffentlichen Adresse. Gelingt keine Direktverbindung, kann der Verkehr über einen TURN-Relay (Standard: der öffentliche Relay von peerjs.com) laufen. Auch dabei wird deine IP-Adresse übertragen.</li>
      <li><b>Mitspielende:</b> Die Teilnehmer einer Runde sehen technisch bedingt die IP-Adressen der anderen, mit denen sie direkt verbunden sind. Spielinhalte (Name, Charakterbogen, Würfe, Karte, Handouts) gehen direkt zwischen den Browsern und verschlüsselt, nicht über unsere Server.</li>
    </ul>
    <p class="dim">Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Nutzung der von dir gewählten Funktion) bzw. lit. f (Verbindungsaufbau hinter NAT und Firewalls). Ohne Mehrspieler-Funktion findet diese Übertragung nicht statt.</p>
  </section>

  <section class="panel">
    <h2>Kontakt per E-Mail</h2>
    <p class="dim">Wenn du uns schreibst, verarbeiten wir deine Nachricht und Absenderadresse, um sie zu beantworten (Art. 6 Abs. 1 lit. f DSGVO, bei vertragsähnlichem Bezug lit. b). Wir löschen sie, wenn die Anfrage erledigt ist und keine Aufbewahrungspflicht besteht.</p>
  </section>

  <section class="panel">
    <h2>Deine Rechte</h2>
    <p class="dim">Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 15 bis 21 DSGVO). Wende dich dazu an die Kontaktadresse oben. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren, zum Beispiel bei der Landesbeauftragten für Datenschutz und Informationsfreiheit Nordrhein-Westfalen, Kavalleriestraße 2–4, 40213 Düsseldorf (<a href="https://www.ldi.nrw.de" target="_blank" rel="noreferrer">ldi.nrw.de</a>).</p>
  </section>

  <section class="panel">
    <h2>Externe Links</h2>
    <p class="dim">Links auf GitHub, incompetech.com und Creative-Commons-Seiten verlassen diese App. Dort gelten die Datenschutzbestimmungen der jeweiligen Betreiber.</p>
  </section>

  <p class="dim">Stand: Oktober 2026 · <a href="#/impressum">Impressum</a> · <a href="#/credits">Credits</a></p>
  <Copyright />
</section>

<style>
  .wrap { max-width: 760px; }
  .list { padding-left: 1.1em; display: grid; gap: 0.6rem; margin: 0.5rem 0; }
</style>
