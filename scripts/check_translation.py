#!/usr/bin/env python3
"""Prüft, dass eine Übersetzung des Regelwerks dieselbe Struktur wie das deutsche Original hat.

Die Bildschlüssel der Übersetzung kommen positionsweise aus der deutschen Datei (`key_source`), deshalb müssen
Zeilenzahl, Überschriften, Tabellen und Listen übereinstimmen. Rein inhaltliche Abweichungen (Zahlen, Hervorhebungen)
werden nur gemeldet, solange `--strict` fehlt.

    python3 scripts/check_translation.py                      # regelwerk/KINETIK_Regelwerk.md gegen .en.md
    python3 scripts/check_translation.py DE.md EN.md --strict
"""
from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DE_DEFAULT = ROOT / "regelwerk" / "KINETIK_Regelwerk.md"
EN_DEFAULT = ROOT / "regelwerk" / "KINETIK_Regelwerk.en.md"

HEADING = re.compile(r"^(#{1,6})\s+(.*?)\s*#*\s*$")
BULLET = re.compile(r"^(\s*)([*+-]|\d+[.)])\s+")
NUM = re.compile(r"\d+(?:[.,]\d+)?")
VERSION = re.compile(r"Version\s+(\d+(?:\.\d+)*)")
HEAD_NUM = re.compile(r"^\**\s*(\d+(?:\.\d+)*)[.)]?\s")
APPENDIX = re.compile(r"^\**\s*(?:Anhang|Appendix)\s+([A-Z])\b")


def kind(line: str) -> str:
    """Grobe Art einer Zeile: gleiche Art in beiden Sprachen ist Pflicht."""
    s = line.rstrip()
    if not s.strip():
        return "blank"
    if re.fullmatch(r"-{3,}", s.strip()):
        return "hr"
    m = HEADING.match(s)
    if m:
        return f"h{len(m.group(1))}"
    if s.lstrip().startswith("|"):
        cells = s.strip().strip("|").split("|")
        sep = all(re.fullmatch(r"\s*:?-{3,}:?\s*", c) for c in cells)
        return f"{'tsep' if sep else 'trow'}{len(cells)}"
    if re.match(r"^\s*!\[", s):
        return "image"
    m = BULLET.match(s)
    if m:
        return f"li{len(m.group(1))}{'n' if m.group(2)[0].isdigit() else 'b'}"
    return "p"


def numbers(line: str) -> Counter:
    return Counter(t.replace(",", ".") for t in NUM.findall(line))


def head_id(line: str) -> str | None:
    m = HEADING.match(line.rstrip())
    if not m:
        return None
    text = m.group(2).strip()
    n = HEAD_NUM.match(text)
    if n:
        return n.group(1)
    a = APPENDIX.match(text)
    if a:
        return "app-" + a.group(1)
    return None


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    paths = [a for a in argv if not a.startswith("--")]
    de_path = Path(paths[0]) if len(paths) > 0 else DE_DEFAULT
    en_path = Path(paths[1]) if len(paths) > 1 else EN_DEFAULT
    de = de_path.read_text(encoding="utf-8").split("\n")
    en = en_path.read_text(encoding="utf-8").split("\n")

    errors: list[str] = []
    warns: list[str] = []

    if len(de) != len(en):
        errors.append(f"Zeilenzahl: de {len(de)}, en {len(en)}")
    for i, (a, b) in enumerate(zip(de, en), start=1):
        ka, kb = kind(a), kind(b)
        if ka != kb:
            errors.append(f"Zeile {i}: Art {ka} (de) != {kb} (en)")
            continue
        if ka.startswith("h") and head_id(a) != head_id(b):
            errors.append(f"Zeile {i}: Überschriftsnummer {head_id(a)} (de) != {head_id(b)} (en)")
        na, nb = numbers(a), numbers(b)
        if na != nb:
            warns.append(f"Zeile {i}: Zahlen de {dict(na)} != en {dict(nb)}")
        if a.count("*") != b.count("*"):
            warns.append(f"Zeile {i}: Anzahl * de {a.count('*')} != en {b.count('*')}")
        if ka == "image" and "(" in a and "(" in b:
            pa = re.search(r"\(([^)]*)\)", a)
            pb = re.search(r"\(([^)]*)\)", b)
            if pa and pb and Path(pa.group(1)).stem.split(".")[0] != Path(pb.group(1)).stem.split(".")[0]:
                errors.append(f"Zeile {i}: Bilddatei {pa.group(1)} (de) != {pb.group(1)} (en)")

    va = VERSION.search("\n".join(de)[:600])
    vb = VERSION.search("\n".join(en)[:600])
    if not va or not vb or va.group(1) != vb.group(1):
        errors.append(f"Version: de {va and va.group(1)} != en {vb and vb.group(1)}")

    for e in errors:
        print("FEHLER", e)
    for w in warns:
        print("HINWEIS", w)
    print(f"{len(errors)} Fehler, {len(warns)} Hinweise ({en_path.name} gegen {de_path.name}, {len(de)} Zeilen)")
    return 1 if errors or (strict and warns) else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
