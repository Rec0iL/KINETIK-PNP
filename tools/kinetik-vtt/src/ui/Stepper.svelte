<script lang="ts">
  let {
    value = $bindable(0),
    min = -99,
    max = 99,
    step = 1,
    label = '',
    warn = false,
    disabled = false,
    onchange,
  }: { value: number; min?: number; max?: number; step?: number; label?: string; warn?: boolean; disabled?: boolean; onchange?: (v: number) => void } = $props();

  function set(v: number) {
    const n = Math.max(min, Math.min(max, Math.round(v)));
    if (n !== value) {
      value = n;
      onchange?.(n);
    }
  }
</script>

<div class="stepper" class:warn role="group" aria-label={label || undefined}>
  <button type="button" class="btn sm icon" onclick={() => set(value - step)} disabled={disabled || value <= min} aria-label="Verringern">−</button>
  <input
    type="number" {min} {max} {step} aria-label={label || 'Wert'}
    value={value}
    {disabled}
    onchange={(e) => set(Number(e.currentTarget.value))}
  />
  <button type="button" class="btn sm icon" onclick={() => set(value + step)} disabled={disabled || value >= max} aria-label="Erhöhen">+</button>
</div>

<style>
  .stepper { display: inline-flex; align-items: stretch; gap: 3px; max-width: 100%; }
  /* Die Themes geben Schaltflächen eigene Ränder und Innenabstände (Pixelrahmen, Schrägen): hier bleiben sie kompakt, damit die Zeile in schmale Karten passt */
  .stepper :global(.btn) { padding-inline: 0.5em !important; margin: 2px !important; min-width: 28px !important; }
  .stepper input { width: min(3.4em, 3.1rem) !important; margin: 2px !important; min-width: 0; flex: 0 1 auto; min-height: 30px; padding: 0.2em; text-align: center; -moz-appearance: textfield; appearance: textfield; }
  .stepper input::-webkit-outer-spin-button, .stepper input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  .warn input { border-color: var(--warn); color: var(--warn); }
</style>
