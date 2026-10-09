#!/usr/bin/env python3
"""Erzeugt die Körpersilhouette (Regel 2.3) in den Farben jedes Looks: assets/grafiken/koerper-silhouette-<theme>.svg.

Die Farben kommen aus denselben --term-*-Werten, die auch die Silhouette im VTT benutzt (tools/kinetik-vtt/src/themes/themes.css),
damit PDF, Web-Regelwerk und Charakterbogen gleich aussehen. Neo-Noir behält die Originalgrafik (assets/grafiken/koerper-silhouette.svg).

    python3 scripts/themed_silhouette.py            # alle Looks
    python3 scripts/themed_silhouette.py wushu      # einer
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "grafiken" / "koerper-silhouette.svg"
CSS = ROOT / "tools" / "kinetik-vtt" / "src" / "themes" / "themes.css"
THEMES = ["sincity", "wushu", "pixel", "manga", "ukiyo", "western", "akte", "terminal", "hybrid"]


def term_tokens():
    """{theme: {bg, fg, dim, line, fill, lead}} aus themes.css; was ein Theme nicht setzt, erbt es von Neo-Noir (:root)."""
    css = CSS.read_text(encoding="utf-8")
    blocks = {}
    for m in re.finditer(r"(:root,\s*:root\[data-theme='noir'\]|:root\[data-theme='(\w+)'\])\s*\{(.*?)\n\}", css, re.S):
        name = m.group(2) or "noir"
        blocks[name] = dict(re.findall(r"--term-(\w+):\s*([^;]+);", m.group(3)))
    base = blocks["noir"]
    return {t: {**base, **blocks.get(t, {})} for t in blocks}


def rgb(v):
    v = v.strip()
    if v.startswith("#"):
        v = v if len(v) == 7 else "#" + "".join(c * 2 for c in v[1:])
        return [int(v[i:i + 2], 16) for i in (1, 3, 5)], 1.0
    parts = [float(x) for x in re.match(r"rgba?\(([^)]+)\)", v).group(1).split(",")]
    return parts[:3], parts[3] if len(parts) > 3 else 1.0


def hex_of(v, over=None):
    """#rrggbb. Halbtransparente Werte (rgba) werden über der Hintergrundfarbe `over` zu einer festen Farbe gemischt."""
    (r, g, b), a = rgb(v)
    if a < 1 and over:
        (br, bg_, bb), _ = rgb(over)
        r, g, b = r * a + br * (1 - a), g * a + bg_ * (1 - a), b * a + bb * (1 - a)
    return "#%02x%02x%02x" % (round(r), round(g), round(b))


def make(theme, tokens):
    t = tokens[theme]
    svg = SRC.read_text(encoding="utf-8")
    sub = {
        "#12352b": hex_of(t["fill"], t["bg"]),   # Zonen
        "#1fc28b": hex_of(t["line"]),   # Umriss, Kästchen, Titel
        "#8aa39a": hex_of(t["dim"], t["bg"]),    # gestrichelte Innenlinie
        "#0d1015": hex_of(t["bg"]),     # Kästchen innen
        "#e6edf0": hex_of(t["fg"]),     # Beschriftung
        "#8f9ca3": hex_of(t["dim"], t["bg"]),    # Legende
        "#2d5a4b": hex_of(t["lead"], t["bg"]),   # Hilfslinien
        "#10141a": hex_of(t["bg"]),     # Hintergrund
    }
    for old, new in sub.items():
        svg = svg.replace(old, new)
    line = hex_of(t["line"])
    # Ring und Rahmen aus dem Linienton, damit die Fläche auf jeder Seitenfarbe als Karte erkennbar bleibt
    svg = svg.replace('stroke="#1a2a29" stroke-width="1.5"', f'stroke="{line}" stroke-opacity="0.18" stroke-width="1.5"')
    svg = svg.replace('rx="14" fill="%s"' % hex_of(t["bg"]), f'rx="14" fill="{hex_of(t["bg"])}" stroke="{line}" stroke-opacity="0.45" stroke-width="2"')
    return svg


def main():
    tokens = term_tokens()
    for theme in sys.argv[1:] or THEMES:
        out = ROOT / "assets" / "grafiken" / f"koerper-silhouette-{theme}.svg"
        out.write_text(make(theme, tokens), encoding="utf-8")
        print(f"{theme}: {out.relative_to(ROOT)}  Hintergrund {hex_of(tokens[theme]['bg'])}, Linie {hex_of(tokens[theme]['line'])}, Füllung {hex_of(tokens[theme]['fill'])}")


if __name__ == "__main__":
    main()
