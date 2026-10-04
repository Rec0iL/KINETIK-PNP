<script lang="ts">
  // Unsichtbar: hält die Verbindung zu PenNodePaper, solange eine Runde läuft und die Brücke eingeschaltet ist.
  import { gm } from './gm.svelte';
  import { settings } from '../lib/settings.svelte';
  import { connectBridge, disconnectBridge, pnp, reportParty } from './pnp.svelte';
  import { partyList } from './pnp';

  $effect(() => {
    // Adresse und Token mitlesen: Änderungen bauen die Verbindung neu auf.
    const on = gm.status === 'open' && !!gm.session && settings.pnpEnabled && settings.pnpToken.trim() !== '';
    void settings.pnpUrl;
    void settings.pnpToken;
    if (!on) {
      pnp.status = 'off';
      return;
    }
    connectBridge();
    return disconnectBridge;
  });

  // Die Spielercharaktere (Name, Werte, Porträt, online) gehen von selbst an PenNodePaper, kurz nachdem sie sich ändern.
  $effect(() => {
    if (pnp.status !== 'connected' || !gm.session) return;
    const list = partyList(gm.session);
    const signature = JSON.stringify(list);
    const t = setTimeout(() => reportParty(list, signature), 1500);
    return () => clearTimeout(t);
  });
</script>
