<script lang="ts">
  import { untrack } from 'svelte';
  import { rules, ueberzahlBonus, type NpcType, type ZoneKey } from '../rules';
  import { gm, commitCombat, patchPlayer, partyFor } from '../net/gm.svelte';
  import {
    startCombat, nextRound, endCombat, otherSide, bedraengnisHit, newNpc, npcNormalHit, npcInjury, npcStatus, type Npc, type Side,
  } from './combat';
  import { roll2d6 } from '../dice/roller.svelte';
  import { uid } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';
  import TagInput from '../ui/TagInput.svelte';

  const combat = $derived(gm.session!.combat);
  const party = $derived(partyFor(null));
  const gmName = $derived(gm.session!.state.gmName);

  let newType = $state<NpcType>('elite');
  let newName = $state('');
  let newCount = $state(3);
  let ambush = $state<'' | Side>('');
  let attackers = $state(1);
  let hurtZone = $state<ZoneKey>('torso');
  let secret = $state(false);

  // Jede Änderung am Kampf wird gespeichert und an die Spieler gemeldet.
  let first = true;
  $effect(() => {
    JSON.stringify($state.snapshot(gm.session!.combat));
    if (first) { first = false; return; }
    untrack(commitCombat);
  });

  const types = rules.npc.leiter;
  const sideName = (s: Side) => (s === 'players' ? 'Spieler' : 'Gegner');

  function start() { startCombat(combat, { ambush: ambush || undefined }); }
  function end() {
    if (!confirm('Kampf beenden? Momentum der Spieler verfällt auf 0.')) return;
    for (const p of gm.session!.players) if (p.character) patchPlayer(p.id, [{ op: 'set', key: 'momentum', value: 0 }]);
    endCombat(combat);
  }
  function setMarker(s: Side) { combat.marker = s; }
  function sideDone() { combat.side = otherSide(combat.side); }

  function addNpc() {
    const n = newNpc(uid(), newType, newName.trim() || undefined, newCount);
    combat.npcs.push(n);
    newName = '';
  }
  function removeNpc(id: string) { combat.npcs = combat.npcs.filter((n) => n.id !== id); delete combat.done[id]; }

  function goonHit(playerId: string) {
    const p = gm.session!.players.find((x) => x.id === playerId);
    if (!p?.character) return;
    const r = bedraengnisHit(combat.bedraengnis[playerId] ?? 0);
    combat.bedraengnis[playerId] = r.counter;
    if (r.result === 'erster') {
      patchPlayer(playerId, [{ op: 'add', key: p.character.resources.schutz.current > 0 ? 'schutz' : 'wk', delta: -1 }]);
    } else {
      patchPlayer(playerId, [{ op: 'injury', zone: hurtZone, text: 'Bedrängnis durch Goons' }]);
    }
  }
  const playerWins = (id: string) => { combat.bedraengnis[id] = 0; };

  function rollNpc(n: Npc) {
    roll2d6({ who: n.name, label: `Gegner (${n.type})`, bonus: n.bonus + ueberzahlBonus(attackers), kind: 'attr', secret });
  }
  function hit(n: Npc) { npcNormalHit(n); }
  const fmt = (v: number) => (v > 0 ? `+${v}` : String(v));
  const defaultsOf = (t: NpcType) => types.find((x) => x.key === t)!;
</script>

