# **KINETIK v3: Prüfbericht**

Geprüft wurden Widersprüche, Zahlen, Lücken und Balance der v3. Die Wahrscheinlichkeiten stammen aus einer exakten Rechnung über alle 2W6-Kombinationen, die Kampfdauer aus einer Monte-Carlo-Simulation (je 40.000 Kämpfe).

**Legende:** 🔴 Kritisch (Widerspruch oder Regelbruch) · 🟠 Wichtig (Lücke oder Balance) · 🟡 Kleinkram

---

## **1. Kurzfazit**

Das Fundament trägt. Clash, Schwellen, Schutz als Schwelle, Kaskade und Bedrängnis laufen zahlenmäßig sauber. Die Kampfdauer liegt bei 4 bis 5 Runden, das passt zu "schnell und tödlich".

Gefunden wurden **7 kritische** Punkte, vor allem zwei Rabatt-Schleifen im Move-System, ein Widerspruch bei legendären Moves und eine Klippe bei Außer-Reichweite. Dazu kommen **12 wichtige** Lücken (u. a. Tags ohne Mechanik, Kampfende von NPCs, tote Levels) und ein paar Kleinigkeiten.

---

## **2. Kritische Befunde 🔴**

### **K1. Legendäre Moves sind ab Level 8 unmöglich**

* **Problem:** Das EP-Cap ist 3 + Meisterschaft. Level 8 und 9 haben Meisterschaft 4 und damit **Cap 7**, Level 10 hat **Cap 8**. Legendäre Moves brauchen ≥ 8 EP, Kap. 5.3 erlaubt sie aber "ab Level 8".
* **Lösung A (empfohlen):** Legendäre Moves erst auf **Level 10**. Das passt zu den Beispielen (Elena und Kaito) und zum "Endstadium". Level 8 und 9 bekommen "Meister-Moves" bis 7 EP (2 Momentum).
* **Lösung B:** Cap = 4 + Meisterschaft. Dann ist Level 8 bei 8 EP. Das hebt aber alle Moves um 1 EP an.

### **K2. Zwei Rabatt-Schleifen (Meisterschaft zählt doppelt)**

* **Wurfbonus:** "+1 auf den Wurf (max. +2)" kostet 1 EP je Punkt, Energie = EP - Meisterschaft. Ab Meisterschaft 2 (Level 4) ist ein Wurfbonus von +2 **kostenlos**. Meisterschaft wirkt also zweimal (Bonus und Rabatt), und die Tabellen in Kap. 4 und Anhang B stimmen nicht mehr.
* **Wiederherstellung:** "Energie oder WK +2 wiederherstellen" kostet 1 EP, ab Meisterschaft 1 ist das kostenlos. Das ist eine **gratis Energie-Pumpe**. Der "Qi-Fluss" (2 EP) ist ab Meisterschaft 2 gratis und gibt Verbündeten +2 Energie.
* **Lösung:** Effekte, die Würfe oder Ressourcen verbessern, sind vom Rabatt **ausgenommen** (volle EP als Kosten). Alternativ werden Wiederherstellungs-Effekte über Momentum oder WK bezahlt.

### **K3. Außer-Reichweite hat eine Klippe**

* **Problem:** Level 4 und Level 5 haben denselben Bonus (+5), aber die Regel schaltet sich bei Level-Differenz 5 ein. Beispiel: Ein Naturtalent-Brute (Gewalt +3, Level 0, Bonus +3) hat gegen einen Level-4-Profi (+5) noch 24 % Siegchance, gegen einen Level-5-Profi (ebenfalls +5) **null**. Dieselbe Zahlenlage, anderes Ergebnis.
* **Lösung:** Die Regel an die **Gesamtbonus-Lücke** koppeln statt an den Level:
  * **Lücke ≥ 5:** Der Unterlegene kann weder Dominanz noch Konter erzielen (Heldenhafte Gegenwehr, 3 Momentum). Die Rechnung stützt das: bei Lücke 5 gewinnt der Unterlegene nur noch 5 %.
  * **Lücke ≥ 8:** Es wird nicht gewürfelt.
* **Probe an den Beispielen:** Elena Level 5 (+5) gegen Goons (0): Lücke 5 ✓. Level 10 (+9) gegen Goons: 9, keine Würfe ✓. Level 10 gegen den Brute (+3): 6, außer Reichweite ✓.
* Der **Level** bleibt für Finale, Achillesferse und Aura relevant (siehe W7).

