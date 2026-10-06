#!/usr/bin/env python3
"""Illustriert das Regelwerk der Web-App je Theme neu, mit der Pipeline der PDF-Erzeugung (tools/rulebook-pdf).

Pro Theme entsteht ein eigenes Projekt unter assets/pdf-themes/<theme>/ (Welt und Stil des Themes, Prompts von agy,
Bilder von Krea 2 in ComfyUI). Jedes Bild geht durch die Bildkontrolle von agy im 3x3-Modus: bis zu 3 Konzepte mit
je 3 Bildern, sobald eins passt, ist Schluss. Die Nachbearbeitung des Themes (Phosphorgrün, Schwarzweiß mit Rot,
Pixelraster …) läuft vor der Kontrolle, agy beurteilt also das fertige Aussehen.

Voraussetzungen: ComfyUI läuft, agy ist angemeldet (siehe tools/rulebook-pdf/README.md).

    python3 scripts/gen_rulebook_themes.py                      # alle Themes außer noir, vorhandene Bilder bleiben
    python3 scripts/gen_rulebook_themes.py --theme wushu        # ein Theme
    python3 scripts/gen_rulebook_themes.py --theme wushu --keys cover ch-1-grundphilosophie
    python3 scripts/gen_rulebook_themes.py --plan-only          # nur Prompts schreiben lassen
    python3 scripts/gen_rulebook_themes.py --no-qc              # ohne Bildkontrolle (schneller)

Danach: python3 scripts/build_rulebook_web.py baut die Web-Fassung mit allen Bildsätzen.
Neu erzeugen: Datei in assets/pdf-themes/<theme>/images/ löschen und das Skript erneut starten.
"""
import argparse
import copy
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "rulebook-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from PIL import Image  # noqa: E402

import gen_web_assets as art  # noqa: E402  (Stile, Negative und Nachbearbeitung der Themes)
from rpdf import comfy, pipeline, planner  # noqa: E402
from rpdf import project as proj  # noqa: E402

MAIN = ROOT / "assets" / "pdf"
OUT = ROOT / "assets" / "pdf-themes"

# Reihenfolge: zuerst die auffälligsten Looks
ORDER = ["sincity", "wushu", "pixel", "manga", "ukiyo", "western", "akte", "terminal", "hybrid"]

BASE = ("Modern-day cinematic action roleplaying: gun-fu, martial arts and over-the-top fights, ex-assassins, SWAT operators, "
        "street brawlers and legendary masters. ")
# Welt je Theme: bestimmt die Motive, die agy schreibt (Stil und Nachbearbeitung kommen aus gen_web_assets.THEMES)
WORLD = {
    "sincity": BASE + "Told as a hard-boiled crime graphic novel: rain-soaked noir city at night, trench coats and fedoras, dangerous women in red, rooftops, back alleys, harsh shadows.",
    "wushu": BASE + "Reimagined as a wuxia martial arts epic: misty mountain temples, bamboo forests, stone bridges, wandering swordsmen and masters in flowing robes, lanterns, ink-painting scenery. Keep the fights and training scenes, swap guns for blades, staves and fists.",
    "pixel": BASE + "Reimagined as a 16-bit arcade beat-em-up and RPG: pixel art heroes, neon city stages, boss fights, character select screens, party lineups.",
    "manga": BASE + "Told as a shonen action manga: dramatic angles, speed lines, impact bursts, rival fighters, training arcs, exaggerated expressions.",
    "ukiyo": BASE + "Reimagined in Edo-period Japan: ronin and samurai, wandering monks, geisha, merchants, great waves, mountains, bridges, castles, rain and moonlit gardens. Keep the fights and training scenes.",
    "western": BASE + "Reimagined as a spaghetti western: dusty frontier town, saloon, duels at high noon, gunslingers and a wandering kung fu master, desert, trains, canyon ambushes.",
    "akte": BASE + "Seen as an investigation dossier: surveillance and evidence photographs of operatives, security camera stills, case files, stakeouts, parking garages, rainy streets at night.",
    "terminal": BASE + "Seen through tactical computer displays: green wireframe maps, radar screens, schematic diagrams of fighters and weapons, blueprints, data streams.",
    "hybrid": BASE + "Told as a cyberpunk deck-runner story: neon rooftops, holographic interfaces, hackers and street samurai, glitch effects, data streams over a rain-slick megacity.",
}
COVER = {
    "sincity": "tall poster composition, a lone man in a trench coat and a woman in a red dress standing back to back in heavy rain under a street lamp, white rain streaks, black city skyline, empty plain black sky at the very top and plain ground at the very bottom, no logo, no title, no lettering",
    "wushu": "tall poster composition, a martial arts master and a gunslinger standing back to back on a stone bridge above a misty mountain valley, flowing robes, falling leaves, empty plain misty sky at the very top and plain ground at the very bottom, no logo, no title, no lettering",
    "pixel": "tall arcade poster composition, a pixel art martial artist mid flying kick and a gunslinger in a long coat, neon city at night, empty plain night sky at the very top and plain street at the very bottom, no logo, no title, no lettering",
    "manga": "tall manga cover composition, a martial artist in a dynamic flying kick and a gunslinger aiming a pistol, speed lines and impact burst, empty plain sky at the very top and plain ground at the very bottom, no logo, no title, no lettering",
    "ukiyo": "tall woodblock print composition, a ronin and a martial artist facing each other on a wooden bridge under a great stylized wave and a pale mountain, empty plain sky at the very top and plain ground at the very bottom, no logo, no title, no lettering",
    "western": "tall film poster composition, a gunslinger in a long duster and a martial artist facing off in a dusty frontier street at high noon, heat haze, empty plain sky at the very top and plain ground at the very bottom, no logo, no title, no lettering",
    "akte": "tall composition, a grainy black and white surveillance photograph of two figures facing each other in a rainy street at night, a red circle drawn around one of them, plain dark top and bottom, no logo, no title, no lettering",
    "terminal": "tall composition, a green wireframe vector city with two fighter silhouettes facing each other, perspective grid floor, radar arcs, plain black sky at the very top and plain grid floor at the very bottom, no logo, no title, no lettering",
    "hybrid": "tall cyberpunk poster composition, a hacker in a long coat and a martial artist facing each other on a neon rooftop, holographic wireframe skyline, magenta and cyan light, plain dark sky at the very top and plain rooftop at the very bottom, no logo, no title, no lettering",
}
ACCENT = {  # Farben für das (nicht genutzte) PDF-Theme des Projekts
    "sincity": ("#ec1c24", "#ffffff"), "wushu": ("#b9301d", "#8a6416"), "pixel": ("#ffcd75", "#41a6f6"),
    "manga": ("#15151c", "#ffd400"), "ukiyo": ("#ff7a5c", "#e8c26a"), "western": ("#dba94a", "#d2603f"),
    "akte": ("#b3202a", "#24477a"), "terminal": ("#29e0a0", "#d7e24a"), "hybrid": ("#ff2bd6", "#19e9ff"),
}


