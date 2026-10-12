<script lang="ts">
  import { untrack } from 'svelte';
  import { gm, reconnectNow, importSession, startHost, loadSavedSession, scheduleParty, persistSession, setSharedNotes, partyFor, commitCombat, type GmSession } from '../net/gm.svelte';
  import { settings } from '../lib/settings.svelte';
  import { formatCode } from '../net/protocol';
  import { pushToast } from '../ui/toasts.svelte';
  import NetSettings from '../ui/NetSettings.svelte';
  import GmPlayers from '../gm/GmPlayers.svelte';
  import GmSettings from '../gm/GmSettings.svelte';
  import ClashAnswer from '../gm/ClashAnswer.svelte';
  import GmMap from '../gm/GmMap.svelte';
  import GmMusic from '../gm/GmMusic.svelte';
  import GmCombat from '../gm/GmCombat.svelte';
  import CombatSidebar from '../gm/CombatSidebar.svelte';
  import GmHandouts from '../gm/GmHandouts.svelte';
  import RollPanel from '../sheet/RollPanel.svelte';
  import { t, tn, fmtDate, fmtTime } from '../i18n';

  let name = $state(settings.displayName || t('pages.gm.defaultName'));
  let password = $state('');
  let saved = $state<GmSession | null>(null);
  let loaded = $state(false);
  let tab = $state<'players' | 'combat' | 'map' | 'handouts' | 'music' | 'dice' | 'notes' | 'settings'>('players');
  let sharedDraft = $state('');
  let sharedTimer: ReturnType<typeof setTimeout>;

  $effect(() => {
    loadSavedSession().then((s) => { saved = s; loaded = true; });
  });

  // Änderungen an der Sitzung (lokale Bögen, Notizen, Passwort) speichern und der Gruppe melden.
  let first = true;
  $effect(() => {
    if (gm.status !== 'open' || !gm.session) return;
    JSON.stringify($state.snapshot(gm.session.players));
    gm.session.gmNotes;
    gm.session.password;
    if (first) { first = false; return; }
    untrack(() => { scheduleParty(); persistSession(); });
  });
  // Jede Änderung am Kampf wird gespeichert und an die Spieler gemeldet, auch wenn der Kampf-Tab nicht offen ist.
  let firstCombat = true;
  $effect(() => {
    if (gm.status !== 'open' || !gm.session) return;
    JSON.stringify($state.snapshot(gm.session.combat));
    if (firstCombat) { firstCombat = false; return; }
    untrack(commitCombat);
  });
  $effect(() => {
    if (gm.status === 'open' && gm.session) sharedDraft = untrack(() => gm.session!.state.notes);
  });

  let importFile = $state<HTMLInputElement>();
  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      saved = await importSession(await f.text());
      pushToast(t('pages.gm.sessionLoaded'), 'good');
    } catch (err) { pushToast((err as Error).message, 'danger'); }
  }

  async function start(resume: GmSession | null) {
    settings.displayName = name.trim();
    await startHost({ gmName: name.trim() || t('pages.gm.defaultName'), password, resume });
  }

  const joinUrl = $derived(`${location.origin}${location.pathname}#/beitreten/${gm.session?.code ?? ''}`);
  const party = $derived(gm.session ? partyFor(null) : []);
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); pushToast(t('pages.gm.copied', { what }), 'good', 2500); } catch { pushToast(t('pages.gm.copyFailed'), 'warn'); }
  }
  const online = $derived(gm.session?.players.filter((p) => p.connected || p.local).length ?? 0);
</script>

