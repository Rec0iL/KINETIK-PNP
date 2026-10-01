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

1. **Neues Projekt…**: Regelwerk wählen (`.md`, `.docx`, `.pdf`, `.txt`) und einen leeren Projektordner. Word-Dateien werden lokal über ihre Überschriftenstile umgewandelt, PDF und Text abschnittsweise von agy (Wortlaut bleibt erhalten). Hat das PDF ein Inhaltsverzeichnis (Word-Stil mit Punktlinien und Seitenzahlen), übernimmt das Tool daraus die Gliederung: Einträge der ersten Ebene werden Kapitel, die der zweiten Abschnitte. Das Verzeichnis selbst landet nicht im Text. **Das erzeugte Markdown kurz prüfen** (Toolbar: „Quelle öffnen“), vor allem bei PDFs.
2. **Buch**: Titel, Untertitel, Kopfzeile, Farben, Schriftgröße, Blocksatz.
3. **Stil**: Vorlage wählen (Anime Action, Film Noir, Dark Fantasy, Comic …) oder einen freien **Stilwunsch** eintragen, z.B. „soll aussehen wie One Piece“, und **Mit agy verfeinern**. agy macht daraus einen Stil-Suffix, den das gewählte Bildmodell versteht, und schlägt passende Akzentfarben vor. Der Suffix bleibt editierbar. **Komprimieren** neben jedem Feld lässt agy Doppeltes, Widersprüche, Füllwörter und für das gewählte Modell wirkungslose Begriffe entfernen (bei Krea 2 z.B. „masterpiece, best quality“). Was entfernt wurde, steht im Log.
4. **Engine**: agy-Modell und ComfyUI. „Verbinden“ lädt die Modelle aus dem laufenden ComfyUI. Unter **Bildmodell** stehen alle Modelle mit ihrer erkannten Bauart, die Einstellungen werden beim Auswählen automatisch gesetzt (siehe „Bildmodelle“).
5. **① Prompts planen**: agy liest das Regelwerk, beschreibt Welt und Genre und schreibt für jeden Bildplatz ein Motiv. Ohne gesetzten Stil schlägt agy auch Stil und Farben vor.
6. **② Fehlende Bilder**: generiert alle Bilder, die noch fehlen.
7. **③ PDF bauen**.

**▶ Alles** führt 1–3 nacheinander aus und überspringt Vorhandenes.

### Einzelne Bilder nachbessern

In der Bildliste ein Bild wählen. Rechts stehen Motiv-Prompt, ein eigener Negativ-Prompt für dieses Bild (leer = Standard aus „Stil“), Seed und „Stil-Suffix anhängen“. Die Vorschaubilder in der Liste aktualisieren sich, sobald ein Bild fertig ist, nicht erst am Ende des Durchlaufs.

- **Prompt neu (agy)**: neues Motiv, optional mit Wunsch („eher Nacht, zwei Kämpfer“).
- **Analysieren (agy)**: agy sieht sich das aktuelle Bild an, schreibt kurz, was passt und was nicht, und verbessert Motiv-Prompt und Negativ-Prompt gezielt (z.B. „fused fingers“, wenn Hände verschmolzen sind). Ein Wunsch im Feld darüber wird berücksichtigt („mehr Crew zeigen“).
- **Prüfen**: nur die Bildkontrolle (✓ / ✗).
- **Vorschau**: rendert mit den aktuellen Einstellungen, ohne das Bild zu ersetzen.
- **Übernehmen**: ersetzt das Bild durch die Vorschau.
- **Generieren & speichern**: direkt neu erzeugen.

Ein Bild passt nicht? Wunsch eintragen → Analysieren → Vorschau → Übernehmen.

### Füllbilder für Leerraum

Kurze Abschnitte hinterlassen am Seitenende oft eine Lücke, weil der nächste Block aus Überschrift und Bild nicht mehr passt. Mit **Buch → Leerraum mit Füllbildern füllen** setzt das Tool das PDF zuerst probeweise, misst jede Lücke ab der eingestellten Höhe (Standard 55 mm) und legt dafür einen Bildplatz `fill-…` an. Das gilt nur für Lücken nach einem Abschnitt, der auf dieser Seite endet. agy schreibt ein zweites, anderes Motiv zum selben Abschnitt, ComfyUI erzeugt es im Seitenverhältnis der Lücke, und beim Bauen füllt es genau diesen Platz. Die übrige Seitenaufteilung bleibt gleich.

