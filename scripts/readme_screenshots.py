#!/usr/bin/env python3
"""Erzeugt die Screenshots für die README (docs/screenshots/*.jpg) aus der gebauten Web-App.

Voraussetzung: tools/kinetik-vtt ist gebaut und läuft als Vorschau, z.B.
    cd tools/kinetik-vtt && npm run build && npx vite preview --port 4173
Dann:
    pip install playwright && playwright install chromium
    python3 scripts/readme_screenshots.py [http://localhost:4173] [sheet wizard rulebook builder gm]

Der Screenshot des SL-Dashboards braucht Internet (öffentlicher PeerJS-Server für den Rundenstart).
"""
import re
import sys
import traceback
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "screenshots"
GM = '.tabs[aria-label="SL-Dashboard"]'
BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:4173").rstrip("/")


def save(page, name, clip=None):
    png = OUT / f"{name}.png"
    page.screenshot(path=str(png), clip=clip)
    Image.open(png).convert("RGB").save(OUT / f"{name}.jpg", "JPEG", quality=84, optimize=True, progressive=True)
    png.unlink()
    print("ok", name, flush=True)


def btn(page, name, exact=False):
    return page.get_by_role("button", name=name, exact=exact)


def tab(page, name, scope=".sticky .tabs"):
    page.locator(f"{scope} button", has_text=re.compile(name, re.I)).first.click()
    page.wait_for_timeout(400)


def step(label):
    def deco(fn):
        def run(*a, **k):
            try:
                fn(*a, **k)
            except Exception:
                print("FEHLER bei", label)
                traceback.print_exc()
        return run
    return deco


@step("Bogen")
def sheet(page):
    page.goto(f"{BASE}/#/charaktere")
    page.wait_for_timeout(800)
    btn(page, re.compile("Beispiel laden")).click()
    page.wait_for_url(re.compile("charakter/"))
    page.wait_for_timeout(600)
    tab(page, "Moves")
    for tpl in ("mozambique", "judo-wurf", "meuchelstoss"):
        page.select_option('select[aria-label="Vorlage wählen"]', tpl)
        btn(page, "Hinzufügen", exact=True).click()
        page.wait_for_timeout(250)
    tab(page, "Übersicht")
    page.evaluate("window.scrollTo(0,0)")
    page.wait_for_timeout(500)
    save(page, "sheet-overview")
    page.evaluate("document.querySelector('.resrow').scrollIntoView({block:'start'}); window.scrollBy(0,-150)")
    page.wait_for_timeout(500)
    save(page, "sheet-resources")
    page.evaluate("[...document.querySelectorAll('.content h2')].find(h=>h.innerText.toLowerCase().startsWith('moves')).scrollIntoView({block:'start'}); window.scrollBy(0,-150)")
    page.wait_for_timeout(500)
    save(page, "sheet-moves")
    # Würfel-Fenster und 3D-Würfel
    page.evaluate("window.scrollTo(0,0)")
    page.locator(".dock .pill").click()
    page.wait_for_timeout(500)
    page.locator(".dock button.primary", has_text="Würfeln").first.click()
    page.wait_for_timeout(2300)
    save(page, "dice")


@step("Assistent")
def wizard(page):
    page.goto(f"{BASE}/#/neu")
    page.wait_for_timeout(600)
    page.locator(".opt", has_text=re.compile("Legende", re.I)).click()
    btn(page, "Weiter", exact=True).click()
    page.locator(".opt", has_text=re.compile("Assistent", re.I)).click()
    page.wait_for_url(re.compile("wizard/"))
    page.wait_for_timeout(500)
    page.locator(".step input").first.fill("Mara Voss")
    page.locator(".step textarea").first.fill("Ehemalige Parkour-Läuferin, die für die falsche Seite Pakete trug.")
    btn(page, re.compile("Weiter")).click()
    page.wait_for_timeout(500)
    page.locator(".tpl .chip", has_text="Sturmninja").click()
    page.locator(".tpl .chip", has_text="Revolverheld").click()
    page.wait_for_timeout(300)
    page.locator(".title input[type=number]").first.fill("4")
    page.locator(".title input[type=number]").first.dispatch_event("change")
    page.wait_for_timeout(400)
    save(page, "wizard")


@step("Regelwerk")
def rulebook(page):
    page.goto(f"{BASE}/#/")
    page.wait_for_timeout(800)
    page.locator(".rbbtn").click()
    page.wait_for_timeout(1500)
    page.locator("aside.rb input[type=search]").fill("Dominanz")
    page.wait_for_timeout(500)
    page.locator("aside.rb .hit").first.click()
    page.wait_for_timeout(500)
    page.evaluate("""() => {
      const sc = document.querySelector('aside.rb .body');
      const el = sc.querySelector('[id="rb-sec-3-1-die-wuerfelmechanik-der-clash"]');
      sc.scrollTop = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - 8;
    }""")
    page.wait_for_timeout(1500)
    save(page, "rulebook")
    page.keyboard.press("Escape")
    page.wait_for_timeout(400)


