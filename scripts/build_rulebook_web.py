#!/usr/bin/env python3
"""Baut das Regelwerk für die Web-App: Kapitel und Abschnitte als HTML plus die Bilder des PDFs (als WebP).

Quelle ist dieselbe wie beim PDF: regelwerk/KINETIK_Regelwerk.md, geteilt mit dem Parser aus tools/rulebook-pdf,
und die Bilder aus assets/pdf/images (zugeordnet über Kapitel- und Abschnittsschlüssel wie "sec-2-4-...").

    python3 scripts/build_rulebook_web.py

Ausgabe: tools/kinetik-vtt/public/rulebook/ (rulebook.json, img/*.webp, das PDF zum Herunterladen).
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

WIDTH = {"ch": 1400, "sec": 1000, "fill": 1000}


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
    """Konvertiert das Bild zu `key` (falls vorhanden) und liefert den Dateinamen oder None."""
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


def main():
    md = SRC.read_text(encoding="utf-8")
    doc = parse(md, chapter_level=PROJECT.get("chapter_level") or None, appendix_patterns=PROJECT.get("appendix_patterns", []))
    version = (re.search(r"Version\s+(\d+(?:\.\d+)*)", md) or [None, ""])[1]

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "img").mkdir(parents=True)
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
    pdf = sorted((ROOT / "export").glob(f"KINETIK_Regelwerk_v{version}*.pdf"))
    pdf_name = None
    if pdf:
        pdf_name = "KINETIK_Regelwerk.pdf"
        shutil.copy(pdf[-1], OUT / pdf_name)

    data = {"version": version, "title": doc.title or "KINETIK", "intro": render(doc.intro_md), "cover": cover, "pdf": pdf_name, "chapters": chapters}
    (OUT / "rulebook.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"Regelwerk v{version}: {len(chapters)} Kapitel, {sum(len(c['sections']) for c in chapters)} Abschnitte, {len(written)} Bilder, {size // 1024} KB")


if __name__ == "__main__":
    main()
