"""Write image prompts with the agy CLI (Gemini) instead of spending Claude tokens.

agy only receives text in the prompt and returns JSON; it runs in an empty
temp directory and is never given file or shell permissions.
"""
import json
import re
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


NO_TOOLS = """IMPORTANT: Everything you need is in this message. Do not use any tools: do not run
commands, do not read, create or edit files, do not browse. Think, then answer only with the
requested JSON.

"""
RETRY_NOTE = """Your previous attempt tried to use a tool, which is not allowed here, and produced no
answer. Do not use tools this time; return the JSON answer directly.

"""


def _find_json(text, required):
    """Last JSON object in `text` that has all `required` keys, or None."""
    dec = json.JSONDecoder()
    for i in [i for i, ch in enumerate(text) if ch == "{"][::-1]:
        try:
            obj, _ = dec.raw_decode(text[i:])
        except ValueError:
            continue
        if isinstance(obj, dict) and required <= obj.keys():
            return obj
    return None


def _unwrap(obj, required):
    """Models sometimes put a whole ```json {...}``` answer into a single field.
    Unpack such nesting until the fields hold plain values."""
    for _ in range(3):
        nested = None
        for key in required:
            value = obj.get(key)
            if isinstance(value, str) and value.lstrip().startswith(("```", "{")):
                nested = _find_json(value, required)
                if nested:
                    break
        if not nested:
            return obj
        obj = nested
    return obj


def _structured(data, schema):
    """structured_output, or a JSON object with the required keys found in the response text."""
    required = set(schema.get("required", []))
    obj = data.get("structured_output") or _find_json(data.get("response") or "", required)
    return _unwrap(obj, required) if obj else None


def fast_variant(model):
    """Same model family with low reasoning effort (agy encodes effort in the model name)."""
    return re.sub(r"-(medium|high)$", "-low", model) if model else model


def run(prompt, schema, model=None, timeout=600):
    """Run one agy print-mode turn and return its structured JSON output.

    agy runs in an empty temp dir without auto-approved permissions; if it still
    tries a tool (which then gets denied) and comes back empty, ask once more.
    """
    if not available():
        raise AgyError("agy wurde nicht gefunden (Antigravity CLI).")
    data = {}
    for attempt in range(2):
        full = NO_TOOLS + (RETRY_NOTE if attempt else "") + prompt
        with tempfile.TemporaryDirectory(prefix="rpdf-agy-") as tmp:
            schema_path = Path(tmp) / "schema.json"
            schema_path.write_text(json.dumps(schema), encoding="utf-8")
            cmd = ["agy", "-p", full, "--output-format", "json",
                   "--json-schema", str(schema_path), "--print-timeout", f"{timeout}s"]
            if model:
                cmd += ["--model", model]
            proc = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True, timeout=timeout + 60)
        out = proc.stdout.strip()
        start = out.find("{")
        if start < 0:
            raise AgyError(f"agy lieferte keine Antwort: {(proc.stderr or out)[-600:]}")
        data = json.loads(out[start:])
        if data.get("status") == "SUCCESS":
            result = _structured(data, schema)
            if result is not None:
                return result
        if not data.get("denied_actions"):
            break
    denied = ", ".join(a.get("display_name", a.get("action", "?")) for a in data.get("denied_actions", []))
    if denied:
        raise AgyError(f"agy wollte ein Werkzeug benutzen ({denied}), das ist hier gesperrt, "
                       "und hat danach keine Antwort geliefert – auch nicht im zweiten Versuch.")
    raise AgyError(f"agy-Fehler ({data.get('status')}): {(data.get('error') or data.get('response') or '')[:400]}")


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


META_TEXT = ("successfully", "requested json", "json format", "as requested", "here is", "generated prompt")


def _real_prompt(text):
    """True if `text` is an actual image description and not a status message about one."""
    t = (text or "").strip()
    return len(t.split()) >= 10 and not any(m in t.lower() for m in META_TEXT)


