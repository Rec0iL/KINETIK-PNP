<script lang="ts">
  // W6 als 3D-Würfel (CSS). Das Ergebnis steht fest, die Animation landet darauf.
  let { value, size = 72, delay = 0, animate = true }: { value: number; size?: number; delay?: number; animate?: boolean } = $props();

  const FACES: { cls: string; v: number }[] = [
    { cls: 'front', v: 1 }, { cls: 'back', v: 6 }, { cls: 'right', v: 3 }, { cls: 'left', v: 4 }, { cls: 'top', v: 2 }, { cls: 'bottom', v: 5 },
  ];
  const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  // Endlage: die Fläche mit dem Wurfergebnis liegt OBEN (Normale nach oben, wie bei einem Würfel auf dem Tisch).
  // Reihenfolge der Transformationen auf Punkte: erst Z, dann X, dann Y (Gierwinkel um die Hochachse).
  const END: Record<number, { x: number; z: number }> = {
    2: { x: 0, z: 0 },     // Oberseite liegt schon oben
    5: { x: 180, z: 0 },   // Unterseite nach oben
    1: { x: 90, z: 0 },    // Vorderseite nach oben
    6: { x: -90, z: 0 },   // Rückseite nach oben
    3: { x: 0, z: -90 },   // rechte Seite nach oben
    4: { x: 0, z: 90 },    // linke Seite nach oben
  };

  let cube = $state<HTMLElement>();
  let fly = $state<HTMLElement>();

  $effect(() => {
    if (!cube || !fly) return;
    const e = END[value] ?? END[2];
    const yaw = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 38);
    const rnd = (n: number) => (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * n)) * 360;
    const end = `rotateY(${yaw}deg) rotateX(${e.x}deg) rotateZ(${e.z}deg)`;
    if (!animate || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cube.style.transform = end;
      return;
    }
    const dir = Math.random() < 0.5 ? -1 : 1;
    const x0 = dir * (160 + Math.random() * 140);
    const dur = 1500 + Math.random() * 300;
    cube.animate(
      [
        { transform: `rotateY(${yaw + rnd(2)}deg) rotateX(${e.x + rnd(2)}deg) rotateZ(${e.z + rnd(1)}deg)` },
        { transform: end },
      ],
      { duration: dur, delay, easing: 'cubic-bezier(0.15, 0.7, 0.25, 1)', fill: 'both' },
    );
    fly.animate(
      [
        { transform: `translate(${x0}px, -260px) scale(1.7)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', offset: 0 },
        { transform: `translate(${x0 * 0.25}px, 0) scale(1)`, easing: 'cubic-bezier(0.1, 0.6, 0.4, 1)', offset: 0.34 },
        { transform: `translate(${x0 * 0.1}px, -64px) scale(1.12)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', offset: 0.5 },
        { transform: `translate(${x0 * 0.03}px, 0) scale(1)`, easing: 'cubic-bezier(0.1, 0.6, 0.4, 1)', offset: 0.64 },
        { transform: 'translate(0, -22px) scale(1.04)', easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', offset: 0.78 },
        { transform: 'translate(0, 0) scale(1)', offset: 1 },
      ],
      { duration: dur, delay, fill: 'both' },
    );
  });
</script>

<div class="scene" style:--s="{size}px" aria-label={`W6: ${value}`} role="img">
  <div class="fly" bind:this={fly}>
    <div class="tilt">
      <div class="cube" bind:this={cube}>
        {#each FACES as f}
          <div class="face {f.cls}">
            {#each Array(9) as _, i}<i class:on={PIPS[f.v].includes(i)}></i>{/each}
          </div>
        {/each}
      </div>
    </div>
    <div class="shadow"></div>
  </div>
</div>

<style>
  .scene { width: var(--s); height: var(--s); perspective: calc(var(--s) * 6); position: relative; }
  .fly { position: absolute; inset: 0; will-change: transform; }
  .tilt { position: absolute; inset: 0; transform-style: preserve-3d; transform: rotateX(-54deg); }
  .cube { position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform; }
  .face {
    position: absolute; inset: 0; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); padding: 14%;
    background: linear-gradient(145deg, color-mix(in srgb, var(--accent) 22%, #0c1016), #05070a);
    border: 2px solid var(--accent); border-radius: 14%; backface-visibility: hidden;
    box-shadow: inset 0 0 14px rgba(0, 0, 0, 0.7), 0 0 10px var(--accent-soft);
  }
  .face i { display: block; border-radius: 50%; margin: 14%; }
  .face i.on { background: var(--ink-strong); box-shadow: 0 0 8px var(--accent), inset 0 0 3px rgba(0, 0, 0, 0.4); }
  .front { transform: translateZ(calc(var(--s) / 2)); }
  .back { transform: rotateY(180deg) translateZ(calc(var(--s) / 2)); }
  .right { transform: rotateY(90deg) translateZ(calc(var(--s) / 2)); }
  .left { transform: rotateY(-90deg) translateZ(calc(var(--s) / 2)); }
  .top { transform: rotateX(90deg) translateZ(calc(var(--s) / 2)); }
  .bottom { transform: rotateX(-90deg) translateZ(calc(var(--s) / 2)); }
  .shadow { position: absolute; left: 10%; right: 10%; bottom: -14%; height: 14%; background: radial-gradient(ellipse, rgba(0, 0, 0, 0.55), transparent 70%); filter: blur(2px); }
</style>
