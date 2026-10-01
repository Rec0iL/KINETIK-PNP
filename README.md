# KINETIK: Cinematic Action Roleplaying

Ein Pen-&-Paper-Regelwerk für grenzenlose, filmische Action: Gun-Fu, Kampfkunst, Anime. Schnelle, tödliche Kämpfe über ein 2W6-Clash-System, in dem Angreifer und Verteidiger gegeneinander würfeln, und ein Titel-System, in dem Erfahrung mehr zählt als rohes Talent.

## Status

| Bestandteil | Stand |
|---|---|
| Regelwerk | v3.4 (Alpha, in aktiver Entwicklung) |
| Online-Charakterbogen | geplant |
| SL-Dashboard | geplant |
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
│   ├── charakterbogen/    Online-Charakterbogen
│   ├── sl-dashboard/      Dashboard für Spielleiter
│   └── rulebook-pdf/      PDF-Export mit KI-Bildern (agy + ComfyUI)
├── assets/                Grafiken, Logos, Druckvorlagen
│   ├── grafiken/          Grafiken zum Regeltext (z.B. Körpersilhouette)
│   └── pdf/               PDF-Projekt: Bilder, Prompts, Layout-Einstellungen
├── export/                Fertige PDFs
└── scripts/               Hilfsskripte
```

## Roadmap

- [x] Regelwerk v3: Meisterschaft, Clash, Schutz, Moves, Waffen
- [ ] Online-Charakterbogen
- [ ] SL-Dashboard (Initiative, Gegner, Bedrängnis, Kinetik-Marker)
- [ ] Move-Builder (EP-Rechner nach Kapitel 5.1)
- [ ] Regeldaten in `data/` als gemeinsame Quelle für alle Tools
- [x] Druckversion (PDF)
- [ ] Schnellreferenz

## Lizenz

Noch festzulegen. Üblich ist eine getrennte Lizenz für Regeltext (z.B. CC BY-SA 4.0) und Code (z.B. MIT).
