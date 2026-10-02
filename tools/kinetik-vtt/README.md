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
- M5 Musik: SL steuert Wiedergabe für alle (Titel, Pause, Springen, Lautstärke, Schleife, automatisch nächster Titel), Position über Uhrenabgleich synchron, Überblendung beim Titelwechsel, eigene Audiodateien per Übertragung, 9 mitgelieferte CC-BY-Titel von Kevin MacLeod mit Credits-Seite, lokale Lautstärke/Stumm, Hinweis "Audio aktivieren" bei Autoplay-Sperre.
- Schutz-Anzeige als Schild mit Aktuell / Max und Pfeiltasten.
- M6 SL-Werkzeuge: Kampf-Tab mit Seiten-Initiative und Kinetik-Marker, Bedrängnis-Zähler mit Regelanwendung, NPC-Manager nach NPC-Leiter (Goon-Gruppen, Schläger, Elite, Boss, Nemesis, Ausgeschaltet-Status, Überzahl), öffentliche Kampfanzeige für Spieler, Handouts (Text und Bild) an alle oder einzelne, Sitzung als Datei sichern und laden.
- Als Nächstes:, Grafiken, Feinschliff und Deploy (M7).
