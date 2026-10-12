<script lang="ts">
  import { rules, ZONE_KEYS, zoneStatus, type ZoneKey } from '../rules';
  import { uid, type Character } from '../model/character';
  import { computeSheet } from '../model/sheet';
  import Silhouette from './Silhouette.svelte';
  import { settings } from '../lib/settings.svelte';
  import { t, tn } from '../i18n';

  let { char }: { char: Character } = $props();
  const sheet = $derived(computeSheet(char));
  const zoneDefs = rules.tabellen.zonen;
  let selected = $state<ZoneKey | null>(null);

  const isDyingNow = () => ZONE_KEYS.some((z) => zoneStatus(z, char.injuries[z].length) === 'sterbend');

  function syncDying() {
    if (isDyingNow()) {
      if (char.dying === null) char.dying = rules.tabellen.sterbendRunden;
    } else if (!char.dyingGift) char.dying = null;
  }

  function addInjury(z: ZoneKey) {
    const def = zoneDefs.find((d) => d.key === z)!;
    if (char.injuries[z].length >= def.felder) return;
    char.injuries[z].push({ text: '' });
    if (settings.autoShock) char.resources.wk = Math.max(0, char.resources.wk - 1);
    selected = z;
    syncDying();
  }
  function removeInjury(z: ZoneKey, i: number) {
    char.injuries[z].splice(i, 1);
    syncDying();
  }
  function toScar(z: ZoneKey, i: number) {
    const inj = char.injuries[z][i];
    const zname = zoneDefs.find((d) => d.key === z)!.name;
    char.scars.push({ id: uid(), text: `${inj.text || t('sheet.body.injuryFallback')} (${zname})` });
    removeInjury(z, i);
  }
  function onbox(z: ZoneKey, i: number) {
    if (i < char.injuries[z].length) {
      if (char.injuries[z][i].text && !confirm(t('sheet.body.confirmHealOne'))) return;
      removeInjury(z, i);
    } else addInjury(z);
  }
  const clearAll = () => {
    if (!confirm(t('sheet.body.confirmHealAll'))) return;
    for (const z of ZONE_KEYS) char.injuries[z] = [];
    syncDying();
  };
</script>

<div class="body">
  <section class="panel fig">
    <Silhouette injuries={char.injuries} {selected} {onbox} onzone={(z) => (selected = selected === z ? null : z)} />
    <label class="check"><input type="checkbox" bind:checked={settings.autoShock} /> {t('sheet.body.autoShock')}</label>
    <p class="dim hint">{t('sheet.body.clickHint')}</p>
  </section>

  <div class="stack">
    {#if char.dying !== null}
      <section class="panel dying">
        <h2>{t('sheet.body.dying')}</h2>
        <div class="row">
          <span class="rounds">{char.dying}</span>
          <span class="dim">{tn('sheet.body.dyingText', char.dying, { mw: rules.tabellen.stabilisierenMW })}</span>
        </div>
        <div class="row">
          <button class="btn sm" onclick={() => (char.dying = Math.max(0, (char.dying ?? 0) - 1))}>{t('sheet.body.roundPassed')}</button>
          <button class="btn sm" onclick={() => (char.dying = rules.tabellen.sterbendRunden)}>{t('sheet.body.reset')}</button>
          <button class="btn sm primary" onclick={() => { char.dying = null; char.dyingGift = undefined; }}>{t('sheet.body.stabilized')}</button>
        </div>
      </section>
    {/if}

    <section class="panel">
      <div class="row"><h2>{t('sheet.body.injuries')}</h2><span class="spacer"></span>
        <span class="chip">{t('sheet.body.total', { n: sheet.injuryCount })}</span>
        <button class="btn sm danger" onclick={clearAll} disabled={!sheet.injuryCount}>{t('sheet.body.healAll')}</button>
      </div>
      <div class="zones">
        {#each zoneDefs as zd}
          {@const list = char.injuries[zd.key as ZoneKey]}
          {@const st = zoneStatus(zd.key as ZoneKey, list.length)}
          <div class="zone" class:sel={selected === zd.key} class:bad={st !== 'ok'}>
            <div class="row zhead">
              <button class="zname" onclick={() => (selected = selected === zd.key ? null : (zd.key as ZoneKey))}>{zd.name}</button>
              <span class="chip">{list.length}/{zd.felder}</span>
              {#if st === 'sterbend'}<span class="chip danger">{t('sheet.body.statusDying')}</span>{:else if st === 'unbrauchbar'}<span class="chip amber">{t('sheet.body.statusUseless')}</span>{/if}
              <span class="spacer"></span>
              <button class="btn sm" onclick={() => addInjury(zd.key as ZoneKey)} disabled={list.length >= zd.felder}>{t('sheet.body.addInjury')}</button>
            </div>
            {#each list as inj, i}
              <div class="row inj">
                <input bind:value={inj.text} placeholder={t('sheet.body.injuryPlaceholder')} aria-label={t('sheet.common.injuryAria', { zone: zd.name, n: i + 1 })} />
                <button class="btn sm" onclick={() => toScar(zd.key as ZoneKey, i)} title={t('sheet.body.keepScarTitle')}>{t('sheet.body.scar')}</button>
                <button class="btn sm icon" onclick={() => removeInjury(zd.key as ZoneKey, i)} aria-label={t('sheet.body.healed')} title={t('sheet.body.healed')}>✓</button>
              </div>
            {/each}
          </div>
        {/each}
      </div>
      <p class="dim hint">{t('sheet.body.healingHint')}</p>
    </section>

    <section class="panel">
      <div class="row"><h2>{t('sheet.body.scars')}</h2><span class="spacer"></span><button class="btn sm" onclick={() => char.scars.push({ id: uid(), text: '' })}>{t('sheet.body.addScar')}</button></div>
      {#each char.scars as s, i (s.id)}
        <div class="row inj"><input bind:value={s.text} placeholder={t('sheet.body.scarPlaceholder')} /><button class="btn sm icon danger" onclick={() => char.scars.splice(i, 1)} aria-label={t('sheet.common.remove')}>✕</button></div>
      {:else}
        <p class="dim">{t('sheet.body.noScars')}</p>
      {/each}
    </section>
  </div>
</div>

<style>
  .body { display: grid; grid-template-columns: minmax(280px, 420px) 1fr; gap: 1rem; align-items: start; }
  .fig { display: grid; gap: 0.7rem; justify-items: center; }
  .check { display: flex; gap: 0.5em; align-items: center; color: var(--ink-dim); font-size: 0.88rem; }
  .hint { font-size: 0.82rem; margin: 0; }
  .dying { border-color: var(--danger); }
  .dying h2 { color: var(--danger); }
  .rounds { font: 400 3.4rem/1 var(--font-display); color: var(--danger); text-shadow: 0 0 16px var(--danger); }
  .zones { display: grid; gap: 0.6rem; margin-top: 0.7rem; }
  .zone { padding: 0.5rem 0.6rem; background: var(--raised); border: 1px solid var(--line); display: grid; gap: 0.4rem; }
  .zone.sel { border-color: var(--accent-2); }
  .zone.bad { border-left: 3px solid var(--accent-2); }
  .zname { background: none; border: 0; color: var(--ink-strong); font: 600 1rem var(--font-head); letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; padding: 0; }
  .zname:hover { color: var(--accent); }
  .inj { flex-wrap: nowrap; }
  @media (max-width: 760px) { .body { grid-template-columns: 1fr; } }
</style>
