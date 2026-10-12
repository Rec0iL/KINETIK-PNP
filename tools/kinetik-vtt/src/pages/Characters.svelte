<script lang="ts">
  import { library, addCharacter, removeCharacter, duplicateCharacter, getCharacter, saveCharacter } from '../store/characters.svelte';
  import { newCharacter } from '../model/character';
  import { jinYamada } from '../model/examples';
  import { downloadJson, exportCharacter, exportLibrary, fileNameFor, parseImport, ImportError } from '../model/io';
  import { computeSheet } from '../model/sheet';
  import { navigate } from '../lib/router.svelte';
  import { portraitPlaceholder } from '../lib/art';
  import { t, tn } from '../i18n';

  let fileInput = $state<HTMLInputElement>();
  let message = $state('');

  const create = () => navigate('/neu');
  function loadExample() {
    const c = addCharacter(jinYamada());
    navigate(`/charakter/${c.id}`);
  }
  function dup(id: string) {
    const c = duplicateCharacter(id);
    if (c) message = t('pages.characters.duplicated', { name: c.name });
  }
  async function del(id: string, name: string) {
    if (confirm(t('pages.characters.confirmDelete', { name }))) await removeCharacter(id);
  }
  async function onFiles(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const files = [...(input.files ?? [])];
    let added = 0;
    const errors: string[] = [];
    for (const f of files) {
      try {
        for (const c of parseImport(await f.text())) {
          const existing = getCharacter(c.id);
          if (existing) {
            if (confirm(t('pages.characters.confirmReplace', { name: c.name }))) {
              Object.assign(existing, c);
              saveCharacter(existing);
              added++;
              continue;
            }
            c.id = crypto.randomUUID();
          }
          addCharacter(c);
          added++;
        }
      } catch (err) {
        errors.push(`${f.name}: ${err instanceof ImportError ? err.message : t('pages.common.readError')}`);
      }
    }
    input.value = '';
    message = [added ? tn('pages.characters.imported', added) : '', ...errors].filter(Boolean).join(' ');
  }
  const exportAll = () => downloadJson(exportLibrary($state.snapshot(library.characters)), 'kinetik-characters.json');
  const topLevel = (c: (typeof library.characters)[number]) => c.titles.reduce((m, ti) => Math.max(m, ti.level), 0);
</script>

<section class="head">
  <div>
    <span class="kicker">{t('pages.common.player')}</span>
    <h1>{t('pages.characters.title')}</h1>
  </div>
  <div class="row">
    <button class="btn primary" onclick={create}>{t('pages.characters.newChar')}</button>
    <button class="btn" onclick={() => fileInput?.click()}>{t('pages.characters.importJson')}</button>
    <button class="btn" onclick={exportAll} disabled={!library.characters.length}>{t('pages.common.exportAll')}</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" multiple class="sr-only" onchange={onFiles} />
  </div>
</section>

{#if library.storageError}<p class="panel flat banner danger">{library.storageError}</p>{/if}
{#if message}<p class="panel flat banner">{message} <button class="btn sm ghost" onclick={() => (message = '')}>OK</button></p>{/if}

{#if !library.ready}
  <p class="dim">{t('pages.common.loading')}</p>
{:else if !library.characters.length}
  <section class="panel empty stack">
    <h2>{t('pages.characters.emptyTitle')}</h2>
    <p class="dim">{t('pages.characters.emptyText')}</p>
    <div class="row"><button class="btn primary" onclick={create}>{t('pages.characters.createFirst')}</button><button class="btn" onclick={loadExample}>{t('pages.characters.loadExample')}</button></div>
  </section>
{:else}
  <div class="grid cards">
    {#each library.characters as c (c.id)}
      {@const s = computeSheet(c)}
      <article class="panel card">
        <a class="open" href={`#/charakter/${c.id}`} aria-label={t('pages.characters.open', { name: c.name })}>
          <div class="pic">{#if c.portrait}<img src={c.portrait} alt="" />{:else}<img class="ph" src={portraitPlaceholder()} alt="" />{/if}</div>
          <div class="info">
            <h2>{c.name}</h2>
            {#if c.alias}<span class="kicker">{t('pages.common.quoted', { text: c.alias })}</span>{/if}
            <small class="dim">{c.titles.map((ti) => `${ti.name} L${ti.level}`).join(' · ') || t('pages.characters.noTitle')}</small>
            <div class="vitals">
              <span class="chip accent" title={t('pages.common.energy')}>{t('pages.common.energyShort')} {c.resources.energie}/{s.energieMax.value}</span>
              <span class="chip amber" title={t('pages.common.willpower')}>{t('pages.common.willpowerShort')} {c.resources.wk}/{s.wkMax.value}</span>
              {#if topLevel(c)}<span class="chip">{t('pages.characters.level', { n: topLevel(c) })}</span>{/if}
              {#if s.states.sterbend}<span class="chip danger">{t('pages.characters.dying')}</span>{/if}
            </div>
          </div>
        </a>
        <div class="row acts">
          <button class="btn sm" onclick={() => downloadJson(exportCharacter($state.snapshot(c)), fileNameFor(c))}>{t('pages.characters.export')}</button>
          <button class="btn sm" onclick={() => dup(c.id)}>{t('pages.common.duplicate')}</button>
          <span class="spacer"></span>
          <button class="btn sm danger icon" onclick={() => del(c.id, c.name)} aria-label={t('pages.common.delete')}>🗑</button>
        </div>
      </article>
    {/each}
  </div>
  <p class="dim foot">{t('pages.characters.foot')}</p>
{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: end; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.2rem; }
  .banner { margin: 0 0 1rem; }
  .banner.danger { border-color: var(--danger); color: var(--danger); }
  .cards { grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); }
  .card { display: grid; gap: 0.6rem; padding: 0.9rem; transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s; }
  .card:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: var(--glow); }
  .open { display: grid; grid-template-columns: 82px 1fr; gap: 0.9rem; color: inherit; text-decoration: none; }
  .open:hover { text-decoration: none; }
  .pic { width: 82px; height: 104px; background: linear-gradient(160deg, var(--accent-soft), var(--track-bg)); border: 1px solid var(--line-strong); display: grid; place-items: center; overflow: hidden; }
  .pic img { width: 100%; height: 100%; object-fit: cover; }
  .pic img.ph { opacity: 0.6; filter: saturate(0.7); }
  .info { display: grid; gap: 0.25rem; align-content: start; min-width: 0; }
  .info h2 { font-family: var(--font-display); font-weight: 400; font-size: 1.8rem; letter-spacing: 0.05em; line-height: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vitals { display: flex; gap: 5px; flex-wrap: wrap; margin-top: 0.2rem; }
  .acts { border-top: 1px solid var(--line); padding-top: 0.6rem; }
  .foot { margin-top: 1.2rem; font-size: 0.85rem; }
  .empty { max-width: 640px; }
</style>
