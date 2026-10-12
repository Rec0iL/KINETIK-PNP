<script lang="ts">
  import { library } from '../store/characters.svelte';
  import { settings } from '../lib/settings.svelte';
  import { router, navigate } from '../lib/router.svelte';
  import { connectToRound, leaveRound, player, resumeFromSession } from '../net/player.svelte';
  import { normalizeCode, formatCode } from '../net/protocol';
  import NetSettings from '../ui/NetSettings.svelte';
  import { t } from '../i18n';

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
  <span class="kicker">{t('pages.common.player')}</span>
  <h1>{t('pages.join.title')}</h1>

  {#if player.status === 'connected'}
    <section class="panel stack">
      <h2>{t('pages.join.connected')}</h2>
      <div class="row"><a class="btn primary" href="#/runde">{t('pages.join.toRound')}</a><button class="btn" onclick={leaveRound}>{t('pages.common.leave')}</button></div>
    </section>
  {:else}
    <section class="panel stack">
      <label class="field">{t('pages.join.roomCode')}
        <input class="code" value={formatCode(normalizeCode(code))} oninput={(e) => (code = normalizeCode(e.currentTarget.value))} placeholder="ABC-123" autocomplete="off" autocapitalize="characters" spellcheck="false" disabled={busy} />
      </label>
      <label class="field">{t('pages.join.yourName')}
        <input bind:value={name} placeholder={t('pages.join.namePh')} disabled={busy} />
      </label>
      <label class="field">{t('pages.join.character')}
        <select bind:value={characterId} disabled={busy}>
          {#each library.characters as c}<option value={c.id}>{c.name}{c.alias ? ` ${t('pages.common.quoted', { text: c.alias })}` : ''}</option>{/each}
          <option value="">{t('pages.join.noSheet')}</option>
        </select>
      </label>
      {#if !library.characters.length}<p class="dim">{t('pages.join.noChar')} <a href="#/charaktere">{t('pages.join.noCharLink')}</a>.</p>{/if}
      <label class="field">{t('pages.join.password')}
        <input type="password" bind:value={password} autocomplete="off" disabled={busy} />
      </label>

      <NetSettings />

      {#if player.status === 'pending'}<p class="chip amber">{t('pages.common.waitGm')}</p>{/if}
      {#if player.status === 'connecting'}<p class="chip accent">{t('pages.join.connecting')}</p>{/if}
      {#if player.status === 'reconnecting'}<p class="chip amber">{t('pages.join.retry', { error: player.error })}</p>{/if}
      {#if player.status === 'error' || player.status === 'denied'}<p class="err">{player.error}</p>{/if}

      <div class="row">
        {#if busy}
          <button class="btn" onclick={leaveRound}>{t('pages.common.cancel')}</button>
        {:else}
          <button class="btn primary" onclick={join} disabled={!valid}>{t('pages.join.join')}</button>
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
