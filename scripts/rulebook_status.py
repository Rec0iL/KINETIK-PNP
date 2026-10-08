#!/usr/bin/env python3
"""Zeigt den Stand des Regelwerk-Bildlaufs (scripts/gen_rulebook_themes.py und rulebook_themes_nachlauf.sh) im Terminal.

    python3 scripts/rulebook_status.py          # live, aktualisiert sich alle 5 Sekunden (Strg+C beendet)
    python3 scripts/rulebook_status.py --once   # einmal ausgeben
    python3 scripts/rulebook_status.py -n 10    # anderes Intervall in Sekunden

Liest nur: Bilder und Manifeste in assets/pdf-themes, das neueste Log, laufende Prozesse und ComfyUI. Ändert nichts.
"""
import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / "assets" / "pdf-themes"
EXPORT = ROOT / "export"
THEMES = ["sincity", "wushu", "pixel", "manga", "ukiyo", "western", "akte", "terminal", "hybrid"]
NAMES = {"sincity": "Film Noir", "wushu": "Wushu", "pixel": "8-Bit", "manga": "Manga", "ukiyo": "Ukiyo-e", "western": "Western",
         "akte": "Akte", "terminal": "Terminal", "hybrid": "Cyberdeck"}
MAIN_TOTAL = 38
FILL_GUESS = 7          # solange die Lücken eines Themes noch nicht gemessen sind
COMFY = "http://127.0.0.1:8188"

USE_COLOR = sys.stdout.isatty()
C = {"dim": "2", "red": "31", "green": "32", "yellow": "33", "blue": "34", "cyan": "36", "bold": "1"}


def col(text, *styles):
    if not USE_COLOR or not styles:
        return str(text)
    return f"\x1b[{';'.join(C[s] for s in styles)}m{text}\x1b[0m"


def bar(done, total, width=24):
    total = max(total, 1)
    n = round(width * min(done, total) / total)
    color = "green" if done >= total else "cyan"
    return col("█" * n, color) + col("░" * (width - n), "dim")


