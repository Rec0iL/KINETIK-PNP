#!/usr/bin/env python3
"""Baut das Regelwerk für die Web-App: Kapitel und Abschnitte als HTML plus die Bilder des PDFs (als WebP).

Quelle ist dieselbe wie beim PDF: regelwerk/KINETIK_Regelwerk.md, geteilt mit dem Parser aus tools/rulebook-pdf,
und die Bilder aus assets/pdf/images (zugeordnet über Kapitel- und Abschnittsschlüssel wie "sec-2-4-...").

    python3 scripts/build_rulebook_web.py              # alle Sprachen (rulebook.json, rulebook.en.json)
    python3 scripts/build_rulebook_web.py --langs de   # nur die deutsche Fassung (der Ausgabeordner wird trotzdem neu aufgebaut)

Sprachen: Die Übersetzung (regelwerk/KINETIK_Regelwerk.en.md) teilt sich Bilder und Schlüssel mit der deutschen Fassung
(Schlüssel aus den deutschen Überschriften, siehe "key_source" in assets/pdf-en/project.json). Eigen sind nur
rulebook.<sprache>.json, die Füllbilder (img/<sprache>/fill-*.webp, sie passen zum Satz der Sprache), die Körpersilhouette
mit Beschriftung (img/koerper-silhouette.<sprache>.svg) und die PDFs (KINETIK_Rulebook_v<Version>[_<theme>].pdf).

Bildsätze je Theme: Liegt unter assets/pdf-themes/<theme>/images/ ein Satz (erzeugt von scripts/gen_rulebook_themes.py),
landet er als img/<theme>/<schlüssel>.webp in der Ausgabe; rulebook.json nennt unter "themed", welche Schlüssel es je Theme gibt.
Die Seite nimmt dann automatisch die Bilder des gewählten Themes (fehlende Schlüssel: die Standardbilder). Standard ist noir.

PDFs: Die Version steht in jedem Dateinamen. Standard export/KINETIK_Regelwerk_v<Version>.pdf, je Theme
export/KINETIK_Regelwerk_v<Version>_<theme>.pdf (erzeugt von gen_rulebook_themes.py --pdf), beide werden unter demselben Namen
mitgeliefert, rulebook.json nennt sie unter "pdfs". Die Download-Schaltfläche der Seite bietet das PDF zum gewählten Theme an.

Ausgabe: tools/kinetik-vtt/public/rulebook/ (rulebook.json, img/*.webp, img/<theme>/*.webp, die PDFs zum Herunterladen).
"""
import argparse
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "rulebook-pdf"))

import markdown  # noqa: E402
from PIL import Image  # noqa: E402
from rpdf.mdparse import parse  # noqa: E402

IMG_SRC = ROOT / "assets" / "pdf" / "images"
OUT = ROOT / "tools" / "kinetik-vtt" / "public" / "rulebook"
# Sprachen: Quelltext, Projekt (Manifest der Füllbilder), Themes, PDF-Namen, Ausgabe-JSON, Silhouette, Ordner der Füllbilder
LANGS = {
    "de": dict(src=ROOT / "regelwerk" / "KINETIK_Regelwerk.md", project=ROOT / "assets" / "pdf", theme_dir=ROOT / "assets" / "pdf-themes",
               pdf="KINETIK_Regelwerk", json="rulebook.json", sil="koerper-silhouette.svg", fill_dir="img"),
    "en": dict(src=ROOT / "regelwerk" / "KINETIK_Regelwerk.en.md", project=ROOT / "assets" / "pdf-en", theme_dir=ROOT / "assets" / "pdf-themes-en",
               pdf="KINETIK_Rulebook", json="rulebook.en.json", sil="koerper-silhouette.en.svg", fill_dir="img/en"),
}
KEY_SOURCE = LANGS["de"]["src"]

WIDTH = {"ch": 1400, "sec": 1000, "fill": 1000}
THEME_DIR = LANGS["de"]["theme_dir"]
PIXEL_THEMES = {"pixel"}   # Pixelbilder verlustfrei speichern, die Seite skaliert sie ungeglättet


