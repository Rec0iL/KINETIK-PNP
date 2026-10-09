#!/usr/bin/env python3
"""Prüft die Web-App in allen Themes und mehreren Fensterbreiten darauf, ob Text oder Elemente über ihren Rahmen oder das
Fenster hinausragen. Nicht Teil von `npm test` (braucht einen Browser und den laufenden Entwicklungsserver).

    npm run dev        # in tools/kinetik-vtt, Port 5173
    python3 tests/overflow-audit.py                        # alle Themes, alle Breiten
    python3 tests/overflow-audit.py --themes western akte  --widths 390 1360
    python3 tests/overflow-audit.py --json bericht.json

Voraussetzung: pip install playwright und ein Chrome (Pfad per --chrome).
Gemeldet wird je (Theme, Seite, Element): Text, der über die Box seines Elements oder eines abschneidenden Vorfahren hinausläuft,
Kindboxen, die ihren Elternrahmen rechts verlassen, und alles, was rechts über das Fenster hinausreicht (inklusive Seitenscroll).
"""
import argparse
import json
import sys
from collections import defaultdict

from playwright.sync_api import sync_playwright

THEMES = ["noir", "sincity", "manga", "wushu", "ukiyo", "western", "akte", "pixel", "terminal", "hybrid"]
WIDTHS = [320, 390, 768, 1100, 1440, 1920]
BASE = "http://localhost:5173/"  # per --base änderbar

# Wird im Browser ausgeführt: liefert eine Liste von Funden für die aktuelle Seite.
FIND = r"""
(() => {
  const found = [];
  const vw = document.documentElement.clientWidth;
  const sel = (el) => {
    const p = [];
    for (let e = el; e && e.nodeType === 1 && p.length < 4; e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      const c = [...e.classList].filter((x) => !x.startsWith('svelte-')).slice(0, 2);
      if (e.id) s += '#' + e.id; else if (c.length) s += '.' + c.join('.');
      p.unshift(s);
    }
    return p.join(' > ');
  };
  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Elemente, die absichtlich scrollen oder abschneiden, werden als Grenze behandelt
  const clipper = (el) => {
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/(hidden|clip|auto|scroll)/.test(cs.overflowX) || cs.clipPath !== 'none') return e;
    }
    return null;
  };
  const inHiddenDrawer = (el) => !!el.closest('.rb:not(.open), [aria-hidden="true"], .sr-only, dialog:not([open]), .dlpop:not(:popover-open)');
  const seen = new Set();
  const add = (kind, el, extra) => {
    const key = kind + '|' + sel(el);
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ kind, el: sel(el), text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), ...extra });
  };

  const all = document.querySelectorAll('body *');
  for (const el of all) {
    if (inHiddenDrawer(el) || !visible(el)) continue;
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && el.matches('.rain, canvas')) continue;
    const r = el.getBoundingClientRect();
    const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

    // 1. Elementbox ragt rechts oder links aus dem Fenster (nicht in scrollenden Behältern)
    if (!clipper(el) && !el.closest('.rain') && cs.position !== 'fixed') {
      if (r.right > vw + 1) add('Fenster-rechts', el, { by: Math.round(r.right - vw) });
      if (r.left < -1 && r.right > 0) add('Fenster-links', el, { by: Math.round(-r.left) });
    }

    // 2. Text läuft über die eigene Box hinaus
    if (ownText && cs.display !== 'inline') {
      const range = document.createRange();
      range.selectNodeContents(el);
      let maxR = -1e9, minL = 1e9;
      for (const q of range.getClientRects()) { if (q.width) { maxR = Math.max(maxR, q.right); minL = Math.min(minL, q.left); } }
      const padR = parseFloat(cs.paddingRight) || 0, padL = parseFloat(cs.paddingLeft) || 0;
      const boxR = r.right - parseFloat(cs.borderRightWidth || 0), boxL = r.left + parseFloat(cs.borderLeftWidth || 0);
      const hidden = /(hidden|clip)/.test(cs.overflowX);
      if (maxR > boxR + 1.5 && !(cs.overflowX === 'auto' || cs.overflowX === 'scroll')) add(hidden ? 'Text-abgeschnitten' : 'Text-über-Box', el, { by: Math.round(maxR - boxR) });
      else if (minL < boxL - 1.5 && !(cs.overflowX === 'auto' || cs.overflowX === 'scroll')) add(hidden ? 'Text-abgeschnitten' : 'Text-über-Box', el, { by: Math.round(boxL - minL), side: 'links' });
    }

    // 3. Kindbox verlässt den Rahmen des Elternelements (nur bei sichtbaren Rahmen: Hintergrund, Rand oder Schatten)
    const parent = el.parentElement;
    if (parent && parent !== document.body && cs.position !== 'absolute' && cs.position !== 'fixed') {
      const pcs = getComputedStyle(parent);
      const framed = pcs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(pcs.borderRightWidth) > 0 || pcs.backgroundImage !== 'none' || pcs.boxShadow !== 'none';
      const pr = parent.getBoundingClientRect();
      const lim = pr.right - parseFloat(pcs.borderRightWidth || 0);
      if (framed && !/(auto|scroll)/.test(pcs.overflowX) && r.right > lim + 1.5 && r.left < lim) add('Kind-über-Rahmen', el, { by: Math.round(r.right - lim) });
    }
  }

  // 4. Seitenscroll
  const dsw = document.documentElement.scrollWidth;
  if (dsw > vw + 1) found.push({ kind: 'Seite-scrollt-seitlich', el: 'html', text: '', by: dsw - vw });
  return found;
})()
"""