def make_project(theme):
    root = OUT / theme
    new = not (root / "project.json").exists()
    p = proj.Project(root)
    if new:
        main = json.loads((MAIN / "project.json").read_text(encoding="utf-8"))
        cfg = copy.deepcopy(main)
        th = art.THEMES[theme]
        cfg["source"] = "../../../regelwerk/KINETIK_Regelwerk.md"
        cfg["output"] = f"../../../export/KINETIK_Regelwerk_{theme}.pdf"
        cfg["style"] = th["style"]
        cfg["negative"] = f"{art.BASE_NEGATIVE}, {th['negative']}" if th["negative"] else art.BASE_NEGATIVE
        cfg["world"] = WORLD[theme]
        cfg["style_preset"], cfg["style_wish"] = "", ""
        cfg["theme"]["accent"], cfg["theme"]["accent2"] = ACCENT[theme]
        cfg["layout"]["fill_gaps"] = False
        cfg["qc"] = {"enabled": True, "auto_fix": True, "rounds": 3, "radical": True}
        p.config = proj._merge(proj.DEFAULTS, cfg)
        p.save()
    # Cover und Hintergrund: Cover bekommt ein eigenes Motiv, der Hintergrund wird für die Web-Fassung nicht gebraucht.
    # Beide Einträge vorab zu füllen verhindert, dass agy die Welt aus dem Buchtext neu beschreibt und meine überschreibt.
    p.sync_manifest(p.slots())
    p.entry("cover").update(prompt=COVER[theme], include_style=True)
    p.entry("background").update(prompt="unused (not shown in the web version)", include_style=False)
    bg = p.image_path("background")
    if not bg.exists():
        bg.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(MAIN / "images" / "background.jpg", bg)
    p.save()
    return p


def patch_save(theme):
    """Nachbearbeitung des Themes vor dem Speichern, damit agy das fertige Aussehen beurteilt."""
    post_name = art.THEMES[theme]["post"]
    post = art.POST.get(post_name) if post_name else None
    pixel = post_name == "pixel"
    orig = comfy.save_image

    def save(img, path, kind):
        if kind == "background":
            return orig(img, path, kind)
        key = Path(path).stem
        if post:
            img = post(img, key)
        path.parent.mkdir(parents=True, exist_ok=True)
        if pixel:   # flache Pixelflächen: kaum Kompression, sonst fransen die Kanten
            img.save(path, "JPEG", quality=97, subsampling=0)
        else:
            img.save(path, "JPEG", quality=86, optimize=True)
    comfy.save_image = save
    return orig


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", action="append", choices=ORDER)
    ap.add_argument("--keys", nargs="*", help="nur diese Bildplätze (z.B. cover ch-1-grundphilosophie)")
    ap.add_argument("--plan-only", action="store_true")
    ap.add_argument("--no-qc", action="store_true")
    ap.add_argument("--force-plan", action="store_true", help="vorhandene Prompts neu schreiben lassen")
    args = ap.parse_args()

    ctx = pipeline.Context(log=lambda m: print(m, flush=True), progress=lambda d, t: None)
    for theme in args.theme or ORDER:
        print(f"\n=== {theme} ===", flush=True)
        p = make_project(theme)
        if args.no_qc:
            p.config["qc"]["enabled"] = False
        keys = set(args.keys) if args.keys else None
        try:
            pipeline.plan(p, ctx, force=args.force_plan, keys=keys)
            if args.plan_only:
                continue
            orig = patch_save(theme)
            try:
                pipeline.images(p, ctx, keys=keys)
            finally:
                comfy.save_image = orig
        except (comfy.ComfyError, planner.AgyError) as e:
            print(f"FEHLER bei {theme}: {e}", flush=True)
        p.save()


if __name__ == "__main__":
    main()