Ändert sich der Text, verschieben sich die Lücken: Füllbilder ohne Lücke werden einfach nicht mehr eingesetzt, neue Lücken bekommen beim nächsten „Prompts planen“ / „Fehlende Bilder“ ein eigenes Bild.

### Bildkontrolle mit agy (optional)

**Engine → Generierte Bilder automatisch prüfen**: Nach jedem generierten Bild sieht sich agy das Bild an und beurteilt Motiv, Textartefakte, Anatomie und ob es zur Welt passt. Mit **Unpassende Bilder neu generieren** schreibt agy bei einem Fehlschlag einen besseren Prompt, und das Bild wird mit neuem Seed neu erzeugt. „Bilder prüfen (agy)“ prüft alle vorhandenen Bilder, „Prüfen“ beim einzelnen Bild nur dieses. Das Ergebnis steht am Bild (✓ / ✗ mit den gefundenen Problemen).

agy bekommt Bilder nur als Datei (im Headless-Modus nimmt es nur Text an). Das Tool legt deshalb für jedes Bild einen Ordner `.build/qc/<bildplatz>/` an, in dem nur eine verkleinerte Kopie liegt. Dort startet es agy mit `--sandbox` und **ohne** `--dangerously-skip-permissions`. agy darf also nichts ausführen oder schreiben, ohne dass eine Freigabe greift. Lesen kann agy die Kopie, weil der Ordner in einem seiner vertrauenswürdigen Arbeitsbereiche liegt:

```json
// ~/.gemini/antigravity-cli/settings.json
"trustedWorkspaces": [ "/home/<du>", ... ]
```

Bildgröße und Hoch-/Querformat bewertet agy dabei nicht, die gibt das Tool vor (Cover und Hintergrund sind absichtlich Hochformat).

Liegt dein Projekt außerhalb aller `trustedWorkspaces`, meldet die Bildkontrolle „agy konnte das Bild nicht öffnen“. Dann den Projektordner (oder einen übergeordneten Ordner) dort eintragen. Erlaube agy dafür **nicht** pauschal alles.

## Bilder im Regelwerk selbst

Bilder, die im Markdown stehen (`![Bildunterschrift](pfad/bild.svg)`), übernimmt das PDF an ihrer Stelle. Relative Pfade gelten relativ zur Markdown-Datei. Der Alt-Text wird zur Bildunterschrift, Hochformat-Bilder bleiben in der Spalte, Querformate gehen über beide Spalten. Unterstützt werden SVG, PNG, JPG, GIF und WebP.

Beim Import fremder Regelwerke bleiben deren Bilder erhalten: Word-Bilder landen in `media/` und stehen an ihrer Stelle im Markdown. Aus PDFs werden größere Bilder (ab 200 px) seitenweise extrahiert und am Ende ihrer Seite eingefügt. Dabei können Deko-Elemente mitkommen, deshalb `media/` und das Markdown kurz prüfen.

## Bildmodelle

Unter **Engine → Bildmodell** listet das Tool alle Modelle aus ComfyUI und erkennt ihre Bauart am Dateikopf (Namen der Tensoren, nicht am Dateinamen). Beim Auswählen setzt es Workflow, Text-Encoder, VAE, Steps, CFG, Sampler und Scheduler. Was du danach unter „Feinabstimmung“ änderst, merkt es sich pro Modelldatei (`~/.config/rulebook-pdf/models.json`, gilt für alle Projekte). **Empfohlene Werte** setzt wieder auf die Vorgaben zurück.

| Bauart | Workflow | Vorgaben | Hinweis |
|---|---|---|---|
| Krea 2 | Diffusion-Modell | `qwen3vl_4b_fp8_scaled` (Typ `krea2`), `qwen_image_vae`, 8 Steps, CFG 1, euler/simple | Turbo-Modell, Negativ-Prompt wirkt bei CFG 1 nicht |
| Anima | Diffusion-Modell | `qwen_3_06b_base`, `qwen_image_vae`, 28 Steps, CFG 4, euler/simple | |
| SDXL / Illustrious / Pony | Checkpoint | 28 Steps, CFG 6, dpmpp_2m/karras | Lightning/Turbo im Namen: 8 Steps, CFG 2, dpmpp_sde/karras |
| SD 1.5 | Checkpoint | 25 Steps, CFG 7, dpmpp_2m/karras | |
| Flux (mit Encoder und VAE) | Checkpoint | 20 Steps (schnell: 4), CFG 1 | |

