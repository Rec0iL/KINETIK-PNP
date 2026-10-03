# KINETIK VTT

Web-App für KINETIK: Charakterbogen, Multiplayer über WebRTC (PeerJS), SL-Dashboard, Karte, Musik, Würfel mit Log, Notizen. Läuft statisch auf GitHub Pages.

Stack: Vite, Svelte 5, TypeScript. Deutsche Oberfläche (alle Texte in `src/i18n/de.ts`). Drei Looks: Neo-Noir, Terminal, Hybrid.

## Kurzanleitung

**Spieler:** Auf der Startseite „Spieler“ wählen, einen Charakter anlegen (oder das Beispiel Jin laden) und ausfüllen. Alles speichert automatisch in diesem Browser. Wichtige Charaktere zusätzlich als JSON exportieren. Jeder abgeleitete Wert (Energie/WK-Maximum, Momentum-Deckel, Meisterschaft, Move-Kosten) lässt sich per Klick überschreiben. Zum Mitspielen: „Beitreten“, Raumcode des SL und Namen eingeben, der SL bestätigt. Ohne Internet am Tisch funktioniert der Bogen genauso, nur ohne Verbindung.

**Spielleiter:** „Spielleiter“, „Runde starten“. Der Raumcode (z.B. `K7X-2QF`) oder der Link geht an die Spieler. Der SL-Tab ist der Server und muss offen bleiben (nach einem Neuladen setzt er die Runde selbst fort). Tabs: Spieler (Bögen, Schnell-Aktionen, Sichtbarkeit), Kampf (Runden, Kinetik-Marker, Bedrängnis, Gegner, Kampfsituationen), Karte (Bild hochladen, Tokens, Gegner aufstellen, Nebel, Raster, Kampf-Seitenleiste), Handouts, Musik, Würfel (auch geheim, Clash-Antwort auf Spielerwürfe), Notizen, Einstellungen (Sichtbarkeit, lokale Spieler ohne Gerät, Sitzung sichern).

**Verbindung:** Die Spieldaten laufen direkt zwischen den Browsern (WebRTC). Ein öffentlicher PeerJS-Server vermittelt nur den Verbindungsaufbau. Bei strenger Firewall hilft ein eigener TURN-Server (Einstellung „Erweitert“ beim Beitreten und Starten). Ein eigener PeerJS-Server (`npx peerjs --port 9000`) ist dort ebenfalls einstellbar.

## Veröffentlichen auf GitHub Pages

1. Repository auf GitHub anlegen und pushen.
2. Unter Settings > Pages als Source „GitHub Actions“ wählen.
3. Der Workflow `.github/workflows/pages.yml` prüft Daten, Typen und Tests, baut die App und veröffentlicht sie unter `https://<nutzer>.github.io/<repo>/`.

Die App nutzt relative Pfade und Hash-Routing, funktioniert also unter jedem Unterpfad.

## Regelwerk in der App

Der Button „Regelwerk“ im Kopf öffnet das Regelwerk als Seitenleiste (für Spieler und SL, überall in der App): gleiche Texte und Bilder wie das PDF, aber als HTML im App-Look, mit Inhaltsverzeichnis, Suche und Sprungmarken (der Charakter-Assistent springt zum passenden Kapitel). Kein PDF-Viewer des Browsers beteiligt, das PDF gibt es nur als Download. Gebaut wird es aus `regelwerk/KINETIK_Regelwerk.md` und `assets/pdf/images`:

```bash
python3 scripts/build_rulebook_web.py   # schreibt tools/kinetik-vtt/public/rulebook/
```

Nach jeder Regelwerk-Änderung neu ausführen und das Ergebnis einchecken.

## Charaktererschaffung

„Neuer Charakter“ fragt zuerst die Kampagnenstartstufe (Straße, Kino, Legende oder Eigene mit frei wählbaren Budgets), dann Assistent oder Manuell. Der Assistent führt durch Konzept, Titel, Attribute, Moves, Ausrüstung und Abschluss mit Live-Budget; Manuell öffnet den leeren Bogen. Stufe, Naturtalent und die Budget-Hinweise stehen danach im Block „Charaktererschaffung“ am Ende des Bogens.

## Grafiken neu erzeugen

`python3 scripts/gen_web_assets.py` erzeugt die Bilder in `public/art` mit Krea 2 in ComfyUI (Einstellungen aus `assets/pdf/project.json`, ComfyUI muss laufen). Vorhandene Dateien werden übersprungen, `--force` erzeugt neu. Vor einer öffentlichen Nutzung die Lizenz des Bildmodells (Krea 2) für die erzeugten Bilder prüfen.

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
- M8 Karte und Kampf verknüpft: Gegner aufstellen legt Token und Kampf-Gegner zusammen an (Goons als Einzeltoken einer Gruppe). Im Kampf bewegen sich Spieler per Anfrage (Geisterbild, der SL bestätigt). Der Spieler klickt einen Gegner an und plant Angriff, Durchatmen oder Sammeln mit Attribut, Technik und genutzten Tags. Beim SL entsteht eine Kampfsituation: Erleichtern/Erschweren, Tags streichen, Gift setzen, Bullet Time vergeben (einmal pro Spieler und Runde), freigeben, Würfe, Vorschlag der Folgen (Treffer-Kaskade, Goons, Belohnungen, Kinetik-Marker, Bedrängnis, „gehandelt“) mit Ein-Klick-Anwendung. Gegner greifen per „greift an“ an, der Spieler bekommt eine Verteidigungs-Abfrage (Heldenhafte Gegenwehr möglich). Move-Kosten zahlt der Spieler wie gewohnt nach dem Wurf.
- M9 Gift (3.11): Gifte mit Stufe und Verzögerung am Bogen und an NPCs, Wirkung am Rundenende („Nächste Runde“ oder „Gift-Runde“), Lähmgift als großer Tag Gelähmt, tödliches Gift macht sterbend, Überlauf bei negativer Energie, Gegenmittel-Probe (MW 7/9/11) per Knopf, Kurze Rast beendet nicht-tödliches Gift. Gift-Moves tragen ihre Verzögerung im Move-Editor und wirken nur, wenn der Treffer den Körper erreicht (Schutz 0 oder Verletzung).
- M6 SL-Werkzeuge: Kampf-Tab mit Seiten-Initiative und Kinetik-Marker, Bedrängnis-Zähler mit Regelanwendung, NPC-Manager nach NPC-Leiter (Goon-Gruppen, Schläger, Elite, Boss, Nemesis, Ausgeschaltet-Status, Überzahl), öffentliche Kampfanzeige für Spieler, Handouts (Text und Bild) an alle oder einzelne, Sitzung als Datei sichern und laden.
- Als Nächstes:, Grafiken, Feinschliff und Deploy (M7).

## Offene Punkte (TODO)

- **Kampf auf der Karte, Rest:** Experten-Regel 3.13 (der Spieler nennt nur Ziel, Attribut und Technik, der SL die Reaktion) ist nicht umgesetzt. Tischwürfel (echte Würfel) gibt es in Kampfsituationen nicht, der SL kann nur für Spieler ohne Gerät würfeln. Gift auf Goon-Gruppen wird nicht abgebildet. Überzahl ist ein Stepper an der Verteidigung (Vorgabe: Zahl der Goons). Gift tickt nur, wenn der betroffene Spieler verbunden ist oder lokal geführt wird.
