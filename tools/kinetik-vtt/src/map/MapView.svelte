<script lang="ts">
  import { untrack } from 'svelte';
  import { assets, assetUrl, requestAsset } from '../net/assets.svelte';
  import { pings } from './pings.svelte';
  import { measure, snapToGrid, type FogOp, type FogShape, type MapOp, type MapState, type Token } from './mapstate';

  export type Tool = 'move' | 'reveal-rect' | 'reveal-brush' | 'reveal-poly' | 'hide-rect' | 'hide-brush' | 'ping' | 'measure';

  let {
    map,
    role,
    myPlayerId = '',
    tool = 'move',
    brush = 80,
    snap = true,
    pingColor = '#ffb800',
    selected = $bindable(null),
    onops,
  }: {
    map: MapState;
    role: 'gm' | 'player';
    myPlayerId?: string;
    tool?: Tool;
    brush?: number;
    snap?: boolean;
    pingColor?: string;
    selected?: string | null;
    onops: (ops: MapOp[]) => void;
  } = $props();

  let wrap = $state<HTMLDivElement>();
  let canvas = $state<HTMLCanvasElement>();
  let img: HTMLImageElement | null = null;
  let imgHash = '';
  let loadError = $state('');
  const view = { scale: 1, tx: 0, ty: 0 };
  let cw = 0;
  let ch = 0;
  let raf = 0;
  let fogCanvas: HTMLCanvasElement | null = null;
  let fogKey = '';
  const tokenImgs = new Map<string, HTMLImageElement>();

  // Interaktionszustand
  const pointers = new Map<number, { x: number; y: number }>();
  let drag: null | {
    kind: 'pan' | 'token' | 'rect' | 'stroke' | 'poly' | 'measure';
    startX: number; startY: number; startTx: number; startTy: number;
    tokenId?: string; offX?: number; offY?: number;
    pts?: [number, number][];
    cur?: [number, number];
    moved: boolean;
  } = null;
  let pinch: null | { dist: number; scale: number; cx: number; cy: number } = null;
  let polyPts: [number, number][] = [];
  let hover: [number, number] | null = null;
  let lastEmit = 0;

  // ---------- Koordinaten ----------
  const toImg = (clientX: number, clientY: number): [number, number] => {
    const r = canvas!.getBoundingClientRect();
    return [(clientX - r.left - view.tx) / view.scale, (clientY - r.top - view.ty) / view.scale];
  };

  export function fit() {
    if (!cw || !ch) return;
    const s = Math.min(cw / map.width, ch / map.height) * 0.98;
    view.scale = s;
    view.tx = (cw - map.width * s) / 2;
    view.ty = (ch - map.height * s) / 2;
    schedule();
  }

  export function focusOn(x: number, y: number) {
    view.tx = cw / 2 - x * view.scale;
    view.ty = ch / 2 - y * view.scale;
    schedule();
  }

  // ---------- Bild ----------
  $effect(() => {
    const hash = map.asset;
    untrack(() => {
      if (!hash) { img = null; imgHash = ''; schedule(); return; }
      if (hash === imgHash && img) return;
      imgHash = hash;
      loadError = '';
      requestAsset(hash)
        .then(() => assetUrl(hash))
        .then((url) => {
          if (!url || hash !== map.asset) return;
          const el = new Image();
          el.onload = () => { img = el; schedule(); };
          el.onerror = () => { loadError = 'Das Kartenbild konnte nicht geladen werden.'; schedule(); };
          el.src = url;
        })
        .catch((e) => { loadError = (e as Error).message; schedule(); });
    });
  });

  let fittedFor = '';
  $effect(() => {
    const id = map.id;
    if (fittedFor !== id && cw) { fittedFor = id; fit(); }
  });

  function tokenImage(src: string): HTMLImageElement | null {
    let el = tokenImgs.get(src);
    if (!el) {
      el = new Image();
      el.onload = () => schedule();
      el.src = src;
      tokenImgs.set(src, el);
    }
    return el.complete && el.naturalWidth ? el : null;
  }

  // ---------- Zeichnen ----------
  function schedule() {
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; draw(); });
  }

  $effect(() => {
    map.rev;
    map.grid.show; map.grid.size; map.grid.ox; map.grid.oy; map.grid.color; map.grid.opacity;
    map.fog.enabled;
    pings.list.length;
    assets.progress[map.asset ?? ''];
    tool; role;
    untrack(schedule);
  });

  function drawShape(g: CanvasRenderingContext2D, s: FogShape) {
    g.beginPath();
    if (s.t === 'rect') g.rect(s.x, s.y, s.w, s.h);
    else if (s.t === 'circle') g.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    else if (s.t === 'poly') { s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
    else {
      if (s.pts.length === 1) { g.arc(s.pts[0][0], s.pts[0][1], s.r, 0, Math.PI * 2); g.fill(); return; }
      s.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.lineWidth = s.r * 2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.stroke();
      return;
    }
    g.fill();
  }

  function renderFog(): HTMLCanvasElement {
    const key = `${map.id}:${map.rev}:${map.width}`;
    if (fogCanvas && key === fogKey) return fogCanvas;
    const k = Math.min(1, 2048 / Math.max(map.width, map.height));
    const c = fogCanvas ?? document.createElement('canvas');
    c.width = Math.max(1, Math.round(map.width * k));
    c.height = Math.max(1, Math.round(map.height * k));
    const g = c.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, c.width, c.height);
    g.setTransform(k, 0, 0, k, 0, 0);
    for (const op of map.fog.ops) {
      g.globalCompositeOperation = op.m === 'reveal' ? 'destination-out' : 'source-over';
      g.fillStyle = '#05070a';
      g.strokeStyle = '#05070a';
      drawShape(g, op.s);
    }
    g.globalCompositeOperation = 'source-over';
    fogCanvas = c;
    fogKey = key;
    return c;
  }

  function draw() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const g = canvas.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.setTransform(dpr * view.scale, 0, 0, dpr * view.scale, dpr * view.tx, dpr * view.ty);

    // Karte
    if (img) {
      g.drawImage(img, 0, 0, map.width, map.height);
    } else {
      g.fillStyle = '#10141a';
      g.fillRect(0, 0, map.width, map.height);
      g.fillStyle = '#8f9aab';
      g.font = `${Math.max(16, map.width / 40)}px Barlow, sans-serif`;
      g.textAlign = 'center';
      const p = map.asset ? assets.progress[map.asset] : undefined;
      const msg = loadError || (map.asset ? (p ? `Karte wird übertragen … ${Math.round((p.loaded / Math.max(1, p.total)) * 100)} %` : 'Karte wird geladen …') : 'Keine Karte');
      g.fillText(msg, map.width / 2, map.height / 2);
    }
    g.strokeStyle = 'rgba(255,255,255,0.15)';
    g.lineWidth = 2 / view.scale;
    g.strokeRect(0, 0, map.width, map.height);

    // Raster
    const gr = map.grid;
    if (gr.show && gr.size > 4) {
      g.beginPath();
      const x0 = ((gr.ox % gr.size) + gr.size) % gr.size;
      const y0 = ((gr.oy % gr.size) + gr.size) % gr.size;
      for (let x = x0; x <= map.width; x += gr.size) { g.moveTo(x, 0); g.lineTo(x, map.height); }
      for (let y = y0; y <= map.height; y += gr.size) { g.moveTo(0, y); g.lineTo(map.width, y); }
      g.globalAlpha = gr.opacity;
      g.strokeStyle = gr.color;
      g.lineWidth = Math.max(1, 1.2 / view.scale);
      g.stroke();
      g.globalAlpha = 1;
    }

    // Tokens
    for (const t of map.tokens) drawToken(g, t);

    // Nebel
    if (map.fog.enabled) {
      g.globalAlpha = role === 'gm' ? 0.58 : 1;
      g.drawImage(renderFog(), 0, 0, map.width, map.height);
      g.globalAlpha = 1;
    }

    // Vorschau der aktuellen Geste
    if (drag?.kind === 'rect' && drag.cur) {
      const [x0, y0] = [drag.startX, drag.startY];
      const [x1, y1] = drag.cur;
      g.fillStyle = tool.startsWith('reveal') ? 'rgba(0,229,255,0.2)' : 'rgba(255,77,109,0.25)';
      g.strokeStyle = tool.startsWith('reveal') ? '#00e5ff' : '#ff4d6d';
      g.lineWidth = 2 / view.scale;
      g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      g.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
    }
    if (drag?.kind === 'stroke' && drag.pts) {
      g.strokeStyle = tool.startsWith('reveal') ? 'rgba(0,229,255,0.35)' : 'rgba(255,77,109,0.4)';
      g.lineWidth = brush * 2;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      drag.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (drag.pts.length === 1) g.lineTo(drag.pts[0][0] + 0.01, drag.pts[0][1]);
      g.stroke();
    }
    if (tool === 'reveal-poly' && polyPts.length) {
      g.strokeStyle = '#00e5ff';
      g.fillStyle = 'rgba(0,229,255,0.18)';
      g.lineWidth = 2 / view.scale;
      g.beginPath();
      polyPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (hover) g.lineTo(hover[0], hover[1]);
      g.closePath();
      g.fill();
      g.stroke();
      for (const [x, y] of polyPts) { g.beginPath(); g.arc(x, y, 5 / view.scale, 0, Math.PI * 2); g.fillStyle = '#00e5ff'; g.fill(); }
    }
    if (drag?.kind === 'measure' && drag.cur) {
      const a: [number, number] = [drag.startX, drag.startY];
      const b = drag.cur;
      g.strokeStyle = '#ffb800';
      g.lineWidth = 3 / view.scale;
      g.setLineDash([10 / view.scale, 8 / view.scale]);
      g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.stroke();
      g.setLineDash([]);
      const m = measure(gr, a, b);
      const label = `${m.cells.toFixed(1).replace('.0', '')} Felder · ${m.units.toFixed(1).replace('.0', '')} ${gr.unit}`;
      g.font = `600 ${15 / view.scale}px Barlow, sans-serif`;
      const w = g.measureText(label).width + 14 / view.scale;
      g.fillStyle = 'rgba(5,8,12,0.88)';
      g.fillRect((a[0] + b[0]) / 2 - w / 2, (a[1] + b[1]) / 2 - 24 / view.scale, w, 24 / view.scale);
      g.fillStyle = '#ffb800';
      g.textAlign = 'center';
      g.fillText(label, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 7 / view.scale);
    }

    // Pings
    const now = performance.now();
    let animating = false;
    for (const p of pings.list) {
      const age = (now - p.ts) / 3000;
      if (age > 1) continue;
      animating = true;
      for (let k = 0; k < 3; k++) {
        const phase = (age * 2 + k / 3) % 1;
        g.beginPath();
        g.arc(p.x, p.y, (20 + phase * 70) / view.scale, 0, Math.PI * 2);
        g.strokeStyle = p.color;
        g.globalAlpha = (1 - phase) * (1 - age);
        g.lineWidth = 4 / view.scale;
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = p.color;
      g.beginPath(); g.arc(p.x, p.y, 6 / view.scale, 0, Math.PI * 2); g.fill();
      g.font = `700 ${14 / view.scale}px Barlow, sans-serif`;
      g.textAlign = 'center';
      g.fillStyle = '#fff';
      g.fillText(p.who, p.x, p.y - 28 / view.scale);
    }
    if (animating) schedule();
  }

  function drawToken(g: CanvasRenderingContext2D, t: Token) {
    const r = (t.size * map.grid.size * 0.92) / 2;
    g.save();
    if (t.hidden) g.globalAlpha = 0.5;
    g.beginPath();
    g.arc(t.x, t.y, r, 0, Math.PI * 2);
    g.fillStyle = 'rgba(8,10,14,0.85)';
    g.fill();
    const im = t.img ? tokenImage(t.img) : null;
    if (im) {
      g.save();
      g.clip();
      const s = Math.max((r * 2) / im.naturalWidth, (r * 2) / im.naturalHeight);
      g.drawImage(im, t.x - (im.naturalWidth * s) / 2, t.y - (im.naturalHeight * s) / 2 - r * 0.1, im.naturalWidth * s, im.naturalHeight * s);
      g.restore();
    } else {
      g.fillStyle = t.color;
      g.font = `700 ${r * 1.1}px Oswald, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText((t.name[0] ?? '?').toUpperCase(), t.x, t.y + r * 0.05);
      g.textBaseline = 'alphabetic';
    }
    g.beginPath();
    g.arc(t.x, t.y, r, 0, Math.PI * 2);
    g.lineWidth = Math.max(3, r * 0.1);
    g.strokeStyle = t.color;
    if (t.hidden) g.setLineDash([r * 0.3, r * 0.2]);
    g.stroke();
    g.setLineDash([]);
    if (selected === t.id) {
      g.beginPath();
      g.arc(t.x, t.y, r + Math.max(5, r * 0.12), 0, Math.PI * 2);
      g.strokeStyle = '#ffffff';
      g.lineWidth = Math.max(2, r * 0.06);
      g.stroke();
    }
    // Beschriftung
    const fs = Math.max(11 / view.scale, r * 0.32);
    g.font = `600 ${fs}px Barlow, sans-serif`;
    g.textAlign = 'center';
    const label = t.name + (t.note ? ` · ${t.note}` : '');
    const w = g.measureText(label).width + fs * 0.8;
    g.fillStyle = 'rgba(5,8,12,0.78)';
    g.fillRect(t.x - w / 2, t.y + r + fs * 0.15, w, fs * 1.35);
    g.fillStyle = '#e6eaf0';
    g.fillText(label, t.x, t.y + r + fs * 1.1);
    g.restore();
  }

  // ---------- Größe ----------
  $effect(() => {
    if (!wrap || !canvas) return;
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const r = wrap!.getBoundingClientRect();
      const first = !cw;
      cw = Math.max(1, Math.floor(r.width));
      ch = Math.max(1, Math.floor(r.height));
      canvas!.width = Math.round(cw * dpr);
      canvas!.height = Math.round(ch * dpr);
      if (first) { fittedFor = map.id; fit(); } else schedule();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  });

  // ---------- Interaktion ----------
  function hitToken(x: number, y: number): Token | undefined {
    for (let i = map.tokens.length - 1; i >= 0; i--) {
      const t = map.tokens[i];
      const r = (t.size * map.grid.size * 0.92) / 2;
      if (Math.hypot(x - t.x, y - t.y) <= r) return t;
    }
  }
  const canMove = (t: Token) => role === 'gm' || (!!myPlayerId && t.playerId === myPlayerId);

  function onDown(e: PointerEvent) {
    canvas!.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
      drag = null;
      return;
    }
    const [x, y] = toImg(e.clientX, e.clientY);
    const panAlways = e.button === 1 || e.button === 2 || e.shiftKey;
    const base = { startX: x, startY: y, startTx: view.tx, startTy: view.ty, moved: false };

    if (panAlways) { drag = { ...base, kind: 'pan', startX: e.clientX, startY: e.clientY }; return; }

    switch (tool) {
      case 'move': {
        const t = hitToken(x, y);
        if (t) {
          selected = t.id;
          if (canMove(t)) { drag = { ...base, kind: 'token', tokenId: t.id, offX: x - t.x, offY: y - t.y }; schedule(); return; }
          schedule();
        }
        drag = { ...base, kind: 'pan', startX: e.clientX, startY: e.clientY };
        return;
      }
      case 'ping':
        doPing(x, y);
        return;
      case 'measure':
        drag = { ...base, kind: 'measure', cur: [x, y] };
        return;
      case 'reveal-rect':
      case 'hide-rect':
        if (role === 'gm') drag = { ...base, kind: 'rect', cur: [x, y] };
        return;
      case 'reveal-brush':
      case 'hide-brush':
        if (role === 'gm') { drag = { ...base, kind: 'stroke', pts: [[x, y]] }; schedule(); }
        return;
      case 'reveal-poly':
        if (role === 'gm') {
          const first = polyPts[0];
          if (first && polyPts.length > 2 && Math.hypot(x - first[0], y - first[1]) < 14 / view.scale) finishPoly();
          else polyPts.push([x, y]);
          schedule();
        }
        return;
    }
  }

  function onMove(e: PointerEvent) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt(pinch.cx, pinch.cy, (pinch.scale * d) / pinch.dist, true);
      return;
    }
    const [x, y] = toImg(e.clientX, e.clientY);
    if (tool === 'reveal-poly') { hover = [x, y]; if (polyPts.length) schedule(); }
    if (!drag) return;
    const dx = e.clientX - (drag.kind === 'pan' ? drag.startX : 0);
    if (drag.kind === 'pan') {
      view.tx = drag.startTx + dx;
      view.ty = drag.startTy + (e.clientY - drag.startY);
      drag.moved = true;
    } else if (drag.kind === 'token') {
      const t = map.tokens.find((k) => k.id === drag!.tokenId);
      if (!t) return;
      const nx = x - (drag.offX ?? 0);
      const ny = y - (drag.offY ?? 0);
      drag.moved = true;
      const now = performance.now();
      if (now - lastEmit > 60) { lastEmit = now; onops([{ op: 'tokmove', id: t.id, x: nx, y: ny }]); }
      else { t.x = nx; t.y = ny; }
    } else if (drag.kind === 'stroke' && drag.pts) {
      const last = drag.pts[drag.pts.length - 1];
      if (Math.hypot(x - last[0], y - last[1]) > Math.max(4, brush / 6)) drag.pts.push([x, y]);
    } else {
      drag.cur = [x, y];
    }
    schedule();
  }

  function onUp(e: PointerEvent) {
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) pinch = null; return; }
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.kind === 'token') {
      const t = map.tokens.find((k) => k.id === d.tokenId);
      if (t && d.moved) {
        let [nx, ny] = [t.x, t.y];
        if (snap && map.grid.show) [nx, ny] = snapToGrid(map.grid, nx, ny, Math.round(t.size));
        onops([{ op: 'tokmove', id: t.id, x: nx, y: ny }]);
      }
    } else if (d.kind === 'rect' && d.cur) {
      const w = Math.abs(d.cur[0] - d.startX);
      const h = Math.abs(d.cur[1] - d.startY);
      if (w > 4 && h > 4) emitFog({ t: 'rect', x: Math.min(d.startX, d.cur[0]), y: Math.min(d.startY, d.cur[1]), w, h });
    } else if (d.kind === 'stroke' && d.pts) {
      emitFog({ t: 'stroke', pts: d.pts.map(([px, py]) => [Math.round(px), Math.round(py)] as [number, number]), r: brush });
    }
    schedule();
  }

  function emitFog(s: FogShape) {
    const m: FogOp['m'] = tool.startsWith('reveal') ? 'reveal' : 'hide';
    onops([{ op: 'fog+', fog: { m, s } }]);
  }

  function finishPoly() {
    if (polyPts.length > 2) onops([{ op: 'fog+', fog: { m: 'reveal', s: { t: 'poly', pts: polyPts.map(([x, y]) => [Math.round(x), Math.round(y)] as [number, number]) } } }]);
    polyPts = [];
    schedule();
  }

  function doPing(x: number, y: number) {
    onops([{ op: 'ping', x, y, who: '', color: pingColor }]);
  }

  function zoomAt(cx: number, cy: number, next: number, client = false) {
    const r = canvas!.getBoundingClientRect();
    const px = client ? cx - r.left : cx;
    const py = client ? cy - r.top : cy;
    const s = Math.max(0.05, Math.min(8, next));
    const ix = (px - view.tx) / view.scale;
    const iy = (py - view.ty) / view.scale;
    view.scale = s;
    view.tx = px - ix * s;
    view.ty = py - iy * s;
    schedule();
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    zoomAt(e.clientX, e.clientY, view.scale * Math.exp(-e.deltaY * 0.0015), true);
  }

  function onDbl(e: MouseEvent) {
    const [x, y] = toImg(e.clientX, e.clientY);
    if (tool === 'reveal-poly') { finishPoly(); return; }
    if (tool === 'move' && !hitToken(x, y)) doPing(x, y);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && polyPts.length) finishPoly();
    if (e.key === 'Escape') { polyPts = []; drag = null; schedule(); }
    if (e.key === '+' || e.key === '=') zoomAt(cw / 2, ch / 2, view.scale * 1.2);
    if (e.key === '-') zoomAt(cw / 2, ch / 2, view.scale / 1.2);
    if (e.key === '0') fit();
  }

  $effect(() => { tool; untrack(() => { polyPts = []; schedule(); }); });

  const cursor = $derived(
    tool === 'move' ? 'grab' : tool === 'ping' ? 'crosshair' : tool === 'measure' ? 'crosshair' : tool.includes('brush') ? 'cell' : 'crosshair',
  );
</script>

<div class="mapwrap" bind:this={wrap}>
  <canvas
    bind:this={canvas}
    style:cursor={cursor}
    tabindex="0"
    aria-label="Karte"
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
    onwheel={onWheel}
    ondblclick={onDbl}
    oncontextmenu={(e) => e.preventDefault()}
    onkeydown={onKey}
  ></canvas>
  {#if map.asset && assets.progress[map.asset]}
    <div class="prog"><i style:width="{(assets.progress[map.asset].loaded / Math.max(1, assets.progress[map.asset].total)) * 100}%"></i></div>
  {/if}
</div>

<style>
  .mapwrap { position: relative; width: 100%; height: 100%; min-height: 320px; background: #05070a; overflow: hidden; border: 1px solid var(--line-strong); }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; outline: none; }
  canvas:focus-visible { box-shadow: inset 0 0 0 2px var(--accent); }
  .prog { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(0, 0, 0, 0.6); }
  .prog i { display: block; height: 100%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
</style>