def render(md, lang="de"):
    html = markdown.markdown(md, extensions=["tables", "sane_lists"])
    sil = LANGS[lang]["sil"]
    html = html.replace(f"../assets/grafiken/{sil}", f"img/{sil}")
    html = re.sub(r"<table>", '<div class="tablewrap"><table>', html)
    html = html.replace("</table>", "</table></div>")
    # Bilder, die allein in einem Absatz stehen, werden Abbildungen mit Beschriftung
    html = re.sub(
        r'<p>\s*<img alt="([^"]*)" src="([^"]*)"\s*/?>\s*</p>',
        r'<figure class="md-figure"><img src="\2" alt="\1" loading="lazy"><figcaption>\1</figcaption></figure>',
        html,
    )
    return html


def manifest_of(lang):
    return json.loads((LANGS[lang]["project"] / "images.json").read_text(encoding="utf-8"))


def image(key, kind, written, lang="de", manifest=None):
    """Konvertiert das Bild zu `key` (falls vorhanden) und liefert den Dateinamen oder None.

    Füllbilder (`fill-…`) setzt das PDF nur dort ein, wo es eine Lücke gefunden hat (Eintrag "active" im Manifest der Sprache).
    Alte Füllbilder ohne aktive Lücke bleiben auf der Platte liegen und dürfen weder im PDF noch hier erscheinen.
    Alles andere ist für alle Sprachen dasselbe Bild (img/<schlüssel>.webp); Füllbilder liegen je Sprache (img/<sprache>/)."""
    L = LANGS[lang]
    if key.startswith("fill-"):
        entry = (manifest or {}).get(key, {})
        if not (entry.get("kind") == "filler" and entry.get("active")):
            return None
        src = L["project"] / "images" / f"{key}.jpg"
        rel = f"{L['fill_dir']}/{key}.webp"
        token = f"{lang}:{key}"
    else:
        src = IMG_SRC / f"{key}.jpg"
        rel = f"img/{key}.webp"
        token = key
    if not src.exists():
        return None
    dst = OUT / rel
    if token not in written:
        dst.parent.mkdir(parents=True, exist_ok=True)
        im = Image.open(src).convert("RGB")
        w = WIDTH[kind]
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=76, method=6)
        written.add(token)
    return rel


def kind_of(key):
    return "ch" if key == "cover" or key.startswith("ch-") else "sec"


def themed_images():
    """Konvertiert die Bildsätze der Themes. Liefert {theme: [schlüssel, ...]}."""
    out = {}
    if not THEME_DIR.exists():
        return out
    for tdir in sorted(THEME_DIR.iterdir()):
        src_dir = tdir / "images"
        if not src_dir.is_dir():
            continue
        keys = []
        for src in sorted(src_dir.glob("*.jpg")):
            key = src.stem
            if key == "background" or key.startswith("fill-"):
                continue
            dst = OUT / "img" / tdir.name / f"{key}.webp"
            dst.parent.mkdir(parents=True, exist_ok=True)
            im = Image.open(src).convert("RGB")
            w = WIDTH[kind_of(key)]
            if tdir.name in PIXEL_THEMES:
                im.save(dst, "WEBP", lossless=True, method=6)
            else:
                if im.width > w:
                    im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                im.save(dst, "WEBP", quality=76, method=6)
            keys.append(key)
        if keys:
            out[tdir.name] = keys
    return out


