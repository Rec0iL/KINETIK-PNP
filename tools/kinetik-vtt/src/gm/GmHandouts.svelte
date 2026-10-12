<script lang="ts">
  import { gm, addHandout, removeHandout, sendHandout, partyFor } from '../net/gm.svelte';
  import { prepareImage, putAsset, removeAsset, assetUrl } from '../net/assets.svelte';
  import type { Handout } from '../net/protocol';
  import { uid } from '../model/character';
  import { pushToast } from '../ui/toasts.svelte';
  import { t } from '../i18n';

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
    addHandout({ id: uid(), title: title.trim() || t('gm.handouts.defaultTitle'), kind: 'text', text, ts: Date.now() });
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
    } catch (err) { pushToast(t('gm.common.imageFailed', { msg: (err as Error).message }), 'danger'); }
  }
  function send(h: Handout) {
    const to = target[h.id] ?? '';
    const n = sendHandout({ ...h, ts: Date.now() }, to ? [to] : null);
    pushToast(n ? t('gm.handouts.sent', { title: h.title, who: (to ? party.find((p) => p.id === to)?.name : t('gm.handouts.all')) ?? '' }) : t('gm.handouts.nobody'), n ? 'good' : 'warn');
  }
  async function del(h: Handout) {
    if (!confirm(t('gm.handouts.confirmDelete', { title: h.title }))) return;
    removeHandout(h.id);
    if (h.hash && !gm.session!.handouts.some((x) => x.hash === h.hash) && !gm.session!.scenes.some((s) => s.asset === h.hash)) await removeAsset(h.hash);
  }
</script>

<div class="stack">
  <section class="panel">
    <h2>{t('gm.handouts.new')}</h2>
    <div class="stack">
      <label class="field">{t('gm.handouts.title')}<input bind:value={title} placeholder={t('gm.handouts.titlePlaceholder')} /></label>
      <label class="field">{t('gm.handouts.text')}<textarea rows="4" bind:value={text} placeholder={t('gm.handouts.textPlaceholder')}></textarea></label>
      <div class="row">
        <button class="btn primary" onclick={addText} disabled={!title.trim() && !text.trim()}>{t('gm.handouts.addText')}</button>
        <button class="btn" onclick={() => fileInput?.click()}>{t('gm.handouts.uploadImage')}</button>
        <input bind:this={fileInput} type="file" accept="image/*" class="sr-only" onchange={onFile} />
      </div>
    </div>
  </section>

  <div class="list">
    {#each hs as h (h.id)}
      <article class="panel h">
        <div class="row"><h3>{h.title}</h3><span class="chip">{h.kind === 'image' ? t('gm.handouts.kindImage') : t('gm.handouts.kindText')}</span><span class="spacer"></span>
          <button class="btn sm icon ghost danger" onclick={() => del(h)} aria-label={t('gm.common.delete')}>✕</button>
        </div>
        {#if h.kind === 'image' && previews[h.id]}<img src={previews[h.id]} alt={h.title} />{/if}
        {#if h.text}<p class="txt">{h.text}</p>{/if}
        <div class="row">
          <select bind:value={target[h.id]} aria-label={t('gm.handouts.recipient')}><option value="">{t('gm.handouts.toAll')}</option>{#each party as p}<option value={p.id} disabled={!p.connected}>{p.characterName || p.name}{p.connected ? '' : t('gm.handouts.offline')}</option>{/each}</select>
          <button class="btn sm amber" onclick={() => send(h)}>{t('gm.common.send')}</button>
        </div>
      </article>
    {:else}
      <p class="dim">{t('gm.handouts.empty')}</p>
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
