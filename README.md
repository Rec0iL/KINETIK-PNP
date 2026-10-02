# KINETIK: Cinematic Action Roleplaying

Ein Pen-&-Paper-Regelwerk für grenzenlose, filmische Action: Gun-Fu, Kampfkunst, Anime. Schnelle, tödliche Kämpfe über ein 2W6-Clash-System, in dem Angreifer und Verteidiger gegeneinander würfeln, und ein Titel-System, in dem Erfahrung mehr zählt als rohes Talent.

## Status

| Bestandteil | Stand |
|---|---|
| Regelwerk | v3.4 (Alpha, in aktiver Entwicklung) |
| Web-App (Charakterbogen, Multiplayer, SL-Dashboard) | in Entwicklung, siehe `tools/kinetik-vtt` |
| Illustriertes PDF | `export/`, gebaut mit `tools/rulebook-pdf` |

## Projektstruktur

```
KINETIK_PNP/
├── README.md              Diese Datei
├── CHANGELOG.md           Versionsgeschichte des Regelwerks
├── regelwerk/
│   ├── KINETIK_Regelwerk.md   Aktuelle Fassung
│   └── archiv/                Frühere Fassungen
├── docs/
│   └── design/            Prüfberichte, Designnotizen, Rechnungen
├── data/                  Maschinenlesbare Regeldaten für die Tools
├── tools/
│   ├── kinetik-vtt/       Web-App: Charakterbogen, Multiplayer (WebRTC), SL-Dashboard
│   └── rulebook-pdf/      PDF-Export mit KI-Bildern (agy + ComfyUI)
├── assets/                Grafiken, Logos, Druckvorlagen
│   ├── grafiken/          Grafiken zum Regeltext (z.B. Körpersilhouette)
│   └── pdf/               PDF-Projekt: Bilder, Prompts, Layout-Einstellungen
├── export/                Fertige PDFs
└── scripts/               Hilfsskripte
```

## Roadmap

- [x] Regelwerk v3: Meisterschaft, Clash, Schutz, Moves, Waffen
- [x] Regeldaten in `data/` als gemeinsame Quelle für alle Tools
- [ ] Online-Charakterbogen (`tools/kinetik-vtt`)
- [ ] Move-Builder (EP-Rechner nach Kapitel 5.1)
- [ ] Multiplayer mit Karte, Musik, Würfel und Log (WebRTC)
- [ ] SL-Dashboard (Initiative, Gegner, Bedrängnis, Kinetik-Marker)
- [x] Druckversion (PDF)
- [ ] Schnellreferenz

## Lizenz

Noch festzulegen. Üblich ist eine getrennte Lizenz für Regeltext (z.B. CC BY-SA 4.0) und Code (z.B. MIT).
