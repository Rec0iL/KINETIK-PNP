<script lang="ts">
  import { rules, type ZoneKey } from '../rules';
  import type { Injury } from '../model/character';

  let {
    injuries,
    selected = null,
    onbox,
    onzone,
  }: {
    injuries: Record<ZoneKey, Injury[]>;
    selected?: ZoneKey | null;
    onbox?: (zone: ZoneKey, index: number) => void;
    onzone?: (zone: ZoneKey) => void;
  } = $props();

  // Geometrie aus assets/grafiken/koerper-silhouette.svg (Regel 2.3).
  const zones: { key: ZoneKey; shape: { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number } | { t: 'path'; d: string }; boxes: [number, number][]; label: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; text: string }; lead?: [number, number, number, number] }[] = [
    { key: 'kopf', shape: { t: 'ellipse', cx: 200, cy: 104, rx: 40, ry: 48 }, boxes: [[186, 110], [203, 110]], label: { x: 200, y: 100, anchor: 'middle', text: 'KOPF' } },
    { key: 'torso', shape: { t: 'path', d: 'M160,162 L240,162 L251,232 L236,298 L164,298 L149,232 Z' }, boxes: [[176, 238], [194, 238], [212, 238]], label: { x: 200, y: 226, anchor: 'middle', text: 'TORSO' } },
    { key: 'armL', shape: { t: 'path', d: 'M151,167 L163,186 L130,308 L109,300 Z' }, boxes: [[62, 250], [79, 250]], label: { x: 94, y: 242, anchor: 'end', text: 'L-ARM' }, lead: [122, 246, 98, 246] },
    { key: 'armR', shape: { t: 'path', d: 'M249,167 L237,186 L270,308 L291,300 Z' }, boxes: [[309, 250], [326, 250]], label: { x: 306, y: 242, anchor: 'start', text: 'R-ARM' }, lead: [278, 246, 302, 246] },
    { key: 'beinL', shape: { t: 'path', d: 'M172,308 L197,308 L195,528 L166,528 L164,322 Z' }, boxes: [[104, 424], [121, 424]], label: { x: 136, y: 416, anchor: 'end', text: 'L-BEIN' }, lead: [164, 420, 140, 420] },
    { key: 'beinR', shape: { t: 'path', d: 'M203,308 L228,308 L236,322 L234,528 L205,528 Z' }, boxes: [[267, 424], [284, 424]], label: { x: 264, y: 416, anchor: 'start', text: 'R-BEIN' }, lead: [236, 420, 260, 420] },
  ];

  const status = (z: ZoneKey) => {
    const def = rules.tabellen.zonen.find((x) => x.key === z)!;
    const n = injuries[z].length;
    return n >= def.felder ? def.folge : 'ok';
  };
</script>

<svg viewBox="0 0 400 610" role="group" aria-label="Körpersilhouette mit sechs Trefferzonen">
  <rect width="400" height="610" rx="14" class="bg" />
  <circle cx="200" cy="310" r="172" class="ring" />
  <text class="title" x="22" y="34">KÖRPER &amp; VERLETZUNGEN</text>

  {#each zones as z}
    {@const st = status(z.key)}
    <g class="zonegroup" class:sel={selected === z.key} class:bad={st !== 'ok'} class:dead={st === 'sterbend'}>
      {#if z.shape.t === 'ellipse'}
        <ellipse class="zone" cx={z.shape.cx} cy={z.shape.cy} rx={z.shape.rx} ry={z.shape.ry} role="button" tabindex="0" aria-label={z.label.text}
          onclick={() => onzone?.(z.key)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onzone?.(z.key)} />
      {:else}
        <path class="zone" d={z.shape.d} role="button" tabindex="0" aria-label={z.label.text}
          onclick={() => onzone?.(z.key)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onzone?.(z.key)} />
      {/if}
      {#if z.key === 'torso'}<path class="inner" d="M171,175 L229,175 L238,232 L226,285 L174,285 L162,232 Z" />{/if}
      {#if z.lead}<line class="lead" x1={z.lead[0]} y1={z.lead[1]} x2={z.lead[2]} y2={z.lead[3]} />{/if}
      <text class="label" x={z.label.x} y={z.label.y} text-anchor={z.label.anchor}>{z.label.text}</text>
      {#each z.boxes as [x, y], i}
        <rect
          class="box" class:hit={i < injuries[z.key].length} {x} {y} width="12" height="12" rx="2"
          role="button" tabindex="0" aria-label={`${z.label.text} Verletzung ${i + 1}`} aria-pressed={i < injuries[z.key].length}
          onclick={() => onbox?.(z.key, i)} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onbox?.(z.key, i)}
        />
      {/each}
    </g>
  {/each}

  <rect class="box" x="22" y="556" width="10" height="10" rx="2" />
  <text class="note" x="38" y="565">= 1 Verletzung (kostet sofort 1 Willenskraft)</text>
  <text class="note" x="22" y="584">Arm/Bein: 2. Verletzung = unbrauchbar</text>
  <text class="note" x="22" y="600">Kopf: 2. Verletzung · Torso: 3. Verletzung = sterbend</text>
</svg>

<style>
  svg { width: 100%; max-width: 420px; height: auto; display: block; }
  .bg { fill: var(--term-bg); }
  .ring { fill: none; stroke: color-mix(in srgb, var(--term-line) 18%, transparent); stroke-width: 1.5; }
  .zone { fill: var(--term-fill); stroke: var(--term-line); stroke-width: 3; stroke-linejoin: round; cursor: pointer; transition: fill 0.2s, filter 0.2s; }
  .zonegroup:hover .zone { filter: brightness(1.4); }
  .sel .zone { stroke: var(--accent-2); filter: drop-shadow(0 0 6px var(--accent-2)); }
  .bad .zone { fill: color-mix(in srgb, var(--accent-2) 22%, var(--term-bg)); stroke: var(--accent-2); }
  .dead .zone { fill: color-mix(in srgb, var(--danger) 30%, var(--term-bg)); stroke: var(--danger); animation: throb 1.2s infinite alternate; }
  @keyframes throb { to { filter: brightness(1.6); } }
  .inner { fill: none; stroke: var(--term-dim); stroke-width: 1.2; stroke-dasharray: 4 4; opacity: 0.7; pointer-events: none; }
  .box { fill: var(--term-bg); stroke: var(--term-line); stroke-width: 1.6; cursor: pointer; transition: fill 0.15s; }
  .box:hover { stroke: var(--accent-2); stroke-width: 2.4; }
  .box.hit { fill: var(--danger); stroke: var(--danger); filter: drop-shadow(0 0 4px var(--danger)); }
  .label { font: 700 13px var(--font-mono); fill: var(--term-fg); letter-spacing: 0.5px; pointer-events: none; }
  .title { font: 700 12px var(--font-mono); fill: var(--term-line); letter-spacing: 2px; }
  .note { font: 10.5px var(--font-mono); fill: var(--term-dim); }
  .lead { stroke: var(--term-lead); stroke-width: 1.2; }
</style>
