"""Write image prompts with the agy CLI (Gemini) instead of spending Claude tokens.

agy only receives text in the prompt and returns JSON; it runs in an empty
temp directory and is never given file or shell permissions.
"""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

CHAPTER_TEXT_LIMIT = 14000
OVERVIEW_TEXT_LIMIT = 6000

RULES = """Rules for every prompt:
- One concrete, vivid scene that shows what the section is about (its mechanic, theme or example),
  set in the world/genre of this rulebook.
- English, 25-60 words: subjects, action, setting, mood, camera angle. Wide landscape composition
  unless stated otherwise.
- Do NOT add art-style words (medium, line art, rendering, quality tags) - a style suffix is appended automatically.
- No readable text, letters, numbers, logos, signs with writing, UI elements or panels.
- People should match the setting. No monsters, creatures or wings unless the section is about them.
- Vary characters, places and camera angles between sections so the book does not repeat itself."""


class AgyError(RuntimeError):
    pass


def available():
    return shutil.which("agy") is not None


def list_models():
    try:
        out = subprocess.run(["agy", "models"], capture_output=True, text=True, timeout=60).stdout
    except Exception:
        return []
    return [line.split("\t")[0] for line in out.splitlines() if "\t" in line]


def run(prompt, schema, model=None, timeout=600):
    """Run one agy print-mode turn and return its structured JSON output."""
    if not available():
        raise AgyError("agy wurde nicht gefunden (Antigravity CLI).")
    with tempfile.TemporaryDirectory(prefix="rpdf-agy-") as tmp:
        schema_path = Path(tmp) / "schema.json"
        schema_path.write_text(json.dumps(schema), encoding="utf-8")
        cmd = ["agy", "-p", prompt, "--output-format", "json",
               "--json-schema", str(schema_path), "--print-timeout", f"{timeout}s"]
        if model:
            cmd += ["--model", model]
        proc = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True, timeout=timeout + 60)
    out = proc.stdout.strip()
    start = out.find("{")
    if start < 0:
        raise AgyError(f"agy lieferte keine Antwort: {(proc.stderr or out)[-600:]}")
    data = json.loads(out[start:])
    if data.get("status") != "SUCCESS" or "structured_output" not in data:
        raise AgyError(f"agy-Fehler: {str(data)[:600]}")
    return data["structured_output"]


def plan_global(doc, title, model=None):
    """Genre summary, a style suggestion, theme colors, cover and background prompts."""
    outline = "\n".join(f"- {c.full_title}" + "".join(f"\n  - {s.title}" for s in c.sections)
                        for c in doc.chapters)
    sample = doc.intro_md + "\n\n" + "\n\n".join(c.intro_md for c in doc.chapters)
    prompt = f"""You are the art director for an illustrated tabletop RPG rulebook PDF.
Book title: {title}

Table of contents:
{outline}

Excerpt:
{sample[:OVERVIEW_TEXT_LIMIT]}

Return:
- world: 2-3 sentences (English) describing genre, setting, era and tone, for other illustrators.
- style: a comma-separated art-style suffix (English, 15-35 words) for an image model that suits this
  book's genre: medium, line work, lighting, color mood, plus quality tags. No subjects.
- accent, accent2: two hex colors for the PDF layout (headings and highlights) that fit the style,
  readable on a near-black background.
- cover: a portrait-format cover scene with the book's iconic characters in dramatic action; keep the
  lower third as calm dark empty space for the title.
- background: an abstract, dark, low-contrast texture fitting the setting, for page backgrounds;
  no people, no objects in focus.

{RULES}"""
    schema = {"type": "object", "properties": {
        "world": {"type": "string"}, "style": {"type": "string"},
        "accent": {"type": "string"}, "accent2": {"type": "string"},
        "cover": {"type": "string"}, "background": {"type": "string"}},
        "required": ["world", "style", "accent", "accent2", "cover", "background"]}
    return run(prompt, schema, model)


def plan_chapter(chapter, slots, world, model=None):
    """Prompts for the chapter banner and its section slots: {key: prompt}."""
    text = chapter.intro_md + "".join(f"\n\n### {s.title}\n{s.body_md}" for s in chapter.sections)
    def describe(s):
        if s.kind == "chapter":
            return f'chapter banner for "{s.title}"'
        if s.kind == "filler":
            shape = "portrait" if s.aspect < 0.9 else ("square" if s.aspect < 1.25 else "landscape")
            return (f'additional {shape} illustration for "{s.title.removeprefix("Füllbild: ")}" '
                    f'- a different moment, place or character than its section image')
        return f'section "{s.title}"'
    wanted = "\n".join(f"- {s.key}: {describe(s)}" for s in slots)
    prompt = f"""You write prompts for an image model that illustrates a tabletop RPG rulebook.
World of the book: {world}

Chapter "{chapter.full_title}":
{text[:CHAPTER_TEXT_LIMIT]}

Write one prompt for each of these keys:
{wanted}

{RULES}"""
    schema = {"type": "object", "properties": {"images": {"type": "array", "items": {
        "type": "object", "properties": {"key": {"type": "string"}, "prompt": {"type": "string"}},
        "required": ["key", "prompt"]}}}, "required": ["images"]}
    result = run(prompt, schema, model)
    keys = {s.key for s in slots}
    out = {}
    for item in result.get("images", []):
        key = item.get("key", "").strip().strip("`'\"[]- ").lower()
        if key in keys and item.get("prompt", "").strip():
            out[key] = item["prompt"].strip()
    return out


