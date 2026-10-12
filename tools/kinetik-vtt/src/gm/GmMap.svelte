<script lang="ts">
  import { gm, addScene, removeScene, activateScene, gmMapOps, gmPing, partyFor } from '../net/gm.svelte';
  import { assets, putAsset, prepareImage, removeAsset } from '../net/assets.svelte';
  import { newScene, snapToGrid, TOKEN_COLORS, type MapOp, type MapState, type Token } from '../map/mapstate';
  import { uid } from '../model/character';
  import { shrinkDataUrl } from '../lib/image';
  import { pushToast } from '../ui/toasts.svelte';
  import MapView, { type Tool, type Ghost } from '../map/MapView.svelte';
  import Stepper from '../ui/Stepper.svelte';
  import CombatSidebar from './CombatSidebar.svelte';
  import { rules, type NpcType } from '../rules';
  import { newNpc, npcStatus, type Npc } from './combat';
  import { t, fmtNumber } from '../i18n';

  let selectedId = $state<string | null>(null);
  let tool = $state<Tool>('move');
  let brush = $state(80);
  let snap = $state(true);
  let selectedToken = $state<string | null>(null);
  let uploading = $state(false);
  let fileInput = $state<HTMLInputElement>();
  let view = $state<{ fit: () => void; focusOn: (x: number, y: number) => void }>();
  let showGrid = $state(false);
  let npcName = $state(t('gm.common.enemy'));
  let npcColor = $state('#ff4d6d');
  let npcSize = $state(1);
  let enemyType = $state<NpcType>('schlaeger');
  let enemyName = $state('');
  let enemyCount = $state(3);
  /** Spalten einklappbar: auf kleineren Bildschirmen gehört der Platz der Karte. */
  let sideOpen = $state(typeof innerWidth === 'undefined' || innerWidth >= 1500);
  let leftOpen = $state(true);

  const scenes = $derived(gm.session?.scenes ?? []);
  const scene = $derived(scenes.find((s) => s.id === selectedId) ?? null);
  const live = $derived(gm.session?.activeScene ?? null);
  const token = $derived(scene?.tokens.find((t) => t.id === selectedToken) ?? null);
  const party = $derived(gm.session ? partyFor(null) : []);
  const combat = $derived(gm.session!.combat);
  const ghosts = $derived<Ghost[]>(
    combat.moveRequests.map((r) => ({
      id: r.id, from: r.from, to: r.to, label: r.name, size: scene?.tokens.find((t) => t.id === r.tokenId)?.size ?? 1,
      color: scene?.tokens.find((t) => t.id === r.tokenId)?.color ?? '#ffb800',
    })),
  );
  const npcOf = (t: { npcId?: string }) => combat.npcs.find((n) => n.id === t.npcId);

  $effect(() => {
    if (!selectedId && scenes.length) selectedId = live ?? scenes[0].id;
    if (selectedId && !scenes.some((s) => s.id === selectedId)) selectedId = scenes[0]?.id ?? null;
  });

  async function loadDemo() {
    uploading = true;
    try {
      const res = await fetch(new URL('art/map-lagerhaus.webp', document.baseURI));
      if (!res.ok) throw new Error(t('gm.map.demoMissing'));
      const bytes = await res.arrayBuffer();
      const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/webp' }));
      const meta = await putAsset(bytes, 'lagerhaus.webp', 'image/webp');
      const s = newScene(uid(), t('gm.map.demoName'), meta.hash, bmp.width, bmp.height);
      bmp.close?.();
      s.grid.size = Math.round(s.width / 28);
      addScene(s);
      selectedId = s.id;
    } catch (err) {
      pushToast((err as Error).message, 'danger');
    } finally {
      uploading = false;
    }
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    uploading = true;
    try {
      const prep = await prepareImage(file);
      const meta = await putAsset(prep.bytes, file.name, prep.mime);
      const s = newScene(uid(), file.name.replace(/\.[^.]+$/, '') || t('gm.map.defaultName'), meta.hash, prep.width, prep.height);
      addScene(s);
      selectedId = s.id;
      pushToast(t('gm.map.added', { name: s.name, mb: fmtNumber(prep.bytes.byteLength / 1024 / 1024, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }), 'good');
    } catch (err) {
      pushToast(t('gm.common.imageFailed', { msg: (err as Error).message }), 'danger');
    } finally {
      uploading = false;
    }
  }

  function handle(ops: MapOp[]) {
    if (!scene) return;
    const real: MapOp[] = [];
    for (const op of ops) {
      if (op.op === 'ping') gmPing(op.x, op.y, op.color);
      else real.push(op);
    }
    if (real.length) gmMapOps(scene.id, real);
  }
  const send = (...ops: MapOp[]) => scene && gmMapOps(scene.id, ops);

  async function addPcToken(playerId: string) {
    if (!scene) return;
    const p = party.find((x) => x.id === playerId);
    if (!p) return;
    const idx = scene.tokens.filter((t) => t.kind === 'pc').length;
    const t: Token = {
      id: uid(), name: p.characterName || p.name, x: scene.width / 2 + idx * scene.grid.size, y: scene.height / 2,
      size: 1, color: TOKEN_COLORS[idx % TOKEN_COLORS.length], kind: 'pc', playerId,
      img: p.portrait ? await shrinkDataUrl(p.portrait).catch(() => undefined) : undefined,
    };
    send({ op: 'tok', token: t });
    selectedToken = t.id;
  }
  function addNpc() {
    if (!scene) return;
    const tok: Token = {
      id: uid(), name: npcName || t('gm.common.enemy'), x: scene.width / 2, y: scene.height / 2 - scene.grid.size * 2,
      size: npcSize, color: npcColor, kind: 'npc', hidden: false,
    };
    send({ op: 'tok', token: tok });
    selectedToken = tok.id;
  }
  /** Freies Feld nahe der Kartenmitte, ohne bestehende Token zu überdecken. */
  function freeSpot(taken: { x: number; y: number; size: number }[], size: number): [number, number] {
    const sc = scene!;
    const g = sc.grid.size;
    const cx = sc.width / 2;
    const cy = sc.height / 2 - g * 3;
    for (let r = 0; r < 40; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const [x, y] = snapToGrid(sc.grid, cx + dx * g * size, cy + dy * g * size, size);
          if (x < 0 || y < 0 || x > sc.width || y > sc.height) continue;
          if (taken.every((t) => Math.hypot(t.x - x, t.y - y) >= ((t.size + size) / 2) * g * 0.95)) return [x, y];
        }
      }
    }
    return [cx, cy];
  }

  /** Token für einen Kampf-NPC setzen (Goon-Gruppen: ein Token je Mitglied); mit Porträt, falls vorhanden. */
  function spawnTokens(n: Npc) {
    if (!scene) return;
    const total = n.type === 'goon' ? Math.max(1, n.count) : 1;
    const size = n.type === 'boss' || n.type === 'nemesis' ? 2 : 1;
    const ops: MapOp[] = [];
    let last: Token | null = null;
    const placed: { x: number; y: number; size: number }[] = scene.tokens.map((t) => ({ x: t.x, y: t.y, size: t.size }));
    for (let i = 0; i < total; i++) {
      const [x, y] = freeSpot(placed, size);
      placed.push({ x, y, size });
      last = {
        id: uid(), name: n.type === 'goon' ? `${n.name} ${i + 1}` : n.name, x, y, size, color: npcColor, kind: 'npc', hidden: false, npcId: n.id, img: n.token,
      };
      ops.push({ op: 'tok', token: last });
    }
    send(...ops);
    if (last) selectedToken = last.id;
  }

  /** Gegner aufstellen: Kampf-NPC und Token in einem Schritt. Goon-Gruppen bekommen einen Token je Mitglied. */
  function addEnemy() {
    if (!scene) return;
    const n = newNpc(uid(), enemyType, enemyName.trim() || undefined, enemyCount);
    combat.npcs.push(n);
    spawnTokens(n);
    enemyName = '';
  }

  /** Kampf-Gegner (z. B. von PenNodePaper übergeben), die auf dieser Karte noch keinen Token haben. */
  const unplaced = $derived(scene ? combat.npcs.filter((n) => !scene.tokens.some((t) => t.npcId === n.id)) : []);
  function removeToken() {
    if (!token) return;
    const n = npcOf(token);
    if (n?.type === 'goon') n.count = Math.max(0, n.count - 1);
    send({ op: 'tokdel', id: token.id });
    selectedToken = null;
  }
  function patchToken(p: Partial<Token>) {
    if (token) send({ op: 'tok', token: { ...$state.snapshot(token), ...p } });
  }
  const hasPcToken = (id: string) => !!scene?.tokens.some((t) => t.playerId === id);

  function setGrid(p: Partial<MapState['grid']>) {
    if (scene) send({ op: 'grid', grid: { ...$state.snapshot(scene.grid), ...p } });
  }
  function fogAll() { if (scene) send({ op: 'fog=', enabled: true, ops: [] }); }
  function fogNone() {
    if (scene) send({ op: 'fog=', enabled: true, ops: [{ m: 'reveal', s: { t: 'rect', x: 0, y: 0, w: scene.width, h: scene.height } }] });
  }
  function undoFog() {
    if (scene) send({ op: 'fog=', enabled: scene.fog.enabled, ops: scene.fog.ops.slice(0, -1).map((o) => $state.snapshot(o)) });
  }
  async function delScene(s: MapState) {
    if (!confirm(t('gm.map.confirmDelete', { name: s.name }))) return;
    removeScene(s.id);
    if (s.asset && !scenes.some((x) => x.id !== s.id && x.asset === s.asset)) await removeAsset(s.asset);
  }
  const tools: { key: Tool; label: string; title: string }[] = [
    { key: 'move', label: t('gm.map.tool.move'), title: t('gm.map.tool.moveTitle') },
    { key: 'ping', label: t('gm.map.tool.ping'), title: t('gm.map.tool.pingTitle') },
    { key: 'measure', label: t('gm.map.tool.measure'), title: t('gm.map.tool.measureTitle') },
    { key: 'reveal-brush', label: t('gm.map.tool.revealBrush'), title: t('gm.map.tool.revealBrushTitle') },
    { key: 'reveal-rect', label: t('gm.map.tool.revealRect'), title: t('gm.map.tool.revealRectTitle') },
    { key: 'reveal-poly', label: t('gm.map.tool.revealPoly'), title: t('gm.map.tool.revealPolyTitle') },
    { key: 'hide-brush', label: t('gm.map.tool.hideBrush'), title: t('gm.map.tool.hideBrushTitle') },
    { key: 'hide-rect', label: t('gm.map.tool.hideRect'), title: t('gm.map.tool.hideRectTitle') },
  ];
