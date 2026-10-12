# Skripte

Platz für Hilfsskripte, z.B. den Export des Regelwerks als PDF oder das Prüfen der Regeldaten in `data/`.

Der PDF-Export ist ein eigenes Tool mit Oberfläche: [`tools/rulebook-pdf`](../tools/rulebook-pdf/).

- `check_translation.py`: Übersetzung des Regelwerks gegen das Original (Zeilenart, Überschriftsnummern, Tabellen, Zahlen, Version).
- `build_rulebook_web.py`: Regelwerk für die App (alle Sprachen, `--langs de` nur Deutsch). Baut den Ausgabeordner immer ganz neu auf.
- `gen_rulebook_themes.py [--lang en]`: Bildsätze, Füllbilder und PDFs der Looks.
