# Sprachen der App (de, en)

Die Sprache steht beim Start fest (`locale.ts`: `?lang=`, gespeicherte Wahl, Browsersprache) und wird nur über einen Neustart
der Seite gewechselt. Deshalb dürfen Texte auch auf Modulebene (Tabellen, Konstanten) mit `t()` aufgelöst werden.

## Texte

- `t('bereich.ort.name', { param })` aus `src/i18n`. Platzhalter `{param}`. Kein HTML in Texten: Markup im Template lassen, Text in Teile schneiden.
- Mehrzahl: `tn('bereich.ort.name', n, { ... })` mit den Schlüsseln `<name>.one` und `<name>.other` (`{n}` wird gesetzt).
- Zahlen/Zeiten: `fmtNumber`, `fmtDate`, `fmtTime`, `fmtDateTime` (nie `'de-DE'` oder `.replace('.', ',')` im Code).
- Dateien: `src/i18n/de/<bereich>.ts` (Quelle, deutsch, wörtlich wie vorher im Code) und `src/i18n/en/<bereich>.ts` (gleiche Schlüssel,
  der Typ erzwingt das). Bereich = Ordner unter `src/` (gm, sheet, pages, wizard, net, rules, model, dice, map, music, ui, rulebook, legal);
  die App-Hülle (App.svelte, Navigation, Home) steht in `app`.
- Schlüssel: `<bereich>.<komponente oder thema>.<name>`, z. B. `gm.combat.addEnemy`.

## Englisch

Begriffe aus `regelwerk/GLOSSARY.en.md` (verbindlich: GM, Willpower, Protection, Exchange, Dominance, Winded, Broken, minor/major tag,
Prodigy, Difficulty (DC), ...). Oberflächentexte kurz und üblich ("Save", "Cancel", "Add enemy"), derselbe Ton wie das Regelwerk.

## Nicht übersetzen

Ids und Enum-Werte (`'klein'`, `'fluss'`, Routen), JSON-Schlüssel, CSS-Klassen, Daten von Nutzern, Kommentare, `console.*`.

## Tags, Preise, Namen

Tags und Preise liegen als Text in Charakteren und Sitzungen. Verglichen wird über die Kennung (`TAG`, `isTag`, `sameTag`, `canonicalTag`,
`canonicalPrice` aus `src/rules`), angezeigt mit `tagLabel(name)` / `priceLabel(name)`, damit ein deutscher Charakter in einer
englischen Runde (und umgekehrt) richtig erkannt und beschriftet wird. Regeldaten (`rules.*`) sind schon in der Sprache der App.
