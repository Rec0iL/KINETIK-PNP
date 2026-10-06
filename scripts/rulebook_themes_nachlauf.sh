#!/usr/bin/env bash
# Läuft nach dem Haupt-Bildlauf von gen_rulebook_themes.py (wartet darauf) und erledigt den Rest in einem Rutsch:
#   1. zweiter Durchgang (fehlende Bilder nachholen, z.B. nach einem agy-Fehler)
#   2. Füllbilder für die Lücken im PDF-Satz je Theme
#   3. PDFs je Theme (export/KINETIK_Regelwerk_<theme>.pdf)
#   4. Web-Fassung (Bilder, PDFs) neu bauen
# Danach nur noch prüfen und committen. Log: assets/pdf-themes/nachlauf.log
cd "$(dirname "$0")/.." || exit 1
echo "$(date '+%F %T') wartet auf den Bildlauf …"
while pgrep -f "python3 scripts/gen_rulebook_themes.py$" >/dev/null; do sleep 60; done
run() { echo; echo "$(date '+%F %T') === $* ==="; "$@"; }
run python3 scripts/gen_rulebook_themes.py
run python3 scripts/gen_rulebook_themes.py --fillers
run python3 scripts/gen_rulebook_themes.py --pdf
run python3 scripts/build_rulebook_web.py
echo "$(date '+%F %T') fertig"