def fmt_td(seconds):
    if seconds is None:
        return "–"
    seconds = int(seconds)
    h, m = divmod(seconds // 60, 60)
    return f"{h} h {m:02d} min" if h else f"{m} min"


def theme_state(t):
    d = BASE / t
    imgs = list((d / "images").glob("*.jpg")) if (d / "images").exists() else []
    main = [f for f in imgs if not f.name.startswith(("fill-", "background"))]
    fills = [f for f in imgs if f.name.startswith("fill-")]
    active = None
    if (d / "images.json").exists():
        try:
            man = json.loads((d / "images.json").read_text(encoding="utf-8"))
            active = sum(1 for k, v in man.items() if k.startswith("fill-") and v.get("active"))
        except Exception:
            pass
    # Prüfung: wie viele fertige Bilder trugen zuletzt "passt nicht"? (letzter Stand je Platz)
    bad = 0
    try:
        bad = sum(1 for k, v in man.items() if (v.get("qc") or {}).get("fits") is False and (d / "images" / f"{k}.jpg").exists())
    except Exception:
        pass
    pdf = EXPORT / f"KINETIK_Regelwerk_{t}.pdf"
    return {"main": len(main), "fills": len(fills), "active": active, "bad": bad, "pdf": pdf.exists(),
            "files": imgs, "pdf_time": pdf.stat().st_mtime if pdf.exists() else 0}


def latest_log():
    logs = [f for f in glob.glob(str(BASE / "*lauf*.log"))]
    return Path(max(logs, key=os.path.getmtime)) if logs else None


def tail(path, n=400):
    try:
        with open(path, "rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 60000))
            return f.read().decode("utf-8", "replace").splitlines()[-n:]
    except OSError:
        return []


def activity(lines):
    """Phase, Theme und aktuelles Bild aus dem Log-Ende ableiten."""
    phase = theme = img = detail = None
    for ln in lines:
        m = re.search(r"=== python3 scripts/(\S+)(?: (--\S+))?", ln)
        if m:
            phase = {None: "Hauptbilder (Durchgang)", "--fillers": "Füllbilder", "--pdf": "PDFs bauen"}.get(m.group(2), m.group(2))
            if m.group(1).startswith("build_rulebook_web"):
                phase = "Web-Paket bauen"
        m = re.match(r"=== (\w+) ===", ln)
        if m and m.group(1) in THEMES:
            theme = m.group(1)
        m = re.match(r"\[(\d+)/(\d+)\] (.*)", ln)
        if m:
            img = f"{m.group(1)}/{m.group(2)}  {m.group(3)}"
            if m.group(3).startswith("Füllbild"):
                phase = "Füllbilder"   # der Kopf dieser Phase kann aus dem Log-Ausschnitt gefallen sein
            detail = None
        m = re.search(r"Bildkontrolle: (passt nicht|passt)(?: \(Konzept (\d)/3, Bild (\d)/3\))?", ln)
        if m:
            detail = ("✓ passt" if m.group(1) == "passt" else "✗ passt nicht") + (f"  (Konzept {m.group(2)}/3, Bild {m.group(3)}/3)" if m.group(2) else "")
        if "neues Konzept" in ln:
            detail = "neues Konzept wird entworfen …"
        if "ComfyUI wird neu gestartet" in ln or "ComfyUI läuft nicht mehr" in ln:
            detail = "ComfyUI wird neu gestartet …"
        if ln.startswith("FEHLER"):
            detail = col(ln[:90], "red")
    done = bool(lines) and lines[-1].strip().endswith("fertig")
    return phase, theme, img, detail, done


def procs():
    out = subprocess.run(["pgrep", "-af", "gen_rulebook_themes|rulebook_themes_nachlauf|build_rulebook_web"], capture_output=True, text=True).stdout
    mine = [l for l in out.splitlines() if "pgrep" not in l and "rulebook_status" not in l and "/bin/bash -c" not in l and "eval" not in l]
    return bool(mine)


def comfy_info():
    alive, rss = False, 0.0
    try:
        urllib.request.urlopen(COMFY + "/system_stats", timeout=3).read()
        alive = True
    except Exception:
        pass
    pid = None
    for p in subprocess.run(["pgrep", "-f", "main.py --reserve-vram"], capture_output=True, text=True).stdout.split():
        try:
            if "python" in Path(f"/proc/{p}/comm").read_text():
                pid = int(p)
                break
        except OSError:
            continue
    if pid:
        try:
            for line in open(f"/proc/{pid}/status"):
                if line.startswith("VmRSS:"):
                    rss = int(line.split()[1]) / 1048576
        except OSError:
            pass
    q = ""
    if alive:
        try:
            qd = json.loads(urllib.request.urlopen(COMFY + "/queue", timeout=3).read())
            q = f"{len(qd.get('queue_running', []))} läuft, {len(qd.get('queue_pending', []))} wartet"
        except Exception:
            pass
    return alive, rss, q


def mem_info():
    try:
        d = dict(l.split(":") for l in open("/proc/meminfo"))
        kb = lambda k: int(d[k].split()[0]) / 1048576
        return kb("MemAvailable"), kb("MemTotal"), kb("SwapTotal") - kb("SwapFree"), kb("SwapTotal")
    except Exception:
        return 0, 0, 0, 0


def render():
    states = {t: theme_state(t) for t in THEMES}
    lines = tail(latest_log()) if latest_log() else []
    phase, cur_theme, img, detail, finished = activity(lines)
    running = procs()
    alive, rss, queue = comfy_info()
    avail, total, swap_used, swap_total = mem_info()

    # Stand und Tempo: alle fertigen Bilder aller Themes nach Zeit (jede Datei ist ein Bild)
    stamps = sorted(f.stat().st_mtime for s in states.values() for f in s["files"] if not f.name.startswith("background"))
    now = time.time()
    recent = [t for t in stamps if now - t < 3 * 3600]
    rate = None
    if len(recent) >= 4:
        span = recent[-1] - recent[0]
        rate = span / (len(recent) - 1) if span > 0 else None      # Sekunden pro Bild (inklusive aller Wiederholungen)

    out = []
    head = col("KINETIK · Regelwerk-Bildlauf", "bold")
    if finished:
        status = col("● fertig", "green")
    elif running and alive:
        status = col("● läuft", "green")
    elif running:
        status = col("● läuft, ComfyUI antwortet nicht", "yellow")
    else:
        status = col("● gestoppt", "red")
    out.append(f"{head}    {status}    {time.strftime('%d.%m. %H:%M:%S')}")
    out.append("")

    rows_main = rows_fill = fill_total_known = 0
    out.append(col(f"{'Theme':<10} {'Hauptbilder':<31} {'Füllbilder':<31} {'PDF (aktuell?)'}", "dim"))
    remaining = 0
    for t in THEMES:
        s = states[t]
        fill_total = s["active"] if s["active"] else FILL_GUESS
        measured = s["active"] is not None and s["active"] > 0
        hint = "" if measured else col("~", "dim")
        mark = col("▶", "yellow") if t == cur_theme and not finished and running else " "
        m_txt = f"{s['main']:>2}/{MAIN_TOTAL}"
        f_txt = f"{s['fills']:>2}/{fill_total}{hint}" if (measured or s["fills"]) else col(" –  noch nicht gemessen", "dim")
        newest = max((f.stat().st_mtime for f in s["files"]), default=0)
        # ein PDF zählt erst, wenn es nach dem letzten Bild des Themes gebaut wurde
        pdf_txt = (col("✓", "green") if s["pdf_time"] > newest else col("alt", "yellow")) if s["pdf"] else col("·", "dim")
        out.append(f"{mark}{NAMES[t]:<9} {bar(s['main'], MAIN_TOTAL, 16)} {m_txt:<6}  {bar(s['fills'], fill_total, 16)} {f_txt:<16} {pdf_txt}")
        rows_main += s["main"]
        rows_fill += s["fills"]
        remaining += max(0, MAIN_TOTAL - s["main"]) + max(0, fill_total - s["fills"])
    out.append("")
    all_total = MAIN_TOTAL * len(THEMES)
    out.append(f"Hauptbilder gesamt  {bar(rows_main, all_total, 30)} {rows_main}/{all_total}")
    fill_guess_total = sum((states[t]['active'] or FILL_GUESS) for t in THEMES)
    out.append(f"Füllbilder gesamt   {bar(rows_fill, fill_guess_total, 30)} {rows_fill}/~{fill_guess_total}")
    out.append("")

    if finished:
        out.append(col("Alles durch. Nächster Schritt: Seiten der PDFs ansehen, dann committen.", "green"))
    else:
        out.append(f"Jetzt:     {col(phase or 'unbekannt', 'cyan')}" + (f"  ·  Theme {col(NAMES.get(cur_theme, cur_theme), 'bold')}" if cur_theme else ""))
        if img:
            out.append(f"Bild:      {img}")
        if detail:
            out.append(f"Prüfung:   {detail}")
        if rate:
            eta = remaining * rate
            out.append(f"Tempo:     {rate / 60:.1f} min pro Bild (letzte 3 h, mit Wiederholungen)   ·   noch ~{remaining} Bilder   ·   Rest ca. {col(fmt_td(eta), 'bold')}")
            out.append(col(f"           fertig etwa {time.strftime('%a %d.%m. %H:%M', time.localtime(now + eta))}  (plus PDFs und Web-Paket ~10 min; Schätzung, die Zahl der Füllbilder steht erst nach dem Messen fest)", "dim"))
        else:
            out.append("Tempo:     noch zu wenig Daten für eine Schätzung")
        if stamps:
            out.append(f"Zuletzt:   letztes Bild vor {fmt_td(now - stamps[-1])}")
            if running and now - stamps[-1] > 45 * 60:
                out.append(col("           ⚠ seit über 45 Minuten kein neues Bild, siehe Log", "yellow"))
    out.append("")

    cs = col("läuft", "green") if alive else col("antwortet nicht", "red")
    rss_txt = f"{rss:.1f} GB RAM (Neustart ab 14)" if rss else "–"
    out.append(f"ComfyUI:   {cs}   {rss_txt}   Warteschlange: {queue or '–'}")
    sw = f"{swap_used:.0f}/{swap_total:.0f} GB"
    out.append(f"System:    {avail:.0f} GB RAM frei von {total:.0f}   Swap {col(sw, 'red') if swap_total and swap_used / swap_total > 0.85 else sw}")
    if swap_total and swap_used / swap_total > 0.95:
        out.append(col("           ⚠ Swap ist fast voll: der Rechner steht unter Speicherdruck (Browser, Chat-Programme …)", "yellow"))
    bad = sum(s["bad"] for s in states.values())
    if bad:
        out.append(f"Bilder:    {bad} Bilder liegen mit Prüfergebnis „passt nicht“ vor (letzter Versuch bleibt stehen)")
    lg = latest_log()
    out.append(col(f"Log:       {lg.relative_to(ROOT) if lg else '–'}   (tail -f dafür)", "dim"))
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--once", action="store_true")
    ap.add_argument("-n", type=float, default=5, help="Intervall in Sekunden")
    args = ap.parse_args()
    if args.once or not sys.stdout.isatty():
        print(render())
        return
    try:
        sys.stdout.write("\x1b[?25l")
        while True:
            text = render()
            sys.stdout.write("\x1b[H\x1b[2J" + text + "\n\n" + col(f"aktualisiert alle {args.n:g} s, Strg+C beendet", "dim") + "\n")
            sys.stdout.flush()
            time.sleep(args.n)
    except KeyboardInterrupt:
        pass
    finally:
        sys.stdout.write("\x1b[?25h\n")


if __name__ == "__main__":
    main()
