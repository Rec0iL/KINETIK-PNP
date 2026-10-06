#!/usr/bin/env python3
"""Erzeugt die Grafiken der Web-App (tools/kinetik-vtt/public/art/<theme>) mit Krea 2 in ComfyUI.

Nutzt den Client und die Modell-Einstellungen des PDF-Projekts (tools/rulebook-pdf, assets/pdf/project.json).
ComfyUI muss laufen (Standard http://127.0.0.1:8188).

Jedes Theme hat einen eigenen Satz (hero, vier Karten, portrait) mit eigenem Stil und eigener Nachbearbeitung.
Hybrid benutzt die Bilder von noir. Die Karte (map-lagerhaus) liegt themenunabhängig in art/.

    python3 scripts/gen_web_assets.py                         # alle Themes, vorhandene Dateien werden übersprungen
    python3 scripts/gen_web_assets.py --theme sincity         # nur ein Theme
    python3 scripts/gen_web_assets.py --theme wushu hero      # nur einzelne Bilder
    python3 scripts/gen_web_assets.py --force --seed 7 ...    # neu würfeln (anderer Seed)
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "rulebook-pdf"))

from PIL import Image, ImageEnhance, ImageFilter, ImageOps, ImageStat  # noqa: E402
from rpdf.comfy import Comfy, ComfyError  # noqa: E402

OUT = ROOT / "tools" / "kinetik-vtt" / "public" / "art"
project = json.loads((ROOT / "assets" / "pdf" / "project.json").read_text(encoding="utf-8"))
cfg = project["comfy"]
BASE_NEGATIVE = project["negative"]

# Größen je Bild: (Erzeugung, Ziel). Karten werden 800x500, Hero 1600x896, Porträt 384x480.
SIZES = {
    "hero": ((1600, 896), (1600, 896)),
    "card-player": ((960, 600), (800, 500)),
    "card-join": ((960, 600), (800, 500)),
    "card-gm": ((960, 600), (800, 500)),
    "card-builder": ((960, 600), (800, 500)),
    "portrait": ((768, 960), (384, 480)),
}

# theme -> Stil, Zusatz zum Negativ-Prompt, Nachbearbeitung, Motive
THEMES = {
    "noir": {
        "style": project["style"],
        "negative": "",
        "post": None,
        "brightness": {"hero": 0.85},
        "subjects": {
            "hero": "wide establishing shot of a rain-soaked neon city street at night, a lone gunslinger in a long coat and a martial artist in a fighting stance facing each other in the distance, steam from manholes, reflections on wet asphalt, no text",
            "card-player": "a martial artist in mid-air roundhouse kick in a rainy alley, motion lines, cyan neon rim light on one side and amber light on the other, dynamic action pose, no text",
            "card-join": "four silhouettes of heroes walking side by side into a neon-lit alley at night, rain, glowing signs in the background, no text",
            "card-gm": "a lone figure seen from behind in a dark control room, a glowing holographic city map table and many monitors, cyan and amber light, no text",
            "card-builder": "close-up of a hand drawing a glowing technique diagram of a martial arts strike on a dark dojo wall, chalk lines and light trails, cyan and amber glow, no text",
            "portrait": "anonymous hero character portrait, hooded jacket, face half in shadow, neon rim light cyan and amber, rain droplets, chest-up, centered, no text",
        },
    },
    "terminal": {
        "style": "monochrome green phosphor CRT screen graphic, glowing green vector wireframe lines on a pure black background, scanlines, 1980s hacker computer terminal aesthetic, technical schematic, high contrast, only shades of green, no text",
        "negative": "color photo, blue, red, orange, yellow, painting, realistic shading, text, letters, numbers",
        "post": "phosphor",
        "subjects": {
            "hero": "wide wireframe vector city skyline at night over a perspective grid floor, a lone gunslinger silhouette and a martial artist silhouette facing each other in the distance, radar sweep arc in the sky",
            "card-player": "wireframe vector figure of a martial artist performing a flying kick, motion trails, targeting reticle and HUD brackets around it",
            "card-join": "four wireframe silhouettes walking side by side into a glowing grid tunnel corridor, data streams on the walls, perspective vanishing point",
            "card-gm": "top-down tactical radar display of a city map with contact blips and waypoints, concentric range rings, command center HUD",
            "card-builder": "technical blueprint diagram of a martial arts strike on a wireframe skeleton, angle arcs and trajectory curves, measurement ticks, no text",
            "portrait": "anonymous hero silhouette portrait made of vector wireframe and halftone dots, hooded figure, chest-up, centered",
        },
    },
    "sincity": {
        "style": "stark black and white graphic novel ink art, extreme contrast, pure black and pure white with almost no gray, hard-edged shadow shapes, white silhouettes cut out of solid black, rain as white streaks, thick brush ink linework, exactly one small vivid red accent on a single element, hard-boiled crime comic noir",
        "negative": "color photo, many colors, blue, green, soft gradients, gray tones, anime, text, letters, speech bubbles",
        "post": "spotred",
        "subjects": {
            "hero": "wide city street at night in heavy rain, a lone man in a long trench coat and a woman in a red dress facing each other in the distance, white rain streaks, a street lamp throwing a hard white pool of light, black buildings with a few lit windows",
            "card-player": "a martial artist in a mid-air kick, white silhouette against a solid black alley wall, hard white light shape, a red scarf trailing behind",
            "card-join": "four figures walking side by side down a rain-soaked alley seen from behind, white outlines against black, one wearing a red tie, white puddle reflections",
            "card-gm": "a lone man in a fedora seen from behind in a dark office, venetian blind shadows slashing across the wall in white stripes, a desk lamp, cigarette smoke, a red telephone on the desk",
            "card-builder": "a hand drawing a martial arts technique diagram with white chalk on a solid black wall, bold white linework and arrows, one red arrow",
            "portrait": "noir portrait of an anonymous hero in a hat with a trench coat collar turned up, half of the face in solid black shadow and half in pure white light, red lips, chest-up, centered",
        },
    },
    "wushu": {
        "style": "traditional Chinese ink wash painting in a wuxia martial arts film style, expressive black brush strokes, soft grey ink washes, misty mountains, aged rice paper texture on a warm off-white background, a few vermilion red accents and one small red seal stamp, elegant negative space, painterly",
        "negative": "photograph, 3d render, neon, cyberpunk, anime, text, letters, chinese characters, calligraphy, watermark",
        "post": "paper",
        "subjects": {
            "hero": "wide misty mountain valley with a stone temple on a cliff, two martial artists in flowing robes facing each other in a bamboo grove clearing in the distance, swirling mist, falling leaves",
            "card-player": "a kung fu master in a mid-air flying kick with flowing robes, ink splashes as motion, a vermilion sash",
            "card-join": "four warriors walking side by side along a stone path through a bamboo forest in mist, seen from behind, paper lanterns",
            "card-gm": "an old master sitting at a low table in a mountain pavilion overlooking misty peaks, an unrolled scroll map, a tea set, soft lantern glow",
            "card-builder": "a hand holding a calligraphy brush painting a martial arts movement on a scroll, ink trails showing strike arcs, a red seal stamp",
            "portrait": "portrait of an anonymous martial artist wearing a bamboo hat and a cloth mask with the face hidden in shadow, ink wash, chest-up, centered, a vermilion scarf",
        },
    },
    "pixel": {
        "style": "16-bit pixel art, crisp square pixels, limited vibrant color palette, dithering, retro arcade video game illustration, SNES era, strong dark outlines, no anti-aliasing",
        "negative": "photo, realistic, smooth gradients, blurry, anti-aliasing, 3d render, text, letters, numbers, UI",
        "post": "pixel",
        "subjects": {
            "hero": "wide pixel art cyberpunk city street at night with neon signs and rain, a gunslinger in a long coat and a martial artist in a fighting stance facing each other, side-scrolling beat-em-up stage background",
            "card-player": "pixel art fighting game character, a martial artist performing a flying kick with a bright hit spark effect, arcade action",
            "card-join": "four pixel art heroes as an RPG party walking to the right in a neon alley, side view",
            "card-gm": "pixel art control room seen from behind, a person at a glowing map table with tiny figurines, big CRT monitors showing blank maps and radar blips, dark cozy room, no text, no letters",
            "card-builder": "pixel art RPG skill tree menu with glowing move icons connected by lines, ability screen, no text",
            "portrait": "pixel art character portrait of a hooded hero with the face in shadow, RPG dialogue portrait, chest-up, centered",
        },
    },
    "hybrid": {
        "style": "cyberpunk holographic interface aesthetic, deep indigo darkness with hot magenta and electric cyan light, glowing HUD overlays and wireframe grids blended into a moody neon scene, glitch artifacts, volumetric haze, sharp digital illustration",
        "negative": "text, letters, numbers, daylight, pastel, watercolor, photo",
        "post": None,
        "subjects": {
            "hero": "wide cyberpunk rooftop at night, a lone hacker in a long coat and a martial artist in a fighting stance facing each other, a huge holographic wireframe city and data streams floating in the sky, magenta and cyan light",
            "card-player": "a martial artist in a mid-air kick with holographic HUD targeting brackets and wireframe motion trails around the body, magenta and cyan rim light",
            "card-join": "four silhouettes walking side by side through a corridor of floating holographic panels and data streams, magenta and cyan glow",
            "card-gm": "a lone figure seen from behind at a cyberdeck with floating holographic tactical map and network graphs, magenta and cyan light",
            "card-builder": "a hand manipulating a glowing holographic wireframe skeleton showing a martial arts strike, trajectory arcs, magenta and cyan",
            "portrait": "anonymous hacker hero portrait, hood and visor, face half in shadow, holographic HUD fragments and glitch lines, magenta and cyan rim light, chest-up, centered",
        },
    },
    "manga": {
        "style": "black and white manga ink illustration, bold clean linework, screentone halftone dot shading, dramatic dynamic angle, speed lines, high contrast, white paper background, a single flat bright yellow accent color on exactly one element",
        "negative": "color photo, many colors, painting, 3d render, realistic, gray gradients, text, letters, speech bubbles, sound effects, watermark",
        "post": "spotyellow",
        "subjects": {
            "hero": "wide manga splash page of a rainy city street, a gunslinger in a long coat and a martial artist in a fighting stance facing each other in the distance, speed lines converging on them, dramatic perspective, yellow umbrella accent",
            "card-player": "a martial artist in a mid-air flying kick, strong speed lines and impact burst behind, dynamic foreshortening, a yellow scarf",
            "card-join": "four clearly different heroes walking side by side toward the viewer, a tall woman with a ponytail, a broad muscular man, a small teenager in a hood and an older man with a cane, low angle, speed lines, the teenager wears a yellow hoodie",
            "card-gm": "a mysterious figure seen from behind at a big table covered with a city map and small figurines, dramatic shadows, a yellow desk lamp glow",
            "card-builder": "close-up of a hand drawing a martial arts technique diagram with arrows on paper, manga style tools, a yellow marker line",
            "portrait": "manga character portrait of an anonymous hero with wild hair and a cold stare, half the face in screentone shadow, chest-up, centered, a yellow collar",
        },
    },
    "western": {
        "style": "vintage 1960s widescreen western film still, faded warm sepia tones, heavy film grain, dust haze, harsh low sun, anamorphic look, painterly cinematic photograph, gritty",
        "negative": "modern, neon, cyberpunk, anime, cartoon, text, letters, watermark, bright saturated colors",
        "post": "sepia",
        "subjects": {
            "hero": "wide shot of a dusty frontier town main street at high noon with wooden buildings and a water tower, a lone gunslinger in a long duster coat and a martial artist in a fighting stance facing each other in the distance, tumbleweed, heat haze",
            "card-player": "a martial artist in a mid-air kick inside a dusty saloon, splintering wooden table, dust cloud, shafts of sunlight through the doors",
            "card-join": "four riders and walkers side by side on a desert road at sunset seen from behind, long shadows, dust",
            "card-gm": "a man in a wide-brim hat seated at a saloon table seen from behind, a map and an oil lamp, cigar smoke, sunlight through window blinds",
            "card-builder": "a hand drawing a technique diagram in chalk on a weathered wooden wall of a barn, dust motes, warm light",
            "portrait": "weathered anonymous gunslinger portrait, wide-brim hat shading the eyes, bandana, stubble, dust, chest-up, centered",
        },
    },
    "ukiyo": {
        "style": "traditional Japanese ukiyo-e woodblock print, flat areas of color, bold black outlines, limited palette of deep indigo blue, cream paper, vermilion red and a little gold, stylized wave and cloud patterns, visible paper grain, elegant composition",
        "negative": "photograph, 3d render, gradients, neon, anime, text, letters, calligraphy, chinese characters, watermark",
        "post": "woodblock",
        "subjects": {
            "hero": "a great curling stylized wave beneath a pale mountain at dusk, in the foreground a small wooden bridge where a gunslinger in a long coat and a martial artist in a fighting stance face each other, drifting clouds",
            "card-player": "a martial artist in a mid-air flying kick with flowing robes above stylized waves, bold outlines, a red sash",
            "card-join": "four travelers walking side by side along a path beside the sea under a pale moon, seen from behind, stylized clouds",
            "card-gm": "an old master sitting on a veranda overlooking a sea of clouds with a map scroll and a lantern, patterned robes",
            "card-builder": "a hand with a brush painting a martial arts movement diagram on a scroll, wave patterns around, a red seal",
            "portrait": "portrait of an anonymous warrior in a patterned kimono with a straw hat shading the face, bold outlines, chest-up, centered, a red sash",
        },
    },
    "akte": {
        "style": "grainy black and white surveillance photograph, harsh flash lighting, photocopy texture, documentary evidence photo, slightly out of focus, high contrast, one red ink mark as the only color",
        "negative": "color photo, painting, anime, cartoon, neon, text, letters, numbers, watermark, timestamp",
        "post": "dossier",
        "subjects": {
            "hero": "wide high angle black and white surveillance photo of a rainy street at night, two figures facing each other under a street lamp, grainy, a red circle drawn around one of them in marker",
            "card-player": "grainy black and white security camera photo of a martial artist caught mid-kick in a parking garage, motion blur, a red arrow drawn in marker",
            "card-join": "four people walking side by side photographed with a telephoto lens, grainy black and white, a red circle drawn around one head",
            "card-gm": "top-down view of an investigator's desk covered with photos pinned together by red string, a city map, a coffee cup and paper clips, grainy black and white with red string",
            "card-builder": "close-up of hands marking a technique diagram on a photocopied sheet with a red pen, grainy black and white",
            "portrait": "grainy mugshot-style black and white photo of an anonymous man in a hood with the face half in shadow, flat flash lighting, chest-up, centered, a red stripe",
        },
    },
}


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


def post_phosphor(img, name):
    """Alles in Phosphorgrün auf Schwarz, dazu feine Scanlines."""
    g = ImageOps.autocontrast(img.convert("L"), cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(1.25)
    out = ImageOps.colorize(g, black="#010503", mid="#0f8f66", white="#9bffd2", midpoint=110)
    a = np.asarray(out).astype(np.float32)
    a[::3] *= 0.78
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def post_spotred(img, name):
    """Schwarzweiß mit hartem Kontrast, nur kräftiges Rot bleibt erhalten (Sin-City-Look)."""
    hsv = np.asarray(img.convert("HSV")).astype(np.float32)
    h, s, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    red = ((h < 14) | (h > 238)) & (s > 0.45) & (v > 0.25)
    red_mask = np.asarray(Image.fromarray((red * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    gray = np.asarray(ImageOps.autocontrast(img.convert("L"), cutoff=1)).astype(np.float32) / 255
    # harte S-Kurve: tiefes Schwarz, leuchtendes Weiß
    gray = np.clip((gray - 0.5) * 2.6 + 0.5, 0, 1)
    gray = gray ** 1.1
    rgb = np.stack([gray] * 3, axis=-1)
    redc = np.stack([np.clip(v * 1.15, 0, 1) * 0.92 + 0.08, np.clip(v * 0.05, 0, 1), np.clip(v * 0.08, 0, 1)], axis=-1)
    redc[..., 0] = np.clip(redc[..., 0], 0, 1)
    out = rgb * (1 - red_mask[..., None]) + redc * red_mask[..., None]
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def post_paper(img, name):
    """Leicht wärmen, damit alle Bilder zum Reispapier-Ton passen."""
    img = ImageEnhance.Color(img).enhance(0.92)
    a = np.asarray(img).astype(np.float32)
    a *= np.array([1.0, 0.985, 0.94])
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def post_pixel(img, name):
    """Echtes Pixelraster: auf 1/4 verkleinern, Palette begrenzen. Die App skaliert mit image-rendering: pixelated."""
    w, h = img.size
    small = img.resize((w // 4, h // 4), Image.BOX)
    small = ImageEnhance.Color(small).enhance(1.15)
    q = small.quantize(colors=40, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    return q.convert("RGB")



def _spot(img, hue_lo, hue_hi, min_sat, gain=1.0, tint=None):
    """Schwarzweiß mit hartem Kontrast; nur Farbtöne im Bereich hue_lo..hue_hi (PIL-Skala 0..255) bleiben erhalten."""
    hsv = np.asarray(img.convert("HSV")).astype(np.float32)
    h, s_, v = hsv[..., 0], hsv[..., 1] / 255, hsv[..., 2] / 255
    keep = ((h >= hue_lo) & (h <= hue_hi) if hue_lo <= hue_hi else (h >= hue_lo) | (h <= hue_hi)) & (s_ > min_sat) & (v > 0.25)
    m = np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    gray = np.asarray(ImageOps.autocontrast(img.convert("L"), cutoff=1)).astype(np.float32) / 255
    gray = np.clip((gray - 0.5) * 2.2 * gain + 0.5, 0, 1)
    rgb = np.stack([gray] * 3, axis=-1)
    col = np.asarray(img.convert("RGB")).astype(np.float32) / 255
    out = rgb * (1 - m[..., None]) + col * m[..., None]
    if tint is not None:
        out = out * np.array(tint)
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def post_spotyellow(img, name):
    """Manga: Schwarzweiß, nur das Gelb bleibt."""
    return _spot(img, 28, 62, 0.4, gain=1.1)


def post_sepia(img, name):
    """Westernfilm: Sepia-Einfärbung, Korn, Vignette."""
    g = ImageOps.autocontrast(img.convert("L"), cutoff=1)
    out = np.asarray(ImageOps.colorize(g, black="#150c06", mid="#7d5632", white="#f5e2b8", midpoint=120)).astype(np.float32)
    h, w = g.size[1], g.size[0]
    rng = np.random.default_rng(3)
    out += rng.normal(0, 7, (h, w, 1))
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    out *= (1 - 0.38 * np.clip(r - 0.45, 0, 1) ** 1.4)[..., None]
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def post_woodblock(img, name):
    """Holzschnitt: wenige flache Farben, kein Dither."""
    img = ImageEnhance.Contrast(img.convert("RGB")).enhance(1.12)
    return img.quantize(colors=14, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")


def post_dossier(img, name):
    """Akte: körniges Schwarzweiß auf Kopierpapier, nur Rot bleibt."""
    out = _spot(img, 238, 14, 0.4, gain=0.9, tint=(0.95, 0.9, 0.78))
    a = np.asarray(out).astype(np.float32)
    rng = np.random.default_rng(5)
    a += rng.normal(0, 9, a.shape[:2])[..., None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


POST = {"phosphor": post_phosphor, "spotred": post_spotred, "paper": post_paper, "pixel": post_pixel,
        "spotyellow": post_spotyellow, "sepia": post_sepia, "woodblock": post_woodblock, "dossier": post_dossier}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*")
    ap.add_argument("--theme", action="append", help="Theme (mehrfach möglich); Standard: alle")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--seed", type=int, default=0, help="Seed-Versatz zum Neuwürfeln")
    args = ap.parse_args()

    comfy = Comfy(cfg["url"])
    if not comfy.alive():
        sys.exit(f"ComfyUI nicht erreichbar unter {cfg['url']}")
    Comfy.check_config(cfg)

    for key in (args.theme or list(THEMES)):
        th = THEMES[key]
        out_dir = OUT / key
        out_dir.mkdir(parents=True, exist_ok=True)
        names = [n for n in th["subjects"] if not args.names or n in args.names]
        for i, name in enumerate(names):
            path = out_dir / f"{name}.webp"
            if path.exists() and not args.force:
                print(f"{key}/{name}: vorhanden, übersprungen")
                continue
            gen, target = SIZES[name]
            print(f"{key}/{name}: erzeuge {gen[0]}x{gen[1]} ...", flush=True)
            prompt = f"{th['subjects'][name]}. {th['style']}"
            negative = f"{BASE_NEGATIVE}, {th['negative']}" if th["negative"] else BASE_NEGATIVE
            seed = 1000 + list(THEMES).index(key) * 100 + list(th["subjects"]).index(name) + args.seed * 7919
            wf = Comfy.build_workflow(cfg, prompt, negative, gen[0], gen[1], seed)
            try:
                img = comfy.generate(wf, timeout=900)
            except ComfyError as e:
                print(f"{key}/{name}: FEHLER {e}", flush=True)
                continue
            img = trim_bars(img)
            if img.size != gen:
                img = img.resize(gen, Image.LANCZOS)
            if th["post"] != "pixel" and img.size != target:
                img = ImageOps.fit(img, target, Image.LANCZOS)
            elif th["post"] == "pixel":
                img = ImageOps.fit(img, target, Image.LANCZOS)
            if th["post"]:
                img = POST[th["post"]](img, name)
            b = th.get("brightness", {}).get(name, 1.0)
            if b != 1.0:
                img = ImageEnhance.Brightness(img).enhance(b)
            if th["post"] == "pixel":
                img.save(path, "WEBP", lossless=True, method=6)
            else:
                img.save(path, "WEBP", quality=82, method=6)
            print(f"{key}/{name}: gespeichert ({path.stat().st_size // 1024} KB)", flush=True)


if __name__ == "__main__":
    main()
