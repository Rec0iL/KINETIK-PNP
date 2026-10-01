"""Pipeline steps shared by CLI and GUI.

Each step takes a Context with log/progress callbacks and a cancel flag.
"""
import random

from . import comfy, layout, planner
from .project import size_for


class Cancelled(Exception):
    pass


class Context:
    def __init__(self, log=print, progress=lambda done, total: None, cancelled=lambda: False):
        self.log, self.progress, self.cancelled = log, progress, cancelled

    def check(self):
        if self.cancelled():
            raise Cancelled()


def _detect(project, doc, ctx):
    if project.config["layout"].get("fill_gaps"):
        layout.detect_fillers(project, doc, ctx.log)


def plan(project, ctx, force=False, keys=None, suggest_style=None):
    """Fill missing image prompts via agy. force=True rewrites existing prompts too."""
    doc = project.document()
    _detect(project, doc, ctx)
    slots = project.sync_manifest(project.slots(doc))
    model = project.config["agy"].get("model") or None
    wanted = [s for s in slots if (keys is None or s.key in keys)
              and (force or not project.entry(s.key).get("prompt"))]
    if not wanted:
        ctx.log("Alle Prompts sind schon vorhanden.")
        return

    cfg = project.config
    need_global = (not cfg.get("world") or any(s.kind in ("cover", "background") for s in wanted)
                   or (suggest_style if suggest_style is not None else not cfg.get("style")))
    total = len({s.chapter_key for s in wanted if s.chapter_key}) + (1 if need_global else 0)
    done = 0
    ctx.progress(done, total)

    if need_global:
        ctx.log("agy: Welt, Stil, Cover und Hintergrund …")
        g = planner.plan_global(doc, cfg.get("title") or doc.title or "", model)
        cfg["world"] = g["world"]
        if suggest_style or (suggest_style is None and not cfg.get("style")):
            cfg["style"] = g["style"]
            cfg["theme"]["accent"], cfg["theme"]["accent2"] = g["accent"], g["accent2"]
            ctx.log(f"Stil-Vorschlag übernommen: {g['style']}")
        for key in ("cover", "background"):
            if any(s.key == key for s in wanted):
                project.entry(key).update(prompt=g[key], include_style=True)
        project.save()
        done += 1
        ctx.progress(done, total)

    by_chapter = {}
    for s in wanted:
        if s.chapter_key:
            by_chapter.setdefault(s.chapter_key, []).append(s)
    chapters = {c.key: c for c in doc.chapters}

    # Sequential on purpose: concurrent agy runs interfere with each other and
    # come back with empty results.
    for ck, chapter_slots in by_chapter.items():
        ctx.check()
        title = chapters[ck].full_title
        pending, got = list(chapter_slots), {}
        for attempt in range(2):
            try:
                got.update(planner.plan_chapter(chapters[ck], pending, cfg["world"], model))
            except planner.AgyError as e:
                ctx.log(f"agy-Fehler bei „{title}“: {e}")
            pending = [s for s in chapter_slots if s.key not in got]
            if not pending:
                break
            if attempt == 0:
                ctx.log(f"„{title}“: {len(pending)} Prompt(s) fehlen, frage erneut …")
        # last resort: ask for the remaining slots one by one
        for s in list(pending):
            try:
                got[s.key] = planner.plan_single(s, cfg["world"], model)
                pending.remove(s)
            except planner.AgyError as e:
                ctx.log(f"agy-Fehler bei „{s.title}“: {e}")
        for key, prompt in got.items():
            project.entry(key).update(prompt=prompt, include_style=True)
        ctx.log(f"Prompts für „{title}“: {len(got)}/{len(chapter_slots)}"
                + (f" (fehlt: {', '.join(s.title for s in pending)})" if pending else ""))
        project.save_manifest()
        done += 1
        ctx.progress(done, total)
    project.save()


def replan_one(project, key, hint="", ctx=None):
    slot = next(s for s in project.slots() if s.key == key)
    prompt = planner.plan_single(slot, project.config.get("world", ""),
                                 project.config["agy"].get("model") or None, hint)
    project.entry(key).update(prompt=prompt, include_style=True)
    project.save_manifest()
    return prompt


def images(project, ctx, keys=None, regenerate=False, new_seed=False):
    """Generate images. By default only slots without an image file."""
    doc = project.document()
    if keys is None:
        _detect(project, doc, ctx)
    slots = project.sync_manifest(project.slots(doc))
    todo = [s for s in slots if (keys is None or s.key in keys)
            and (regenerate or not project.has_image(s.key))]
    if not todo:
        ctx.log("Keine Bilder zu generieren.")
        return
    no_prompt = [s for s in todo if not project.entry(s.key).get("prompt", "").strip()]
    if no_prompt:
        ctx.log(f"Ohne Prompt übersprungen: {', '.join(s.title for s in no_prompt)} – erst „Prompts planen“.")
        todo = [s for s in todo if s not in no_prompt]

    cfg = project.config["comfy"]
    client = comfy.Comfy(cfg["url"])
    comfy.Comfy.check_config(cfg)
    if not client.alive():
        raise comfy.ComfyError(f"ComfyUI unter {cfg['url']} nicht erreichbar – in Pinokio starten.")

    qc = project.config.get("qc", {})
    for i, s in enumerate(todo):
        ctx.check()
        ctx.progress(i, len(todo))
        e = project.entry(s.key)
        if new_seed:
            e["seed"] = random.randint(1, 2**31 - 1)
        ctx.log(f"[{i + 1}/{len(todo)}] {s.title}")
        _generate(project, client, cfg, s, ctx)
        if qc.get("enabled"):
            _check_and_fix(project, client, cfg, s, ctx, fix=qc.get("auto_fix", True),
                           rounds=int(qc.get("rounds", 1)))
    ctx.progress(len(todo), len(todo))


