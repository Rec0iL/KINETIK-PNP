<script lang="ts">
  import { rules, ATTR_KEYS, describePoison, type AttrKey, type NpcType } from '../rules';
  import { gm, partyFor, answerMove, advanceRound, gmAttack, gmPlan } from '../net/gm.svelte';
  import { startCombat, endCombat, otherSide, npcStatus, roughState, ROUGH_LABEL, type Side } from './combat';
  import { isOpen, KIND_LABEL, type SitKind } from './situation';
  import { patchPlayer } from '../net/gm.svelte';
  import SitCard from './SitCard.svelte';

  /** Im Kampf-Tab stehen Runde, Marker und Spielerliste schon links: hier nur Bewegung, Situationen und Gegner-Angriffe. */
  let { situationsOnly = false }: { situationsOnly?: boolean } = $props();
  const combat = $derived(gm.session!.combat);
  const party = $derived(partyFor(null).filter((p) => p.vitals));
  const sideName = (s: Side) => (s === 'players' ? 'Spieler' : 'Gegner');
  const open = $derived(combat.situations.filter((s) => isOpen(s)));
  const closed = $derived(combat.situations.filter((s) => !isOpen(s) && s.round === combat.round).slice(-4).reverse());
  const nameOf = (id: string) => party.find((p) => p.id === id)?.characterName || party.find((p) => p.id === id)?.name || id;
  const npcName = (id: string | null) => combat.npcs.find((n) => n.id === id)?.name ?? '';

  let ambush = $state<'' | Side>('');
  let attackFrom = $state<Record<string, string>>({});
  let formPlayer = $state('');
  let formKind = $state<SitKind>('attack');
  let formTarget = $state('');
  let formAttr = $state<AttrKey>('gewalt');
  let formText = $state('');
  let formOpen = $state(false);

  function start() { startCombat(combat, { ambush: ambush || undefined }); }
  function end() {
    if (!confirm('Kampf beenden? Momentum der Spieler verfällt auf 0.')) return;
    for (const p of gm.session!.players) if (p.character) patchPlayer(p.id, [{ op: 'set', key: 'momentum', value: 0 }]);
    endCombat(combat);
  }
  function createForPlayer() {
    const pid = formPlayer || party[0]?.id;
    if (!pid) return;
    gmPlan(pid, {
      kind: formKind, npcId: formKind === 'attack' ? (formTarget || combat.npcs[0]?.id || null) : null, attr: formAttr, technique: formText, moveName: '', tagsUsed: [],
    });
    formText = '';
    formOpen = false;
  }
  const types = rules.npc.leiter;
  const typeName = (t: NpcType) => types.find((x) => x.key === t)?.name ?? t;
</script>