VIEWS = [
    ("Start", "#/", None),
    ("Charaktere", "#/charaktere", None),
    ("Würfel", "#/wuerfel", None),
    ("Move-Builder", "#/builder", None),
    ("Beitreten", "#/beitreten", None),
    ("Spielleiter", "#/sl", None),
    ("Credits", "#/credits", None),
]
SHEET_TABS = ["Übersicht", "Körper", "Moves", "Ausrüstung", "Tags & Nachteile", "Notizen", "Erschaffung"]


def audit(theme, width, chrome, quick):
    findings = []
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chrome, args=["--no-sandbox"])
        ctx = b.new_context(viewport={"width": width, "height": 900})
        ctx.add_init_script(f"localStorage.setItem('kinetik.theme','{theme}')")
        pg = ctx.new_page()
        errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))

        def check(view):
            pg.wait_for_timeout(350)
            for f in pg.evaluate(FIND):
                f.update(theme=theme, width=width, view=view)
                findings.append(f)

        pg.goto(BASE + "#/")
        pg.wait_for_timeout(1500)
        for name, route, _ in VIEWS:
            pg.evaluate(f"location.hash = {json.dumps(route)}")
            pg.wait_for_timeout(500)
            check(name)

        # Charakterbogen mit Beispielcharakter, alle Tabs
        pg.evaluate("location.hash = '#/charaktere'")
        pg.wait_for_timeout(500)
        if pg.locator("text=Beispiel laden").count():
            pg.locator("text=Beispiel laden").first.click()
            pg.wait_for_timeout(800)
        else:
            pg.locator("a[href*='#/charakter/']").first.click()
            pg.wait_for_timeout(800)
        for tab in SHEET_TABS:
            loc = pg.locator(f'[role="tab"]:has-text("{tab}"), .tabs button:has-text("{tab}")')
            if loc.count():
                loc.first.click()
                pg.wait_for_timeout(300)
                check(f"Bogen: {tab}")
        # Würfelfenster
        dock = pg.locator(".dock-toggle, button:has-text('Würfeln')")
        if not quick and dock.count():
            try:
                dock.first.click(timeout=2000)
                pg.wait_for_timeout(400)
                check("Würfeldock offen")
                pg.keyboard.press("Escape")
            except Exception:
                pass

        # Regelwerk: Anfang, Kapitel, Inhaltsverzeichnis, Download-Menü
        pg.evaluate("location.hash = '#/'")
        pg.wait_for_timeout(400)
        pg.locator("button.rbbtn").click()
        pg.wait_for_timeout(1500)
        check("Regelwerk: Anfang")
        for target in ("rb-ch-2-der-charakter", "rb-sec-3-1-die-wuerfelmechanik-der-clash", "rb-sec-5-1-das-bewertungs-framework-effektpunkte"):
            pg.evaluate(f"document.getElementById({json.dumps(target)})?.scrollIntoView()")
            pg.wait_for_timeout(500)
            check(f"Regelwerk: {target[3:30]}")
        pg.locator("aside.rb button[aria-label='Inhaltsverzeichnis']").click()
        pg.wait_for_timeout(500)
        check("Regelwerk: Inhaltsverzeichnis")
        pg.locator("aside.rb button[aria-label='Inhaltsverzeichnis']").click()
        pg.locator("aside.rb button.dl").click()
        pg.wait_for_timeout(500)
        check("Regelwerk: Download-Menü")
        pg.keyboard.press("Escape")
        b.close()
    return findings, errs


def main():
    global BASE
    ap = argparse.ArgumentParser()
    ap.add_argument("--themes", nargs="*", default=THEMES)
    ap.add_argument("--widths", nargs="*", type=int, default=WIDTHS)
    ap.add_argument("--chrome", default="/usr/bin/google-chrome")
    ap.add_argument("--json")
    ap.add_argument("--quick", action="store_true")
    ap.add_argument("--base", default=BASE, help="Adresse der App (Entwicklungs- oder Vorschauserver)")
    args = ap.parse_args()
    BASE = args.base

    allf = []
    for theme in args.themes:
        for w in args.widths:
            f, errs = audit(theme, w, args.chrome, args.quick)
            allf += f
            print(f"{theme:8s} {w:5d}px  {len(f):3d} Funde" + (f"  JS-Fehler: {errs[:1]}" if errs else ""), flush=True)

    # Zusammenfassen: gleiches Element, gleiche Art -> Liste der Breiten
    groups = defaultdict(lambda: {"widths": set(), "views": set(), "by": 0, "text": ""})
    for f in allf:
        k = (f["theme"], f["kind"], f["el"])
        g = groups[k]
        g["widths"].add(f["width"])
        g["views"].add(f["view"])
        g["by"] = max(g["by"], f.get("by", 0))
        g["text"] = g["text"] or f.get("text", "")
    print(f"\n{len(groups)} verschiedene Funde in {len(args.themes)} Themes, {len(args.widths)} Breiten")
    for (theme, kind, el), g in sorted(groups.items()):
        print(f"{theme:8s} {kind:22s} bis {g['by']:4d}px  Breiten {sorted(g['widths'])}  [{', '.join(sorted(g['views']))[:60]}]\n          {el}  „{g['text']}“")
    if args.json:
        json.dump([{"theme": k[0], "kind": k[1], "el": k[2], "widths": sorted(v["widths"]), "views": sorted(v["views"]), "by": v["by"], "text": v["text"]}
                   for k, v in groups.items()], open(args.json, "w"), ensure_ascii=False, indent=1)
    sys.exit(1 if groups else 0)


if __name__ == "__main__":
    main()
