"""Convert other people's rulebooks (DOCX, PDF, TXT) to Markdown.

DOCX is converted locally from its heading styles. PDF/TXT text has no
reliable structure, so agy restores headings, lists and tables chunk by
chunk while keeping the wording.
"""
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from . import planner

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
CHUNK_CHARS = 12000
HEADING_STYLE_RE = re.compile(r"(?i)(heading|berschrift|titre|titolo|titulo|kop)\s*(\d)")


def to_markdown(src, dest, ctx):
    src, dest = Path(src), Path(dest)
    ext = src.suffix.lower()
    if ext in (".md", ".markdown"):
        shutil.copy(src, dest)
    elif ext == ".docx":
        dest.write_text(docx_to_markdown(src), encoding="utf-8")
    elif ext == ".pdf":
        dest.write_text(_llm_restructure(pdf_text(src), ctx), encoding="utf-8")
    elif ext == ".txt":
        dest.write_text(_llm_restructure(src.read_text(encoding="utf-8", errors="replace"), ctx), encoding="utf-8")
    else:
        raise ValueError(f"Format {ext} wird nicht unterstützt (md, docx, pdf, txt).")
    ctx.log(f"Markdown geschrieben: {dest}")
    return dest


# ---------- DOCX ----------
def _run_text(r):
    t = "".join(x.text or "" for x in r.iter(W + "t"))
    if not t.strip():
        return t
    props = r.find(W + "rPr")
    bold = props is not None and props.find(W + "b") is not None
    ital = props is not None and props.find(W + "i") is not None
    if bold:
        t = f"**{t.strip()}** " if t.endswith(" ") else f"**{t.strip()}**"
    elif ital:
        t = f"*{t.strip()}* " if t.endswith(" ") else f"*{t.strip()}*"
    return t


def _para(p):
    style = p.find(f"{W}pPr/{W}pStyle")
    style_id = style.get(W + "val") if style is not None else ""
    text = "".join(_run_text(r) for r in p.iter(W + "r")).strip()
    text = re.sub(r"\*\*\s*\*\*", "", text)
    if not text:
        return ""
    if style_id.lower() == "title":
        return "# " + re.sub(r"\*", "", text)
    m = HEADING_STYLE_RE.search(style_id)
    if m:
        level = min(int(m.group(2)) + 1, 6)   # Heading 1 -> "##", the title owns "#"
        return "#" * level + " " + re.sub(r"\*", "", text)
    num = p.find(f"{W}pPr/{W}numPr")
    if num is not None:
        lvl = num.find(W + "ilvl")
        depth = int(lvl.get(W + "val")) if lvl is not None else 0
        return "    " * depth + "* " + text
    return text


def _table(tbl):
    rows = []
    for tr in tbl.iter(W + "tr"):
        cells = [" ".join(_para(p) for p in tc.iter(W + "p")).replace("|", "/").strip()
                 for tc in tr.iter(W + "tc")]
        rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    lines = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    return "\n".join(lines)


def docx_to_markdown(path):
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    body = root.find(W + "body")
    blocks, prev_list = [], False
    for el in body:
        if el.tag == W + "p":
            line = _para(el)
            if not line:
                continue
            is_list = line.lstrip().startswith("* ")
            sep = "\n" if (is_list and prev_list) else "\n\n"
            blocks.append(sep + line)
            prev_list = is_list
        elif el.tag == W + "tbl":
            blocks.append("\n\n" + _table(el))
            prev_list = False
    return "".join(blocks).strip() + "\n"


# ---------- PDF / TXT ----------
def pdf_text(path):
    if not shutil.which("pdftotext"):
        raise RuntimeError("pdftotext fehlt (Paket poppler-utils).")
    return subprocess.run(["pdftotext", "-enc", "UTF-8", str(path), "-"],
                          capture_output=True, text=True, check=True).stdout


def _chunks(text):
    pages = text.split("\f")
    chunk = ""
    for page in pages:
        if len(chunk) + len(page) > CHUNK_CHARS and chunk:
            yield chunk
            chunk = ""
        chunk += page + "\n"
    if chunk.strip():
        yield chunk


def _llm_restructure(text, ctx):
    chunks = list(_chunks(text))
    out, headings = [], []
    for i, chunk in enumerate(chunks):
        ctx.check()
        ctx.progress(i, len(chunks))
        ctx.log(f"agy: Abschnitt {i + 1}/{len(chunks)} in Markdown umwandeln …")
        md = planner.convert_to_markdown(chunk, headings, first=(i == 0))
        headings += re.findall(r"(?m)^#{1,4} .+$", md)
        out.append(md.strip())
    ctx.progress(len(chunks), len(chunks))
    return "\n\n".join(out) + "\n"
