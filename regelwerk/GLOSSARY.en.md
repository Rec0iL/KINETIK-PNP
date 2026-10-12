# KINETIK: English glossary and translation rules

Source: `KINETIK_Regelwerk.md` (German, v3.6). Target: `KINETIK_Regelwerk.en.md`. The same terms are used for the web app
(`tools/kinetik-vtt/src/i18n/en`), the rule data (`data/i18n/en`) and the PDFs, so a change here means changing it everywhere.

## Translation rules

1. **Line for line.** The English file has exactly as many lines as the German file, and every line has the same kind
   (heading level, blank line, table row, bullet with the same indentation, `---`). One paragraph = one line, as in the source.
2. **Structure stays identical:** heading levels and numbers (`### **2.3 ...**`), table columns and rows, `**bold**`, `*italic*`,
   `★`, `Δ`, `≥`, `→`, rule cross-references (`siehe 3.2` becomes `see 3.2`), all numbers and formulas.
3. **Headings keep the shape** `## **3. Title (Subtitle)**`: number, title, optional trailing parenthesis. The pipeline derives the
   subtitle and the stable image keys from this shape (keys come from the German file by position).
4. **Dice:** `2W6` -> `2d6`, `W6` -> `d6`. Decimal comma -> point (`5,1` -> `5.1`), `5 %` -> `5%`, `z.B.` -> `e.g.`, `d.h.` -> `i.e.`.
5. **Capitalization:** defined game terms are capitalized (attributes, resources, outcomes, thresholds, Title, Domain, Mastery,
   Kinetic Marker, Bullet Time, Clash, Cascade). Generic words stay lowercase (move, tag, action, round, zone, injury, level, scene).
   Tags and move names are *italic* as in the source; tags are Title Case (*Off Balance*).
6. **Tone:** same punchy, cinematic, direct voice as the German. Short sentences. No filler. Second person where the source uses "du".
7. **Names stay:** Jin, Mara, Kaito, Elena, Miller, Chen, John Wick, Naruto, Jackie Chan, Rasengan, Hokage, move names that are
   already English (Mozambique Drill, Drunken Parry, Iaijutsu Quickdraw, Flashbang Breach, Lock Reversal, Wick Flick, Rear Naked
   Choke), place and genre words (Gun-Fu, Wushu, Anime, Urban Brawler, SWAT-Operator, Ex-Hitman, BJJ).
8. **Silhouette figure:** the image line points to `../assets/grafiken/koerper-silhouette.en.svg` (English labels); the alt text is translated.
9. Do not add, drop or reorder rules, examples or sentences. If something is ambiguous, translate literally and add the question to the
   translator notes at the end of your reply, never into the file.

## Core terms

