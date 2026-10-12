#!/bin/bash
# Füllbilder der englischen Fassung: erst das Hauptprojekt (Neo-Noir), dann alle Looks. Vorhandene, passende Füllbilder bleiben.
cd /home/rec0il/Dokumente/Scritps/KINETIK_PNP
echo "=== $(date) default (assets/pdf-en)"
python3 tools/rulebook-pdf/rulebook_pdf.py plan assets/pdf-en
python3 tools/rulebook-pdf/rulebook_pdf.py images assets/pdf-en
echo "=== $(date) themes"
python3 scripts/gen_rulebook_themes.py --lang en --fillers
echo "=== $(date) fertig"
