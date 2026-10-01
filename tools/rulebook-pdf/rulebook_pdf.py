#!/usr/bin/env python3
"""rulebook-pdf: illustrated PDFs from Markdown rulebooks.

  python3 rulebook_pdf.py gui [PROJEKT]              Oberfläche starten
  python3 rulebook_pdf.py new PROJEKT QUELLE          Projekt anlegen (md, docx, pdf, txt)
  python3 rulebook_pdf.py plan PROJEKT [--force]      Bild-Prompts mit agy schreiben
  python3 rulebook_pdf.py images PROJEKT [--all]      Fehlende (oder alle) Bilder generieren
  python3 rulebook_pdf.py check PROJEKT [--no-fix]    Bilder mit agy prüfen (und unpassende neu machen)
  python3 rulebook_pdf.py restructure PROJEKT ORIGINAL.pdf
                                                      Kapitel laut Inhaltsverzeichnis des Originals hochstufen
  python3 rulebook_pdf.py build PROJEKT               PDF setzen
  python3 rulebook_pdf.py all PROJEKT                 plan + images + build
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["gui", "new", "plan", "images", "check", "build", "all", "detect", "restructure"])
    ap.add_argument("project", nargs="?")
    ap.add_argument("source", nargs="?")
    ap.add_argument("--force", action="store_true", help="plan: vorhandene Prompts neu schreiben")
    ap.add_argument("--all", action="store_true", help="images: auch vorhandene Bilder neu generieren")
    ap.add_argument("--no-fix", action="store_true", help="check: nur prüfen, nichts neu generieren")
    args = ap.parse_args()

    if args.command == "gui":
        from rpdf.gui import run
        return run(args.project)

    if not args.project:
        ap.error("PROJEKT fehlt")
    from rpdf import comfy, pipeline, planner
    ctx = pipeline.Context(log=lambda msg: print(msg, flush=True), progress=lambda d, t: None)
    try:
        run_command(args, ap, ctx)
    except (comfy.ComfyError, planner.AgyError, FileNotFoundError, ValueError, RuntimeError) as e:
        sys.exit(f"Fehler: {e}")


def run_command(args, ap, ctx):
    from rpdf import importer, pipeline, project as proj
    if args.command == "new":
        if not args.source:
            ap.error("QUELLE fehlt")
        root = Path(args.project)
        root.mkdir(parents=True, exist_ok=True)
        src = Path(args.source)
        if src.suffix.lower() not in (".md", ".markdown"):
            src = importer.to_markdown(src, root / (src.stem + ".md"), ctx, proj.DEFAULTS["agy"]["model"])
        p = proj.create(root, src)
        print(f"Projekt angelegt: {p.root} ({len(p.manifest)} Bild-Plätze)")
        return

    p = proj.Project(args.project)
    if args.command == "restructure":
        return restructure(p, args.source, ctx)
    if args.command in ("plan", "all"):
        pipeline.plan(p, ctx, force=args.force)
    if args.command in ("images", "all"):
        pipeline.images(p, ctx, regenerate=args.all)
    if args.command == "check":
        pipeline.check(p, ctx, fix=False if args.no_fix else None)
    if args.command in ("build", "all"):
        pipeline.build(p, ctx)
    if args.command == "detect":   # internal: gap measurement for filler images
        from rpdf import layout
        layout.detect_fillers(p, log=ctx.log)


def restructure(p, original, ctx):
    """Promote headings to chapters according to the original PDF's table of contents,
    keeping the images of the promoted slots."""
    import shutil
    from rpdf import importer, mdparse, project as proj
    if not original:
        sys.exit("ORIGINAL.pdf fehlt (das PDF mit dem Inhaltsverzeichnis).")
    toc = importer.toc_from_pdf(original)
    if not toc:
        sys.exit("Im Original wurde kein Inhaltsverzeichnis gefunden.")
    src = p.source_path
    md, promoted = importer.promote_chapters_from_toc(src.read_text(encoding="utf-8"), toc)
    if not promoted:
        ctx.log("Nichts zu tun: alle Kapitel stimmen schon mit dem Inhaltsverzeichnis überein.")
        return
    backup = src.with_name(src.stem + ".vor-restructure" + src.suffix)
    shutil.copy(src, backup)
    src.write_text(md, encoding="utf-8")
    mapping = {"sec-" + mdparse.slugify(mdparse.plain(t)): "ch-" + mdparse.slugify(mdparse.plain(t)) for t in promoted}
    moved = proj.rekey(p, mapping)
    p.sync_manifest(p.slots())
    p.save()
    ctx.log(f"Zu Kapiteln gemacht: {', '.join(promoted)}")
    ctx.log(f"Bilder übernommen: {len(moved)} · Sicherung: {backup.name}")


if __name__ == "__main__":
    main()
