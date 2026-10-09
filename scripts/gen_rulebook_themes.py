#!/usr/bin/env python3
"""Illustriert das Regelwerk der Web-App je Theme neu, mit der Pipeline der PDF-Erzeugung (tools/rulebook-pdf).

Pro Theme entsteht ein eigenes Projekt unter assets/pdf-themes/<theme>/ (Welt und Stil des Themes, Prompts von agy,
Bilder von Krea 2 in ComfyUI). Jedes Bild geht durch die Bildkontrolle von agy im 3x3-Modus: bis zu 3 Konzepte mit
je 3 Bildern, sobald eins passt, ist Schluss. Die Kontrolle ist großzügig (qc.lenient): Ein Bild gilt als gut, wenn es zum
Kapitel passt und keine groben Fehler hat, auch wenn es nicht genau dem Prompt entspricht. Die Nachbearbeitung des Themes (Phosphorgrün, Schwarzweiß mit Rot,
Pixelraster …) läuft vor der Kontrolle, agy beurteilt also das fertige Aussehen.

Voraussetzungen: ComfyUI läuft, agy ist angemeldet (siehe tools/rulebook-pdf/README.md).

    python3 scripts/gen_rulebook_themes.py                      # alle Themes außer noir, vorhandene Bilder bleiben
    python3 scripts/gen_rulebook_themes.py --theme wushu        # ein Theme
    python3 scripts/gen_rulebook_themes.py --theme wushu --keys cover ch-1-grundphilosophie
    python3 scripts/gen_rulebook_themes.py --plan-only          # nur Prompts schreiben lassen
    python3 scripts/gen_rulebook_themes.py --no-qc              # ohne Bildkontrolle (schneller)

PDFs je Theme (nach den Bildern; baut aus einer temporären Kopie, das laufende Projekt bleibt unberührt):

    python3 scripts/gen_rulebook_themes.py --pdf                # alle Themes -> export/KINETIK_Regelwerk_v<Version>_<theme>.pdf
    python3 scripts/gen_rulebook_themes.py --pdf --theme wushu --pdf-out /tmp/test.pdf

Danach: python3 scripts/build_rulebook_web.py baut die Web-Fassung mit allen Bildsätzen und PDFs.
Neu erzeugen: Datei in assets/pdf-themes/<theme>/images/ löschen und das Skript erneut starten.
"""
import argparse
import copy
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools" / "rulebook-pdf"))
sys.path.insert(0, str(ROOT / "scripts"))

from PIL import Image  # noqa: E402

import gen_web_assets as art  # noqa: E402  (Stile, Negative und Nachbearbeitung der Themes)
import pdf_backgrounds  # noqa: E402
from pdf_theme_styles import STYLES as PDF_STYLES  # noqa: E402
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


# ---------- Robustheit für lange Läufe ----------
# ComfyUI wächst über die Stunden auf 20 bis 27 GB und wurde einmal vom Kernel beendet. Deshalb: ein totes ComfyUI neu starten
# (wie Pinokio: main.py --reserve-vram 3, nur lokal) und zeitweilige Fehler (agy, Netz) überstehen.
COMFY_DIR = Path(os.environ.get("COMFY_DIR", "/mnt/nvme-data/pinokio/api/comfy.git/app"))
FREE_EVERY = 12      # alle n erzeugten Bilder Modelle entladen und den Cache leeren


def rb_version():
    """Version des Regelwerks aus seiner Untertitelzeile (\"Version 3.6.\")."""
    m = re.search(r"Version\s+(\d+(?:\.\d+)*)", (ROOT / "regelwerk" / "KINETIK_Regelwerk.md").read_text(encoding="utf-8")[:600])
    return m.group(1) if m else "x"


def pdf_path(theme):
    """export/KINETIK_Regelwerk_v<version>_<theme>.pdf: die Version steht im Dateinamen."""
    return ROOT / "export" / f"KINETIK_Regelwerk_v{rb_version()}_{theme}.pdf"


def cfg_url():
    return json.loads((MAIN / "project.json").read_text(encoding="utf-8"))["comfy"]["url"]


def comfy_alive(url):
    try:
        urllib.request.urlopen(url + "/system_stats", timeout=5).read()
        return True
    except Exception:
        return False