{#if gm.status !== 'open'}
  <section class="start">
    <span class="kicker">{t('pages.gm.kicker')}</span>
    <h1>{t('pages.gm.title')}</h1>
    <div class="panel stack">
      {#if saved && loaded}
        <div class="resume">
          <h2>{t('pages.gm.resumeTitle')}</h2>
          <p class="dim">{t('pages.gm.roomCode')} <b class="mono">{formatCode(saved.code)}</b> · {tn('pages.gm.playerCount', saved.players.length)} · {t('pages.gm.started', { date: fmtDate(saved.created) })} {t('pages.gm.rejoin')}</p>
          <button class="btn primary" onclick={() => start(saved)} disabled={gm.status === 'starting'}>{t('pages.gm.resume')}</button>
        </div>
        <hr />
      {/if}
      <div class="row"><button class="btn sm" onclick={() => importFile?.click()}>{t('pages.gm.loadFile')}</button><input bind:this={importFile} type="file" accept="application/json,.json" class="sr-only" onchange={onImport} /></div>
      <label class="field">{t('pages.gm.yourName')}<input bind:value={name} /></label>
      <label class="field">{t('pages.gm.password')}<input bind:value={password} autocomplete="off" placeholder={t('pages.gm.passwordPh')} /></label>
      <NetSettings />
      {#if gm.error}<p class="err" class:wait={gm.status === 'starting'}>{gm.error}</p>{/if}
      <div class="row">
        <button class="btn amber" onclick={() => start(null)} disabled={gm.status === 'starting'}>{gm.status === 'starting' ? t('pages.gm.starting') : saved ? t('pages.gm.newRound') : t('pages.gm.title')}</button>
      </div>
      <p class="dim">{t('pages.gm.hostNote')}</p>
    </div>
  </section>
{:else if gm.session}
  <div class="gmhead">
  <section class="top">
    <div>
      <span class="kicker">{t('pages.gm.kickerOpen', { name: gm.session.state.gmName })}</span>
      <div class="codewrap">
        <span class="code mono">{formatCode(gm.session.code)}</span>
        <button class="btn sm" onclick={() => copy(formatCode(gm.session!.code), t('pages.gm.roomCode'))}>{t('pages.gm.copyCode')}</button>
        <button class="btn sm" onclick={() => copy(joinUrl, t('pages.gm.joinLink'))}>{t('pages.gm.copyLink')}</button>
      </div>
    </div>
    <div class="row">
      <span class="chip" class:accent={gm.broker} class:danger={!gm.broker} title={gm.broker ? t('pages.gm.brokerOk') : t('pages.gm.brokerDown')}>{gm.broker ? t('pages.gm.roomOnline') : t('pages.gm.roomOffline')}</span>
      {#if !gm.broker}
        {#if gm.brokerNote}<span class="chip amber">{gm.brokerNote}</span>{/if}
        <button class="btn sm" onclick={reconnectNow}>{t('pages.gm.reconnect')}</button>
      {/if}
      <span class="chip">{t('pages.gm.online', { online, total: gm.session.players.length })}</span>
      {#if gm.pending.length}<span class="chip amber">{tn('pages.gm.requests', gm.pending.length)}</span>{/if}
    </div>
  </section>

  <div class="tabs" role="tablist" aria-label={t('pages.gm.dashboard')}>
    <button role="tab" aria-selected={tab === 'players'} onclick={() => (tab = 'players')}>{t('pages.gm.tabPlayers')}{#if gm.pending.length} ({gm.pending.length}){/if}</button>
    <button role="tab" aria-selected={tab === 'combat'} onclick={() => (tab = 'combat')}>{t('pages.gm.tabCombat')}{#if gm.session.combat.active}{t('pages.gm.tabCombatRound', { round: gm.session.combat.round })}{/if}</button>
    <button role="tab" aria-selected={tab === 'map'} onclick={() => (tab = 'map')}>{t('pages.gm.tabMap')}</button>
    <button role="tab" aria-selected={tab === 'handouts'} onclick={() => (tab = 'handouts')}>{t('pages.gm.tabHandouts')}</button>
    <button role="tab" aria-selected={tab === 'music'} onclick={() => (tab = 'music')}>{t('pages.gm.tabMusic')}</button>
    <button role="tab" aria-selected={tab === 'dice'} onclick={() => (tab = 'dice')}>{t('pages.gm.tabDice')}</button>
    <button role="tab" aria-selected={tab === 'notes'} onclick={() => (tab = 'notes')}>{t('pages.gm.tabNotes')}</button>
    <button role="tab" aria-selected={tab === 'settings'} onclick={() => (tab = 'settings')}>{t('pages.gm.tabSettings')}</button>
  </div>
  </div>

  <div class="content" class:narrow={tab === 'notes' || tab === 'settings' || tab === 'dice'}>
    {#if tab === 'players'}
      <div class="cols">
        <GmPlayers />
        <section class="panel feed">
          <h2>{t('pages.gm.feed')}</h2>
          {#each gm.feed.slice(0, 15) as f}<div class="f"><span class="dim mono">{fmtTime(f.ts, { hour: '2-digit', minute: '2-digit' })}</span> {f.text}</div>{:else}<p class="dim">{t('pages.gm.feedEmpty')}</p>{/each}
        </section>
      </div>
    {:else if tab === 'combat'}
      <div class="combatgrid"><GmCombat /><CombatSidebar situationsOnly /></div>
    {:else if tab === 'handouts'}
      <GmHandouts />
    {:else if tab === 'map'}
      <GmMap />
    {:else if tab === 'music'}
      <GmMusic />
    {:else if tab === 'dice'}
      <RollPanel isGm canSecret who={gm.session.state.gmName} {party}>
        {#snippet entryActions(r)}
          {#if !r.secret && r.who !== gm.session?.state.gmName && (r.kind === 'attr' || r.kind === 'move' || r.kind === 'clash' || r.kind === 'probe') && !r.mw}
            <ClashAnswer roll={r} {party} gmName={gm.session!.state.gmName} />
          {/if}
        {/snippet}
      </RollPanel>
    {:else if tab === 'notes'}
      <div class="stack">
        <section class="panel">
          <h2>{t('pages.gm.myNotes')}</h2>
          <textarea rows="12" bind:value={gm.session.gmNotes} placeholder={t('pages.gm.myNotesPh')}></textarea>
        </section>
        <section class="panel">
          <h2>{t('pages.gm.sharedNotes')}</h2>
          <textarea rows="6" bind:value={sharedDraft} oninput={() => { clearTimeout(sharedTimer); sharedTimer = setTimeout(() => setSharedNotes(sharedDraft), 600); }} placeholder={t('pages.gm.sharedNotesPh')}></textarea>
        </section>
      </div>
    {:else}
      <GmSettings />
    {/if}
  </div>
{/if}

<style>
  .start { max-width: 640px; display: grid; gap: 1rem; }
  .resume { display: grid; gap: 0.5rem; }
  hr { border: 0; border-top: 1px solid var(--line); width: 100%; }
  .err { color: var(--danger); margin: 0; }
  .err.wait { color: var(--accent-2); }
  .mono { font-family: var(--font-mono); }
  .top { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
  .codewrap { display: flex; gap: 0.7rem; align-items: center; flex-wrap: wrap; margin-top: 0.3rem; }
  /* Breite Bildschirme: Raumcode, Tabs und Status in einer Zeile, die Höhe gehört der Karte. */
  @media (min-width: 1200px) {
    .gmhead { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 0 1.6rem; border-bottom: 1px solid var(--line); }
    .gmhead .top { display: contents; }
    .gmhead .top > div:first-child { grid-column: 1; grid-row: 1; }
    .gmhead .top > .row { grid-column: 3; grid-row: 1; align-self: center; flex-wrap: wrap; justify-content: flex-end; }
    .gmhead .tabs { grid-column: 2; grid-row: 1; border-bottom: 0; align-self: end; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
    .gmhead .code { font-size: 2.5rem; }
    .gmhead .codewrap { margin-top: 0.1rem; }
    .gmhead .top { margin-bottom: 0; }
  }
  .code { font: 400 3.4rem/1 var(--font-display); letter-spacing: 0.22em; color: var(--accent-2); text-shadow: var(--hard-shadow); }
  .content { padding-top: 1rem; }
  /* Reine Textseiten bleiben lesbar schmal, auch auf Ultrawide. */
  .content.narrow { max-width: 1280px; }
  .cols { display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start; }
  .combatgrid { display: grid; grid-template-columns: minmax(0, 1fr) clamp(380px, 22vw, 520px); gap: 1rem; align-items: start; }
  @media (max-width: 1200px) { .combatgrid { grid-template-columns: 1fr; } }
  .feed .f { padding: 0.3rem 0; border-bottom: 1px solid var(--line); font-size: 0.9rem; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
</style>
