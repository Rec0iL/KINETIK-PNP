# PDF-Projekt: KINETIK-Regelwerk

Projektordner für [`tools/rulebook-pdf`](../../tools/rulebook-pdf/). Er baut `export/KINETIK_Regelwerk_v3.6.pdf` aus `regelwerk/KINETIK_Regelwerk.md`.

- `project.json`: Titel, Farben, Stil, ComfyUI-Einstellungen (Anima-Modell `trattoNero_nitrattoANIMA`)
- `images.json`: Prompt und Seed pro Bild
- `images/`: Cover, Seitentextur, 6 Kapitel-Banner, 27 Abschnittsbilder, Füllbilder (`fill-…`) für Leerraum nach kurzen Abschnitten

Nach einer Regeländerung:

```bash
python3 tools/rulebook-pdf/rulebook_pdf.py build assets/pdf
```

Neue Abschnitte bekommen erst mit `plan` und `images` ein Bild (oder in der Oberfläche: `rulebook_pdf.py gui`). Bei einer neuen Version auch `output` in `project.json` anpassen.

Grafiken, die zum Regeltext selbst gehören (z.B. die Körpersilhouette in 2.3), liegen in `assets/grafiken/` und sind direkt im Markdown eingebunden. Sie erscheinen damit auch auf GitHub und in jedem anderen Markdown-Export.