def _orientation(slot):
    aspect = getattr(slot, "aspect", None)
    if slot.kind in ("cover", "background"):
        return "portrait"
    if slot.kind == "filler" and aspect:
        return "portrait" if aspect < 0.9 else "square" if aspect < 1.25 else "landscape"
    return "wide landscape"


def plan_single(slot, world, model=None, hint=""):
    """New prompt for one slot, optionally steered by a user hint."""
    prompt = f"""You write prompts for an image model that illustrates a tabletop RPG rulebook.
World of the book: {world}

Section "{slot.title}":
{slot.context_md[:CHAPTER_TEXT_LIMIT]}

Write one fresh image description for this {slot.kind} image ({_orientation(slot)} format).{(' User wish: ' + hint) if hint else ''}
{'Keep the lower third dark and empty for the title.' if slot.kind == 'cover' else ''}
Put the description itself into "image_prompt" - not a note that you wrote it.

{RULES}"""
    schema = {"type": "object", "properties": {"image_prompt": {
        "type": "string", "description": "The image description itself, 25-60 English words."}},
        "required": ["image_prompt"]}
    for _ in range(2):
        text = run(prompt, schema, model)["image_prompt"].strip()
        if _real_prompt(text):
            return text
        prompt += "\n\nYour last answer was a status message, not an image description. Return the description."
    raise AgyError(f"agy lieferte keine Bildbeschreibung, sondern: „{text[:120]}“")


def _run_on_image(image_path, work_dir, prompt, schema, model=None):
    """agy call that may read exactly one file: a downscaled copy of the image.

    work_dir contains nothing but that copy. agy runs there with --sandbox and normal
    permission handling (no auto-approval); it can read the image because the folder
    lies in one of agy's trusted workspaces.
    """
    from PIL import Image

    work_dir.mkdir(parents=True, exist_ok=True)
    for old in work_dir.iterdir():
        old.unlink()
    with Image.open(image_path) as im:
        im = im.convert("RGB")
        im.thumbnail((768, 768))
        im.save(work_dir / "image.jpg", "JPEG", quality=85)
    schema = {**schema, "properties": {"could_view": {"type": "boolean"}, **schema["properties"]},
              "required": ["could_view"] + schema["required"]}
    head = ("Look at the image file image.jpg in the current directory with your file viewing tool. "
            "Only view that file: do not run commands, do not create or edit files.\n"
            "Set could_view=false if you could not open the image.\n\n")
    if not available():
        raise AgyError("agy wurde nicht gefunden (Antigravity CLI).")
    with tempfile.TemporaryDirectory(prefix="rpdf-agy-") as tmp:
        schema_path = Path(tmp) / "schema.json"
        schema_path.write_text(json.dumps(schema), encoding="utf-8")
        cmd = ["agy", "-p", head + prompt, "--output-format", "json", "--json-schema", str(schema_path),
               "--sandbox", "--print-timeout", "300s"]
        if model:
            cmd += ["--model", model]
        proc = subprocess.run(cmd, cwd=work_dir, capture_output=True, text=True, timeout=360)
    out = proc.stdout.strip()
    start = out.find("{")
    if start < 0:
        raise AgyError(f"agy lieferte keine Antwort: {(proc.stderr or out)[-600:]}")
    data = json.loads(out[start:])
    result = _structured(data, schema) if data.get("status") == "SUCCESS" else None
    if not result:
        raise AgyError(f"agy-Fehler bei der Bildanalyse: {(data.get('error') or data.get('response') or '')[:400]}")
    if not result.get("could_view"):
        raise AgyError("agy konnte das Bild nicht öffnen. Der Projektordner muss in agys "
                       "'trustedWorkspaces' liegen (siehe README, Abschnitt Bildkontrolle).")
    return result


IMAGE_FORMAT_NOTE = ("Do NOT judge or mention image size, aspect ratio or orientation (portrait/landscape) - "
                     "the tool sets the format on purpose.")