Nicht für Text-zu-Bild nutzbar und grau markiert: Flux Kontext (Bildbearbeitung), Wan (Video), reine Flux-Diffusionsmodelle (nur über „Eigener Workflow“), Erkennungs-/Pose-Modelle.

Fehlt ein Text-Encoder oder VAE, steht das unter dem Modell mit Download-Link. Liegt ein reines Diffusionsmodell nur in `checkpoints/` (z.B. Krea 2 aus Civitai), erscheint es mit ⚠ und dem Button **In diffusion_models verlinken**. Der Diffusion-Modell-Loader von ComfyUI sucht nur dort.

**Krea 2 auf Karten mit 16 GB oder weniger:** Die schnellen INT8-Kernel brauchen eine RTX 3000 oder neuer. Auf älteren Karten (z.B. RTX 2000 / Quadro RTX) nutzt ComfyUI einen langsameren Weg, der zusätzlichen VRAM braucht. Ohne Reserve bricht die Generierung mit „Allocation on device“ ab. Abhilfe: ComfyUI mit `--reserve-vram 3` starten (bei Pinokio in `comfy.git/start.js`). Dann lagert ComfyUI einen Teil des Modells ins RAM aus.

### Workflow-Typen

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
python3 rulebook_pdf.py check  PROJEKT [--no-fix]  # Bilder mit agy prüfen (--no-fix: nur prüfen)
python3 rulebook_pdf.py build  PROJEKT           # PDF setzen
python3 rulebook_pdf.py all    PROJEKT           # plan + images + build
```

## Projektordner

```
projekt/
├── project.json   Einstellungen (Quelle, Ausgabe, Titel, Farben, Stil, Engine)
├── images.json    pro Bildplatz: Motiv-Prompt, Seed, Stil an/aus, optional Negativ-Prompt, Prüfergebnis
├── images/        die generierten Bilder als JPEG (Name = Bildplatz-Schlüssel)
├── media/         Bilder aus importierten Word-/PDF-Regelwerken
└── .build/        Zwischendateien, Vorschauen, Bildkontrolle (nicht versionieren)
```

Bildplatz-Schlüssel entstehen aus den Überschriften (`ch-…` für Kapitel, `sec-…` für Abschnitte, `fill-…` für Füllbilder). Wird eine Überschrift umbenannt, bekommt sie einen neuen Platz und braucht ein neues Bild; der alte Eintrag bleibt in `images.json` stehen.

## Wie das Markdown aussehen sollte

- `#` Buchtitel (optional), `##` Kapitel, `###` Abschnitte. Bei mehreren `#` gelten `#` als Kapitel und `##` als Abschnitte. Unter „Buch → Überschriften“ lässt sich das auch fest einstellen.
- Eine Nummer am Kapitelanfang („3. Der Kampf“) wird als Kapitelnummer genutzt, eine Klammer am Ende („(Das Clash-System)“) als Untertitel.
- Kapitel, deren Titel mit „Anhang“, „Appendix“, „Änderungsprotokoll“ oder „Changelog“ beginnen, werden schlicht und einspaltig gesetzt, ohne Banner (Muster in `project.json` → `appendix_patterns`).

## Hinweise

- agy-Aufrufe laufen nacheinander. Parallel gestartete agy-Läufe stören sich gegenseitig und liefern leere Antworten. Fehlende Prompts fragt das Tool einmal nach.
- WeasyPrint malt `@page`-Hintergrundbilder nur im Satzspiegel; die Seitentextur ist deshalb ein fixiertes Element, das auf jeder Seite wiederholt wird.
- WeasyPrint kann einen zweispaltigen Block nicht umbrechen, wenn darin ein unteilbares Element steckt, das in keine Spalte der Seite mehr passt; es schiebt dann den ganzen Abschnitt weiter. Abbildungen in Spalten sind deshalb auf 100 mm Höhe begrenzt. Hohe Grafiken besser mitten in einen Abschnitt setzen als an seinen Anfang.
- Schriften (Bebas Neue, Oswald, Barlow) liegen in `rpdf/fonts/` (SIL Open Font License).
