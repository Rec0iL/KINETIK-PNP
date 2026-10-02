<script lang="ts">
  import { settings } from '../lib/settings.svelte';
</script>

<details>
  <summary>Erweitert: Vermittlungsserver</summary>
  <div class="stack adv">
    <p class="dim">Standard ist der öffentliche PeerJS-Server. Er vermittelt nur den Verbindungsaufbau, die Spieldaten laufen direkt zwischen den Browsern. Eigener Server und TURN (für strenge Firewalls) sind optional.</p>
    <div class="row">
      <label class="field"><span>Host</span><input bind:value={settings.peerHost} placeholder="leer = peerjs.com" /></label>
      <label class="field"><span>Port</span><input type="number" bind:value={settings.peerPort} /></label>
      <label class="field"><span>Pfad</span><input bind:value={settings.peerPath} /></label>
      <label class="check"><input type="checkbox" bind:checked={settings.peerSecure} /> TLS</label>
    </div>
    <label class="field"><span>ICE-Server (JSON, z.B. TURN)</span><textarea rows="3" bind:value={settings.iceJson} placeholder={'[{"urls":"turn:example.org:3478","username":"u","credential":"p"}]'}></textarea></label>
  </div>
</details>

<style>
  summary { cursor: pointer; color: var(--ink-dim); }
  .adv { margin-top: 0.7rem; }
  .check { display: flex; gap: 0.4em; align-items: center; }
  .row :global(.field) { flex: 1; min-width: 100px; }
</style>
