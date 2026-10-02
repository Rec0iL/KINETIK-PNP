# KINETIK VTT

Web-App für KINETIK: Charakterbogen, Multiplayer über WebRTC (PeerJS), SL-Dashboard, Karte, Musik, Würfel mit Log, Notizen. Läuft statisch auf GitHub Pages.

Stack: Vite, Svelte 5, TypeScript. Deutsche Oberfläche (alle Texte in `src/i18n/de.ts`). Drei Looks: Neo-Noir, Terminal, Hybrid.

## Entwickeln

```bash
cd tools/kinetik-vtt
npm install
npm run dev          # http://localhost:5173
npm run test         # Regel-Engine gegen Regelwerk-Beispiele und Anhang A
npm run check        # svelte-check / TypeScript
npm run check-data   # Regeldaten in ../../data prüfen
npm run build        # dist/
```

## Aufbau

| Pfad | Inhalt |
|---|---|
| `src/rules/` | Regel-Engine, reine Funktionen ohne DOM: abgeleitete Werte, Clash, Proben, Move-Kosten, NPC |
| `src/themes/` | Themes über CSS-Variablen, Schriften |
| `src/i18n/` | Texte |
| `src/lib/` | Router, Theme-Zustand |
| `src/pages/` | Seiten |
| `../../data/` | Regeldaten (gemeinsame Quelle, per Alias `@data`) |

## Stand

M0 Fundament: Gerüst, Themes, Regel-Engine mit Tests, Regeldaten. Nächste Schritte: Charakterbogen (M1), Move-Builder (M2), Multiplayer (M3), Karte (M4), Musik (M5), SL-Werkzeuge (M6), Grafiken und Deploy (M7).
