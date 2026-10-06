#!/usr/bin/env python3
"""Lädt die Latin-Teilmenge einiger Theme-Schriften als woff2 von Google Fonts (alle SIL OFL) nach
tools/kinetik-vtt/src/assets/fonts. Nur nötig, wenn eine Datei fehlt."""
import re
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "tools" / "kinetik-vtt" / "src" / "assets" / "fonts"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36"
# (Familie, Gewichte, Dateipräfix)
FONTS = [
    ("Bangers", [400], "bangers"),
    ("Rye", [400], "rye"),
    ("Arvo", [400, 700], "arvo"),
    ("Shippori Mincho", [700, 800], "shippori"),
    ("Zen Kaku Gothic New", [400, 700], "zenkaku"),
    ("Courier Prime", [400, 700], "courierprime"),
]


def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read()


for fam, weights, prefix in FONTS:
    css = get(f"https://fonts.googleapis.com/css2?family={fam.replace(' ', '+')}:wght@{';'.join(map(str, weights))}&display=swap").decode()
    for block in re.findall(r"/\* (\S+) \*/\s*@font-face \{(.*?)\}", css, re.S):
        subset, body = block
        if subset != "latin":
            continue
        w = re.search(r"font-weight:\s*(\d+)", body).group(1)
        url = re.search(r"url\((https://[^)]+\.woff2)\)", body).group(1)
        path = OUT / f"{prefix}-{w}-latin.woff2"
        path.write_bytes(get(url))
        print(path.name, path.stat().st_size, "B")