def _generate(project, client, cfg, slot, ctx):
    e = project.entry(slot.key)
    w, h = size_for(slot)
    wf = comfy.Comfy.build_workflow(cfg, project.full_prompt(slot.key), project.negative(slot.key), w, h, e["seed"])
    img = client.generate(wf, cancelled=ctx.cancelled)
    comfy.save_image(img, project.image_path(slot.key), slot.kind)
    e.pop("qc", None)
    project.save_manifest()
    ctx.log(f"    gespeichert: {project.image_path(slot.key).name}")


def _check_and_fix(project, client, cfg, slot, ctx, fix, rounds):
    """agy image check; on a miss optionally rewrite the prompt and regenerate."""
    model = project.config["agy"].get("model") or None
    for attempt in range(rounds + 1):
        ctx.check()
        e = project.entry(slot.key)
        result = planner.check_image(project.image_path(slot.key), project.build_dir / "qc" / slot.key,
                                     slot, e.get("prompt", ""), project.config.get("world", ""), model)
        e["qc"] = {"fits": result["fits"], "problems": result["problems"]}
        project.save_manifest()
        if result["fits"]:
            ctx.log("    Bildkontrolle: passt")
            return True
        ctx.log("    Bildkontrolle: passt nicht – " + "; ".join(result["problems"]))
        if not fix or attempt == rounds:
            return False
        e.update(prompt=result["better_prompt"], include_style=True, seed=random.randint(1, 2**31 - 1))
        ctx.log("    neuer Prompt, generiere neu …")
        _generate(project, client, cfg, slot, ctx)
    return False


def check(project, ctx, keys=None, fix=None):
    """Run the agy image check over existing images (fix=None: use the project setting)."""
    qc = project.config.get("qc", {})
    fix = qc.get("auto_fix", True) if fix is None else fix
    slots = [s for s in project.sync_manifest(project.slots())
             if project.has_image(s.key) and s.kind != "background" and (keys is None or s.key in keys)]
    cfg = project.config["comfy"]
    client = comfy.Comfy(cfg["url"])
    if fix:
        comfy.Comfy.check_config(cfg)
        if not client.alive():
            raise comfy.ComfyError(f"ComfyUI unter {cfg['url']} nicht erreichbar – in Pinokio starten.")
    misses = 0
    for i, s in enumerate(slots):
        ctx.check()
        ctx.progress(i, len(slots))
        ctx.log(f"[{i + 1}/{len(slots)}] prüfe {s.title}")
        if not _check_and_fix(project, client, cfg, s, ctx, fix=fix, rounds=int(qc.get("rounds", 1))):
            misses += 1
    ctx.progress(len(slots), len(slots))
    ctx.log(f"Bildkontrolle fertig: {len(slots) - misses} passen, {misses} auffällig.")


def refine_style(project, wish):
    """Ask agy to turn a free-text style wish into a style suffix + accent colors."""
    from .styles import model_hint
    cfg = project.config
    return planner.refine_style(wish, cfg.get("style", ""), cfg.get("world", ""),
                                model_hint(cfg["comfy"]), cfg["agy"].get("model") or None)


def preview(project, key, ctx, prompt=None, style=None, seed=None):
    """Render one slot with the current settings into .build/ without touching the project images."""
    slot = next(s for s in project.slots() if s.key == key)
    e = project.entry(key)
    subject = (prompt if prompt is not None else e.get("prompt", "")).strip()
    style = (style if style is not None else project.config.get("style", "")).strip()
    full = f"{subject}, {style}" if style and e.get("include_style", True) else subject
    cfg = project.config["comfy"]
    client = comfy.Comfy(cfg["url"])
    comfy.Comfy.check_config(cfg)
    if not client.alive():
        raise comfy.ComfyError(f"ComfyUI unter {cfg['url']} nicht erreichbar – in Pinokio starten.")
    w, h = size_for(slot)
    ctx.log(f"Vorschau: {slot.title}")
    wf = comfy.Comfy.build_workflow(cfg, full, project.negative(key), w, h, seed or e["seed"])
    img = client.generate(wf, cancelled=ctx.cancelled)
    path = project.build_dir / f"preview-{key}.jpg"
    comfy.save_image(img, path, slot.kind)
    return path


def build(project, ctx):
    return layout.render(project, log=ctx.log)