# ComfyUI wird nicht vorsorglich neu gestartet: Es läuft, bis es von selbst abstürzt (die Speichergrenze des systemd-Bereichs sorgt dafür, dass
# dann nur ComfyUI stirbt), und wird erst dann neu gestartet.
def comfy_pid():
    """PID des ComfyUI-Pythonprozesses (nicht systemd-run, nicht eine Shell, die zufällig denselben Text enthält)."""
    out = subprocess.run(["pgrep", "-f", "main.py --reserve-vram"], capture_output=True, text=True).stdout.split()
    for pid in map(int, out):
        try:
            if "python" in Path(f"/proc/{pid}/comm").read_text():
                return pid
        except OSError:
            continue
    return None


def comfy_rss_gb():
    """Anonymer Speicher von ComfyUI in GB (RssAnon), ohne gemappte Modelldateien."""
    pid = comfy_pid()
    if not pid:
        return 0.0
    try:
        for line in open(f"/proc/{pid}/status"):
            if line.startswith("RssAnon:"):
                return int(line.split()[1]) / 1048576
    except OSError:
        pass
    return 0.0


def start_comfy():
    """ComfyUI wie Pinokio starten, aber in einem eigenen Bereich (systemd-Scope) mit Speichergrenze: so reißt ein Speicherproblem
    nur ComfyUI mit, nicht den Lauf und nicht den Rest des Rechners."""
    py = COMFY_DIR / "env" / "bin" / "python"
    if not py.exists():
        return False
    log = open(ROOT / "assets" / "pdf-themes" / "comfyui.log", "ab")
    cmd = [str(py), "main.py", "--reserve-vram", "3"]
    if shutil.which("systemd-run"):
        cmd = ["systemd-run", "--user", "--scope", "--collect", "-p", "MemoryMax=22G", "-p", "MemorySwapMax=0", "--"] + cmd
    subprocess.Popen(cmd, cwd=COMFY_DIR, stdout=log, stderr=log, stdin=subprocess.DEVNULL, start_new_session=True,
                     env={**os.environ, "PYTORCH_ENABLE_MPS_FALLBACK": "1", "TOKENIZERS_PARALLELISM": "false"})
    return True


def stop_comfy():
    pid = comfy_pid()
    if pid:
        try:
            os.kill(pid, 15)
        except OSError:
            pass
        for _ in range(30):
            if not comfy_pid():
                break
            time.sleep(1)
        if comfy_pid():
            os.kill(comfy_pid(), 9)
            time.sleep(2)