@step("Builder")
def builder(page):
    page.goto(f"{BASE}/#/builder")
    page.wait_for_timeout(800)
    page.locator(".list button", has_text="Flashbang").click()
    page.wait_for_timeout(500)
    save(page, "builder")


def make_characters(page):
    """Zwei Charaktere für die SL-Ansicht: das Beispiel Jin und eine manuell angelegte Figur."""
    page.goto(f"{BASE}/#/charaktere")
    page.wait_for_timeout(800)
    btn(page, re.compile("Beispiel laden")).click()
    page.wait_for_url(re.compile("charakter/"))
    page.wait_for_timeout(400)
    page.goto(f"{BASE}/#/neu")
    page.wait_for_timeout(500)
    btn(page, "Weiter", exact=True).click()
    page.locator(".opt", has_text=re.compile("Manuell", re.I)).click()
    page.wait_for_url(re.compile("charakter/"))
    page.wait_for_timeout(500)
    page.locator(".ident .fields input").first.fill("Mara Voss")
    page.wait_for_timeout(400)


@step("SL")
def gm(page):
    make_characters(page)
    page.goto(f"{BASE}/#/sl")
    page.wait_for_timeout(800)
    page.get_by_role("button", name=re.compile("Runde starten|Neue Runde", re.I)).first.click()
    page.wait_for_selector(".code", timeout=30000)
    tab(page, "Einstellungen", GM)
    sel = page.locator("select[aria-label='Aus Bibliothek']")
    for i in (1, 2):  # Jin und Mara
        opts = sel.locator("option").all_inner_texts()
        if len(opts) > i:
            sel.select_option(index=i)
            btn(page, "Hinzufügen", exact=True).click()
            page.wait_for_timeout(300)
    tab(page, "Spieler", GM)
    page.wait_for_timeout(500)
    save(page, "gm-players")

    tab(page, "Kampf", GM)
    btn(page, "Kampf starten").click()
    for typ, name in (("elite", "Chen"), ("goon", "Wachen")):
        page.select_option('select[aria-label="Typ"]', typ)
        page.locator('input[placeholder="Name (optional)"]').fill(name)
        btn(page, "+ Gegner").click()
        page.wait_for_timeout(250)
    btn(page, re.compile("Goon-Treffer")).first.click()
    page.wait_for_timeout(500)
    save(page, "gm-combat")

    tab(page, "Karte", GM)
    btn(page, "Beispielkarte laden").click()
    page.wait_for_timeout(2500)
    for b in page.locator(".gmmap button", has_text=re.compile(r"^\+ (Jin|Mara)")).all():
        pass
    for label in ("Jin", "Mara"):
        loc = page.locator(".gmmap button", has_text=re.compile(rf"^\+ {label}"))
        if loc.count():
            loc.first.click()
            page.wait_for_timeout(500)
    page.locator(".gmmap .npc input").first.fill("Chen")
    btn(page, "+ Token").click()
    page.wait_for_timeout(400)
    btn(page, "Alles verdunkeln").click()
    page.locator(".toolbar button", has_text="Aufdecken ▭").click()
    box = page.locator(".gmmap canvas").bounding_box()
    page.mouse.move(box["x"] + box["width"] * 0.18, box["y"] + box["height"] * 0.22)
    page.mouse.down()
    page.mouse.move(box["x"] + box["width"] * 0.55, box["y"] + box["height"] * 0.5, steps=8)
    page.mouse.move(box["x"] + box["width"] * 0.8, box["y"] + box["height"] * 0.8, steps=8)
    page.mouse.up()
    page.locator(".toolbar button", has_text="Bewegen").click()
    page.wait_for_timeout(600)
    page.evaluate("document.querySelector('.gmmap .toolbar').scrollIntoView({block:'start'}); window.scrollBy(0,-90)")
    page.wait_for_timeout(500)
    save(page, "gm-map")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1400, "height": 900}, locale="de-DE")
        page = ctx.new_page()
        page.on("dialog", lambda d: d.accept())
        steps = {"sheet": sheet, "wizard": wizard, "rulebook": rulebook, "builder": builder, "gm": gm}
        wanted = sys.argv[2:] or list(steps)
        for name in wanted:
            steps[name](page)
        browser.close()


if __name__ == "__main__":
    main()