### **K4. "Gebrochen" hat nur Nachteile**

* **Problem:** Die Verzweiflung (-2 auf alle Würfe, jeder verlorene Clash = Verletzung) hat **keinen Vorteil**. Kein Spieler wählt sie, die "letzte Verzweiflungstat" ist mechanisch tot.
* **Lösung:** Eine echte Verzweiflungstat. Bei WK 0 darf der Spieler **einmalig** eine Aktion mit **Wurf +2** ansagen und einen Move bis **Cap + 2 EP kostenlos** einsetzen (ohne Energie- und Momentum-Kosten). Danach folgt der **Zusammenbruch** (handlungsunfähig bis Szenenende oder Hilfe). Alternativ bleibt "Aufgeben/Fliehen". Der -2-Malus entfällt.
* **Bonus:** Bosse können das auch. Ein gebrochener Boss mit letzter Verzweiflungstat ist ein starker Dramaturgie-Moment.

### **K5. Kampfende, Sterben und Heilung fehlen**

* **Problem:** Es steht nirgends, wann ein Elite oder Boss ausgeschaltet ist. "Sterbend" wird erwähnt, aber nicht erklärt. Es gibt keine Heilregeln.
* **Lösung (Vorschlag):**
  * **Goon:** 1 Treffer (Dominanz 2 bis 3).
  * **Elite:** ausgeschaltet bei WK 0 (flieht, ergibt sich) oder 2 Verletzungen.
  * **Boss:** wie ein Spielercharakter (Zonen). WK 0 = Gebrochen mit letzter Verzweiflungstat. Ausgeschaltet bei 3 Verletzungen oder wenn ein Torso die 3. Verletzung hat.
  * **Sterbend:** Die Figur stirbt nach 3 Runden, wenn niemand stabilisiert (Aktion, MW 9, passende Domäne).
  * **Heilung:** Pro Downtime-Phase heilt 1 Verletzung (2 mit Medizin-Probe). Zerstörte Gliedmaßen und Narben bleiben als Tag.

### **K6. Move-Tabelle: Mindestlevel und Kostenformel widersprechen sich**

* **Mindestlevel:** Die Kosten in 5.2 "gelten für Level 1", aber Moves mit ≥ 4 EP gehen erst ab Cap 4 (Meisterschaft 1): Querschläger und Iaijutsu ab **Level 2**, Flashbang ab **Level 4**.
* **Kostenformel:** In 5.1 steht "Energie = EP - Meisterschaft" und gleichzeitig "mindestens 1 Energie bei Momentum-Moves". Die Tabelle rechnet Momentum-Moves aber mit fix 1 Energie.
* **Lösung:** Spalte "Mindestlevel" ergänzen. Regel: **Momentum-Moves kosten fix 1 Energie**, nicht rabattierbar.

### **K7. Beispiel 2 verstößt gegen die eigene Regel 3.9**

* **Problem:** Jin zahlt 3 Energie für den Judo-Wurf, obwohl ein Schlagabtausch den Effekt nicht auslöst (Moves wirken bei Dominanz). 3.9 sagt aber: "Wer kein Ergebnis erzielt, in dem der Move wirkt, zahlt nichts."
* **Lösung:** Entweder Beispiel umschreiben (siehe unten) oder W4 umsetzen. Dann wirken Move-Effekte schon im Schlagabtausch, und das Beispiel stimmt.

---

## **3. Wichtige Befunde 🟠**

### **W1. Unterschiedliche Schwellen pro Seite**

Die Tabelle in 3.1 nutzt ein einziges T. Bei der Helden-Schwelle gilt aber: Dominanz-Grenze = T des **Angreifers**, perfekter-Konter-Grenze = T des **Verteidigers**. Das muss ausdrücklich dastehen, sonst streiten Tische darüber.

### **W2. Tote Level und fehlende Move-Zahl**

* **Tote Level:** Level 5 und 9 ändern den Bonus nicht (Meisterschaft und Attribut bleiben gleich), Level 7 nur beim zweiten Leitattribut.
* **Fehlende Move-Zahl:** Es steht nirgends, wie viele Moves ein Charakter kennt.
* **Vorschlag:** Ungerade Level schalten Moves frei.

