<script lang="ts">
  // Kontaktangabe, die erst nach einem Klick sichtbar wird: schützt E-Mail und Telefon vor Scrapern, bleibt für Menschen mit einem Klick erreichbar.
  import { reveal } from '../lib/legal';
  import { t } from '../i18n';

  let { value, kind = 'mail' }: { value: string; kind?: 'mail' | 'tel' } = $props();
  let shown = $state(false);
  const text = $derived(shown ? reveal(value) : '');
  const label = $derived(kind === 'mail' ? t('ui.reveal.mail') : t('ui.reveal.tel'));
</script>

{#if shown}
  <a href={`${kind === 'mail' ? 'mailto' : 'tel'}:${text.replace(/\s+/g, '')}`}>{text}</a>
{:else}
  <button type="button" class="btn" onclick={() => (shown = true)}>{label}</button>
{/if}
