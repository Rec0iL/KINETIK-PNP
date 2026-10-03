// Verbindungstest: sammelt ICE-Kandidaten mit der aktuellen Konfiguration und zeigt, welche Wege offen sind.
import { buildIceConfig, hasCustomTurn, summarize, verdict, type CandidateInfo, type IceReport, type Verdict } from './ice';
import { settings } from '../lib/settings.svelte';

export function currentIceSettings() {
  return { iceJson: settings.iceJson, turnUrl: settings.turnUrl, turnUser: settings.turnUser, turnPass: settings.turnPass, relayOnly: settings.relayOnly };
}

export async function testIce(ms = 8000): Promise<{ report: IceReport; verdict: Verdict }> {
  const s = currentIceSettings();
  // Der Test zeigt immer alle Wege, auch wenn "Nur über Relay" gesetzt ist.
  const cfg = { ...buildIceConfig({ ...s, relayOnly: false }) };
  const cands: CandidateInfo[] = [];
  const errors: string[] = [];
  const pc = new RTCPeerConnection(cfg);
  pc.createDataChannel('test');
  pc.onicecandidate = (e) => { if (e.candidate) cands.push({ type: e.candidate.type ?? '', protocol: e.candidate.protocol ?? '' }); };
  pc.onicecandidateerror = (e) => {
    const ev = e as RTCPeerConnectionIceErrorEvent;
    errors.push(`${ev.url || 'ICE'}: ${ev.errorCode} ${ev.errorText}`);
  };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } };
  });
  pc.close();
  const report = summarize(cands, [...new Set(errors)]);
  return { report, verdict: verdict(report, hasCustomTurn(s)) };
}
