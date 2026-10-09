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

Ändert sich eine Regel im Regelwerk, wird sie hier und in `tools/kinetik-vtt/src/rules/` nachgezogen. Die Tests in `tools/kinetik-vtt/tests/` prüfen die Formeln gegen die Beispiele und die Tabellen aus Anhang A.
