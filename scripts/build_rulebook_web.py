#!/usr/bin/env python3
"""Baut das Regelwerk für die Web-App: Kapitel und Abschnitte als HTML plus die Bilder des PDFs (als WebP).

Quelle ist dieselbe wie beim PDF: regelwerk/KINETIK_Regelwerk.md, geteilt mit dem Parser aus tools/rulebook-pdf,
und die Bilder aus assets/pdf/images (zugeordnet über Kapitel- und Abschnittsschlüssel wie "sec-2-4-...").

    python3 scripts/build_rulebook_web.py

Bildsätze je Theme: Liegt unter assets/pdf-themes/<theme>/images/ ein Satz (erzeugt von scripts/gen_rulebook_themes.py),
landet er als img/<theme>/<schlüssel>.webp in der Ausgabe; rulebook.json nennt unter "themed", welche Schlüssel es je Theme gibt.
Die Seite nimmt dann automatisch die Bilder des gewählten Themes (fehlende Schlüssel: die Standardbilder). Standard ist noir.

PDFs je Theme: export/KINETIK_Regelwerk_<theme>.pdf (erzeugt von gen_rulebook_themes.py --pdf) wird als KINETIK_Regelwerk_<theme>.pdf
mitgeliefert, rulebook.json nennt sie unter "pdfs". Die Download-Schaltfläche der Seite bietet das PDF zum gewählten Theme an.

Ausgabe: tools/kinetik-vtt/public/rulebook/ (rulebook.json, img/*.webp, img/<theme>/*.webp, die PDFs zum Herunterladen).
"""
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

SRC = ROOT / "regelwerk" / "KINETIK_Regelwerk.md"
IMG_SRC = ROOT / "assets" / "pdf" / "images"
OUT = ROOT / "tools" / "kinetik-vtt" / "public" / "rulebook"
PROJECT = json.loads((ROOT / "assets" / "pdf" / "project.json").read_text(encoding="utf-8"))
MANIFEST = json.loads((ROOT / "assets" / "pdf" / "images.json").read_text(encoding="utf-8"))

WIDTH = {"ch": 1400, "sec": 1000, "fill": 1000}
THEME_DIR = ROOT / "assets" / "pdf-themes"
PIXEL_THEMES = {"pixel"}   # Pixelbilder verlustfrei speichern, die Seite skaliert sie ungeglättet


def render(md):
    html = markdown.markdown(md, extensions=["tables", "sane_lists"])
    html = html.replace("../assets/grafiken/koerper-silhouette.svg", "img/koerper-silhouette.svg")
    html = re.sub(r"<table>", '<div class="tablewrap"><table>', html)
    html = html.replace("</table>", "</table></div>")
    # Bilder, die allein in einem Absatz stehen, werden Abbildungen mit Beschriftung
    html = re.sub(
        r'<p>\s*<img alt="([^"]*)" src="([^"]*)"\s*/?>\s*</p>',
        r'<figure class="md-figure"><img src="\2" alt="\1" loading="lazy"><figcaption>\1</figcaption></figure>',
        html,
    )
    return html


def image(key, kind, written):
    """Konvertiert das Bild zu `key` (falls vorhanden) und liefert den Dateinamen oder None.

    Füllbilder (`fill-…`) setzt das PDF nur dort ein, wo es eine Lücke gefunden hat (Eintrag "active" im Manifest).
    Alte Füllbilder ohne aktive Lücke bleiben auf der Platte liegen und dürfen weder im PDF noch hier erscheinen."""
    entry = MANIFEST.get(key, {})
    if key.startswith("fill-") and not (entry.get("kind") == "filler" and entry.get("active")):
        return None
    src = IMG_SRC / f"{key}.jpg"
    if not src.exists():
        return None
    dst = OUT / "img" / f"{key}.webp"
    if key not in written:
        im = Image.open(src).convert("RGB")
        w = WIDTH[kind]
        if im.width > w:
            im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=76, method=6)
        written.add(key)
    return f"img/{key}.webp"


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


def main():
    md = SRC.read_text(encoding="utf-8")
    doc = parse(md, chapter_level=PROJECT.get("chapter_level") or None, appendix_patterns=PROJECT.get("appendix_patterns", []))
    version = (re.search(r"Version\s+(\d+(?:\.\d+)*)", md) or [None, ""])[1]

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
    shutil.copy(ROOT / "assets" / "grafiken" / "koerper-silhouette.svg", OUT / "img" / "koerper-silhouette.svg")
    written = set()

    chapters = []
    for ch in doc.chapters:
        sections = []
        for s in ch.sections:
            sections.append({
                "id": s.key, "title": s.title, "html": render(s.body_md),
                "image": image(s.key, "sec", written), "fill": image(f"fill-{s.key}", "fill", written),
            })
        chapters.append({
            "id": ch.key, "number": ch.number, "title": ch.title, "subtitle": ch.subtitle, "appendix": ch.appendix,
            "image": image(ch.key, "ch", written), "fill": image(f"fill-{ch.key}", "fill", written),
            "html": render(ch.intro_md), "sections": sections,
        })

    cover = image("cover", "ch", written)
    themed = themed_images()
    pdf = sorted((ROOT / "export").glob(f"KINETIK_Regelwerk_v{version}*.pdf"))
    pdf_name = None
    if pdf:
        pdf_name = "KINETIK_Regelwerk.pdf"
        shutil.copy(pdf[-1], OUT / pdf_name)

    pdfs = {}
    for f in sorted((ROOT / "export").glob("KINETIK_Regelwerk_*.pdf")):
        m = re.fullmatch(r"KINETIK_Regelwerk_([a-z]+)\.pdf", f.name)
        if m and m.group(1) in themed:
            shutil.copy(f, OUT / f.name)
            pdfs[m.group(1)] = f.name

    data = {"version": version, "title": doc.title or "KINETIK", "intro": render(doc.intro_md), "cover": cover, "pdf": pdf_name, "themed": themed, "pdfs": pdfs, "chapters": chapters}
    (OUT / "rulebook.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"Regelwerk v{version}: {len(chapters)} Kapitel, {sum(len(c['sections']) for c in chapters)} Abschnitte, {len(written)} Bilder, Bildsätze: {', '.join(f'{t} ({len(k)})' for t, k in themed.items()) or 'keine'}, PDFs: {', '.join(pdfs) or 'nur Standard'}, {size // 1024} KB")


if __name__ == "__main__":
    main()