def plan_single(slot, world, model=None, hint=""):
    """New prompt for one slot, optionally steered by a user hint."""
    prompt = f"""You write prompts for an image model that illustrates a tabletop RPG rulebook.
World of the book: {world}

Section "{slot.title}":
{slot.context_md[:CHAPTER_TEXT_LIMIT]}

Write one fresh prompt for this {slot.kind} image.{(' User wish: ' + hint) if hint else ''}
{'Portrait format; keep the lower third dark and empty for the title.' if slot.kind == 'cover' else ''}

{RULES}"""
    schema = {"type": "object", "properties": {"prompt": {"type": "string"}}, "required": ["prompt"]}
    return run(prompt, schema, model)["prompt"].strip()


def check_image(image_path, work_dir, slot, prompt_used, world, model=None):
    """Let agy look at one generated image and judge whether it fits its section.

    This is the only agy call that touches a file: work_dir contains nothing but a
    downscaled copy of the image. agy runs there with --sandbox and normal
    permission handling (no auto-approval); it can read the image because the
    folder lies in one of agy's trusted workspaces.
    """
    from PIL import Image

    work_dir.mkdir(parents=True, exist_ok=True)
    for old in work_dir.iterdir():
        old.unlink()
    with Image.open(image_path) as im:
        im = im.convert("RGB")
        im.thumbnail((768, 768))
        im.save(work_dir / "image.jpg", "JPEG", quality=85)

    prompt = f"""Look at the image file image.jpg in the current directory with your file viewing tool.
Only view that file: do not run commands, do not create or edit files.

It was generated to illustrate a tabletop RPG rulebook.
World of the book: {world or 'unknown'}
Section: "{slot.title}"
Section text (excerpt):
{slot.context_md[:1500]}

Intended motif: {prompt_used}

Judge it like an art director of a published rulebook:
- Does it show the intended motif and fit the section and the world?
- Garbled or readable text, letters, logos? Broken anatomy (extra limbs, fused hands, faces)?
- Elements that do not belong (monsters or wings when not asked for, wrong era, wrong genre)?
Set could_view=false if you could not open the image. fits=true only if it is good enough to print.
problems: short German bullet points. better_prompt: an improved English motif prompt (25-60 words,
no style words, no text in the image) that avoids the problems."""
    schema = {"type": "object", "properties": {
        "could_view": {"type": "boolean"}, "fits": {"type": "boolean"},
        "problems": {"type": "array", "items": {"type": "string"}}, "better_prompt": {"type": "string"}},
        "required": ["could_view", "fits", "problems", "better_prompt"]}
    if not available():
        raise AgyError("agy wurde nicht gefunden (Antigravity CLI).")
    with tempfile.TemporaryDirectory(prefix="rpdf-agy-") as tmp:
        schema_path = Path(tmp) / "schema.json"
        schema_path.write_text(json.dumps(schema), encoding="utf-8")
        cmd = ["agy", "-p", prompt, "--output-format", "json", "--json-schema", str(schema_path),
               "--sandbox", "--print-timeout", "300s"]
        if model:
            cmd += ["--model", model]
        proc = subprocess.run(cmd, cwd=work_dir, capture_output=True, text=True, timeout=360)
    out = proc.stdout.strip()
    start = out.find("{")
    if start < 0:
        raise AgyError(f"agy lieferte keine Antwort: {(proc.stderr or out)[-600:]}")
    data = json.loads(out[start:])
    result = data.get("structured_output")
    if data.get("status") != "SUCCESS" or not result:
        raise AgyError(f"agy-Fehler bei der Bildkontrolle: {str(data)[:600]}")
    if not result.get("could_view"):
        raise AgyError("agy konnte das Bild nicht öffnen. Der Projektordner muss in agys "
                       "'trustedWorkspaces' liegen (siehe README, Abschnitt Bildkontrolle).")
    return result


def refine_style(wish, base_style, world, model_hint, model=None):
    """Turn a free-text style wish ("should look like One Piece") into a style suffix."""
    prompt = f"""You are an expert prompt engineer for image-generation models.
{model_hint}
World of the book being illustrated: {world or 'tabletop RPG rulebook'}
Current style suffix: {base_style or '(none)'}
User's style wish (any language): {wish}

Write an improved style suffix that realizes the user's wish for this model: concrete, comma-separated
English tags/phrases for medium, artist or franchise look, line work, color palette, lighting, plus
quality tags. 15-40 words. Keep parts of the current suffix that do not contradict the wish.
Describe only style, never subjects or scenes. No text, logos or letters.
Also pick two hex accent colors for the PDF layout that match the style and are readable on a
near-black background, and explain your choice in one short sentence (German)."""
    schema = {"type": "object", "properties": {
        "style": {"type": "string"}, "accent": {"type": "string"}, "accent2": {"type": "string"},
        "note": {"type": "string"}}, "required": ["style", "accent", "accent2", "note"]}
    return run(prompt, schema, model)


def convert_to_markdown(text, previous_headings, first, model=None):
    """Turn a chunk of extracted rulebook text into structured Markdown (used by the importer)."""
    prompt = f"""Convert this chunk of text extracted from a tabletop RPG rulebook into clean Markdown.
- Keep the wording exactly as it is (same language, no summarizing, no additions, no translation).
- Restore structure: {'"# " only for the book title, ' if first else 'never use "# ", '}"## " for chapters,
  "### " for sections, "#### " below that; bullet and numbered lists; Markdown tables for tabular data.
- Remove page numbers, running headers/footers and hyphenation at line ends.
- Keep every image reference like ![](media/img-012-000.png) exactly as written, on its own line,
  at the position where it appears in the text.
- Headings so far (keep the same levels for the same kind of heading): {previous_headings[-12:]}

Text:
{text}"""
    schema = {"type": "object", "properties": {"markdown": {"type": "string"}}, "required": ["markdown"]}
    return run(prompt, schema, model, timeout=900)["markdown"]
