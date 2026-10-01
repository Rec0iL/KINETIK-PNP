"""Split a Markdown rulebook into chapters and subsections.

Heading levels are detected automatically: with at most one H1 (the book
title), chapters are H2 and subsections H3; otherwise chapters are H1 and
subsections H2.
"""
import re
import unicodedata
from dataclasses import dataclass, field

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")


@dataclass
class Section:
    title: str
    key: str
    body_md: str


@dataclass
class Chapter:
    title: str          # display title without number and trailing "(...)"
    subtitle: str       # contents of a trailing "(...)", if any
    number: int | None  # leading "3." in the heading, if any
    key: str
    intro_md: str       # text before the first subsection
    sections: list[Section] = field(default_factory=list)
    appendix: bool = False

    @property
    def full_title(self):
        return f"{self.title} ({self.subtitle})" if self.subtitle else self.title

    @property
    def text_length(self):
        return len(self.intro_md) + sum(len(s.body_md) for s in self.sections)


@dataclass
class Document:
    title: str | None
    intro_md: str
    chapters: list[Chapter]
    chapter_level: int


def plain(text):
    """Heading text without Markdown emphasis markers."""
    text = re.sub(r"(\*\*|__|\*|_|`)", "", text)
    return re.sub(r"\s+", " ", text).strip()


def slugify(text, max_len=48):
    text = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        text = text.replace(a, b)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text[:max_len].rstrip("-") or "x"


def normalize_markdown(md):
    # Nested list items indented by 1-3 spaces render fine on GitHub, but
    # python-markdown needs 4, otherwise they appear as literal "*".
    return re.sub(r"(?m)^ {1,3}([*+-] |\d+\. )", r"    \1", md)


def _headings(lines):
    in_fence = False
    for i, line in enumerate(lines):
        if line.lstrip().startswith(("```", "~~~")):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        m = HEADING_RE.match(line)
        if m:
            yield i, len(m.group(1)), m.group(2)


def _split(lines, level):
    """Split lines at headings of exactly `level`. Returns (pre, [(title, body)])."""
    marks = [(i, t) for i, lvl, t in _headings(lines) if lvl == level]
    if not marks:
        return "\n".join(lines), []
    pre = "\n".join(lines[:marks[0][0]])
    parts = []
    for n, (i, title) in enumerate(marks):
        end = marks[n + 1][0] if n + 1 < len(marks) else len(lines)
        parts.append((title, "\n".join(lines[i + 1:end])))
    return pre, parts


def parse(md, chapter_level=None, appendix_patterns=()):
    md = normalize_markdown(md)
    lines = md.splitlines()
    heads = list(_headings(lines))
    h1 = [h for h in heads if h[1] == 1]
    if not chapter_level:
        chapter_level = 2 if len(h1) <= 1 else 1

    doc_title = plain(h1[0][2]) if (chapter_level >= 2 and h1) else None
    pre, chapter_parts = _split(lines, chapter_level)
    if doc_title:
        pre = "\n".join(l for l in pre.splitlines() if not re.match(r"^#\s", l))

    appendix_res = [re.compile(p, re.I) for p in appendix_patterns]
    used_keys = set()

    def unique(key):
        base, n = key, 2
        while key in used_keys:
            key, n = f"{base}-{n}", n + 1
        used_keys.add(key)
        return key

    chapters = []
    for raw_title, body in chapter_parts:
        title = plain(raw_title)
        number = None
        m = re.match(r"^(\d+)[.)]?\s+(.+)$", title)
        if m:
            number, title = int(m.group(1)), m.group(2)
        subtitle = ""
        m = re.match(r"^(.*?)\s*\((.+)\)\s*$", title)
        if m:
            title, subtitle = m.group(1), m.group(2)
        is_appendix = any(r.search(plain(raw_title)) for r in appendix_res)
        key = unique("ch-" + slugify(plain(raw_title)))

        intro, sub_parts = _split(body.splitlines(), chapter_level + 1)
        sections = [Section(title=plain(t), key=unique("sec-" + slugify(plain(t))), body_md=b)
                    for t, b in sub_parts]
        chapters.append(Chapter(title=title, subtitle=subtitle, number=number, key=key,
                                intro_md=intro, sections=sections, appendix=is_appendix))

    return Document(title=doc_title, intro_md=pre, chapters=chapters, chapter_level=chapter_level)
