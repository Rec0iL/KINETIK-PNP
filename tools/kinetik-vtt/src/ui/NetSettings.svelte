<script lang="ts">
  import { settings } from '../lib/settings.svelte';
  import { testIce } from '../net/icetest';
  import type { IceReport, Verdict } from '../net/ice';

  let testing = $state(false);
  let result = $state<{ report: IceReport; verdict: Verdict } | null>(null);
  let failure = $state('');

  async function run() {
    testing = true;
    result = null;
    failure = '';
    try { result = await testIce(); } catch (e) { failure = (e as Error).message || 'Der Test konnte nicht laufen (WebRTC nicht verfügbar?).'; }
    testing = false;
  }
  const mark = (ok: boolean) => (ok ? '✓' : '✗');
</script>

<details>
  <summary>Erweitert: Verbindung und Server</summary>
  <div class="stack adv">
    <section class="box">
      <h3>Verbindungstest</h3>
      <p class="dim">Klappt der Beitritt nicht (z.B. über Mobilfunk), zeigt der Test, welche Wege dein Netz zulässt und was fehlt.</p>
      <div class="row"><button class="btn sm primary" onclick={run} disabled={testing}>{testing ? 'Teste … (bis 8 s)' : 'Verbindung testen'}</button></div>
      {#if failure}<p class="bad">{failure}</p>{/if}
      {#if result}
        <ul class="res">
          <li class:okc={result.report.host}><b>{mark(result.report.host)}</b> Direkt im lokalen Netz</li>
          <li class:okc={result.report.srflx}><b>{mark(result.report.srflx)}</b> Über das Internet (STUN)</li>
          <li class:okc={result.report.relay}><b>{mark(result.report.relay)}</b> Relay-Server (TURN){result.report.relayTcp ? ', auch über TCP' : ''}</li>
        </ul>
        <p class="verdict" class:bad={!result.verdict.ok}><b>{result.verdict.title}.</b> {result.verdict.text}</p>
        {#if result.report.errors.length}<details><summary>Fehlermeldungen der Server</summary><pre>{result.report.errors.join('\n')}</pre></details>{/if}
      {/if}
    </section>

    <section class="box">
      <h3>Relay-Server (TURN)</h3>
      <p class="dim">Hinter Mobilfunk oder strengem NAT geht nichts direkt. Dann leitet ein TURN-Server den Verkehr weiter. Der eingebaute öffentliche Server ist ein Notnagel. Zuverlässig ist ein eigener (z.B. Konto bei einem TURN-Anbieter oder selbst gehostetes coturn). Am besten mit einer <code>turns:</code>-URL auf Port 443, die auch strenge Firewalls durchlässt. Nur der Spieler mit dem Problem muss das eintragen.</p>
      <label class="field"><span>TURN-URL(s)</span><textarea rows="2" bind:value={settings.turnUrl} placeholder={'turn:turn.example.org:3478\nturns:turn.example.org:443'}></textarea></label>
      <div class="row">
        <label class="field"><span>Benutzer</span><input bind:value={settings.turnUser} autocomplete="off" /></label>
        <label class="field"><span>Passwort</span><input type="password" bind:value={settings.turnPass} autocomplete="off" /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={settings.relayOnly} /> Nur über Relay verbinden (hilft, wenn der Aufbau über Mobilfunk hängt)</label>
    </section>

    <section class="box">
      <h3>Vermittlungsserver</h3>
      <p class="dim">Standard ist der öffentliche PeerJS-Server. Er vermittelt nur den Verbindungsaufbau, die Spieldaten laufen direkt zwischen den Browsern.</p>
      <div class="row">
        <label class="field"><span>Host</span><input bind:value={settings.peerHost} placeholder="leer = peerjs.com" /></label>
        <label class="field"><span>Port</span><input type="number" bind:value={settings.peerPort} /></label>
        <label class="field"><span>Pfad</span><input bind:value={settings.peerPath} /></label>
        <label class="check"><input type="checkbox" bind:checked={settings.peerSecure} /> TLS</label>
      </div>
      <label class="field"><span>ICE-Server als JSON (Experte, ersetzt die Felder oben)</span><textarea rows="3" bind:value={settings.iceJson} placeholder={'[{"urls":"turn:example.org:3478","username":"u","credential":"p"}]'}></textarea></label>
    </section>
  </div>
</details>

<style>
  summary { cursor: pointer; color: var(--ink-dim); }
  .adv { margin-top: 0.7rem; }
  .box { display: grid; grid-template-columns: minmax(0, 1fr); min-width: 0; gap: 0.6rem; padding: 0.8rem; background: var(--raised); border-left: 3px solid var(--line-strong); }
  .box h3 { margin: 0; }
  .check { display: flex; gap: 0.4em; align-items: center; }
  .row :global(.field) { flex: 1; min-width: 100px; }
  .res { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
  .res li { color: var(--danger); }
  .res li.okc { color: var(--ink); }
  .res li b { display: inline-block; width: 1.4em; }
  .res li.okc b { color: var(--accent); }
  .verdict { margin: 0; padding: 0.5rem 0.7rem; border-left: 3px solid var(--accent); background: var(--accent-soft); }
  .verdict.bad, .bad { border-left-color: var(--danger); color: var(--danger); background: transparent; }
  .verdict.bad { background: rgba(255, 77, 109, 0.08); color: var(--ink); }
  pre { white-space: pre-wrap; font-size: 0.8rem; color: var(--ink-dim); }
  code { font-family: var(--font-mono); }
</style>