| German | English | Note |
|---|---|---|
| KINETIK: Cinematic Action Roleplaying | KINETIK: Cinematic Action Roleplaying | unchanged |
| Spielleiter, SL | Game Master, GM | "GM" in running text, "Game Master (GM)" at first mention |
| Spieler, Spielercharakter | player, player character (PC) | |
| Grundphilosophie | Core Philosophy | |
| Clash, Clash-System | Clash, Clash System | |
| Schlagabtausch | Exchange | outcome, capitalized |
| Dominanz | Dominance | outcome |
| Konter | Counter | outcome |
| Perfekter Konter | Perfect Counter | outcome |
| Dominanz-Schwelle | Dominance threshold | T(A) / T(V) kept |
| Helden-Schwelle | Hero Threshold | |
| Außer Reichweite (Klassenunterschied) | Out of Reach (Class Gap) | |
| Heldenhafte Gegenwehr | Heroic Resistance | |
| Gesamtbonus, Lücke | total bonus, gap | |
| Kaskade | Cascade | Protection -> Willpower -> Injury |
| Treffer, normaler Treffer | hit, normal hit | |
| Standardschaden | standard damage | |
| Durchschlag | Penetration | "Penetration 1" |
| Ignorieren | ignore | |
| Momentum | Momentum | |
| Bullet Time (Rule of Cool) | Bullet Time (Rule of Cool) | unchanged |
| Kinetik-Marker | Kinetic Marker | |
| Kinetik-Regel | Kinetic Rule | |
| Seiten-Initiative | Side Initiative | |
| Überzahl | Outnumbering | "+1 per additional attacker" |
| Unterbrechen | Interrupt | |
| Titel, Titel-System | Title, Title System | |
| Domäne | Domain | |
| Leitattribut | lead attribute | |
| Meisterschaft (M) | Mastery (M) | |
| Attributswachstum | attribute growth | |
| Level-Meilensteine, Level-Tempo | level milestones, level pacing | |
| Learning by Doing, Cineastisches Ausspielen, Trainingsmontage | Learning by Doing, cinematic roleplay, training montage | |
| Downtime | downtime | |
| Fluss (Flow), Präzision (Precision), Gewalt (Force), Instinkt (Instinct), Fokus (Focus) | Flow, Precision, Force, Instinct, Focus | |
| Energie (Chi / Ausdauer) | Energy (Chi / Stamina) | |
| Willenskraft (WK) | Willpower (WP) | |
| Schutz (Rüstung & Glück) | Protection (Armor & Luck) | context-dependent; "matching Protection", "effective Protection" |
| Schutzart | protection type | |
| Schutz ignorieren / zerstören | ignore / destroy Protection | |
| Schutz-Schaden | Protection damage | |
| Verletzung | injury | |
| Körpersilhouette, Trefferzone | body silhouette, hit zone | |
| Kopf, Torso, linker/rechter Arm, linkes/rechtes Bein | head, torso, left/right arm, left/right leg | L-Arm, R-Arm, L-Leg, R-Leg |
| unbrauchbar | useless | limb |
| sterbend | dying | |
| Schock | shock | |
| Knochenbinde | Bone Wrap | special maneuver |
| Zone wählen | Choose Zone | effect name |
| Kampagnenstufe: Straße / Kino / Legende / Eigene | campaign tier: Street / Cinema / Legend / Custom | "Cinema (Standard)" |
| Attribut-Budget, Titel-Level-Budget | attribute budget, title-level budget | |
| Naturtalent | Prodigy | |
| Rast (kurze Rast) | rest (short rest) | |
| Durchatmen | Catch Breath | action |
| Sammeln | Compose | action, Willpower |
| Zuspruch | Encouragement | |
| Ausgepumpt (Energie 0, also Preis) | Winded | state and legendary price |
| Gebrochen (Willenskraft 0) | Broken | |
| Ohnmacht, ohnmächtig | Unconsciousness, unconscious | |
| Wecken | Revive | |
| Letzte Verzweiflungstat | Last Gasp | |
| Zusammenbruch | Collapse | |
| Überlauf | Overflow | |
| Ausgeschaltet | Taken Out | |
| Gnadenstoß | Coup de Grâce | |
| Töten, wehrlos | Killing, helpless | |
| Erwürgen, Würger | Strangling, strangler | |
| Heilung | Healing | |
| Gift, Gegenmittel/Gegengift | Poison, antidote | |
| Gift schwach / stark / Lähmgift / Tödlich | Weak / Strong / Paralytic / Lethal | poison tiers |
| Verzögerung | Delay | poison |
| Moves einsetzen und bezahlen | Using and Paying for Moves | |
| Optionale Experten-Regel: Erst würfeln, dann erzählen | Optional Expert Rule: Roll First, Then Narrate | "Fortune in the Middle" kept |
| Flächenangriffe (AoE) | Area Attacks (AoE) | |
| Fläche | Area | 3 EP effect |
| Proben gegen die Umgebung (Nicht-Kampf-Skills) | Checks Against the Environment (Non-Combat Skills) | |
| Probe, Mindestwurf (MW) | check, Difficulty (DC) | "against DC 9" |
| MW-Stufen Standard / Fordernd / Schwer / Heroisch / Legendär | Standard / Demanding / Hard / Heroic / Legendary | |
| Erfolg mit Preis | Success at a Cost | |
| Heimlichkeit und Infiltration | Stealth and Infiltration | |
| Wachsamkeit: Ahnungslos / Wachsam / Alarmiert | Alertness: Oblivious / Alert / On High Alert | |
| Heimlichkeits-Clash | Stealth Clash | |
| Unbemerkt / Verdacht / Entdeckt / Durchschaut | Unnoticed / Suspicion / Spotted / Seen Through | stealth outcomes |
| Wahrnehmung, passiver Wert | Perception, passive value | |
| Hinterhalt | ambush | |
| Heimspiel | Home Turf | tag rule |
| Freiwillig | Voluntary | tag rule |
| Stapeln, Aufheben | Stacking, Removing | tag rules |
| Kleiner Tag, Großer Tag | minor tag, major tag | |
| Goons (Handlanger), Schläger, Elite, Boss, Nemesis | Goons (Henchmen), Thug, Elite, Boss, Nemesis | |
| NPC-Leiter | NPC ladder | |
| Bedrängnis(-Zähler) | Pressure (counter) | goons as attackers |
| Effektpunkte (EP) | Effect Points (EP) | |
| Bewertungs-Framework | Rating Framework | |
| Sondereffekt | special effect | ★ |
| Abzüge, Vorbedingung, Risiko, Setup-Runde | deductions, prerequisite, risk, setup round | |
| Energie-Move, Momentum-Move | Energy move, Momentum move | |
| Mindestkosten, Mindestlevel, Cap | minimum cost, minimum level, cap | |
| Meister-Moves, Legendäre Moves | Master Moves, Legendary Moves | |
| Gemeisterte Moves, Muskelgedächtnis, Level-Abstand | Mastered Moves, Muscle Memory, Level Gap | |
| Finale-Effekt, Achillesferse, Preis | Finale Effect, Achilles' Heel, Price | |
| Leitplanke, Design-Hinweis, SL-Check | Guardrail, Design Note, GM Check | |
| Waffe, Profil | weapon, profile | |
| Deckung | Cover | |
| Tödliche Hände | Deadly Hands | |
| Verschleiß und Komplikationen | Wear and Complications | |
| Nachladen, Munitionstracking, Magazin, Vorrat | Reloading, ammo tracking, magazine, supply | |
| Härtegrad (optional) | Brutality (optional) | |
| Pistole, Messer, Schlagstock / Tonfa | pistol, knife, baton / tonfa | |
| Akimbo-Pistolen, Sturmgewehr, Schrotflinte | akimbo pistols, assault rifle, shotgun | |
| Scharfschützengewehr (.50), Katana | sniper rifle (.50), katana | |
| Splittergranate, Blendgranate | fragmentation grenade, flashbang | |
| LMG (Dauerfeuer), Raketenwerfer | LMG (sustained fire), rocket launcher | |
| leicht / schwer / Explosiv, Wegwurf | light / heavy / Explosive, thrown away | "thrown, single use" |
| Wahrscheinlichkeiten (Anhang A) | Probabilities (Appendix A) | |
| Änderungsprotokoll | Changelog | "Changelog v3 -> v3.1" |
| Beschlossen und eingearbeitet / Zur Bestätigung | Decided and incorporated / For confirmation | |
| Spielbeispiele am Tisch | Play Examples at the Table | |
| Beispiel-Charakterbogen | Sample Character Sheet | |