</script>

<div class="gmmap" class:noleft={!leftOpen} class:noright={!sideOpen}>
  {#if leftOpen}
  <aside class="stack">
    <section class="panel">
      <div class="row"><h2>{t('gm.map.maps')}</h2><span class="spacer"></span>
        <button class="btn sm primary" onclick={() => fileInput?.click()} disabled={uploading}>{uploading ? t('gm.common.loading') : t('gm.map.addMap')}</button>
        <input bind:this={fileInput} type="file" accept="image/*" class="sr-only" onchange={onFile} />
      </div>
      {#if !scenes.length}<button class="btn sm" onclick={loadDemo} disabled={uploading}>{t('gm.map.loadDemo')}</button>{/if}
      <ul class="list">
        {#each scenes as s (s.id)}
          <li class:on={s.id === selectedId}>
            <button class="pick" onclick={() => (selectedId = s.id)}>{s.name}{#if live === s.id}<span class="chip accent">{t('gm.map.live')}</span>{/if}</button>
            <button class="btn sm icon ghost" onclick={() => delScene(s)} aria-label={t('gm.common.delete')}>✕</button>
          </li>
        {:else}
          <li class="dim">{t('gm.map.noMaps')}</li>
        {/each}
      </ul>
      {#if scene}
        <div class="row">
          {#if live === scene.id}
            <button class="btn sm danger" onclick={() => activateScene(null)}>{t('gm.map.unshare')}</button>
          {:else}
            <button class="btn sm amber" onclick={() => activateScene(scene.id)}>{t('gm.map.share')}</button>
          {/if}
        </div>
        <label class="field">{t('gm.common.name')}<input value={scene.name} onchange={(e) => (scene.name = e.currentTarget.value)} /></label>
      {/if}
    </section>

    {#if scene}
      <section class="panel">
        <h2>{t('gm.map.tokens')}</h2>
        <div class="stack">
          {#each party.filter((p) => !hasPcToken(p.id)) as p (p.id)}
            <button class="btn sm" onclick={() => addPcToken(p.id)}>+ {p.characterName || p.name}</button>
          {/each}
          <div class="enemy stack">
            <h3>{t('gm.map.placeEnemies')}</h3>
            <div class="row npc">
              <select bind:value={enemyType} aria-label={t('gm.common.type')}>{#each rules.npc.leiter as ty}<option value={ty.key as NpcType}>{t('gm.common.typeOption', { name: ty.name, n: ty.bonusMax })}</option>{/each}</select>
              <input bind:value={enemyName} placeholder={t('gm.common.nameOptional')} aria-label={t('gm.common.name')} />
              <input type="color" bind:value={npcColor} aria-label={t('gm.common.color')} class="color" />
              {#if enemyType === 'goon'}<Stepper bind:value={enemyCount} min={1} max={12} label={t('gm.common.count')} />{/if}
              <button class="btn sm danger" onclick={addEnemy}>{t('gm.common.addEnemy')}</button>
            </div>
            <small class="dim">{t('gm.map.placeHint')}</small>
            {#if unplaced.length}
              <h3>{t('gm.map.fromCombat')}</h3>
              <div class="row">
                {#each unplaced as n (n.id)}
                  <button class="btn sm" onclick={() => spawnTokens(n)} title={t('gm.map.spawnTitle')}>{#if n.token}<img class="mini" src={n.token} alt="" />{/if}+ {n.name}</button>
                {/each}
              </div>
            {/if}
          </div>
          <div class="row npc">
            <input bind:value={npcName} aria-label={t('gm.common.name')} placeholder={t('gm.map.neutralToken')} />
            <Stepper bind:value={npcSize} min={1} max={4} label={t('gm.map.sizeCells')} />
            <button class="btn sm" onclick={addNpc}>{t('gm.map.addToken')}</button>
          </div>
        </div>
        {#if token}
          <div class="tok stack">
            <h3>{t('gm.map.selected', { name: token.name })}{#if npcOf(token)} <span class="chip" class:danger={npcStatus(npcOf(token)!).out}>{npcOf(token)!.name}{npcStatus(npcOf(token)!).out ? t('gm.map.outSuffix') : ''}</span>{/if}</h3>
            <label class="field">{t('gm.common.name')}<input value={token.name} onchange={(e) => patchToken({ name: e.currentTarget.value })} /></label>
            <label class="field">{t('gm.map.tokenNote')}<input value={token.note ?? ''} onchange={(e) => patchToken({ note: e.currentTarget.value || undefined })} placeholder={t('gm.map.tokenNotePlaceholder')} /></label>
            <div class="row">
              <input type="color" value={token.color} onchange={(e) => patchToken({ color: e.currentTarget.value })} class="color" aria-label={t('gm.common.color')} />
              <Stepper value={token.size} min={1} max={6} onchange={(v) => patchToken({ size: v })} label={t('gm.map.size')} />
              <label class="check"><input type="checkbox" checked={!!token.hidden} onchange={(e) => patchToken({ hidden: e.currentTarget.checked })} /> {t('gm.map.hiddenGm')}</label>
            </div>
            <div class="row">
              <button class="btn sm" onclick={() => view?.focusOn(token.x, token.y)}>{t('gm.map.show')}</button>
              <button class="btn sm danger" onclick={removeToken}>{t('gm.common.remove')}</button>
            </div>
          </div>
        {/if}
      </section>

      <section class="panel">
        <div class="row"><h2>{t('gm.map.fog')}</h2><span class="spacer"></span>
          <label class="check"><input type="checkbox" checked={scene.fog.enabled} onchange={(e) => send({ op: 'fog=', enabled: e.currentTarget.checked, ops: $state.snapshot(scene.fog.ops) })} /> {t('gm.map.active')}</label>
        </div>
        <div class="row">
          <button class="btn sm" onclick={fogAll}>{t('gm.map.fogAll')}</button>
          <button class="btn sm" onclick={fogNone}>{t('gm.map.fogNone')}</button>
          <button class="btn sm" onclick={undoFog} disabled={!scene.fog.ops.length}>{t('gm.map.undo')}</button>
        </div>
        <label class="field">{t('gm.map.brushSize')}<input type="range" min="20" max="400" bind:value={brush} /></label>
        <small class="dim">{t('gm.map.fogHint')}</small>
      </section>

      <section class="panel">
        <div class="row"><h2>{t('gm.map.grid')}</h2><span class="spacer"></span>
          <label class="check"><input type="checkbox" checked={scene.grid.show} onchange={(e) => setGrid({ show: e.currentTarget.checked })} /> {t('gm.map.gridShow')}</label>
        </div>
        <button class="btn sm ghost" onclick={() => (showGrid = !showGrid)}>{showGrid ? t('gm.map.settingsHide') : t('gm.map.settings')}</button>
        {#if showGrid}
          <div class="stack">
            <label class="field">{t('gm.map.cellSize', { n: Math.round(scene.grid.size) })}<input type="range" min="16" max="400" value={scene.grid.size} oninput={(e) => setGrid({ size: Number(e.currentTarget.value) })} /></label>
            <label class="field">{t('gm.map.offsetX')}<input type="range" min="0" max={scene.grid.size} value={scene.grid.ox} oninput={(e) => setGrid({ ox: Number(e.currentTarget.value) })} /></label>
            <label class="field">{t('gm.map.offsetY')}<input type="range" min="0" max={scene.grid.size} value={scene.grid.oy} oninput={(e) => setGrid({ oy: Number(e.currentTarget.value) })} /></label>
            <label class="field">{t('gm.map.opacity')}<input type="range" min="0.05" max="1" step="0.05" value={scene.grid.opacity} oninput={(e) => setGrid({ opacity: Number(e.currentTarget.value) })} /></label>
            <div class="row">
              <input type="color" value={scene.grid.color} onchange={(e) => setGrid({ color: e.currentTarget.value })} class="color" aria-label={t('gm.map.gridColor')} />
              <label class="field">{t('gm.map.unit')}<input value={scene.grid.unit} onchange={(e) => setGrid({ unit: e.currentTarget.value })} /></label>
              <label class="field">{t('gm.map.perCell')}<input type="number" step="0.5" value={scene.grid.unitsPerCell} onchange={(e) => setGrid({ unitsPerCell: Number(e.currentTarget.value) || 1 })} /></label>
            </div>
          </div>
        {/if}
      </section>
    {/if}
  </aside>
  {/if}

  <section class="stagewrap">
    {#if scene}
      <div class="toolbar">
        {#each tools as tl}<button class="btn sm" class:primary={tool === tl.key} onclick={() => (tool = tl.key)} title={tl.title}>{tl.label}</button>{/each}
        <span class="spacer"></span>
        <label class="check"><input type="checkbox" bind:checked={snap} /> {t('gm.map.snap')}</label>
        <button class="btn sm" class:primary={leftOpen} onclick={() => (leftOpen = !leftOpen)} title={t('gm.map.toolsTitle')}>{t('gm.map.tools')}</button>
        <button class="btn sm" class:primary={sideOpen} onclick={() => (sideOpen = !sideOpen)} title={t('gm.map.combatTitle')}>{t('gm.common.combat')}{#if combat.active}{t('gm.map.roundShort', { n: combat.round })}{/if}{#if combat.moveRequests.length} ({combat.moveRequests.length}){/if}</button>
        <button class="btn sm" onclick={() => view?.fit()}>{t('gm.map.fit')}</button>
      </div>
      <div class="stage"><MapView bind:this={view} map={scene} role="gm" {tool} {brush} {snap} {ghosts} bind:selected={selectedToken} onops={handle} /></div>
      <small class="dim">{t('gm.map.help')}{live === scene.id ? '' : t('gm.map.notShared')}</small>
    {:else}
      <div class="panel empty"><p class="dim">{t('gm.map.pickMap')}</p></div>
    {/if}
    {#each Object.entries(assets.progress) as [h, p] (h)}<small class="dim">{t('gm.map.transfer', { n: Math.round((p.loaded / Math.max(1, p.total)) * 100) })}</small>{/each}
  </section>

  {#if sideOpen}<div class="combatcol"><CombatSidebar /></div>{/if}
</div>

<style>
  .mini { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; vertical-align: -4px; margin-right: 4px; }
  /* Karte nutzt die Höhe des Fensters, die Seitenspalten wachsen mit der Breite. Höhe der Bühne = Fenster minus Kopf und Tabs. */
  .gmmap { --stage-h: clamp(420px, calc(100dvh - 215px), 1800px); display: grid; grid-template-columns: clamp(280px, 17vw, 400px) minmax(0, 1fr); gap: 1rem; align-items: start; }
  .gmmap:has(.combatcol) { grid-template-columns: clamp(280px, 15vw, 380px) minmax(0, 1fr) clamp(340px, 22vw, 480px); }
  .gmmap.noleft { grid-template-columns: minmax(0, 1fr); }
  .gmmap.noleft:has(.combatcol) { grid-template-columns: minmax(0, 1fr) clamp(340px, 22vw, 480px); }
  .gmmap > aside { max-height: calc(100dvh - 96px); overflow-y: auto; position: sticky; top: 64px; padding-right: 2px; scrollbar-width: thin; }
  .combatcol { max-height: calc(100dvh - 96px); overflow-y: auto; position: sticky; top: 64px; padding-right: 2px; scrollbar-width: thin; }
  .enemy { padding: 0.6rem; background: var(--raised); border-left: 3px solid var(--danger); }
  .enemy h3 { margin: 0; }
  .list { list-style: none; margin: 0.6rem 0; padding: 0; display: grid; gap: 2px; }
  .list li { display: flex; align-items: center; }
  .list li.on { background: var(--accent-soft); border-left: 2px solid var(--accent); }
  .pick { flex: 1; display: flex; gap: 0.5rem; align-items: center; background: none; border: 0; color: var(--ink); font: inherit; text-align: left; cursor: pointer; padding: 0.45em 0.6em; }
  .npc { flex-wrap: wrap; }
  .npc input:first-child { flex: 1 1 100%; min-width: 0; }
  .color { width: 40px; min-height: 32px; padding: 2px; flex: none; }
  .tok { margin-top: 0.8rem; padding-top: 0.8rem; border-top: 1px solid var(--line); }
  .check { display: flex; gap: 0.4em; align-items: center; font-size: 0.9rem; }
  .stagewrap { display: grid; gap: 0.5rem; position: sticky; top: 64px; min-width: 0; }
  .toolbar { display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
  .stage { height: var(--stage-h); min-height: 360px; }
  .empty { min-height: 300px; display: grid; place-items: center; }
  input[type='range'] { padding: 0; min-height: 28px; }
  /* Schmaler als ~1300 px: Kampfleiste unter die Karte. */
  @media (max-width: 1300px) { .gmmap:has(.combatcol) { grid-template-columns: 300px minmax(0, 1fr); } .gmmap.noleft:has(.combatcol) { grid-template-columns: minmax(0, 1fr); } .combatcol { grid-column: 1 / -1; position: static; max-height: none; } }
  @media (max-width: 1000px) {
    .gmmap, .gmmap:has(.combatcol), .gmmap.noleft, .gmmap.noleft:has(.combatcol) { grid-template-columns: 1fr; }
    .gmmap > aside { position: static; max-height: none; }
    .stagewrap { position: static; order: -1; }
    .stage { height: min(72vh, 560px); }
  }
</style>