| Level | Zahlen | Freischaltung |
|---|---|---|
| 1 | Meisterschaft 0 | Signatur-Move |
| 2 | M 1 | - |
| 3 | M 1 | +1 Move |
| 4 | M 2, Attribut +1 | - |
| 5 | M 2 | +1 Move, Momentum-Deckel +1 |
| 6 | M 3 | - |
| 7 | M 3, zweites Leitattribut +1 | +1 Move |
| 8 | M 4 | Meister-Move (bis 7 EP) |
| 9 | M 4 | +1 Move |
| 10 | M 5, Attribut +1 (Cap +4) | Legendärer Move, Deckel +1 |

### **W3. Die Energie-Ökonomie kollabiert ab Level 6**

* **Problem:** Normale Moves haben ≤ 3 EP (4+ EP sind Momentum-Moves). Ab Meisterschaft 3 (Level 6) kosten **alle** normalen Moves 0 Energie. Danach verbraucht nur noch ein Momentum-Move (fix 1) und gegnerischer Drain Energie.
* **Option A:** Akzeptieren. Energie ist eine Early-Game-Ressource, später übernimmt Momentum.
* **Option B (empfohlen):** **Mindestkosten 1 Energie für Moves mit ≥ 3 EP.** Kleine Moves (Elenas Dreckiger Trick) werden weiter kostenlos, große bleiben spürbar. Passive Auras (Armee der Schatten) bleiben kostenlos.
* **Option C:** Rabatt nur auf die Signatur-Moves.

### **W4. Moves feuern zu selten**

* **Problem:** Moves wirken nur bei Dominanz. Bei Gleichstand sind das 24 % der Clashs, also etwa **jede vierte Aktion**. Bei einer Kampfdauer von 4 bis 5 Runden zündet ein Spieler im Schnitt etwa **einen Move pro Kampf**.
* **Vorschlag:** Der Hauptteil eines Moves wirkt schon ab **Δ ≥ 0** (Schlagabtausch, bei Gleichstand 56 % der Clashs). Verletzungen und Momentum bleiben der Dominanz vorbehalten. Der Katalogpunkt "Effekt schon bei Schlagabtausch" (2 EP) entfällt. Damit entfällt auch K7.

### **W5. Tags haben keine Mechanik**

* **Problem:** Tags (Am Boden, Entwaffnet, Gelähmt) tauchen überall auf, haben aber keinen Regeleffekt.
* **Vorschlag:**
  * **Kleiner Tag:** Der Gegner erhält +1 auf Clashs, in denen er den Tag ausnutzen kann.
  * **Großer Tag:** +2, oder die betroffene Aktion ist verwehrt (Fixiert: keine Bewegung).
  * **Aufheben:** kostet eine Aktion oder endet mit der Szene.
  * Der taktische Nachteil aus dem Schlagabtausch zählt als kleiner Tag.

### **W6. Unterbrechen ist doppelt vergeben**

Kap. 3.5 erlaubt jedem, für 1 Momentum und 1 Energie zu unterbrechen. Das ist **exakt der Preis** des Iaijutsu Quickdraw und entwertet den Move. Lösung: Allgemeines Unterbrechen kostet 2 Momentum, oder es geht nur über Moves.

### **W7. Goons und NPC-Level**

* **Fehlende Festlegungen:** Ein normaler Sieg schaltet **1** Goon aus, Dominanz 2 bis 3. Goons sind Level 0. Eine Goon-Gruppe handelt als **ein** Charakter. Bedrängnis zählt **pro Spielercharakter**. Ein Schlagabtausch gegen Goons mit "beide Seiten Treffer" zählt als Goon-Treffer.
* **NPC-Level:** Die NPC-Leiter nennt nur den Bonus. Finale, Achillesferse und Aura arbeiten mit Level. Vorschlag: Goon 0, Schläger 1 bis 2, Elite 3 bis 5, Boss 6 bis 8, Nemesis 9 bis 10.

### **W8. Energie- und WK-Gewinne ohne Obergrenze, Farming gegen Goons**