## Tags

| German | English |
|---|---|
| Am Boden | Prone |
| Geblendet | Blinded |
| Entwaffnet | Disarmed |
| Gelähmt | Paralyzed |
| Benommen | Dazed |
| Aus der Balance | Off Balance |
| Deckung verloren | Cover Lost |
| Waffe klemmt | Weapon Stuck |
| Ladehemmung | Jam |
| Magazin leer | Magazine Empty |
| Klinge steckt fest | Blade Stuck |
| Lauf weggedrückt | Barrel Pushed Aside |
| Verschmutzt | Fouled |
| Misstrauisch | Suspicious |
| Verdacht (Tag) | Suspicion |
| Exponiert | Exposed |
| Nachladen | Reloading |
| Niedergehalten | Pinned Down |
| Betäubt | Stunned |
| Fixiert | Immobilized |
| Gewürgt | Choked |
| Gelenk gesperrt | Joint Locked |
| Vergiftet | Poisoned |
| Dunkelheit / Lärm / Menschenmenge / Regen | Darkness / Noise / Crowd / Rain |
| Gleißendes Licht / Stille / Freie Fläche | Blinding Light / Silence / Open Ground |
| Blackout / Nebel / Ablenkung durch Sprengsatz | Blackout / Fog / Explosive Distraction |

## Legendary prices

| German | English |
|---|---|
| Ausgepumpt | Winded |
| Nachglühen | Afterglow |
| Leergebrannt | Burnt Out |
| Narbe | Scar |
| Rückstoß | Recoil |
| Überdehnung | Overextension |
| Selten | Rare |
| Sperre | Lockout |
| Aufladen | Charging Up |
| Enthüllung | Revelation |
| Kollateralschaden | Collateral Damage |
| Verlust | Loss |
| Schuld/Ruf | Debt/Reputation |

## Move, title and example names

| German | English |
|---|---|
| Judo-Wurf | Judo Throw |
| Lingshu-Nervenstoß | Lingshu Nerve Strike |
| Schatten-Doppelgänger | Shadow Double |
| Qi-Fluss | Qi Flow |
| Querschläger | Ricochet |
| Meuchelstoß | Assassin's Strike |
| Schattenschritt | Shadow Step |
| Blasrohr-Pfeil | Blowgun Dart |
| Dokushu-Berührung | Dokushu Touch |
| Garrotte | Garrote |
| Trommel-Salto | Drum Flip |
| Todesberührung | Touch of Death |
| Dreckiger Trick | Dirty Trick |
| Befreiungsschlag | Breakout Strike |
| Aura der Gewalt | Aura of Violence |
| Symphonie des Schmerzes | Symphony of Pain |
| Schatten-Kopie | Shadow Copy |
| Schatten-Klon-Trupp | Shadow Clone Squad |
| Wirbel-Sphäre / Rasengan | Whirl Sphere / Rasengan |
| Armee der Schatten | Army of Shadows |
| Gigantische Elementar-Sphäre | Gigantic Elemental Sphere |
| Ex-Triaden-Auftragskiller | Ex-Triad Contract Killer |
| BJJ-Schüler | BJJ Student |
| Scharfschützin / Jägerin | Sniper / Hunter |
| Straßenschlägerin | Street Brawler |
| Underground-Champion | Underground Champion |
| Mythos der Unterwelt | Myth of the Underworld |
| Akademie-Schüler | Academy Student |
| Sturmninja | Storm Ninja |
| Schatten-Anführer / Hokage | Shadow Leader / Hokage |
| Leibwächter | Bodyguard |
| Dokushu-Meister / Chi-Meister / Lingshu-Heiler | Dokushu Master / Chi Master / Lingshu Healer |
| Revolverheld, Assassine/Attentäter, Gifthand | Gunslinger, Assassin, Poison Hand |
| Detective Miller | Detective Miller |
| Eingeklemmt (Verletzung) | Pinned (injury) |
| Leberhaken | liver hook |

