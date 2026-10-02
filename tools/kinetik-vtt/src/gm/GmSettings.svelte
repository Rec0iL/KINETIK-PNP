<script lang="ts">
  import { gm, setVisibility, setGmName, addLocalPlayer, endSession, stopHost } from '../net/gm.svelte';
  import { library } from '../store/characters.svelte';
  import { parseImport, ImportError } from '../model/io';
  import { newCharacter } from '../model/character';
  import { pushToast } from '../ui/toasts.svelte';
  import { navigate } from '../lib/router.svelte';
  import type { Visibility } from '../net/protocol';

  let fileInput = $state<HTMLInputElement>();
  let pick = $state('');

  const modes: { key: Visibility; title: string; text: string }[] = [
    { key: 'party', title: 'Gruppenleiste', text: 'Alle sehen Name, Energie, WK, Momentum, Verletzungen und Tags der anderen, aber nicht die ganzen Bögen.' },
    { key: 'private', title: 'Privat', text: 'Nur der SL sieht Bögen und Werte. Spieler sehen nur, wer am Tisch sitzt.' },
    { key: 'open', title: 'Offen', text: 'Jeder Spieler darf die Bögen der anderen lesen.' },
  ];

  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    for (const f of [...(input.files ?? [])]) {
      try {
        for (const c of parseImport(await f.text(), { newIds: true })) { addLocalPlayer(c); pushToast(`${c.name} als lokaler Spieler hinzugefügt.`, 'good'); }
      } catch (err) {
        pushToast(`${f.name}: ${err instanceof ImportError ? err.message : 'Lesefehler'}`, 'danger');
      }
    }
    input.value = '';
  }
  function addFromLibrary() {
    const c = library.characters.find((x) => x.id === pick);
    if (!c) return;
    addLocalPlayer(parseImport(JSON.stringify($state.snapshot(c)), { newIds: true })[0]);
    pick = '';
  }
  const addBlank = () => addLocalPlayer(newCharacter({ name: 'Neuer Spieler' }));
</script>

{#if gm.session}
  <div class="stack">
    <section class="panel">
      <h2>Sichtbarkeit der Bögen</h2>
      <div class="modes">
        {#each modes as m}
          <button class="mode" class:on={gm.session.state.visibility === m.key} onclick={() => setVisibility(m.key)}>
            <b>{m.title}</b><small>{m.text}</small>
          </button>
        {/each}
      </div>
      <p class="dim">Pro Spieler lässt sich das auf der Spielerkarte überschreiben.</p>
    </section>

    <section class="panel">
      <h2>Runde</h2>
      <div class="row">
        <label class="field">Dein Name in der Runde<input value={gm.session.state.gmName} onchange={(e) => setGmName(e.currentTarget.value)} /></label>
        <label class="field">Passwort (optional, gilt für neue Beitritte)<input bind:value={gm.session.password} autocomplete="off" /></label>
      </div>
      <div class="row">
        <button class="btn" onclick={() => { stopHost(); }}>Runde pausieren</button>
        <button class="btn danger" onclick={async () => { if (confirm('Runde beenden und alle Daten der Sitzung (Spieler, Notizen) löschen?')) { await endSession(); navigate('/sl'); } }}>Runde beenden und vergessen</button>
      </div>
      <p class="dim">Pausieren trennt alle Spieler, die Sitzung bleibt in diesem Browser gespeichert und lässt sich mit demselben Raumcode fortsetzen.</p>
    </section>

    <section class="panel">
      <h2>Lokale Spieler (ohne Gerät)</h2>
      <p class="dim">Für Spieler am Tisch ohne Verbindung: Der SL pflegt ihren Bogen selbst, sie erscheinen in der Gruppe wie alle anderen.</p>
      <div class="row">
        <button class="btn" onclick={() => fileInput?.click()}>Charakter-JSON laden</button>
        <input bind:this={fileInput} type="file" accept="application/json,.json" multiple class="sr-only" onchange={onFiles} />
        <select bind:value={pick} aria-label="Aus Bibliothek"><option value="">Aus meiner Bibliothek …</option>{#each library.characters as c}<option value={c.id}>{c.name}</option>{/each}</select>
        <button class="btn" onclick={addFromLibrary} disabled={!pick}>Hinzufügen</button>
        <button class="btn" onclick={addBlank}>Leerer Bogen</button>
      </div>
    </section>
  </div>
{/if}

<style>
  .modes { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.6rem; margin: 0.6rem 0; }
  .mode { display: grid; gap: 0.3rem; text-align: left; padding: 0.8rem; background: var(--raised); border: 1px solid var(--line); color: var(--ink); cursor: pointer; font: inherit; }
  .mode b { font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; }
  .mode small { color: var(--ink-dim); }
  .mode:hover { border-color: var(--accent); }
  .mode.on { border-color: var(--accent); background: var(--accent-soft); box-shadow: var(--glow); }
  .mode.on b { color: var(--accent); }
  .row { margin-bottom: 0.5rem; }
  .row :global(.field) { flex: 1; min-width: 200px; }
  select { width: auto; }
</style>
