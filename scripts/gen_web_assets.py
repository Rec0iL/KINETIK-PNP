#!/usr/bin/env python3
"""Erzeugt die Grafiken der Web-App (tools/kinetik-vtt/public/art) mit Krea 2 in ComfyUI.

Nutzt den Client und die Modell-Einstellungen des PDF-Projekts (tools/rulebook-pdf, assets/pdf/project.json).
ComfyUI muss laufen (Standard http://127.0.0.1:8188).

    python3 scripts/gen_web_assets.py            # alles, vorhandene Dateien werden übersprungen
    python3 scripts/gen_web_assets.py --force    # alles neu
    python3 scripts/gen_web_assets.py hero card-gm
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "rulebook-pdf"))

from PIL import Image, ImageEnhance, ImageOps, ImageStat  # noqa: E402
from rpdf.comfy import Comfy, ComfyError  # noqa: E402

OUT = ROOT / "tools" / "kinetik-vtt" / "public" / "art"
project = json.loads((ROOT / "assets" / "pdf" / "project.json").read_text(encoding="utf-8"))
cfg = project["comfy"]
STYLE = project["style"]
NEGATIVE = project["negative"]

# name, Prompt, Erzeugungsgröße, Zielgröße, Helligkeit
ASSETS = [
    ("hero", "wide establishing shot of a rain-soaked neon city street at night, a lone gunslinger in a long coat and a martial artist in a fighting stance facing each other in the distance, steam from manholes, reflections on wet asphalt, no text", (1600, 896), (1600, 896), 0.85),
    ("card-player", "a martial artist in mid-air roundhouse kick in a rainy alley, motion lines, cyan neon rim light on one side and amber light on the other, dynamic action pose, no text", (960, 600), (800, 500), 1.0),
    ("card-join", "four silhouettes of heroes walking side by side into a neon-lit alley at night, rain, glowing signs in the background, no text", (960, 600), (800, 500), 1.0),
    ("card-gm", "a lone figure seen from behind in a dark control room, a glowing holographic city map table and many monitors, cyan and amber light, no text", (960, 600), (800, 500), 1.0),
    ("card-builder", "close-up of a hand drawing a glowing technique diagram of a martial arts strike on a dark dojo wall, chalk lines and light trails, cyan and amber glow, no text", (960, 600), (800, 500), 1.0),
    ("portrait", "anonymous hero character portrait, hooded jacket, face half in shadow, neon rim light cyan and amber, rain droplets, chest-up, centered, no text", (768, 960), (384, 480), 1.0),
    ("map-lagerhaus", "top-down orthographic battle map of a warehouse interior floor plan, concrete floor, wooden crates, steel shelves, a glass-walled office, loading dock doors, oil stains, moody lighting, tabletop RPG battlemap, no grid, no characters, no text", (1536, 1024), (2048, 1365), 1.0),
]


def trim_bars(img, threshold=9):
    """Schneidet schwarze Balken (Letterbox) oben und unten ab, die manche Bilder mitbringen."""
    g = img.convert("L")
    w, h = g.size
    def dark(y):
        return ImageStat.Stat(g.crop((0, y, w, y + 1))).mean[0] < threshold
    top = 0
    while top < h // 4 and dark(top):
        top += 1
    bottom = h
    while bottom > h - h // 4 and dark(bottom - 1):
        bottom -= 1
    return img.crop((0, top, w, bottom)) if (top or bottom < h) else img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    comfy = Comfy(cfg["url"])
    if not comfy.alive():
        sys.exit(f"ComfyUI nicht erreichbar unter {cfg['url']}")
    Comfy.check_config(cfg)
    OUT.mkdir(parents=True, exist_ok=True)

    todo = [a for a in ASSETS if not args.names or a[0] in args.names]
    for i, (name, prompt, size, target, bright) in enumerate(todo):
        path = OUT / f"{name}.webp"
        if path.exists() and not args.force:
            print(f"{name}: vorhanden, übersprungen")
            continue
        print(f"{name}: erzeuge {size[0]}x{size[1]} ...", flush=True)
        wf = Comfy.build_workflow(cfg, f"{prompt}. {STYLE}", NEGATIVE, size[0], size[1], 1000 + i)
        try:
            img = comfy.generate(wf, timeout=900)
        except ComfyError as e:
            print(f"{name}: FEHLER {e}", flush=True)
            continue
        img = trim_bars(img)
        if img.size != target:
            img = ImageOps.fit(img, target, Image.LANCZOS)
        if bright != 1.0:
            img = ImageEnhance.Brightness(img).enhance(bright)
        img.save(path, "WEBP", quality=82, method=6)
        print(f"{name}: gespeichert ({path.stat().st_size // 1024} KB)", flush=True)


if __name__ == "__main__":
    main()
