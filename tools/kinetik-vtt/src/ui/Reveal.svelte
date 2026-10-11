<script lang="ts">
  // Kontaktangabe, die erst nach einem Klick sichtbar wird: schützt E-Mail und Telefon vor Scrapern, bleibt für Menschen mit einem Klick erreichbar.
  import { reveal } from '../lib/legal';

  let { value, kind = 'mail' }: { value: string; kind?: 'mail' | 'tel' } = $props();
  let shown = $state(false);
  const text = $derived(shown ? reveal(value) : '');
  const label = $derived(kind === 'mail' ? 'E-Mail-Adresse anzeigen' : 'Telefonnummer anzeigen');
</script>

{#if shown}
  <a href={`${kind === 'mail' ? 'mailto' : 'tel'}:${text.replace(/\s+/g, '')}`}>{text}</a>
{:else}
  <button type="button" class="btn" onclick={() => (shown = true)}>{label}</button>
{/if}