def build_language(lang, md_version_of, written, themed, tokens):
    """rulebook[.<sprache>].json einer Sprache schreiben. Bilder und Bildsätze der Themes sind für alle Sprachen gemeinsam."""
    L = LANGS[lang]
    project = json.loads((L["project"] / "project.json").read_text(encoding="utf-8"))
    manifest = manifest_of(lang)
    md = L["src"].read_text(encoding="utf-8")
    key_source = KEY_SOURCE.read_text(encoding="utf-8") if lang != "de" else None
    doc = parse(md, chapter_level=project.get("chapter_level") or None, appendix_patterns=project.get("appendix_patterns", []),
                key_source=key_source)
    version = (re.search(r"Version\s+(\d+(?:\.\d+)*)", md) or [None, ""])[1]
    fill = lambda k: image(f"fill-{k}", "fill", written, lang, manifest)

    chapters = []
    for ch in doc.chapters:
        sections = []
        for s in ch.sections:
            sections.append({
                "id": s.key, "title": s.title, "html": render(s.body_md, lang),
                "image": image(s.key, "sec", written), "fill": fill(s.key),
            })
        chapters.append({
            "id": ch.key, "number": ch.number, "title": ch.title, "subtitle": ch.subtitle, "appendix": ch.appendix,
            "image": image(ch.key, "ch", written), "fill": fill(ch.key),
            "html": render(ch.intro_md, lang), "sections": sections,
        })
    cover = image("cover", "ch", written)

    # PDFs: Die Version steht im Dateinamen; je Theme nur, wenn es einen Bildsatz für das Theme gibt
    base = L["pdf"]
    pdf_name = None
    default_pdf = ROOT / "export" / f"{base}_v{version}.pdf"
    if default_pdf.exists():
        pdf_name = default_pdf.name
        shutil.copy(default_pdf, OUT / pdf_name)
    pdfs = {}
    for f in sorted((ROOT / "export").glob(f"{base}_v{version}_*.pdf")):
        m = re.fullmatch(rf"{re.escape(base)}_v{re.escape(version)}_([a-z]+)\.pdf", f.name)
        if m and m.group(1) in themed:
            shutil.copy(f, OUT / f.name)
            pdfs[m.group(1)] = f.name
    # Dateigrößen fürs Download-Menü der Seite ("noir" = das Standard-PDF)
    sizes = {t: (OUT / f).stat().st_size for t, f in pdfs.items()}
    if pdf_name:
        sizes["noir"] = (OUT / pdf_name).stat().st_size

    data = {"lang": lang, "version": version, "title": doc.title or "KINETIK", "intro": render(doc.intro_md, lang), "cover": cover,
            "pdf": pdf_name, "themed": themed, "pdfs": pdfs, "pdfSizes": sizes, "chapters": chapters}
    (OUT / L["json"]).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    return version, len(chapters), sum(len(c["sections"]) for c in chapters), sorted(pdfs)


def main():
    ap = argparse.ArgumentParser(description="Baut public/rulebook/ der Web-App (rulebook[.<sprache>].json, Bilder, PDFs).")
    ap.add_argument("--langs", default=",".join(LANGS), help="Sprachen, kommagetrennt (Standard: alle). Der Ordner wird immer ganz neu aufgebaut.")
    args = ap.parse_args()
    langs = [l for l in args.langs.split(",") if l in LANGS and LANGS[l]["src"].exists()]
    if "de" not in langs:
        sys.exit("Die deutsche Fassung ist die Grundlage (Bilder, Schlüssel) und muss mitgebaut werden.")

    # Inhalt leeren statt den Ordner zu löschen: der Vite-Entwicklungsserver merkt sich sonst veraltete Dateilisten.
    (OUT / "img").mkdir(parents=True, exist_ok=True)
    for old in OUT.iterdir():
        if old.is_dir():
            for f in old.rglob("*"):
                if f.is_file():
                    f.unlink()
            for d in sorted((d for d in old.rglob("*") if d.is_dir()), reverse=True):
                d.rmdir()
        else:
            old.unlink()
    for lang in langs:
        sil = LANGS[lang]["sil"]
        shutil.copy(ROOT / "assets" / "grafiken" / sil, OUT / "img" / sil)
    written = set()
    themed = themed_images()
    # Körpersilhouette (2.3) je Look in dessen Farben (gleiche --term-*-Werte wie im VTT); "koerper-silhouette" in der Liste der Schlüssel,
    # die Datei gibt es je Sprache (koerper-silhouette.svg, koerper-silhouette.en.svg)
    import themed_silhouette
    tokens = themed_silhouette.term_tokens()
    for theme in themed:
        for lang in langs:
            name = LANGS[lang]["sil"]
            (OUT / "img" / theme / name).write_text(themed_silhouette.make(theme, tokens, lang), encoding="utf-8")
        themed[theme].append("koerper-silhouette")

    for lang in langs:
        version, n_ch, n_sec, pdfs = build_language(lang, None, written, themed, tokens)
        print(f"[{lang}] Regelwerk v{version}: {n_ch} Kapitel, {n_sec} Abschnitte, PDFs: {', '.join(pdfs) or 'nur Standard'}")
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"{len([w for w in written if ':' not in w])} Bilder, {len([w for w in written if ':' in w])} Füllbilder (übersetzt), "
          f"Bildsätze: {', '.join(f'{t} ({len(k)})' for t, k in themed.items()) or 'keine'}, {size // 1024} KB")


if __name__ == "__main__":
    main()
