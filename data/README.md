# Regeldaten

Maschinenlesbare Fassung der Regeln (Stand: Regelwerk v3.6) als gemeinsame Quelle für alle Tools. Jede Datei trägt ein Feld `rules_version`. Die Web-App liest die Dateien zur Build-Zeit, das Skript `scripts/check-data.mjs` prüft sie (`npm run check-data` in `tools/kinetik-vtt`).

| Datei | Inhalt |
|---|---|
| `tabellen.json` | Attribute, Meisterschaft nach Level, Ressourcen-Formeln, Momentum-Deckel, Kampagnenstufen, Schwellen (Helden-Schwelle, Außer Reichweite), MW-Skala, Wachsamkeit, Körperzonen, Deckung, Preise legendärer Moves |
| `ep-katalog.json` | Effekte und EP-Werte (5.1), Abzüge, Kostenregeln für Energie-, Momentum-, Meister- und legendäre Moves |
| `moves.json` | Die 14 Beispiel-Moves aus 5.2 mit Effekten, aus denen die EP-Summe nachgerechnet wird |
| `waffen.json` | Waffen-Profile (2.5) |
| `npc.json` | NPC-Leiter, Überzahl und Bedrängnis (3.7), Ausgeschaltet-bei (3.11) |
| `tags.json` | Kleine und große Tags, Umgebungs-Tags, Zustände |

## Übersetzungen (`i18n/<sprache>/`)

Die deutschen Dateien sind die Grundlage: Ids, Zahlen und Texte. `i18n/<sprache>/` (z.B. `i18n/en/`) enthält dieselben Dateinamen, aber nur die übersetzten Texte in derselben Form. Die App mischt sie beim Laden ein (`overlay()` in `tools/kinetik-vtt/src/rules/data.ts`): Texte werden ersetzt, Listen elementweise (gleiche Länge und Reihenfolge), Objekte nach Feldnamen. Zahlen, Ids und Wahrheitswerte kommen immer aus der Grundlage.

* In Listen von Objekten wird die Kennung (`id`, `key`, `mw`) in jedem Eintrag wiederholt, damit `check-data` die Zuordnung prüfen kann.
* Tags (`tags.json`) und Preise legendärer Moves (`tabellen.json`) werden elementweise übersetzt. Ihr deutscher Name bleibt die Kennung, über die Charaktere sprachübergreifend verglichen werden (`src/rules/tagid.ts`).
* Nicht übersetzt werden Kennungen und Verweise: `id`, `key`, `mw`, `rules_version`, `en`, `folge`, `klasse`, `attribut`, `attribute` (Schlüssel in `ressourcen`), `profil`, `schliesstAus`, `abzuege` (Ids in `moves.json`).
* `check-data` prüft jede Sprache: gültiges JSON, gleiche Form wie die Grundlage, nur nicht leere Texte, gleiche Kennungen und eine Übersetzung für jeden Text. Begriffe nach `regelwerk/GLOSSARY.<sprache>.md`.

Ändert sich eine Regel im Regelwerk, wird sie hier und in `tools/kinetik-vtt/src/rules/` nachgezogen. Die Tests in `tools/kinetik-vtt/tests/` prüfen die Formeln gegen die Beispiele und die Tabellen aus Anhang A.
