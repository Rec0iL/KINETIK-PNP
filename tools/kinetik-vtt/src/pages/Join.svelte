<script lang="ts">
  import { library } from '../store/characters.svelte';
  import { settings } from '../lib/settings.svelte';
  import { router, navigate } from '../lib/router.svelte';
  import { connectToRound, leaveRound, player, resumeFromSession } from '../net/player.svelte';
  import { normalizeCode, formatCode } from '../net/protocol';
  import NetSettings from '../ui/NetSettings.svelte';

  let code = $state(router.route.params.code ? normalizeCode(router.route.params.code) : '');
  let name = $state(settings.displayName);
  let password = $state('');
  let characterId = $state(player.characterId || '');

  $effect(() => {
    if (!characterId && library.characters.length) characterId = library.characters[0].id;
  });
  $effect(() => {
    if (player.status === 'connected') navigate('/runde');
  });

  const busy = $derived(player.status === 'connecting' || player.status === 'pending' || player.status === 'reconnecting');
  const valid = $derived(normalizeCode(code).length === 6 && name.trim().length > 0);

  function join() {
    settings.displayName = name.trim();
    connectToRound({ code, name, password, characterId });
  }
</script>

<section class="wrap">
  <span class="kicker">Spieler</span>
  <h1>Runde beitreten</h1>

  {#if player.status === 'connected'}
    <section class="panel stack">
      <h2>Du bist verbunden</h2>
      <div class="row"><a class="btn primary" href="#/runde">Zur Runde</a><button class="btn" onclick={leaveRound}>Verlassen</button></div>
    </section>
  {:else}
    <section class="panel stack">
      <label class="field">Raumcode
        <input class="code" value={formatCode(normalizeCode(code))} oninput={(e) => (code = normalizeCode(e.currentTarget.value))} placeholder="ABC-123" autocomplete="off" autocapitalize="characters" spellcheck="false" disabled={busy} />
      </label>
      <label class="field">Dein Name
        <input bind:value={name} placeholder="Name am Tisch" disabled={busy} />
      </label>
      <label class="field">Charakter für diese Runde
        <select bind:value={characterId} disabled={busy}>
          {#each library.characters as c}<option value={c.id}>{c.name}{c.alias ? ` „${c.alias}“` : ''}</option>{/each}
          <option value="">Ohne Bogen (nur zuschauen und würfeln)</option>
        </select>
      </label>
      {#if !library.characters.length}<p class="dim">Du hast noch keinen Charakter. Du kannst ihn auch später anlegen: <a href="#/charaktere">zu den Charakteren</a>.</p>{/if}
      <label class="field">Passwort (falls der SL eins gesetzt hat)
        <input type="password" bind:value={password} autocomplete="off" disabled={busy} />
      </label>

      <NetSettings />

      {#if player.status === 'pending'}<p class="chip amber">Warte auf die Bestätigung des SL …</p>{/if}
      {#if player.status === 'connecting'}<p class="chip accent">Verbinde …</p>{/if}
      {#if player.status === 'reconnecting'}<p class="chip amber">Neuer Versuch … ({player.error})</p>{/if}
      {#if player.status === 'error' || player.status === 'denied'}<p class="err">{player.error}</p>{/if}

      <div class="row">
        {#if busy}
          <button class="btn" onclick={leaveRound}>Abbrechen</button>
        {:else}
          <button class="btn primary" onclick={join} disabled={!valid}>Beitreten</button>
        {/if}
      </div>
    </section>
  {/if}
</section>

<style>
  .wrap { max-width: 560px; display: grid; gap: 1rem; }
  .code { font: 400 2.4rem var(--font-display); letter-spacing: 0.3em; text-align: center; text-transform: uppercase; }
  .err { color: var(--danger); margin: 0; }
</style>
