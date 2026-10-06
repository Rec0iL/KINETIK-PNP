<script lang="ts">
  // Regen als Partikelsystem auf zwei Canvas: dahinter (drei Tiefenebenen) und davor (wenige lange, schnelle Tropfen).
  // Alle Tropfen sind zufällig verteilt und werden beim Verlassen des Bildes mit neuen Werten wieder oben eingesetzt,
  // der Wind schwankt böig. Dadurch gibt es weder Muster noch eine Schleifennaht.
  import { theme, type ThemeKey } from '../lib/theme.svelte';

  interface Layer { per: number; len: [number, number]; speed: [number, number]; width: number; alpha: number }
  interface Look { color: string; slant: number; gust: number; back: Layer[]; front: Layer }
  // per = Tropfen je 100 000 px² Fläche
  const LOOKS: Partial<Record<ThemeKey, Look>> = {
    noir: {
      color: '150, 220, 255', slant: 11, gust: 0.35,
      back: [
        { per: 13, len: [10, 22], speed: [650, 850], width: 0.8, alpha: 0.22 },
        { per: 7.5, len: [20, 38], speed: [950, 1250], width: 1, alpha: 0.3 },
        { per: 3, len: [38, 66], speed: [1400, 1800], width: 1.4, alpha: 0.34 },
      ],
      front: { per: 0.5, len: [90, 150], speed: [2200, 2900], width: 1.5, alpha: 0.12 },
    },
    sincity: {
      color: '255, 255, 255', slant: 16, gust: 0.5,
      back: [
        { per: 7, len: [14, 30], speed: [800, 1000], width: 1.1, alpha: 0.28 },
        { per: 4.2, len: [30, 56], speed: [1200, 1600], width: 1.7, alpha: 0.42 },
        { per: 1.8, len: [60, 110], speed: [1800, 2400], width: 2.5, alpha: 0.6 },
      ],
      front: { per: 0.45, len: [140, 230], speed: [2800, 3600], width: 2.8, alpha: 0.16 },
    },
  };

  const look = $derived(LOOKS[theme.current]);
  let back = $state<HTMLCanvasElement>();
  let front = $state<HTMLCanvasElement>();

  interface Drop { x: number; y: number; len: number; speed: number; a: number }
  const rnd = (r: [number, number]) => r[0] + Math.random() * (r[1] - r[0]);

  function run(l: Look, cb: HTMLCanvasElement, cf: HTMLCanvasElement) {
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bctx = cb.getContext('2d')!, fctx = cf.getContext('2d')!;
    let W = 0, H = 0, dpr = 1;
    let layers: { cfg: Layer; drops: Drop[] }[] = [];
    let raf = 0, last = 0, t = 0;
    // Anpassung an schwache Geräte: Bildzeit beobachten, bei Bedarf Vordergrund und Tropfen reduzieren, zuletzt auf 30 fps drosseln
    let level = 0, ema = 0.016, frames = 0, skip = false;

    // Tropfen starten über das ganze Bild verteilt, später oben mit leichtem Zufallsversatz
    const spawn = (cfg: Layer, scatter: boolean): Drop => ({
      x: Math.random() * (W + H * 0.5) - H * 0.1,
      y: scatter ? Math.random() * (H + 200) - 100 : -Math.random() * H * 0.35 - 80,
      len: rnd(cfg.len), speed: rnd(cfg.speed), a: 0.55 + Math.random() * 0.6,
    });

    function resize() {
      dpr = 1;   // Regen ist weich genug, 1x spart auf hochauflösenden Bildschirmen Fläche
      W = innerWidth; H = innerHeight;
      for (const c of [cb, cf]) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0); fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = (W * H) / 100000;
      layers = [...l.back, l.front].map((cfg) => ({ cfg, drops: Array.from({ length: Math.max(3, Math.round(cfg.per * area)) }, () => spawn(cfg, true)) }));
    }

    function draw(ctx: CanvasRenderingContext2D, ls: typeof layers, dx: number, dy: number) {
      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      for (const { cfg, drops } of ls) {
        ctx.lineWidth = cfg.width;
        // je Ebene drei Helligkeitsstufen in einem Pfad pro Stufe (wenige Zeichenaufrufe)
        for (const [lo, hi] of [[0, 0.8], [0.8, 1.05], [1.05, 2]]) {
          ctx.beginPath();
          for (const d of drops) {
            if (d.a < lo || d.a >= hi) continue;
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x - dx * d.len, d.y - dy * d.len);
          }
          ctx.strokeStyle = `rgba(${l.color}, ${(cfg.alpha * (lo + hi > 2 ? 1.1 : lo === 0 ? 0.6 : 0.85)).toFixed(3)})`;
          ctx.stroke();
        }
      }
    }

    function degrade() {
      level++;
      if (level === 1) {
        cf.style.display = 'none';
        layers = layers.slice(0, -1).map((l2) => ({ cfg: l2.cfg, drops: l2.drops.slice(0, Math.ceil(l2.drops.length * 0.6)) }));
        layers.push({ cfg: l.front, drops: [] });   // leere Vordergrundebene, damit die Aufteilung gleich bleibt
      }
      frames = 0; ema = 0.016;
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      const raw = (now - last) / 1000;
      if (level >= 2) { skip = !skip; if (skip) return; }   // 30 fps
      const dt = Math.min(raw, 0.05);
      last = now; t += dt;
      ema += (Math.min(raw, 0.2) - ema) * 0.08;
      if (++frames > 90 && level < 2 && ema > (level === 0 ? 0.026 : 0.045)) degrade();
      // böiger Wind: überlagerte Schwingungen mit unregelmäßigem Verhältnis, nie exakt periodisch
      const gust = 1 + l.gust * (0.5 * Math.sin(t * 0.37) + 0.3 * Math.sin(t * 0.91 + 1.7) + 0.2 * Math.sin(t * 2.3 + 0.6));
      const ang = (l.slant * gust * Math.PI) / 180;
      const dx = -Math.sin(ang), dy = Math.cos(ang);
      const sp = 1 + 0.07 * Math.sin(t * 0.6 + 2);
      for (const { cfg, drops } of layers) {
        for (let i = 0; i < drops.length; i++) {
          const d = drops[i];
          d.x += dx * d.speed * sp * dt; d.y += dy * d.speed * sp * dt;
          if (d.y - d.len > H || d.x < -d.len - 20) drops[i] = spawn(cfg, false);
        }
      }
      draw(bctx, layers.slice(0, -1), dx, dy);
      draw(fctx, layers.slice(-1), dx, dy);
    }

    resize();
    addEventListener('resize', resize);
    if (still) {   // wer weniger Bewegung wünscht, bekommt ein ruhendes Bild
      const ang = (l.slant * Math.PI) / 180;
      draw(bctx, layers.slice(0, -1), -Math.sin(ang), Math.cos(ang)); draw(fctx, layers.slice(-1), -Math.sin(ang), Math.cos(ang));
    } else {
      last = performance.now(); raf = requestAnimationFrame(frame);
    }
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }

  $effect(() => {
    if (!look || !back || !front) return;
    return run(look, back, front);
  });
</script>

{#if look}
  <canvas class="rain back" bind:this={back} aria-hidden="true"></canvas>
  <canvas class="rain front" bind:this={front} aria-hidden="true"></canvas>
{/if}

<style>
  .rain { position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; }
  .back { z-index: -1; }
  .front { z-index: 9990; }
</style>