## Terms added during the translation

| German | English | Note |
|---|---|---|
| Raster (für Moves) | framework | "the move framework", "the framework from Chapter 5" |
| Verletzungs-Schwelle | injury threshold | |
| Abnutzung (Schutz) | Attrition | kept apart from "Verschleiß" -> Wear |
| Wiederherstellen | restore / Restoring | ★ effect: "★ restore +2 Energy or WP (self only)" |
| Zonenwahl | Zone choice | the effect itself stays "Choose Zone" |
| Momentum-Deckel | Momentum cap | |
| Start-Momentum | starting Momentum | |
| Szenen-Verfall | Scene decay | |
| Nicht-Leitattribut | non-lead attribute | |
| Eigene Stufe | Custom tier | |
| Startbonus | Starting bonus | |
| Rückgabe (Attributpunkt) | refund | |
| Story-Abschnitt | story arc | |
| EP-Katalog | EP catalog | |
| Schlagabtausch-Nachteil | Exchange drawback | |
| Nachschub | resupply | |
| Der Unterlegene / Der Überlegene | the underdog / the stronger side | |
| Gesamtbonus-Lücke | total bonus gap | |
| Verletzung auch ohne Dominanz | injury even without Dominance (prose), Injury without Dominance (EP breakdown) | |
| Titel-Moves | Title moves | |
| Obergrenze | Ceiling | |
| Überlauf bei Energie / Willenskraft | Energy Overflow / Willpower Overflow | |
| Mitzählen | Tracking | |
| Anbringen (Gift) | Delivery | |
| Stufen (Gift) | Tiers | |
| Anwender (Gift) | the poisoner | |
| Sterbend-Fenster | dying window | |
| Ansage vor dem Wurf | Declare before the roll | |
| Entkommen | Escape | what a Counter becomes in an area attack |
| Rückprall | bank shot | not "ricochet" (that is the move Querschläger) |
| Schleicher / Wächter | sneak / guard | |
| Lautlos ausschalten | Silent takedown | |
| Gegenspiel | counterplay | |
| Standardtreffer | standard hit | |
| Fehlschlag | Failure | |
| Effekt klein / mittel / groß (außerhalb des Katalogs) | small / medium / large effect | not minor/major (those are tag sizes) |
| Energie-Schaden / WK-Schaden | Energy damage / WP damage | |
| Team-Bonus | team bonus | |
| Tag aufheben | remove tag | |
| Gegenangriff, Konter-Aktion | counterattack, counter action | lowercase, not the Counter outcome |
| Mindestgebühr | minimum fee | = minimum cost |
| je angefangene 2 ★-EP | per 2 ★ EP, rounded up | |
| Trainingsbogen | training arc | |
| Story-Beat | story beat | |
| Ebenbürtige | equals | |
| Mythos (Level-10-Charakter) | Myth | |
| Rückschlag | backlash | |
| Heimlichkeits-Hinterhalt-Momentum | ambush Momentum | |
| Kippregel (alt) | tipping rule | |
| Schutzschichten-Dreieck (alt) | Protection-layer triangle | |
| Vorsprung (Helden-Schwelle) | lead | |
| Mitspieler | fellow players | |
| Randnotiz | side note | |
| Parkour-Dropkick, Mozambique-Drill | Parkour Dropkick, Mozambique Drill | |
| Taktik, Anime-Grenadier (Archetyp) | Tactics, Anime Grenadier | |
| Holztisch / Autotür / Betonsäule | wooden table / car door / concrete pillar | cover examples |
| Schulter durchschossen / Knie zertrümmert | Shot Through the Shoulder / Shattered Knee | injury examples |
| Klinge steckt im Knochen fest | Blade Stuck in Bone | |

Open for review: "Chens Leibwächter" in Example 6 is translated literally ("Chen's bodyguard"); Chen is an
Elite *Schläger* with the Title *Leibwächter* in Example 5, so the German may mean a second bodyguard.
