#!/usr/bin/env bash
# Erneuert das Regelwerk komplett nach einer Textänderung (neue Version) in einem Rutsch:
#   1. Neo-Noir (Standard, Projekt assets/pdf): fehlende Prompts und Bilder, Füllbilder für neue Lücken
#   2. die neun Themes (assets/pdf-themes): fehlende Bilder, dann Füllbilder für neue Lücken
#   3. PDFs: Neo-Noir und alle Themes
#   4. Web-Fassung (Bilder, PDFs) neu bauen
# Vorhandenes wird übersprungen, der Lauf ist beliebig oft wiederholbar. Fortschritt: python3 scripts/rulebook_status.py
# Start am besten in einem eigenen systemd-Bereich, damit ein Speicherproblem im Rest des Rechners den Lauf nicht mitreißt:
#   systemd-run --user --scope --collect --unit=kinetik-nachlauf -- scripts/rulebook_themes_nachlauf.sh > assets/pdf-themes/nachlauf.log 2>&1 &
cd "$(dirname "$0")/.." || exit 1
echo "$(date '+%F %T') startet …"
while pgrep -f "python3 scripts/gen_rulebook_themes.py$" >/dev/null; do sleep 60; done
run() { echo; echo "$(date '+%F %T') === $* ==="; "$@"; }
RPDF="python3 tools/rulebook-pdf/rulebook_pdf.py"
run $RPDF plan assets/pdf
run $RPDF images assets/pdf
run python3 scripts/gen_rulebook_themes.py
run python3 scripts/gen_rulebook_themes.py --fillers
run $RPDF build assets/pdf
run python3 scripts/gen_rulebook_themes.py --pdf
run python3 scripts/build_rulebook_web.py
echo "$(date '+%F %T') fertig"
