<script lang="ts">
  import { untrack } from 'svelte';
  import { gm, importSession, startHost, loadSavedSession, scheduleParty, persistSession, setSharedNotes, partyFor, commitCombat, type GmSession } from '../net/gm.svelte';
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

  let name = $state(settings.displayName || 'Spielleiter');
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
      pushToast('Sitzung geladen. Du kannst sie jetzt fortsetzen.', 'good');
    } catch (err) { pushToast((err as Error).message, 'danger'); }
  }

  async function start(resume: GmSession | null) {
    settings.displayName = name.trim();
    await startHost({ gmName: name.trim() || 'Spielleiter', password, resume });
  }

  const joinUrl = $derived(`${location.origin}${location.pathname}#/beitreten/${gm.session?.code ?? ''}`);
  const party = $derived(gm.session ? partyFor(null) : []);
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); pushToast(`${what} kopiert.`, 'good', 2500); } catch { pushToast('Kopieren nicht möglich.', 'warn'); }
  }
  const online = $derived(gm.session?.players.filter((p) => p.connected || p.local).length ?? 0);
</script>

{#if gm.status !== 'open'}
  <section class="start">
    <span class="kicker">Spielleiter</span>
    <h1>Runde starten</h1>
    <div class="panel stack">
      {#if saved && loaded}
        <div class="resume">
          <h2>Letzte Runde fortsetzen</h2>
          <p class="dim">Raumcode <b class="mono">{formatCode(saved.code)}</b> · {saved.players.length} Spieler · gestartet {new Date(saved.created).toLocaleDateString('de-DE')}. Spieler können mit demselben Code wieder beitreten.</p>
          <button class="btn primary" onclick={() => start(saved)} disabled={gm.status === 'starting'}>Fortsetzen</button>
        </div>
        <hr />
      {/if}
      <div class="row"><button class="btn sm" onclick={() => importFile?.click()}>Sitzungsdatei laden</button><input bind:this={importFile} type="file" accept="application/json,.json" class="sr-only" onchange={onImport} /></div>
      <label class="field">Dein Name in der Runde<input bind:value={name} /></label>
      <label class="field">Passwort (optional)<input bind:value={password} autocomplete="off" placeholder="leer = nur Raumcode und Bestätigung" /></label>
      <NetSettings />
      {#if gm.error}<p class="err" class:wait={gm.status === 'starting'}>{gm.error}</p>{/if}
      <div class="row">
        <button class="btn amber" onclick={() => start(null)} disabled={gm.status === 'starting'}>{gm.status === 'starting' ? 'Starte …' : saved ? 'Neue Runde' : 'Runde starten'}</button>
      </div>
      <p class="dim">Der Tab des Spielleiters ist der Server der Runde. Er muss während des Spiels offen bleiben. Spieldaten laufen direkt zwischen den Browsern, der öffentliche Vermittlungsserver sieht nur den Verbindungsaufbau.</p>
    </div>
  </section>
{:else if gm.session}
  <section class="top">
    <div>
      <span class="kicker">Spielleiter · {gm.session.state.gmName}</span>
      <div class="codewrap">
        <span class="code mono">{formatCode(gm.session.code)}</span>
        <button class="btn sm" onclick={() => copy(formatCode(gm.session!.code), 'Raumcode')}>Code kopieren</button>
        <button class="btn sm" onclick={() => copy(joinUrl, 'Beitritts-Link')}>Link kopieren</button>
      </div>
    </div>
    <div class="row">
      <span class="chip" class:accent={gm.broker} class:danger={!gm.broker} title="Vermittlungsserver">{gm.broker ? 'Server erreichbar' : 'Server getrennt'}</span>
      <span class="chip">{online} / {gm.session.players.length} online</span>
      {#if gm.pending.length}<span class="chip amber">{gm.pending.length} Anfrage(n)</span>{/if}
    </div>
  </section>

  <div class="tabs" role="tablist" aria-label="SL-Dashboard">
    <button role="tab" aria-selected={tab === 'players'} onclick={() => (tab = 'players')}>Spieler{#if gm.pending.length} ({gm.pending.length}){/if}</button>
    <button role="tab" aria-selected={tab === 'combat'} onclick={() => (tab = 'combat')}>Kampf{#if gm.session.combat.active} (R{gm.session.combat.round}){/if}</button>
    <button role="tab" aria-selected={tab === 'map'} onclick={() => (tab = 'map')}>Karte</button>
    <button role="tab" aria-selected={tab === 'handouts'} onclick={() => (tab = 'handouts')}>Handouts</button>
    <button role="tab" aria-selected={tab === 'music'} onclick={() => (tab = 'music')}>Musik</button>
    <button role="tab" aria-selected={tab === 'dice'} onclick={() => (tab = 'dice')}>Würfel</button>
    <button role="tab" aria-selected={tab === 'notes'} onclick={() => (tab = 'notes')}>Notizen</button>
    <button role="tab" aria-selected={tab === 'settings'} onclick={() => (tab = 'settings')}>Einstellungen</button>
  </div>

  <div class="content">
    {#if tab === 'players'}
      <div class="cols">
        <GmPlayers />
        <section class="panel feed">
          <h2>Verlauf</h2>
          {#each gm.feed.slice(0, 15) as f}<div class="f"><span class="dim mono">{new Date(f.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span> {f.text}</div>{:else}<p class="dim">Noch nichts.</p>{/each}
        </section>
      </div>
    {:else if tab === 'combat'}
      <div class="combatgrid"><GmCombat /><CombatSidebar /></div>
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
          <h2>Meine Notizen (privat)</h2>
          <textarea rows="12" bind:value={gm.session.gmNotes} placeholder="Plot, Gegner, Geheimnisse, Ideen. Nur du siehst das."></textarea>
        </section>
        <section class="panel">
          <h2>Notizen für die Runde (für alle sichtbar)</h2>
          <textarea rows="6" bind:value={sharedDraft} oninput={() => { clearTimeout(sharedTimer); sharedTimer = setTimeout(() => setSharedNotes(sharedDraft), 600); }} placeholder="Auftrag, bekannte Fakten, Ortsbeschreibung. Spieler sehen das in ihrer Rundenansicht."></textarea>
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
  .code { font: 400 3.4rem/1 var(--font-display); letter-spacing: 0.22em; color: var(--accent-2); text-shadow: var(--hard-shadow); }
  .content { padding-top: 1rem; }
  .cols { display: grid; grid-template-columns: 1fr 260px; gap: 1rem; align-items: start; }
  .combatgrid { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 1rem; align-items: start; }
  @media (max-width: 1200px) { .combatgrid { grid-template-columns: 1fr; } }
  .feed .f { padding: 0.3rem 0; border-bottom: 1px solid var(--line); font-size: 0.9rem; }
  @media (max-width: 900px) { .cols { grid-template-columns: 1fr; } }
</style>