* **Problem:** Dominanz gibt +1 Energie, perfekter Konter +1 WK, aber es steht nicht da, dass Energie und WK nie über den Startwert steigen. Außerdem hat ein Spieler mit Helden-Schwelle gegen Goons 66 % Dominanz und füllt Energie praktisch gratis auf.
* **Lösung:** Maximum = Startwert. Der Energie- und WK-Gewinn durch Dominanz gilt nur **gegen Gegner mit Level ≥ 1** und **höchstens einmal pro Runde**.

### **W9. Startbudget und Attributswachstum**

Ein Legende-Charakter mit Titel Level 5 bekommt durch Level 4 ein Attribut +1. Steht das über dem Startmaximum +2? Klarstellung: Das Wachstum gilt zusätzlich zum Startmaximum. Das Naturtalent bleibt Zusatzoption.

### **W10. Kaitos Level-5-Beispiel ist inkonsistent**

* **Klon-Trupp:** 1 Klon kostet 3 EP, 5+ Klone ebenfalls 3 EP. Mehr Wirkung bei gleichem Preis passt nicht. Lösung: *Schatten-Klon-Trupp* als 5 EP (1 Momentum, 1 Energie).
* **Rasengan:** Er kombiniert "Schutz ignorieren" (2 EP) und "Durchschlag 1" (1 EP), die sich überlappen. Regel: Durchschlag ist nicht mit Schutz ignorieren/zerstören kombinierbar. Kosten bleiben bei 5 EP, indem "Zone wählen" und "Umgebung zerstören" bleiben.

### **W11. Waffen, Ausrüstung und Deckung ohne Regeln**

* **Waffen:** Eine Pistole und eine bloße Faust machen identischen Standardschaden.
* **Deckung:** Querschläger "ignoriert Deckung", aber Deckung existiert regeltechnisch nicht.
* **Vorschlag:** Waffen sind Tags oder geben **Durchschlag 1**. Deckung ist eine Schutzart (Schutz 1 bis 3 gegen Schuss), ähnlich der Schicht "Geschick" aus Anhang A.

### **W12. "Gewonnener Clash" für die Kippregel ist nicht definiert**

Vorschlag: Als gewonnen zählen **Dominanz, Konter und perfekter Konter**. Der Schlagabtausch gilt für niemanden.

---

## **4. Kleinkram 🟡**

* **Wecken:** Ohnmächtige Verbündete wecken: Aktion + MW 9 oder 2 Energie.
* **Zonenwahl:** Bei Standard-Verletzungen wählt der SL plausibel nach der Beschreibung des Angreifers (nur Moves mit "Zone wählen" geben dem Spieler die Wahl).
* **Start-Momentum:** Präparation und Hinterhalt geben beide Start-Momentum. Klarstellen, ob sie sich addieren (Vorschlag: nein, das höhere zählt).
* **Nicht-Leitattribut:** Die halbe Meisterschaft ist auf Level ≤ 3 gleich 0. Das ist gewollt, aber nicht ausdrücklich erwähnt.
* **Anhang B, Tabelle "Lücke und Siegchance":** Die Zeile meint "Unterlegener gewinnt den Clash (Δ strikt zu seinen Gunsten)". Gleichstand ist hier nicht modelliert.
* **Titel Jin:** Der Judo-Wurf läuft über BJJ-Schüler (Level 1, +2), nicht über den Ex-Killer (+3). Das ist korrekt, aber ein schönes Beispiel, dass der falsche Titel Boni kostet. Ein Hinweis im Beispiel würde das zeigen.

---

## **5. Zahlen-Check**

**Geprüft und korrekt:** Clash-Verteilung bei Gleichstand (24 / 32 / 20 / 24), Siegchance des Unterlegenen nach Lücke, Helden-Schwelle (Tabelle in Anhang B), Schutz als Schwelle (24 / 16 / 10 / 5 %), Bedrängnis (24 % und 5,7 %, mit Überzahl 44 % und 19 %), MW-Tabelle (Kap. 4), Auto-Erfolg bei MW ≤ Bonus + 2, Energiekosten von Elena und Kaito (3 EP - Meisterschaft: 3 → 1 → 0), EP-Summe aller Moves, Jins Werte (Energie 8, WK 7), Rechnung der Spielbeispiele 1 bis 3.

**Kampfdauer** (Basis ohne Moves, Durchatmen, Momentum; Schlagabtausch: beide landen Treffer; Ende bei WK 0 oder 3 Verletzungen):

