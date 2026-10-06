#!/usr/bin/env python3
"""Erzeugt die gebündelten Theme-Schriften (woff2, nur Latin) aus lokalen OFL-Fonts.

Quellen (alle SIL OFL): Press Start 2P, Silkscreen, Big Shoulders, Tektur (Google Fonts), Noto Serif CJK SC.
VT323 und Special Elite liegen direkt als woff2 von Google Fonts im Ordner.
Pfade anpassen, falls die Fonts woanders liegen.
"""
import glob
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

OUT = Path(__file__).resolve().parent.parent / "tools" / "kinetik-vtt" / "src" / "assets" / "fonts"
LATIN = list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x131, 0x152, 0x153, 0x2013, 0x2014, 0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E, 0x2022, 0x2026, 0x20AC, 0x2122, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0xD7]
# Wenige CJK-Zeichen als Zierde für das Wushu-Theme (武 Kampf, 道 Weg, 拳 Faust, 気 Qi, 剣 Schwert, 力 Kraft, 心 Herz, 勝 Sieg)
CJK = [ord(c) for c in "武道拳気剣力心勝功夫龍虎"]


def save(font, name, unicodes):
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["kern", "liga", "calt", "locl"]
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13]
    s = subset.Subsetter(opts)
    s.populate(unicodes=unicodes)
    s.subset(font)
    path = OUT / name
    font.flavor = "woff2"
    font.save(path)
    print(name, path.stat().st_size, "B")


def first(pattern):
    hits = sorted(glob.glob(pattern, recursive=True))
    if not hits:
        raise SystemExit(f"nicht gefunden: {pattern}")
    return hits[0]


# Pixel
save(TTFont(first("/home/*/.platformio_py310/lib/python3.10/site-packages/ledfx_assets/fonts/PressStart2P.ttf")), "pressstart2p-latin.woff2", LATIN)
save(TTFont(first("/mnt/nvme-data/flatpak/app/com.adilhanney.ricochlime/x86_64/stable/*/files/bin/data/flutter_assets/assets/google_fonts/Silkscreen/Silkscreen-Regular.ttf")), "silkscreen-400-latin.woff2", LATIN)
save(TTFont(first("/mnt/nvme-data/flatpak/app/com.adilhanney.ricochlime/x86_64/stable/*/files/bin/data/flutter_assets/assets/google_fonts/Silkscreen/Silkscreen-Bold.ttf")), "silkscreen-700-latin.woff2", LATIN)

# Sin City: Big Shoulders in Schwarz und Halbfett
for w, f in ((900, "big-shoulders-900.ttf"), (700, "big-shoulders-700.ttf")):
    save(TTFont(first(f"/home/*/.local/share/fonts/big-shoulders/{f}")), f"bigshoulders-{w}-latin.woff2", LATIN)

# Hybrid: Tektur (Techno-Display)
for w in (500, 700, 900):
    save(TTFont(first(f"/home/*/.local/share/fonts/tektur/tektur-{w}.ttf")), f"tektur-{w}-latin.woff2", LATIN)

# Wushu: Noto Serif CJK SC als Variable Font, Gewichte 400 / 700 / 900
ttc = first("/usr/share/fonts/google-noto-serif-cjk-vf-fonts/NotoSerifCJK-VF.ttc")
from fontTools.ttLib import TTCollection
col = TTCollection(ttc)
sc = next(f for f in col.fonts if "SC" in f["name"].getDebugName(1))
for w in (400, 700, 900):
    f = instancer.instantiateVariableFont(TTFont(ttc, fontNumber=col.fonts.index(sc)), {"wght": w}, inplace=False)
    save(f, f"notoserif-{w}-latin.woff2", LATIN)
f = instancer.instantiateVariableFont(TTFont(ttc, fontNumber=col.fonts.index(sc)), {"wght": 900}, inplace=False)
save(f, "notoserif-900-cjk.woff2", CJK)
