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

- M0 Fundament: Gerüst, Themes, Regel-Engine mit Tests, Regeldaten.
- M1 Charakterbogen (läuft eigenständig, auch offline am Tisch): Charakter-Bibliothek mit Autosave (IndexedDB), JSON-Import/Export, Übersicht (Attribute, Titel mit Bonus-Matrix, Ressourcen, Schutz, Erschaffungshinweise), interaktive Körpersilhouette mit Sterbend-Zähler, Moves, Waffen, Tags, Notizen, Würfler mit Probe, Clash-Rechner und freien Würfeln. Jeder abgeleitete Wert lässt sich überschreiben.
- M2 Move-Builder: eigenständige Seite ohne Charakter, eigene Move-Bibliothek, Vorlagen aus 5.2, Kosten nach Level, Import/Export, "Zu Charakter hinzufügen".
- M3 Multiplayer: SL hostet per Raumcode (PeerJS/WebRTC), Spieler treten bei und der SL bestätigt, Wiederverbinden ohne neue Bestätigung, Bogen-Sync, SL-Schnell-Aktionen, Sichtbarkeit (Gruppenleiste/Privat/Offen), gemeinsames Würfellog mit 3D-Würfeln, geheime Würfe, Clash-Antwort, Notizen, lokale Spieler.
- M4 Karte: SL lädt Bilder hoch (große werden verkleinert), Übertragung in Blöcken mit Prüfsumme und Zwischenspeicher, mehrere Szenen (eine live für Spieler), Raster, Tokens (Spieler mit Porträt, NPCs, versteckte), Nebel (Pinsel, Rechteck, Vieleck), Ping, Messen, Spieler bewegen den eigenen Token.
- Als Nächstes:, Musik (M5), SL-Werkzeuge (M6), Grafiken und Deploy (M7).
