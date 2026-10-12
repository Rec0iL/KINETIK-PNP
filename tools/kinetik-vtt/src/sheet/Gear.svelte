<script lang="ts">
  import { rules, newAmmo, fireShot, reload, isReloadTag, tagLabel } from '../rules';
  import { uid, type Character, type Weapon } from '../model/character';
  import Stepper from '../ui/Stepper.svelte';
  import { t } from '../i18n';

  let { char }: { char: Character } = $props();
  let tpl = $state('');

  function addTemplate() {
    const w = rules.waffen.waffen.find((x) => x.id === tpl);
    if (!w) return;
    const mag = newAmmo(w, !!char.munition?.vorrat);
    char.weapons.push({
      id: uid(), name: w.name, klasse: w.klasse as Weapon['klasse'], ep: w.ep, profilText: w.profilText, durchschlag: w.durchschlag, templateId: w.id,
      ...(mag ? { mag } : {}),
    });
    tpl = '';
  }
  const tracking = $derived(!!char.munition?.track);
  function setTracking(on: boolean) {
    char.munition = { track: on, vorrat: char.munition?.vorrat ?? false };
    if (on) for (const w of char.weapons) if (!w.mag) {
      const tw = rules.waffen.waffen.find((x) => x.id === w.templateId);
      const m = newAmmo(tw, !!char.munition.vorrat);
      if (m) w.mag = m;
    }
  }
  function setVorrat(on: boolean) {
    char.munition = { track: char.munition?.track ?? false, vorrat: on };
    for (const w of char.weapons) if (w.mag) {
      if (on) { const max = w.mag.heavy ? rules.waffen.munition.vorratSchwer : rules.waffen.munition.vorrat; w.mag.reserveMax = max; w.mag.reserve = max; }
      else { w.mag.reserve = undefined; w.mag.reserveMax = undefined; }
    }
  }
  const addMag = (w: Weapon) => { w.mag = { cap: rules.waffen.munition.magazin, cur: rules.waffen.munition.magazin, heavy: false }; if (char.munition?.vorrat) { w.mag.reserveMax = rules.waffen.munition.vorrat; w.mag.reserve = rules.waffen.munition.vorrat; } };
  const shoot = (w: Weapon) => { if (w.mag) w.mag = fireShot(w.mag); };
  let notice = $state('');
  function doReload(w: Weapon, inClash: boolean, viaMove = false) {
    if (!w.mag) return;
    const r = reload(w.mag, { inClash, viaMove });
    if (!r.ok) { notice = `${w.name}: ${r.reason}`; return; }
    w.mag = r.ammo;
    notice = '';
    if (r.tag && !char.tags.some((tg) => isReloadTag(tg.name))) char.tags.push({ id: uid(), name: r.tag, size: 'klein' });
    if (r.action) notice = t('sheet.gear.reloadAction', { weapon: w.name });
  }
  const addCustom = () => char.weapons.push({ id: uid(), name: t('sheet.gear.customWeapon'), klasse: 'frei', ep: 1, profilText: '', durchschlag: 1 });
  const addItem = () => char.inventory.push({ id: uid(), name: '', qty: 1 });
  const classLabel = (k: string) => ({ leicht: t('sheet.gear.class.leicht'), schwer: t('sheet.gear.class.schwer'), explosiv: t('sheet.gear.class.explosiv'), frei: t('sheet.gear.class.frei') } as Record<string, string>)[k] ?? k;
  const hasKampfkunst = $derived(char.titles.some((t) => t.level >= rules.waffen.waffenlos.abLevel));
</script>

