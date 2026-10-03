import { describe, expect, it } from 'vitest';
import { PEERJS_TURN, buildIceConfig, explainFailedJoin, hasCustomTurn, parseTurnUrls, summarize, verdict, type IceSettings } from '../src/net/ice';

const base: IceSettings = { iceJson: '', turnUrl: '', turnUser: '', turnPass: '', relayOnly: false };

describe('ICE-Konfiguration', () => {
  it('Standard: STUN plus öffentlicher PeerJS-TURN, alle Wege erlaubt', () => {
    const c = buildIceConfig(base);
    expect(c.iceTransportPolicy).toBe('all');
    expect(c.iceServers).toContainEqual(PEERJS_TURN);
    expect(c.iceServers!.some((s) => String(s.urls).startsWith('stun:'))).toBe(true);
  });
  it('eigener TURN kommt vor dem öffentlichen, mehrere URLs werden getrennt', () => {
    const s = { ...base, turnUrl: 'turn:t.example.org:3478, turns:t.example.org:443\nfoo', turnUser: 'u', turnPass: 'p' };
    expect(parseTurnUrls(s.turnUrl)).toEqual(['turn:t.example.org:3478', 'turns:t.example.org:443']);
    const c = buildIceConfig(s);
    const own = c.iceServers!.find((x) => x.username === 'u')!;
    expect(own.urls).toEqual(['turn:t.example.org:3478', 'turns:t.example.org:443']);
    expect(own.credential).toBe('p');
    expect(c.iceServers!.indexOf(own)).toBeLessThan(c.iceServers!.indexOf(PEERJS_TURN));
    expect(hasCustomTurn(s)).toBe(true);
    expect(hasCustomTurn(base)).toBe(false);
  });
  it('JSON ersetzt alles, ungültiges JSON wird ignoriert', () => {
    const j = buildIceConfig({ ...base, iceJson: '[{"urls":"turn:x:1","username":"a","credential":"b"}]' });
    expect(j.iceServers).toHaveLength(1);
    expect(hasCustomTurn({ ...base, iceJson: '[{"urls":"turn:x:1"}]' })).toBe(true);
    expect(buildIceConfig({ ...base, iceJson: '{kaputt' }).iceServers!.length).toBeGreaterThan(1);
  });
  it('Nur Relay setzt die Transport-Richtlinie', () => {
    expect(buildIceConfig({ ...base, relayOnly: true }).iceTransportPolicy).toBe('relay');
  });
});

describe('Auswertung', () => {
  const cand = (...t: string[]) => t.map((type) => ({ type, protocol: 'udp' }));
  it('keine Kandidaten: WebRTC blockiert', () => {
    expect(verdict(summarize([]), false).title).toMatch(/blockiert/);
  });
  it('ohne Relay: TURN fehlt, falsche Zugangsdaten werden erkannt', () => {
    const v = verdict(summarize(cand('host', 'srflx'), []), false);
    expect(v.ok).toBe(false);
    expect(v.text).toMatch(/eigenen TURN/);
    const auth = verdict(summarize(cand('host'), ['turn:x: 401 Unauthorized']), true);
    expect(auth.text).toMatch(/Zugangsdaten/);
  });
  it('nur Relay (strenges NAT) ist in Ordnung', () => {
    const v = verdict(summarize(cand('host', 'relay')), true);
    expect(v.ok).toBe(true);
    expect(v.title).toMatch(/Relay/);
  });
  it('alles da', () => {
    const r = summarize([...cand('host', 'srflx'), { type: 'relay', protocol: 'tcp' }]);
    expect(r.relayTcp).toBe(true);
    expect(verdict(r, false).ok).toBe(true);
  });
  it('gescheiterter Beitritt: Ursache je nach Kandidaten', () => {
    expect(explainFailedJoin([], 0, false)).toMatch(/blockiert/);
    expect(explainFailedJoin(['host', 'srflx'], 0, false)).toMatch(/keine Verbindungsdaten/);
    expect(explainFailedJoin(['host', 'srflx'], 2, false)).toMatch(/TURN-Server eintragen/);
    expect(explainFailedJoin(['host', 'srflx', 'relay'], 2, true)).toMatch(/Verbindungstest/);
  });
});