def check_image(image_path, work_dir, slot, prompt_used, world, model=None):
    """Let agy look at one generated image and judge whether it fits its section."""
    prompt = f"""The image was generated to illustrate a tabletop RPG rulebook.
World of the book: {world or 'unknown'}
Section: "{slot.title}"
Section text (excerpt):
{slot.context_md[:1500]}

Intended motif: {prompt_used}

Judge it like an art director of a published rulebook:
- Does it show the intended motif and fit the section and the world?
- Garbled or readable text, letters, logos? Broken anatomy (extra limbs, fused hands, faces)?
- Elements that do not belong (monsters or wings when not asked for, wrong era, wrong genre)?
{IMAGE_FORMAT_NOTE}
fits=true only if it is good enough to print.
problems: short German bullet points. better_prompt: an improved English motif prompt (25-60 words,
no style words, no text in the image) that avoids the problems."""
    schema = {"type": "object", "properties": {
        "fits": {"type": "boolean"}, "problems": {"type": "array", "items": {"type": "string"}},
        "better_prompt": {"type": "string"}}, "required": ["fits", "problems", "better_prompt"]}
    return _run_on_image(image_path, work_dir, prompt, schema, model)


def analyse_image(image_path, work_dir, slot, prompt_used, negative_used, world, model_hint, wish="", model=None):
    """agy looks at the image and fine-tunes motif prompt and negative prompt for the next render."""
    prompt = f"""You are fine-tuning the prompt for an image that illustrates a tabletop RPG rulebook.
{model_hint}
World of the book: {world or 'unknown'}
Section: "{slot.title}"
Section text (excerpt):
{slot.context_md[:1500]}

Motif prompt used: {prompt_used}
Negative prompt used: {negative_used or '(none)'}
{('User wish for the next version: ' + wish) if wish else ''}

Compare the image with the section and the motif prompt. Then write:
- analysis: 2-4 short German sentences: what works, what is off (motif, composition, anatomy,
  text artifacts, mood, details that contradict the section).
- prompt: the improved English motif prompt (25-60 words, no style words, no text in the image),
  keeping what works and fixing what is off{', and realizing the user wish' if wish else ''}.
- negative: an English negative prompt for this image: the generic quality terms plus terms that
  target the concrete problems you saw (comma-separated, max 40 words).
{IMAGE_FORMAT_NOTE}"""
    schema = {"type": "object", "properties": {
        "analysis": {"type": "string"}, "prompt": {"type": "string"}, "negative": {"type": "string"}},
        "required": ["analysis", "prompt", "negative"]}
    return _run_on_image(image_path, work_dir, prompt, schema, model)


COMPRESS_TASK = {
    "style": "a style suffix that is appended to every image prompt (medium, line work, palette, "
             "lighting, quality tags)",
    "negative": "a negative prompt (things the image model must avoid)",
    "world": "a short description of the book's world, genre and tone that is given to other illustrators",
    "wish": "a free-text style wish from the user",
}


def compress(text, kind, model_hint, model=None):
    """Remove redundant or ineffective parts from a prompt field."""
    prompt = f"""You are an expert prompt engineer for image-generation models.
{model_hint}

This text is {COMPRESS_TASK[kind]}:
---
{text}
---
Make it shorter and more effective for this model: remove duplicates and near-duplicates,
contradictions, filler words, vague or ineffective phrases and things the model cannot use.
Keep every distinct, useful idea and the original language of the text. Do not add new ideas.
compressed: the result. removed: short German list of what you removed and why."""
    schema = {"type": "object", "properties": {
        "compressed": {"type": "string"}, "removed": {"type": "array", "items": {"type": "string"}}},
        "required": ["compressed", "removed"]}
    return run(prompt, schema, model)


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
Put the Markdown itself into the "markdown" field - plain Markdown, not JSON and not a code block.
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
    return run(prompt, schema, fast_variant(model), timeout=900)["markdown"]