def ensure_comfy(url, wait=240):
    """Wartet auf ComfyUI und startet es neu, falls es nicht mehr läuft."""
    for i in range(3):
        if comfy_alive(url):
            return True
        time.sleep(10)
    print("ComfyUI läuft nicht mehr, starte es neu …", flush=True)
    if not start_comfy():
        return False
    for _ in range(wait // 5):
        time.sleep(5)
        if comfy_alive(url):
            return True
    return False


def restart_comfy(url, reason):
    print(f"ComfyUI wird neu gestartet ({reason}) …", flush=True)
    stop_comfy()
    return ensure_comfy(url)


def harden_comfy():
    """Erzeugen mit Neustart bei Verbindungsabbruch und regelmäßigem Speicher freigeben."""
    orig = comfy.Comfy.generate
    state = {"n": 0}

    def free(self):
        try:
            req = urllib.request.Request(self.url + "/free", data=json.dumps({"unload_models": True, "free_memory": True}).encode(),
                                         headers={"Content-Type": "application/json"})
            urllib.request.urlopen(req, timeout=15).read()
        except Exception:
            pass

    def generate(self, wf, *a, **kw):
        for attempt in range(4):
            if state["n"] and state["n"] % FREE_EVERY == 0:
                free(self)
            state["n"] += 1
            try:
                return orig(self, wf, *a, **kw)
            except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
                print(f"    ComfyUI nicht erreichbar ({e}), Versuch {attempt + 1}/4", flush=True)
                if not ensure_comfy(self.url):
                    raise comfy.ComfyError("ComfyUI ist weg und ließ sich nicht neu starten.")
        raise comfy.ComfyError("ComfyUI blieb nach mehreren Versuchen unerreichbar.")
    comfy.Comfy.generate = generate


def make_project(theme):
    root = OUT / theme
    new = not (root / "project.json").exists()
    p = proj.Project(root)
    if new:
        main = json.loads((MAIN / "project.json").read_text(encoding="utf-8"))
        cfg = copy.deepcopy(main)
        th = art.THEMES[theme]
        cfg["source"] = "../../../regelwerk/KINETIK_Regelwerk.md"
        cfg["output"] = f"../../../export/KINETIK_Regelwerk_v{rb_version()}_{theme}.pdf"
        cfg["style"] = th["style"]
        cfg["negative"] = f"{art.BASE_NEGATIVE}, {th['negative']}" if th["negative"] else art.BASE_NEGATIVE
        cfg["world"] = WORLD[theme]
        cfg["style_preset"], cfg["style_wish"] = "", ""
        cfg["theme"]["accent"], cfg["theme"]["accent2"] = ACCENT[theme]
        cfg["layout"]["fill_gaps"] = False
        cfg["qc"] = {"enabled": True, "auto_fix": True, "rounds": 3, "radical": True, "lenient": True}
        p.config = proj._merge(proj.DEFAULTS, cfg)
        p.save()
    # Cover und Hintergrund: Cover bekommt ein eigenes Motiv, der Hintergrund wird für die Web-Fassung nicht gebraucht.
    # Beide Einträge vorab zu füllen verhindert, dass agy die Welt aus dem Buchtext neu beschreibt und meine überschreibt.
    p.sync_manifest(p.slots())
    p.entry("cover").update(prompt=COVER[theme], include_style=True)
    p.entry("background").update(prompt="unused (not shown in the web version)", include_style=False)
    bg = p.image_path("background")
    bg.parent.mkdir(parents=True, exist_ok=True)
    if not bg.exists() or new:
        pdf_backgrounds.make(theme, bg)   # Seitenhintergrund des PDFs, prozedural im Ton des Themes
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


WEB_FONTS = ROOT / "tools" / "kinetik-vtt" / "src" / "assets" / "fonts"
PDF_FONTS = ROOT / "tools" / "rulebook-pdf" / "rpdf" / "fonts"


def sync_pdf_fonts():
    """Die gekürzten Theme-Schriften der Web-App (nur Latin) auch für die PDF-Vorlage bereitstellen."""
    css = (ROOT / "tools" / "kinetik-vtt" / "src" / "themes" / "fonts-themes.css").read_text(encoding="utf-8")
    files = set(re.findall(r"url\('\.\./assets/fonts/([^']+)'\)", css))
    for f in files:
        shutil.copy(WEB_FONTS / f, PDF_FONTS / f)
    (PDF_FONTS / "fonts-themes.css").write_text(css.replace("url('../assets/fonts/", "url('fonts/"), encoding="utf-8")
    return len(files)


def apply_pdf_style(cfg, theme):
    """Schriften, Farben und Zusatz-CSS des Themes in eine Projektkonfiguration schreiben."""
    st = PDF_STYLES[theme]
    cfg["theme"].update(st["colors"])
    cfg["theme"].update(st["fonts"])
    cfg["theme"]["extra_css"] = st["extra_css"]
    cfg["layout"]["font_size_pt"] = st["font_size_pt"]
    return cfg


def build_pdf(theme, out):
    """Baut das PDF eines Themes aus einer temporären Kopie des Projekts (Bilder verlinkt, Stil des Themes eingesetzt)."""
    if not (OUT / theme / "project.json").exists():
        make_project(theme)     # nur Konfiguration und Seitenhintergrund, noch keine Bilder
    src = proj.Project(OUT / theme)
    cfg = apply_pdf_style(copy.deepcopy(src.config), theme)
    # Füllbilder nur, wenn es welche gibt (Phase --fillers): sie sitzen genau in den Lücken dieses Layouts
    cfg["layout"]["fill_gaps"] = any(f.name.startswith("fill-") for f in src.images_dir.glob("*.jpg"))
    cfg["source"] = str((src.root / cfg["source"]).resolve())
    cfg["output"] = str(Path(out).resolve())
    tmp = Path(tempfile.mkdtemp(prefix=f"kpdf-{theme}-"))
    (tmp / "images").mkdir()
    for f in src.images_dir.glob("*.jpg"):
        (tmp / "images" / f.name).symlink_to(f)
    pdf_backgrounds.make(theme, tmp / "images" / "background.jpg") if not (tmp / "images" / "background.jpg").exists() else None
    (tmp / "project.json").write_text(json.dumps(cfg, indent=2, ensure_ascii=False), encoding="utf-8")
    shutil.copy(src.root / "images.json", tmp / "images.json")
    p = proj.Project(tmp)
    ctx = pipeline.Context(log=lambda m: print("   ", m, flush=True))
    path, pages = pipeline.build(p, ctx)
    have = len([f for f in src.images_dir.glob("*.jpg") if f.stem != "background"])
    print(f"{theme}: {path.name}, {pages} Seiten, {have} Bilder", flush=True)
    shutil.rmtree(tmp, ignore_errors=True)
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--theme", action="append", choices=ORDER)
    ap.add_argument("--keys", nargs="*", help="nur diese Bildplätze (z.B. cover ch-1-grundphilosophie)")
    ap.add_argument("--plan-only", action="store_true")
    ap.add_argument("--no-qc", action="store_true")
    ap.add_argument("--pdf", action="store_true", help="PDFs bauen (export/KINETIK_Regelwerk_v<Version>_<theme>.pdf) statt Bilder erzeugen")
    ap.add_argument("--fillers", action="store_true",
                    help="Füllbilder für die Lücken im PDF-Satz des Themes planen und erzeugen (nach den Hauptbildern)")
    ap.add_argument("--pdf-out", help="Zieldatei bei --pdf mit genau einem Theme")
    ap.add_argument("--ensure-comfy", action="store_true", help="nur sicherstellen, dass ComfyUI läuft (startet es bei Bedarf) und beenden")
    ap.add_argument("--force-plan", action="store_true", help="vorhandene Prompts neu schreiben lassen")
    args = ap.parse_args()

    if args.ensure_comfy:
        ok = ensure_comfy(cfg_url())
        print("ComfyUI läuft" if ok else "ComfyUI ließ sich nicht starten", flush=True)
        sys.exit(0 if ok else 1)

    if args.pdf:
        n = sync_pdf_fonts()
        print(f"{n} Theme-Schriften für die PDF-Vorlage bereitgestellt", flush=True)
        for theme in args.theme or ORDER:
            out = args.pdf_out if args.pdf_out and args.theme and len(args.theme) == 1 else pdf_path(theme)
            build_pdf(theme, out)
        return

    ctx = pipeline.Context(log=lambda m: print(m, flush=True), progress=lambda d, t: None)
    harden_comfy()
    for theme in args.theme or ORDER:
        print(f"\n=== {theme} ===", flush=True)
        p = make_project(theme)
        if args.fillers:
            # Layout des Themes (Schriften!) fest im Projekt ablegen: die Lücken werden gegen genau diesen Satz gemessen
            apply_pdf_style(p.config, theme)
            p.config["layout"]["fill_gaps"] = True
            p.save()
            sync_pdf_fonts()
        if args.no_qc:
            p.config["qc"]["enabled"] = False
        keys = set(args.keys) if args.keys else None
        # Zeitweilige Fehler (agy-Dienst gestört, ComfyUI neu gestartet) überstehen: dasselbe Theme erneut, Fertiges wird übersprungen
        for attempt in range(1, 9):
            try:
                pipeline.plan(p, ctx, force=args.force_plan and attempt == 1, keys=keys)
                if args.plan_only:
                    break
                orig = patch_save(theme)
                try:
                    pipeline.images(p, ctx, keys=keys)
                finally:
                    comfy.save_image = orig
                break
            except (comfy.ComfyError, planner.AgyError, OSError) as e:
                print(f"FEHLER bei {theme} (Versuch {attempt}/8): {e}", flush=True)
                time.sleep(min(300, 60 * attempt))
                ensure_comfy(p.config["comfy"]["url"])
                p = proj.Project(OUT / theme)      # Stand von der Platte, falls der Lauf unterbrochen wurde
                if args.fillers:
                    apply_pdf_style(p.config, theme)
                    p.config["layout"]["fill_gaps"] = True
        p.save()


if __name__ == "__main__":
    main()
