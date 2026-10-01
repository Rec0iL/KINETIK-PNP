# Rulebook PDF

Macht aus einem Regelwerk (Markdown, Word, PDF oder Text) ein illustriertes PDF im Stil eines gedruckten Regelbuchs: Cover, Kapitel-Banner, ein Bild pro Abschnitt, zweispaltiger Satz, Kopfzeilen und Seitenzahlen.

```
Regelwerk ──► Prompts (agy / Gemini) ──► Bilder (ComfyUI) ──► PDF (WeasyPrint)
```

Die Bild-Prompts schreibt **agy** (Antigravity CLI) statt Claude, das spart Claude-Tokens. agy bekommt dabei nur Text und gibt JSON zurück; es läuft in einem leeren Temp-Ordner und erhält keine Datei- oder Shell-Rechte.

## Voraussetzungen

- Python 3.10+ mit `pip install -r requirements.txt` (PySide6, markdown, WeasyPrint, Pillow)
- [agy](https://antigravity.google) im `PATH`, angemeldet
- ComfyUI (z.B. über Pinokio) mit einem Bildmodell, Standard: `http://127.0.0.1:8188`
- Für PDF-Import: `pdftotext` (Paket poppler-utils)

## Start

```bash
python3 tools/rulebook-pdf/rulebook_pdf.py gui
```

Ohne Argument öffnet die Oberfläche das zuletzt benutzte Projekt. Das KINETIK-Projekt liegt unter `assets/pdf/`.

## Ablauf in der Oberfläche

1. **Neues Projekt…**: Regelwerk wählen (`.md`, `.docx`, `.pdf`, `.txt`) und einen leeren Projektordner. Word-Dateien werden lokal über ihre Überschriftenstile umgewandelt, PDF und Text abschnittsweise von agy (Wortlaut bleibt erhalten). **Das erzeugte Markdown kurz prüfen** (Toolbar: „Quelle öffnen“), vor allem bei PDFs.
2. **Buch**: Titel, Untertitel, Kopfzeile, Farben, Schriftgröße, Blocksatz.
3. **Stil**: Vorlage wählen (Anime Action, Film Noir, Dark Fantasy, Comic …) oder einen freien **Stilwunsch** eintragen, z.B. „soll aussehen wie One Piece“, und **Mit agy verfeinern**. agy macht daraus einen Stil-Suffix, den das gewählte Bildmodell versteht, und schlägt passende Akzentfarben vor. Der Suffix bleibt editierbar.
4. **Engine**: agy-Modell und ComfyUI. „Verbinden“ lädt die Modelllisten aus dem laufenden ComfyUI.
5. **① Prompts planen**: agy liest das Regelwerk, beschreibt Welt und Genre und schreibt für jeden Bildplatz ein Motiv. Ohne gesetzten Stil schlägt agy auch Stil und Farben vor.
6. **② Fehlende Bilder**: generiert alle Bilder, die noch fehlen.
7. **③ PDF bauen**.

**▶ Alles** führt 1–3 nacheinander aus und überspringt Vorhandenes.

### Einzelne Bilder nachbessern

In der Bildliste ein Bild wählen. Rechts stehen Motiv-Prompt, Seed und „Stil-Suffix anhängen“.

- **Vorschau**: rendert mit den aktuellen Einstellungen, ohne das Bild zu ersetzen. Gut, um einen neuen Stil an einem Bild zu testen.
- **Übernehmen**: ersetzt das Bild durch die Vorschau.
- **Prompt neu (agy)**: neues Motiv, optional mit Wunsch („eher Nacht, zwei Kämpfer“).
- **Generieren & speichern**: direkt neu erzeugen.

Ein Bild passt nicht zum Abschnitt? Wunsch eintragen → Prompt neu → Vorschau → Übernehmen.

## Bildmodelle (Workflow)

| Workflow | Für | Einstellungen |
|---|---|---|
| Diffusion-Modell | Anima und andere Modelle, die UNET, Text-Encoder und VAE getrennt laden (z.B. `trattoNero_nitrattoANIMA`) | Diffusion-Modell, Text-Encoder, Encoder-Typ, VAE |
| Checkpoint | SD 1.5, SDXL, Illustrious, Pony … (alles in einer Datei) | Checkpoint |
| Eigener Workflow | alles, was in ComfyUI läuft (Flux, LoRAs, Upscaler …) | In ComfyUI über **Export (API)** gespeichertes JSON |

Beim eigenen Workflow setzt das Tool Prompt, Negativ-Prompt, Seed und Bildgröße automatisch ein: Es sucht den KSampler, folgt dessen `positive`/`negative`-Eingängen zum Text-Knoten und setzt `width`/`height` in allen Knoten, die beides haben.

## Kommandozeile

```bash
python3 rulebook_pdf.py new    PROJEKT QUELLE    # Projekt anlegen (importiert docx/pdf/txt)
python3 rulebook_pdf.py plan   PROJEKT [--force] # Prompts schreiben (--force: alle neu)
python3 rulebook_pdf.py images PROJEKT [--all]   # fehlende Bilder (--all: alle neu)
python3 rulebook_pdf.py build  PROJEKT           # PDF setzen
python3 rulebook_pdf.py all    PROJEKT           # plan + images + build
```

## Projektordner

```
projekt/
├── project.json   Einstellungen (Quelle, Ausgabe, Titel, Farben, Stil, Engine)
├── images.json    pro Bildplatz: Motiv-Prompt, Seed, Stil an/aus, optional eigener Negativ-Prompt
├── images/        die Bilder als JPEG (Name = Bildplatz-Schlüssel)
└── .build/        Zwischendateien und Vorschauen (nicht versionieren)
```

Bildplatz-Schlüssel entstehen aus den Überschriften (`ch-…` für Kapitel, `sec-…` für Abschnitte). Wird eine Überschrift umbenannt, bekommt sie einen neuen Platz und braucht ein neues Bild; der alte Eintrag bleibt in `images.json` stehen.

## Wie das Markdown aussehen sollte

- `#` Buchtitel (optional), `##` Kapitel, `###` Abschnitte. Bei mehreren `#` gelten `#` als Kapitel und `##` als Abschnitte. Unter „Buch → Überschriften“ lässt sich das auch fest einstellen.
- Eine Nummer am Kapitelanfang („3. Der Kampf“) wird als Kapitelnummer genutzt, eine Klammer am Ende („(Das Clash-System)“) als Untertitel.
- Kapitel, deren Titel mit „Anhang“, „Appendix“, „Änderungsprotokoll“ oder „Changelog“ beginnen, werden schlicht und einspaltig gesetzt, ohne Banner (Muster in `project.json` → `appendix_patterns`).

## Hinweise

- agy-Aufrufe laufen nacheinander. Parallel gestartete agy-Läufe stören sich gegenseitig und liefern leere Antworten. Fehlende Prompts fragt das Tool einmal nach.
- WeasyPrint malt `@page`-Hintergrundbilder nur im Satzspiegel; die Seitentextur ist deshalb ein fixiertes Element, das auf jeder Seite wiederholt wird.
- Schriften (Bebas Neue, Oswald, Barlow) liegen in `rpdf/fonts/` (SIL Open Font License).
