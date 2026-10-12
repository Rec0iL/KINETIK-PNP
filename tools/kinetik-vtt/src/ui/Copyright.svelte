<script lang="ts">
  import { COPYRIGHT } from '../lib/legal';
  import { t } from '../i18n';
</script>

<p class="copyright dim">{COPYRIGHT}. {t('ui.copyright.content')} <a href={t('ui.copyright.licenseUrl')} target="_blank" rel="noreferrer">CC BY-NC-SA 4.0</a>, {t('ui.copyright.code')}</p>

<style>
  .copyright { margin-top: 1.4rem; font-size: 0.85rem; }
</style>
