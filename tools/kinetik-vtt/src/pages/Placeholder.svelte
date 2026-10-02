<script lang="ts">
  import { t } from '../i18n';
  let { title }: { title: string } = $props();
</script>

<section class="panel stack">
  <span class="kicker">KINETIK</span>
  <h2>{title}</h2>
  <p class="dim">{t('common.soon')}</p>
  <div class="row"><a class="btn" href="#/">{t('common.back')}</a></div>
</section>