<div class="stack">
  <section class="panel head">
    <div class="row">
      <h2>Kampf</h2>
      {#if combat.active}<span class="chip accent">Runde {combat.round}</span>{:else}<span class="chip">kein Kampf</span>{/if}
      <span class="spacer"></span>
      {#if !combat.active}
        <select bind:value={ambush} aria-label="Hinterhalt"><option value="">Normaler Beginn (Marker bei den Spielern)</option><option value="players">Spieler überraschen (Marker bei Spielern)</option><option value="enemies">Hinterhalt der Gegner (Marker bei Gegnern)</option></select>
        <button class="btn primary" onclick={start}>Kampf starten</button>
      {:else}
        <button class="btn primary" onclick={() => nextRound(combat)}>Nächste Runde</button>
        <button class="btn danger" onclick={end}>Kampf beenden</button>
      {/if}
    </div>

    {#if combat.active}
      <div class="sides">
        <div class="marker">
          <span class="lbl">Kinetik-Marker liegt bei</span>
          <div class="seg">
            <button class:on={combat.marker === 'players'} onclick={() => setMarker('players')}>Spielern</button>
            <button class:on={combat.marker === 'enemies'} onclick={() => setMarker('enemies')}>Gegnern</button>
          </div>
          <small class="dim">Dominanz oder perfekter Konter holt den Marker. Die Seite mit dem Marker beginnt die nächste Runde.</small>
        </div>
        <div class="acting">
          <span class="lbl">Am Zug</span>
          <b class="turn" class:en={combat.side === 'enemies'}>{sideName(combat.side)}</b>
          <button class="btn sm" onclick={sideDone}>Seite fertig, {sideName(otherSide(combat.side))} sind dran</button>
        </div>
      </div>
    {/if}
  </section>

  <div class="cols">
    <section class="panel">
      <h2>Spielercharaktere</h2>
      <div class="row hz"><span class="dim">Zone bei Bedrängnis-Verletzung</span>
        <select bind:value={hurtZone} aria-label="Zone">{#each rules.tabellen.zonen as z}<option value={z.key}>{z.kurz}</option>{/each}</select>
      </div>
      {#each party.filter((p) => p.vitals) as p (p.id)}
        <div class="part" class:done={combat.done[p.id]}>
          <label class="check"><input type="checkbox" checked={!!combat.done[p.id]} onchange={(e) => (combat.done[p.id] = e.currentTarget.checked)} disabled={!combat.active} /> <b>{p.characterName || p.name}</b></label>
          <span class="chip amber" title="Bedrängnis">Bedr. {combat.bedraengnis[p.id] ?? 0}</span>
          <span class="spacer"></span>
          <button class="btn sm" onclick={() => goonHit(p.id)} title="Goon-Gruppe landet einen Treffer: 1. Treffer -1 Schutz/WK, 2. in Folge Verletzung">Goon-Treffer</button>
          <button class="btn sm" onclick={() => playerWins(p.id)} title="Spieler gewinnt einen Clash: Zähler 0">Sieg</button>
        </div>
      {:else}
        <p class="dim">Keine Spielerbögen sichtbar.</p>
      {/each}
      <label class="check opt"><input type="checkbox" bind:checked={combat.showEnemies} /> Spieler sehen Gegnernamen und Status</label>
    </section>

    <section class="panel">
      <h2>Gegner hinzufügen</h2>
      <div class="row">
        <select bind:value={newType} aria-label="Typ">{#each types as t}<option value={t.key}>{t.name} (Bonus +{t.bonusMax})</option>{/each}</select>
        <input bind:value={newName} placeholder="Name (optional)" aria-label="Name" />
        {#if newType === 'goon'}<Stepper bind:value={newCount} min={1} max={20} label="Anzahl" />{/if}
        <button class="btn primary" onclick={addNpc}>+ Gegner</button>
      </div>
      <div class="row ueber">
        <span class="dim">Überzahl: Angreifer auf ein Ziel</span>
        <Stepper bind:value={attackers} min={1} max={10} label="Angreifer" />
        <span class="chip accent">Bonus +{ueberzahlBonus(attackers)}</span>
        <label class="check"><input type="checkbox" bind:checked={secret} /> Gegnerwürfe geheim</label>
      </div>
    </section>
  </div>

  <div class="npcs">
    {#each combat.npcs as n (n.id)}
      {@const st = npcStatus(n)}
      <article class="panel npc" class:out={st.out} class:hid={n.hidden}>
        <div class="row">
          <input class="nm" bind:value={n.name} aria-label="Name" />
          <span class="chip">{defaultsOf(n.type).name}</span>
          {#if st.out}<span class="chip danger" title={st.reason}>ausgeschaltet</span>{/if}
          {#if n.hidden}<span class="chip amber">versteckt</span>{/if}
          <span class="spacer"></span>
          <label class="check"><input type="checkbox" checked={!!combat.done[n.id]} onchange={(e) => (combat.done[n.id] = e.currentTarget.checked)} disabled={!combat.active} /> gehandelt</label>
        </div>
        {#if st.out}<small class="dim">{st.reason}</small>{/if}
        <div class="stats">
          <label class="s">Level<Stepper bind:value={n.level} min={0} max={10} label="Level" /></label>
          <label class="s">Bonus<Stepper bind:value={n.bonus} min={-3} max={20} label="Bonus" /></label>
          {#if n.type === 'goon'}
            <label class="s">Mitglieder<Stepper bind:value={n.count} min={0} max={30} label="Mitglieder" /></label>
          {:else}
            <label class="s">Schutz<span class="pair"><Stepper bind:value={n.schutz} min={0} max={9} label="Schutz" /><span class="dim">/</span><Stepper bind:value={n.schutzMax} min={0} max={9} label="Schutz max" /></span></label>
            <label class="s">WK<span class="pair"><Stepper bind:value={n.wk} min={0} max={n.wkMax} label="WK" /><span class="dim">/</span><Stepper bind:value={n.wkMax} min={0} max={30} label="WK max" /></span></label>
            <label class="s">Energie<span class="pair"><Stepper bind:value={n.energie} min={0} max={n.energieMax} label="Energie" /><span class="dim">/</span><Stepper bind:value={n.energieMax} min={0} max={30} label="Energie max" /></span></label>
          {/if}
        </div>
        {#if n.type !== 'goon'}
          <div class="zones">
            {#each rules.tabellen.zonen as z}
              {@const c = n.injuries[z.key as ZoneKey] ?? 0}
              <span class="z" class:bad={c >= z.felder}>
                <button class="btn sm icon ghost" onclick={() => { n.injuries[z.key as ZoneKey] = Math.max(0, c - 1); }} disabled={!c} aria-label={`${z.kurz} heilen`}>−</button>
                <span>{z.kurz} {c}/{z.felder}</span>
                <button class="btn sm icon ghost" onclick={() => npcInjury(n, z.key as ZoneKey)} disabled={c >= z.felder} aria-label={`${z.kurz} verletzen`}>+</button>
              </span>
            {/each}
          </div>
        {/if}
        <label class="field">Tags<TagInput bind:values={n.tags} label="Tags" placeholder="z.B. Am Boden" /></label>
        <label class="field">Notiz<input bind:value={n.note} placeholder="Verhalten, Schwäche, Beute" /></label>
        <div class="row">
          <button class="btn sm primary" onclick={() => rollNpc(n)} title="2W6 + Bonus (+ Überzahl)">Würfeln {fmt(n.bonus + ueberzahlBonus(attackers))}</button>
          <button class="btn sm" onclick={() => hit(n)} title={n.type === 'goon' ? 'Ein Goon fällt' : 'Normaler Treffer: erst Schutz, dann Willenskraft'}>{n.type === 'goon' ? 'Goon fällt' : 'Treffer'}</button>
          <label class="check"><input type="checkbox" bind:checked={n.hidden} /> versteckt</label>
          <span class="spacer"></span>
          <button class="btn sm danger" onclick={() => removeNpc(n.id)}>Entfernen</button>
        </div>
      </article>
    {/each}
  </div>
  {#if !combat.npcs.length}<p class="dim">Noch keine Gegner. Füge oben Goon-Gruppen, Schläger, Elite, Bosse oder Nemesis hinzu, mit den Werten aus der NPC-Leiter (3.7).</p>{/if}
</div>

<style>
  .head .sides { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--line); }
  .head select { width: auto; max-width: 340px; }
  .lbl { display: block; font: 600 0.74rem var(--font-head); letter-spacing: 0.16em; text-transform: uppercase; color: var(--ink-dim); margin-bottom: 0.3rem; }
  .seg { display: flex; margin-bottom: 0.4rem; }
  .seg button { flex: 1; padding: 0.7em; font: 600 1.05rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; background: var(--raised); border: 1px solid var(--line-strong); color: var(--ink-dim); cursor: pointer; }
  .seg button.on { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); box-shadow: var(--hard-shadow); }
  .seg button:nth-child(2).on { background: var(--danger); border-color: var(--danger); color: #1a0008; }
  .turn { font: 400 2.8rem/1 var(--font-display); color: var(--accent); letter-spacing: 0.06em; display: block; margin-bottom: 0.4rem; }
  .turn.en { color: var(--danger); }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; align-items: start; }
  .part { display: flex; gap: 0.5rem; align-items: center; padding: 0.45rem 0.2rem; border-bottom: 1px solid var(--line); flex-wrap: wrap; }
  .part.done { opacity: 0.5; }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.92rem; }
  .opt { margin-top: 0.6rem; color: var(--ink-dim); }
  .hz { margin-bottom: 0.4rem; }
  .hz select { width: auto; min-height: 30px; padding: 0.2em 0.4em; }
  .ueber { margin-top: 0.7rem; }
  .npcs { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1rem; }
  .npc { display: grid; gap: 0.6rem; border-left: 3px solid var(--danger); }
  .npc.out { opacity: 0.55; }
  .npc.hid { border-left-style: dashed; }
  .nm { font: 400 1.5rem var(--font-display); letter-spacing: 0.05em; flex: 1; min-width: 120px; }
  .stats { display: flex; gap: 0.8rem; flex-wrap: wrap; }
  .s { display: grid; gap: 3px; font: 600 0.7rem var(--font-head); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-dim); }
  .pair { display: flex; align-items: center; gap: 4px; }
  .zones { display: flex; flex-wrap: wrap; gap: 4px; }
  .z { display: inline-flex; align-items: center; gap: 2px; font: 600 0.78rem var(--font-head); letter-spacing: 0.06em; text-transform: uppercase; padding: 0 2px; border: 1px solid var(--line); }
  .z.bad { border-color: var(--danger); color: var(--danger); }
  @media (max-width: 900px) { .cols, .head .sides { grid-template-columns: 1fr; } }
</style>
