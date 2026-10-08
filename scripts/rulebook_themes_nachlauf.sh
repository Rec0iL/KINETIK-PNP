#!/usr/bin/env bash
# Erledigt nach (oder statt) dem Haupt-Bildlauf alles in einem Rutsch:
#   1. Durchgang für fehlende Bilder (z.B. nach einem agy-Fehler)
#   2. Füllbilder für die Lücken im PDF-Satz je Theme
#   3. PDFs je Theme (export/KINETIK_Regelwerk_<theme>.pdf)
#   4. Web-Fassung (Bilder, PDFs) neu bauen
# Start am besten in einem eigenen systemd-Bereich, damit ein Speicherproblem im Rest des Rechners den Lauf nicht mitreißt:
#   systemd-run --user --scope --collect -- scripts/rulebook_themes_nachlauf.sh > assets/pdf-themes/nachlauf3.log 2>&1 &
# Danach nur noch prüfen und committen.
cd "$(dirname "$0")/.." || exit 1
echo "$(date '+%F %T') startet …"
while pgrep -f "python3 scripts/gen_rulebook_themes.py$" >/dev/null; do sleep 60; done
run() { echo; echo "$(date '+%F %T') === $* ==="; "$@"; }
run python3 scripts/gen_rulebook_themes.py
run python3 scripts/gen_rulebook_themes.py --fillers
run python3 scripts/gen_rulebook_themes.py --pdf
run python3 scripts/build_rulebook_web.py
echo "$(date '+%F %T') fertig"