| Szenario | Mittlere Dauer | Siege |
|---|---|---|
| Gleich +4: Spieler (Schutz 2, WK 7) gegen Boss (Schutz 3, WK 8) | 5,1 Runden | Spieler 36 %, Boss 62 % |
| Gleich +4: Spieler gegen Elite (Schutz 1, WK 6) | 4,3 Runden | Spieler 63 %, Elite 35 % |
| Gleich +4: Duell gleichstarker Spieler | 4,8 Runden | 48 % / 49 % |
| Spieler +5 gegen Elite +3 (ohne Helden-Schwelle) | 3,5 Runden | Spieler 98 % |
| Spieler +5 gegen Elite +3 (mit Helden-Schwelle) | 3,1 Runden | Spieler 99 % |
| Spieler +3 gegen Boss +6 (Schutz 3, WK 8) | 3,4 Runden | Boss 100 % |

**Lesehilfe:**

* Die Dauer von **4 bis 5 Runden** passt zu "schnell und tödlich".
* Ein Boss mit gleichem Bonus schlägt einen einzelnen Spieler in 62 % der Fälle. Das ist als Gruppenboss in Ordnung. Für Solo-Duelle sollte der Boss +1 unter dem Spieler liegen.
* Die Helden-Schwelle verkürzt Kämpfe um etwa eine halbe Runde, ändert den Ausgang aber kaum (98 → 99 %). Sie wirkt hauptsächlich auf den Fluss, nicht auf das Ergebnis.
* Mit einer Lücke von 3 hat der Unterlegene (+3 gegen +6) **keine Chance** auf Sieg. Das bestätigt, dass der Level-Unterschied gegen Bosse schon über die Zahlen funktioniert.

---

## **6. Beispiel 2 umschreiben (Vorschlag)**

Zwei Wege, je nachdem, wie du W4 entscheidest:

**Weg A (W4 übernommen):** Das Beispiel bleibt wie es ist. Der Judo-Wurf wirkt im Schlagabtausch (Schutz ignorieren, Tag *Am Boden*), Jin zahlt 3 Energie zu Recht. Nur die Randnotiz am Ende wird angepasst: "Mit Dominanz wäre der Arm gebrochen."

**Weg B (W4 nicht übernommen):** Jin würfelt **12 gegen 9** (Δ = 3, Dominanz). Jetzt zündet der Move: Schutz ignoriert, Verletzung (Arm) und Tag *Am Boden* für 3 Energie. Der SL erklärt: "Ohne Judo-Wurf hättest du Differenz 6 gebraucht, denn Schutz 3 hebt die Schwelle von 3 auf 6." Der Schlagabtausch-Fall mit Wahl zwischen Treffer und Nachteil wandert in ein eigenes Mini-Beispiel (Jin zahlt dort nichts).

---

## **7. Entscheidungen, die du treffen musst**

| # | Frage | Meine Empfehlung |
|---|---|---|
| K1 | Legendäre Moves ab wann? | Level 10, Meister-Moves auf 8 bis 9 |
| K2 | Rabatt-Schleifen | Wurfbonus und Wiederherstellen vom Rabatt ausnehmen |
| K3 | Außer-Reichweite koppeln an | Gesamtbonus-Lücke (≥ 5 / ≥ 8) |
| K4 | Verzweiflung | Einmalige Verzweiflungstat (+2, gratis Move bis Cap + 2), danach Zusammenbruch |
| K5 | Kampfende, Sterben, Heilung | Vorschlag aus Kap. 2 übernehmen |
| W3 | Energie ab Level 6 | Mindestkosten 1 ab 3 EP |
| W4 | Move-Effekt ab wann? | Hauptteil ab Schlagabtausch, Verletzung und Momentum nur bei Dominanz |
| W2 | Moves pro Level | Ungerade Level schalten Moves frei |

---

## **8. Empfohlene Reihenfolge**

1. K1, K2, K3, K6 (reine Konsistenz, schnell erledigt).
2. W4, W3 (entscheiden das Spielgefühl der Moves).
3. K4, K5, W5 (fehlende Kernregeln).
4. W2, W7, W8, W11, W12 (Struktur und Ergänzungen).
5. Beispiele und Kleinkram zuletzt, damit sie nicht doppelt angepasst werden müssen.