<aside class="side">
  {#if !situationsOnly || !combat.active}
  <section class="panel">
    <div class="row">
      <h2>Kampf</h2>
      {#if combat.active}<span class="chip accent">Runde {combat.round}</span>{:else}<span class="chip">kein Kampf</span>{/if}
    </div>
    {#if !combat.active}
      <div class="row">
        <select bind:value={ambush} aria-label="Hinterhalt"><option value="">Normaler Beginn</option><option value="players">Spieler überraschen</option><option value="enemies">Hinterhalt der Gegner</option></select>
        <button class="btn sm primary" onclick={start}>Kampf starten</button>
      </div>
    {:else}
      <div class="row">
        <span class="lbl">Marker</span>
        <div class="seg">
          <button class:on={combat.marker === 'players'} onclick={() => (combat.marker = 'players')}>Spieler</button>
          <button class:on={combat.marker === 'enemies'} onclick={() => (combat.marker = 'enemies')}>Gegner</button>
        </div>
      </div>
      <div class="row">
        <span class="lbl">Am Zug</span><b class="turn" class:en={combat.side === 'enemies'}>{sideName(combat.side)}</b>
        <span class="spacer"></span>
        <button class="btn sm" onclick={() => (combat.side = otherSide(combat.side))}>Seite fertig</button>
      </div>
      <div class="row">
        <button class="btn sm primary" onclick={advanceRound} title="Gift wirkt am Rundenende, dann beginnt die nächste Runde">Nächste Runde</button>
        <label class="check"><input type="checkbox" bind:checked={combat.autoRelease} /> Pläne automatisch freigeben</label>
        <span class="spacer"></span>
        <button class="btn sm danger" onclick={end}>Beenden</button>
      </div>
    {/if}
  </section>
  {/if}

  {#if combat.active}
    {#if combat.moveRequests.length}
      <section class="panel">
        <h2>Bewegung</h2>
        {#each combat.moveRequests as r (r.id)}
          <div class="row mv">
            <span><b>{r.name}</b> will sich bewegen</span><span class="spacer"></span>
            <button class="btn sm primary" onclick={() => answerMove(r.id, true)}>Ok</button>
            <button class="btn sm ghost danger" onclick={() => answerMove(r.id, false)}>Nein</button>
          </div>
        {/each}
        <small class="dim">Das Geisterbild liegt auf der Karte.</small>
      </section>
    {/if}

    <section class="panel">
      <div class="row"><h2>Situationen</h2><span class="spacer"></span><button class="btn sm" onclick={() => (formOpen = !formOpen)}>{formOpen ? 'Schließen' : '+ Aktion für Spieler'}</button></div>
      {#if formOpen}
        <div class="form">
          <select bind:value={formPlayer} aria-label="Spieler">{#each party as p}<option value={p.id}>{p.characterName || p.name}</option>{/each}</select>
          <select bind:value={formKind} aria-label="Art"><option value="attack">Angriff</option><option value="breath">Durchatmen</option><option value="gather">Sammeln</option></select>
          {#if formKind === 'attack'}<select bind:value={formTarget} aria-label="Ziel">{#each combat.npcs.filter((n) => !npcStatus(n).out) as n}<option value={n.id}>{n.name}</option>{/each}</select>
            <select bind:value={formAttr} aria-label="Attribut">{#each ATTR_KEYS as a}<option value={a}>{rules.tabellen.attribute.find((x) => x.key === a)?.name}</option>{/each}</select>{/if}
          <input bind:value={formText} placeholder="Technik" aria-label="Technik" />
          <button class="btn sm primary" onclick={createForPlayer}>Anlegen</button>
        </div>
      {/if}
      <div class="sits">
        {#each open as s (s.id)}<SitCard sit={s} />{:else}<p class="dim">Keine offenen Situationen. Spieler planen ihre Aktion auf ihrem Gerät, Gegner greifst du unten an.</p>{/each}
        {#each closed as s (s.id)}<SitCard sit={s} />{/each}
      </div>
    </section>

    {#if !situationsOnly}
    <section class="panel">
      <h2>Spieler</h2>
      {#each party as p (p.id)}
        {@const v = p.vitals!}
        <div class="pl" class:done={combat.done[p.id]}>
          <label class="check"><input type="checkbox" checked={!!combat.done[p.id]} onchange={(e) => (combat.done[p.id] = e.currentTarget.checked)} /> <b>{p.characterName || p.name}</b></label>
          <span class="chip">E {v.energie}/{v.energieMax}</span><span class="chip">WK {v.wk}</span><span class="chip">M {v.momentum}</span>
          {#if combat.bedraengnis[p.id]}<span class="chip amber">Bedr. {combat.bedraengnis[p.id]}</span>{/if}
          {#if combat.bulletTime[p.id] === combat.round}<span class="chip accent">Bullet Time genutzt</span>{/if}
          {#if combat.exposed[p.id]}<span class="chip danger" title="Der nächste Clash gegen den Spieler bekommt +1 (3.10)">+1 gegen</span>{/if}
          {#each v.poisons as pz}<span class="chip danger" title="Gift">Gift {pz.level}{pz.delay ? ` (${pz.delay})` : ''}</span>{/each}
        </div>
      {:else}<p class="dim">Keine Spielerbögen sichtbar.</p>{/each}
    </section>
    {/if}

    <section class="panel">
      <h2>Gegner</h2>
      {#each combat.npcs as n (n.id)}
        {@const st = npcStatus(n)}
        <div class="en" class:out={st.out}>
          <div class="row">
            <b>{n.name}{n.type === 'goon' ? ` (${n.count})` : ''}</b><span class="chip">{typeName(n.type)}</span>
            <span class="chip" class:danger={st.out}>{ROUGH_LABEL[roughState(n)]}</span>
            {#each n.tags as t}<span class="chip amber">{t}</span>{/each}
            {#each n.poisons ?? [] as pz (pz.id)}<span class="chip danger" title={describePoison(pz)}>Gift {pz.level}{pz.delay ? ` (${pz.delay})` : ''}</span>{/each}
            {#if combat.done[n.id]}<span class="chip">gehandelt</span>{/if}
          </div>
          {#if !st.out && party.length}
            <div class="row atk">
              <select aria-label="Ziel des Angriffs" value={attackFrom[n.id] ?? party[0].id} onchange={(e) => (attackFrom[n.id] = e.currentTarget.value)}>{#each party as p}<option value={p.id}>{p.characterName || p.name}</option>{/each}</select>
              <button class="btn sm danger" onclick={() => gmAttack(attackFrom[n.id] ?? party[0].id, n.id)}>greift an</button>
            </div>
          {/if}
        </div>
      {:else}<p class="dim">Noch keine Gegner. Füge sie auf der Karte hinzu.</p>{/each}
    </section>
  {/if}
</aside>

<style>
  .side { display: grid; gap: 0.8rem; align-content: start; min-width: 0; }
  .side h2 { margin: 0; }
  .side .panel { display: grid; gap: 0.6rem; }
  .lbl { font: 600 0.7rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .seg { display: flex; }
  .seg button { padding: 0.35em 0.9em; font: 600 0.9rem var(--font-head); letter-spacing: 0.08em; text-transform: uppercase; background: var(--raised); border: 1px solid var(--line-strong); color: var(--ink-dim); cursor: pointer; }
  .seg button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
  .seg button:nth-child(2).on { background: var(--danger); border-color: var(--danger); color: #1a0008; }
  .turn { font: 400 1.6rem/1 var(--font-display); color: var(--accent); letter-spacing: 0.06em; }
  .turn.en { color: var(--danger); }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.88rem; }
  .mv { padding: 3px 0; border-bottom: 1px solid var(--line); }
  .form { display: grid; gap: 4px; padding: 0.5rem; background: var(--raised); }
  .form select, .form input { min-height: 32px; }
  .sits { display: grid; gap: 0.6rem; }
  .pl { display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; padding: 0.3rem 0; border-bottom: 1px solid var(--line); }
  .pl.done { opacity: 0.5; }
  .en { display: grid; gap: 4px; padding: 0.35rem 0; border-bottom: 1px solid var(--line); }
  .en.out { opacity: 0.5; }
  .atk select { width: auto; min-height: 30px; padding: 0.15em 0.4em; }
  .row { flex-wrap: wrap; }
</style>