<div class="stack">
  <section class="panel">
    <div class="row"><h2>{t('sheet.gear.weapons')}</h2><span class="spacer"></span>
      <select bind:value={tpl} aria-label={t('sheet.gear.templateAria')}><option value="">{t('sheet.gear.templatePick')}</option>{#each rules.waffen.waffen as w}<option value={w.id}>{w.name} ({classLabel(w.klasse)})</option>{/each}</select>
      <button class="btn sm" onclick={addTemplate} disabled={!tpl}>{t('sheet.common.add')}</button>
      <button class="btn sm primary" onclick={addCustom}>{t('sheet.gear.addCustom')}</button>
    </div>
    <div class="row ammo-set">
      <label class="check"><input type="checkbox" checked={tracking} onchange={(e) => setTracking(e.currentTarget.checked)} /> {t('sheet.gear.ammoTracking')}</label>
      {#if tracking}<label class="check"><input type="checkbox" checked={!!char.munition?.vorrat} onchange={(e) => setVorrat(e.currentTarget.checked)} /> {t('sheet.gear.countReserve')}</label>{/if}
    </div>
    {#if notice}<p class="chip accent">{notice}</p>{/if}
    <p class="dim hint">{t('sheet.gear.profileHint')}</p>
    {#each char.weapons as w, i (w.id)}
      <div class="item">
        <div class="row">
          <label class="field grow">{t('sheet.common.name')}<input bind:value={w.name} /></label>
          <label class="field">{t('sheet.gear.class')}
            <select bind:value={w.klasse}><option value="leicht">{t('sheet.gear.class.leicht')}</option><option value="schwer">{t('sheet.gear.class.schwer')}</option><option value="explosiv">{t('sheet.gear.class.explosiv')}</option><option value="frei">{t('sheet.gear.class.frei')}</option></select>
          </label>
          <label class="field">EP<Stepper bind:value={w.ep} min={0} max={8} label="EP" /></label>
          <label class="field">{t('sheet.common.penetration')}<Stepper bind:value={w.durchschlag} min={0} max={5} label={t('sheet.common.penetration')} /></label>
          <button class="btn sm icon danger" onclick={() => char.weapons.splice(i, 1)} aria-label={t('sheet.gear.removeWeapon')}>✕</button>
        </div>
        <label class="field">{t('sheet.gear.profile')}<input bind:value={w.profilText} placeholder={t('sheet.gear.profilePlaceholder')} /></label>
        {#if tracking}
          {#if w.mag}
            <div class="row mag">
              <span class="lbl">{t('sheet.gear.magazine')}</span>
              <Stepper bind:value={w.mag.cur} min={0} max={w.mag.cap} label={t('sheet.gear.shotsInMag')} warn={w.mag.cur === 0} />
              <span class="dim">{t('sheet.gear.of')}</span>
              <Stepper bind:value={w.mag.cap} min={1} max={12} label={t('sheet.gear.magSize')} />
              {#if w.mag.reserve !== undefined}<span class="dim">{t('sheet.gear.reserve')}</span><Stepper bind:value={w.mag.reserve} min={0} max={9} label={t('sheet.gear.magsInReserve')} />{/if}
              <button class="btn sm" onclick={() => shoot(w)} disabled={w.mag.cur === 0}>{t('sheet.gear.shot')}</button>
              <button class="btn sm" onclick={() => doReload(w, true)} title={t('sheet.gear.reloadClashTitle')}>{t('sheet.gear.reloadClash')}</button>
              <button class="btn sm" onclick={() => doReload(w, false)} title={t('sheet.gear.reloadCalmTitle')}>{t('sheet.gear.reloadCalm')}</button>
              <button class="btn sm" onclick={() => doReload(w, true, true)} title={t('sheet.gear.reloadMoveTitle')}>{t('sheet.gear.reloadMove')}</button>
              {#if w.mag.cur === 0}<span class="chip danger">{tagLabel('Magazin leer')}</span>{/if}
            </div>
          {:else if w.klasse !== 'frei' || !w.templateId}
            <button class="btn sm" onclick={() => addMag(w)}>{t('sheet.gear.addMag')}</button>
          {/if}
        {/if}
        <label class="field">{t('sheet.gear.condition')}<input bind:value={w.note} placeholder={t('sheet.gear.conditionPlaceholder')} /></label>
      </div>
    {:else}
      <p class="dim">{t('sheet.gear.noWeapons')}</p>
    {/each}
    {#if hasKampfkunst}<p class="chip accent hands">{t('sheet.gear.deadlyHands')}</p>{/if}
  </section>

  <section class="panel">
    <h2>{t('sheet.gear.cover')}</h2>
    <div class="row">
      {#each rules.tabellen.deckung as d}<span class="chip">{d.name} <b>{d.schutz}</b></span>{/each}
    </div>
    <p class="dim hint">{t('sheet.gear.coverHint')}</p>
  </section>

  <section class="panel">
    <div class="row"><h2>{t('sheet.gear.equipment')}</h2><span class="spacer"></span><button class="btn sm primary" onclick={addItem}>{t('sheet.gear.addItem')}</button></div>
    {#each char.inventory as it, i (it.id)}
      <div class="row inv">
        <input class="n" bind:value={it.name} placeholder={t('sheet.gear.item')} aria-label={t('sheet.gear.item')} />
        <Stepper bind:value={it.qty} min={0} max={999} label={t('sheet.gear.qty')} />
        <input class="note" bind:value={it.note} placeholder={t('sheet.common.note')} aria-label={t('sheet.common.note')} />
        <button class="btn sm icon danger" onclick={() => char.inventory.splice(i, 1)} aria-label={t('sheet.common.remove')}>✕</button>
      </div>
    {:else}
      <p class="dim">{t('sheet.gear.nothing')}</p>
    {/each}
  </section>
</div>

<style>
  .hint { font-size: 0.85rem; margin: 0.6rem 0; }
  .item { display: grid; gap: 0.5rem; padding: 0.7rem; margin-top: 0.6rem; background: var(--raised); border: 1px solid var(--line); border-left: 3px solid var(--accent-2); }
  .grow { flex: 1; min-width: 180px; }
  .inv { flex-wrap: nowrap; margin-top: 0.4rem; }
  .inv .n { flex: 2; }
  .inv .note { flex: 3; }
  .hands { margin-top: 0.7rem; }
  .ammo-set { gap: 1rem; margin: 0.4rem 0; }
  .mag { flex-wrap: wrap; gap: 0.4rem; align-items: center; }
  .mag .lbl { font: 600 0.72rem var(--font-head); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-dim); }
  select { width: auto; max-width: 100%; }
</style>
