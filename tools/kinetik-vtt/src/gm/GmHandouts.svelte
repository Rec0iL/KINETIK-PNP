<script lang="ts">
  import { gm, addHandout, removeHandout, sendHandout, partyFor } from '../net/gm.svelte';
  import { prepareImage, putAsset, removeAsset, assetUrl } from '../net/assets.svelte';
  import type { Handout } from '../net/protocol';
  import { uid } from '../model/character';
  import { pushToast } from '../ui/toasts.svelte';

  let title = $state('');
  let text = $state('');
  let fileInput = $state<HTMLInputElement>();
  let target = $state<Record<string, string>>({});
  let previews = $state<Record<string, string>>({});

  const hs = $derived(gm.session!.handouts);
  const party = $derived(partyFor(null).filter((p) => !p.local));

  $effect(() => {
    for (const h of hs) {
      if (h.kind === 'image' && h.hash && !previews[h.id]) assetUrl(h.hash).then((u) => { if (u) previews[h.id] = u; });
    }
  });

  function addText() {
    if (!title.trim() && !text.trim()) return;
    addHandout({ id: uid(), title: title.trim() || 'Notiz', kind: 'text', text, ts: Date.now() });
    title = ''; text = '';
  }
  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    try {
      const prep = await prepareImage(f, 2400);
      const meta = await putAsset(prep.bytes, f.name, prep.mime);
      addHandout({ id: uid(), title: title.trim() || f.name.replace(/\.[^.]+$/, ''), kind: 'image', hash: meta.hash, ts: Date.now() });
      title = '';
    } catch (err) { pushToast(`Bild konnte nicht verarbeitet werden: ${(err as Error).message}`, 'danger'); }
  }
  function send(h: Handout) {
    const t = target[h.id] ?? '';
    const n = sendHandout({ ...h, ts: Date.now() }, t ? [t] : null);
    pushToast(n ? `„${h.title}“ an ${t ? party.find((p) => p.id === t)?.name : 'alle'} gesendet.` : 'Niemand verbunden.', n ? 'good' : 'warn');
  }
  async function del(h: Handout) {
    if (!confirm(`Handout „${h.title}“ löschen?`)) return;
    removeHandout(h.id);
    if (h.hash && !gm.session!.handouts.some((x) => x.hash === h.hash) && !gm.session!.scenes.some((s) => s.asset === h.hash)) await removeAsset(h.hash);
  }
</script>

<div class="stack">
  <section class="panel">
    <h2>Neues Handout</h2>
    <div class="stack">
      <label class="field">Titel<input bind:value={title} placeholder="z.B. Brief des Auftraggebers" /></label>
      <label class="field">Text<textarea rows="4" bind:value={text} placeholder="Text für die Spieler (oder leer lassen und ein Bild hochladen)"></textarea></label>
      <div class="row">
        <button class="btn primary" onclick={addText} disabled={!title.trim() && !text.trim()}>Text-Handout anlegen</button>
        <button class="btn" onclick={() => fileInput?.click()}>Bild hochladen</button>
        <input bind:this={fileInput} type="file" accept="image/*" class="sr-only" onchange={onFile} />
      </div>
    </div>
  </section>

  <div class="list">
    {#each hs as h (h.id)}
      <article class="panel h">
        <div class="row"><h3>{h.title}</h3><span class="chip">{h.kind === 'image' ? 'Bild' : 'Text'}</span><span class="spacer"></span>
          <button class="btn sm icon ghost danger" onclick={() => del(h)} aria-label="Löschen">✕</button>
        </div>
        {#if h.kind === 'image' && previews[h.id]}<img src={previews[h.id]} alt={h.title} />{/if}
        {#if h.text}<p class="txt">{h.text}</p>{/if}
        <div class="row">
          <select bind:value={target[h.id]} aria-label="Empfänger"><option value="">An alle Verbundenen</option>{#each party as p}<option value={p.id} disabled={!p.connected}>{p.characterName || p.name}{p.connected ? '' : ' (offline)'}</option>{/each}</select>
          <button class="btn sm amber" onclick={() => send(h)}>Senden</button>
        </div>
      </article>
    {:else}
      <p class="dim">Noch keine Handouts. Brief, Fahndungsfoto, Kartenausschnitt: Der SL schickt es an alle oder einzelne Spieler.</p>
    {/each}
  </div>
</div>

<style>
  .list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr)); gap: 1rem; }
  .h { display: grid; gap: 0.6rem; align-content: start; }
  .h img { max-width: 100%; max-height: 220px; object-fit: contain; background: #000; }
  .txt { white-space: pre-wrap; margin: 0; max-height: 8em; overflow: auto; color: var(--ink-dim); }
  select { width: auto; }
</style>
