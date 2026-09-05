# Möbel-Abstands-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er fragt, warum er
> so gewichtet, was ihn außerhalb seines Ordners berührt, welche Entscheidungen
> bereits gefallen sind – samt Begründung, damit niemand sie versehentlich
> rückgängig macht – und was beim Schreiben dieser Datei auffiel.

---

## 1. Was der Check tut

Er prüft **je Raum**, ob die Heizfläche und ihr Temperaturfühler frei arbeiten
können. Er misst dabei nichts Physikalisches, sondern stellt **drei Fragen** mit
je drei Antworten: `0 = nein/frei`, `1 = teilweise`, `2 = ja/blockiert`. Alle
Fragen sind gleich gepolt – „ja" ist immer der ungünstige Fall.

Welche drei Fragen gestellt werden, hängt an der **Wärmeübergabe des Raums**
(`RoomInstanceEntry.heatTransfer`) und, bei Heizkörpern, zusätzlich am
**Raumtyp**. Kennt das Profil die Wärmeübergabe nicht (Raum aus dem
Schnellstart), erhebt der Check sie selbst über fünf Kacheln und **schreibt sie
ins Profil zurück** (`setRoomHeatTransfer`) – statt stillschweigend „Heizkörper"
zu unterstellen.

Optional lässt sich **eine** der drei Fragen beziffern statt anzuklicken:
- Heizkörper/Infrarot/Ofen → **Abstand in cm** (`furniture`, Zollstock)
- Fußbodenheizung → **zugestellter Flächenanteil in %** (`footless`, Schätzung)

Beides ist bewusst optional. Der Check muss ohne Messgerät eine Aussage
liefern.

**Messgeräte:** `instruments: [{ type: 'distance_meter', required: false }]` im
Katalog. Das `required: false` ist die inhaltliche Aussage „hilft, ist aber
nicht nötig" und trägt zugleich die Vorbelegung des Messschalters (Abschnitt 4).

**Kein €-Wert.** `yieldsSaving` ist im Katalog bewusst nicht gesetzt. Für die
Wirkung eines verdeckten Heizkörpers gibt es keine belastbare Kostenbasis; eine
Zahl wäre Scheinwissen. Der Check liefert einen qualitativen Befund, kein
Sparpotenzial.

---

## 2. Die Fragensätze

`questionKeys(transfer, roomType)` in `furnitureSpacing.ts` ist die einzige
Stelle, die entscheidet, was gefragt wird.

| Wärmeübergabe | Fragen (`FindingKey`) |
|---|---|
| `radiator` | `furniture` \| `builtin` \| `towels`, dann `cover`, `valve` |
| `underfloor` | `footless`, `carpet`, `thermostat` |
| `infrared` | `ir_furniture`, `ir_cover`, `ir_sensor` |
| `stove` | `stove_furniture`, `stove_cover`, `stove_air` |
| `none` | **leer** |

Die erste Heizkörper-Frage wechselt mit dem Raum (`ROOM_PRIMARY_KEY`):
- Küche → `builtin` („von Einbaumöbeln überbaut?") – dort steht kein Sofa
  davor, dort ist der Heizkörper hinter der Sockelblende.
- Bad → `towels` („Handtücher darüber?")
- sonst → `furniture`

Dazu gibt es **raumspezifische Formulierungen derselben Frage**
(`run.questionsByRoom.<roomType>.<key>` in den Locales, mit Rückfall auf
`run.questions.<key>`): im Schlafzimmer heißt `furniture` „Steht das Bett …",
im Büro „Steht ein Schreibtisch …". Das ändert nur den Text, nicht die
Bewertung.

**`none` liefert absichtlich eine leere Liste.** In einem unbeheizten Raum gibt
es nichts freizuhalten. Der eigentliche Riegel ist `skipWhenUnheated: true` im
Katalog – `appliesToRoom()` nimmt den Check dort aus Auswahl **und**
Fortschrittszähler. Ohne ihn stünde er in jedem Keller als offene Aufgabe, die
niemand erledigen kann, und der Fortschrittsring käme nie auf 100 %. Die leere
Liste ist der Riegel dahinter, falls der Check doch über eine alte URL
aufgerufen wird.

---

## 3. Die Bewertung: gewichtete Punkte, als Anteil gelesen

### Gewichte

`WEIGHTS` gibt je Befund ein Paar `[teilweise, ja]`:

| Gewicht | Befunde | Warum |
|---|---|---|
| `[1, 3]` | `furniture`, `towels`, `cover`, `footless`, `carpet`, `ir_furniture`, `stove_furniture` | Umstellbar; verschiebt vor allem die Wärme**verteilung** |
| `[2, 4]` | `builtin`, `valve`, `thermostat`, `ir_cover`, `ir_sensor`, `stove_cover`, `stove_air` | Dauerhaft verbaut oder stört die **Regelung** – bzw. ist zusätzlich ein Sicherheitsproblem |

Der Gedanke dahinter: Ein **eingeschlossener Temperaturfühler** ist der
energetisch wirksamste Einzelbefund des ganzen Checks. Er misst Stauwärme,
regelt zu früh ab, der Raum bleibt kühl – und wird von Hand höher gedreht. Ein
Sofa davor verschiebt dagegen nur die Verteilung. Eine ungewichtete Punktsumme
hätte beides gleichgesetzt; genau das war der Vorzustand.

### Die Ampel

```
ratio = score / maxScore        // maxScore = Summe der „ja"-Gewichte
                                //            der tatsächlich gestellten Fragen

ratio >= 0.55        → high      „Stark blockiert"
ratio >= 0.25        → elevated  „Teilweise blockiert"
score  >  0          → medium    „Kleinigkeit"
sonst                → good      „Alles frei"
```

**Anteil statt absoluter Summe – das ist der Kern.** Sonst wäre dieselbe
Antwort je nach Fragensatz unterschiedlich streng bewertet, sobald ein Raumtyp
anders gewichtete Fragen bekommt (Küche mit `builtin` hat einen höheren
`maxScore` als das Wohnzimmer). Ein Test hält fest, dass volle Blockade in
**jedem** Fragensatz `high` ergibt und ein einzelner voller Befund in jedem
Fragensatz `elevated`.

`maxScore` zählt nur Fragen, die **beantwortet** wurden (`answers[key] !==
undefined`). Ein Altergebnis mit anderem Fragensatz wird deshalb korrekt
gelesen, ohne dass fehlende Fragen den Nenner verwässern.

### Befunde statt Empfehlungsliste

`rateFurniture()` liefert nicht nur die Ampel, sondern `findings[]` – **nur die
Punkte, die tatsächlich zutreffen**, nach Gewicht sortiert (wichtigster zuerst,
bei Gleichstand bleibt die Fragenreihenfolge). Jeder Befund trägt in den
Locales drei Texte: Titel je Stufe (`partly`/`yes`), `why` (Begründung),
`action` (Handlung).

Eine feste Empfehlungsliste hätte auch Punkte gezeigt, die gar nicht zutreffen.
Die alte Liste existiert noch – siehe Abschnitt 6.

---

## 4. Die Zahlen und wo sie stehen

Alle in `furnitureSpacing.ts`, alle exportiert, keine davon doppelt im Code.

| Konstante | Wert | Herkunft |
|---|---|---|
| `DISTANCE_TARGET_CM` | 30 | **Belegt** – Verbraucherzentrale, „Heizung: 10 einfache Tipps". Bis September 2026 standen hier 10 cm ohne Beleg. |
| `DISTANCE_BLOCKED_CM` | 5 | **Unbelegt**, aber keine Empfehlung: eine physikalische Aussage über den freien Querschnitt. Deshalb unverändert. |
| `DISTANCE_MIN/MAX/DEFAULT_CM` | 0 / 60 / 30 | Die Skala muss **über** den Zielwert hinausreichen, sonst liegt „ausreichend Abstand" am Anschlag und wirkt wie ein Maximum. |
| `COVER_PARTLY_PCT` | 15 | **Unbelegt** – gerundeter Erfahrungswert |
| `COVER_BLOCKED_PCT` | 30 | **Unbelegt** – gerundeter Erfahrungswert |
| `COVER_MIN/MAX/DEFAULT_PCT` | 0 / 80 / 15 | |
| `RATIO_ELEVATED` / `RATIO_HIGH` | 0,25 / 0,55 | Interne Ampelschwellen, nicht exportiert |

### Die Übersetzung in eine Antwortstufe

```
answerFromDistance(cm):   cm <= 5  → 2 (blockiert)
                          cm < 30  → 1 (teilweise)
                          sonst    → 0 (frei)

answerFromCoverage(pct):  pct >= 30 → 2
                          pct >= 15 → 1
                          sonst     → 0
```

Beide sind NaN-sicher und fallen auf „frei" zurück statt zu beanstanden.

**Warum `<=` statt `<` bei den 5 cm:** Der Hinweistext nennt „unter 5 cm" als
Grenze der freien Luftzufuhr, aber bis einschließlich 5 cm wurde bisher genauso
bewertet wie 29 cm (beides „teilweise") – ohne erkennbaren Handlungsbedarf in
der Anzeige. Das war Befund #6 der Liste (Screenshots 4/5/16 cm zeigten alle
„Gut"). 5 cm zählt seither schon als blockiert.

**Warum die grobe Dreiteilung statt einer Kurve:** Der Heizkörper arbeitet mit
freier Konvektion – entscheidend ist der freie Querschnitt, nicht der Abstand
als solcher. Eine Prozentkurve würde eine Genauigkeit vortäuschen, die weder
die Physik noch (bei der Fläche) eine Schätzung nach Augenmaß hergibt.

**Warum die Fläche und nicht der Abstand bei Fußbodenheizung:** Ein Abstand zum
Heizkörper ist dort gegenstandslos – es gibt keinen. Die entsprechende Größe
ist der Anteil der beheizten Fläche, der zugestellt ist: Die Anlage ist auf die
ganze Fläche ausgelegt, jede ausgefallene Teilfläche muss der Rest mit höherer
Vorlauftemperatur ausgleichen. Und sie braucht keinen Zollstock, sondern einen
Blick durch den Raum – deshalb „geschätzt", nicht „gemessen".

---

## 5. Die Dateien

```
src/features/measurements/furniture_spacing/
├── furnitureSpacing.ts        324 Z. – die ganze Fachlogik, ohne React
├── context.ts                  59 Z. – Verknüpfung mit dem übrigen Profil
├── FurnitureSpacingIntro.tsx   72 Z. – 1-2-3-Erklärung + Details-Modal
├── FurnitureSpacingRun.tsx    278 Z. – Fragen, Messschalter, Auswertung
└── FurnitureSpacingResult.tsx 217 Z. – Ampel, Befunde, Zusammenhänge
```

`furnitureSpacing.ts` und `context.ts` sind **reine Funktionen ohne
React-Import**. Deshalb sind sie direkt testbar (zwei Testdateien, Abschnitt 9)
und deshalb dürfen `measurementThresholds.ts` und andere daraus importieren,
ohne eine Komponente mitzuziehen.

### Der Mess-Schirm

Kopfzeile mit Symbol und Überschrift je Bauart (`run.headings.<transfer>`),
darunter drei Karten – je Frage eine. Die bezifferbare Frage
(`measurableKey`) trägt zusätzlich einen Schalter „Abstand gemessen" bzw.
„Zugestellte Fläche abschätzen"; ist er an, ersetzt ein `Stepper` mit großer
Zahl die drei Antwortknöpfe.

**Vorbelegung des Schalters:** an, wenn im Profil ein `distance_meter` steht
**und** es nicht um Fußbodenheizung geht. Die Flächen-Schätzung braucht kein
Gerät, ist aber ein zusätzlicher Schritt und deshalb nie vorbelegt.

**Die Wärmeübergabe-Nachfrage** ersetzt den ganzen Schirm, solange `transfer`
`undefined` ist – fünf Kacheln mit denselben Symbolen wie im Fragebogen, damit
die Antwort wiedererkennbar bleibt. Die Antwort gilt für **alle Räume dieses
Typs** (das sagt der Hinweistext auch) und lässt sich im Profil ändern.

### Der Ergebnis-Schirm

Von oben nach unten: `ResultHero` mit Ampel und Zusammenfassung → Messwert-Karte
(nur wenn gemessen: „Gemessener Abstand" oder „Zugestellte Fläche", jeweils mit
Einordnung) → **Befunde** → **Zusammenhang** (Abschnitt 7) → „alles frei"-Karte
→ Legacy-Empfehlungen (Abschnitt 6) → „Warum das zählt" (Mechanismus je Bauart).

---

## 6. Was das Ergebnis speichert

`MeasurementResult.details` nimmt nur Zahlen auf (Konvention in `CLAUDE.md`),
und gespeicherte Ergebnisse werden **nie migriert**.

| Schlüssel | Inhalt |
|---|---|
| `issues` | Anzahl der Befunde |
| `score` | gewichtete Punktsumme |
| `transfer` | Bauart als Code: `radiator 0, underfloor 1, infrared 2, stove 3, none 4` |
| `underfloor` | `0\|1` – **redundant**, hält Altergebnis-Leser bei Laune |
| `ans_<key>` | je gestellter Frage die Antwort `0\|1\|2` |
| `distanceCm` | nur wenn gemessen (Heizkörper/Infrarot/Ofen) |
| `coverPct` | nur wenn geschätzt (Fußbodenheizung) |

`primaryValue` / `unit`:
- mit Messung → `distanceCm` / `'cm'` bzw. `coverPct` / `'%'`
- ohne Messung → `issues` / `''` (der Bericht ergänzt dann „Befunde“, sonst
  stünde dort eine nackte „3“ ohne Bezug)

### Zwei Formate, die beide gelesen werden müssen

1. **`decodeTransfer(details)`** – liest `transfer` (neues Format), sonst
   `underfloor: 0|1` (Altergebnisse, als es nur zwei Bauarten gab).
2. **Die Einzelantworten** – `FurnitureSpacingResult` liest über
   `ALL_FINDING_KEYS`, nicht über den heutigen Fragensatz: Welche Fragen
   gestellt wurden, hängt vom Raumtyp ab und kann sich zwischen App-Ständen
   geändert haben. Fehlen die `ans_*` ganz (ältester Bestand), zeigt der Schirm
   statt der Befunde die frühere **allgemeine Empfehlungsliste**
   (`result.tips.<transfer>`). Die steht nur noch für diesen Fall im Code.

---

## 7. Was erst im Zusammenhang entsteht

`context.ts` ist der Teil, den keine der Messungen für sich liefern kann. Er
zieht das Raumklima-Ergebnis **desselben Raums** und den Wärmeerzeuger aus dem
Profil hinzu:

| Hinweis | Bedingung | Aussage |
|---|---|---|
| `sensorAndCold` | Befund `valve` oder `thermostat` **und** gemessene Raumtemperatur unter dem Komfortband dieses Raums | Das Muster, das zum Höherdrehen führt. Den Fühler freizustellen wirkt hier mehr als jede Änderung am Thermostat. |
| `heatPump` | `heat_pump` in `heatGenerators` | Jede Blockade zwingt zu höherer Vorlauftemperatur – bei einer Wärmepumpe schlägt das direkt auf die Arbeitszahl durch. |

Beide erscheinen **nur, wenn es überhaupt Befunde gibt**. Die Komfortband-Grenze
kommt aus dem Raumklima-Ergebnis (`details.bandMin`), nicht aus einer festen
Zahl – ein Schlafzimmer hat ein anderes Band als ein Bad.

---

## 8. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | Katalogeintrag: `perRoom`, `skipWhenUnheated`, `difficulty 1`, 2 min, Kategorie `heating`, `instruments`. `appliesToRoom()` wertet `skipWhenUnheated` gegen `room.heatTransfer`. |
| `measurements/registry.ts` | Verdrahtung von Intro / Run / Result |
| `measurements/rooms.ts` | `roomHeatTransfer()` – die Wärmeübergabe eines konkreten Raums |
| `measurements/instrumentNeeds.ts` | Dreht `instruments` um: Der Fragebogen leitet daraus die Übersicht „Was du zum Messen brauchst" her. Nimmt der Check seinen Messschritt weg, verschwindet er dort von selbst. |
| `education/measurementThresholds.ts` | Richtwert-Tabelle des Wissensbereichs. **Importiert alle vier Grenzen**, schreibt keine Zahl selbst. `origin: ref(Verbraucherzentrale)`. |
| `education/educationContent.ts` | Mess-Hintergrund „Heizkörper frei?" – Wirkung, Fehler, FAQ. Quelle steht auf Wikipedia (`wiki('Raumklima')`), wie die übrigen. |
| `tips/buildTips.ts` | Ist die schlechteste Bewertung über alle Räume ≠ `good`, entsteht der Tipp `furniture_spacing`: 10 min Aufwand, 0 €, Kategorie `heating`. |
| `reports/measurementsReportData.ts` | Rückfalleinheit `'Befunde'` für den Fall ohne Messung |
| `store/onboardingStore.ts` | `setRoomHeatTransfer` – der Rückschreibweg der Nachfrage |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis im Wohnzimmer (siehe Abschnitt 11) |

---

## 9. Was die Tests festhalten

| Datei | Prüft |
|---|---|
| `tests/unit/furnitureSpacing.test.ts` | Befunde, Gewichtung, Fragenauswahl, beide Messwege, und die **Texte**: zu jeder Frage einer, zu jedem Befund Titel/Begründung/Handlung, keine `questionsByRoom`-Verweise auf nicht existierende Schlüssel, kein behaupteter Wärmeverlust im Ergebnistext – in **beiden** Sprachen |
| `tests/unit/furnitureContext.test.ts` | Die beiden Zusammenhangs-Hinweise samt Randfällen (kein Raumklima, unbrauchbare Werte, raumtypabhängiges Band) |
| `tests/unit/heatTransfer.test.ts` | Fünf Bauarten: eigener Satz je Bauart, keine Überschneidung, jeder Befund in `ALL_FINDING_KEYS`, jeder Code genau einmal, beide Ergebnisformate, `skipWhenUnheated` in Auswahl und Fortschritt, Texte je Bauart |
| `tests/unit/instrumentNeeds.test.ts` | Jede verfügbare Messung trägt eine `instruments`-Angabe |
| `tests/unit/buildTips.test.ts` | Der abgeleitete Tipp |

Zwei Eigenschaften werden dabei bewusst als **Invarianten** geprüft, nicht als
Einzelwerte: `answerFromDistance` ist über den ganzen Eingabebereich monoton,
`answerFromCoverage` wird mit mehr zugestellter Fläche nie milder. Wer die
Schwellen verschiebt, bricht diese Tests nicht – wer die Logik verdreht, schon.

---

## 10. Entscheidungen, die schon gefallen sind

1. **Kein €-Betrag.** Keine belastbare Kostenbasis. `yieldsSaving` bleibt
   ungesetzt.
2. **Der Kachelofen steht in der Raumliste**, obwohl er fachlich ein
   Wärme**erzeuger** ist (`HeatGeneratorType.wood_stove` gibt es bereits). Das
   ist eine bewusste Entscheidung für die Nutzersicht („was macht diesen Raum
   warm?") gegen die Fachsystematik.
3. **Infrarot und Ofen bleiben rein qualitativ.** Ein Mindestabstand zum Ofen
   ist eine Brandschutzgröße aus der Aufstellanleitung des Geräts, keine
   Effizienzgröße, die sich mitteln lässt. Der Befundtext verweist deshalb auf
   die Anleitung und den Schornsteinfeger, statt eine Zahl zu nennen. Es
   entsteht **kein** `ThresholdOrigin: 'pending'`.
4. **„Unbeheizt" nimmt den Check aus dem Raum**, nicht nur seine Fragen – sonst
   stünde er als unerledigbare Aufgabe im Fortschrittsring.
5. **`DISTANCE_BLOCKED_CM` bleibt bei 5 cm**, obwohl unbelegt. Sie auf 30
   anzuheben würde die mittlere Stufe „eng" (5–30 cm) ersatzlos verschlucken –
   aus drei Bewertungsstufen würden zwei. Das ist eine Produktentscheidung,
   keine Quellenfrage.
6. **Der Fragensatz ist immer genau drei Fragen lang.** Ein Test hält das fest.
   Nicht aus Prinzip, sondern weil die Ampelschwellen als Anteil gelesen werden
   und ein vierter Befund die Gewichtung stillschweigend verschöbe.

---

## 11. Was offen ist

**Aus der Liste (`docs/gefundene-probleme.md`, „Offene Fragen"):**

- **#29:** Das Intro-Bild zeigt einen Heizkörper – auch wenn der Raum eine
  Infrarotplatte oder einen Ofen hat. Eigene Bilder je Bauart, oder bleibt das
  eine Illustration für den Check als Ganzes?
- **#29:** `result.summary.<rating>` ist für Heizkörper formuliert („Wärme
  verteilt sich ungleichmäßig"). Für Infrarot und Ofen trifft sie ungefähr zu,
  die Befunde darunter tragen das Genaue. Eigene Sätze je Bauart nachziehen?
- **#37:** Der `Stepper` kann seinen Wert seit dem 05.09. verbergen
  (`showValue={false}`). Hier steht er zweimal – einmal roh im Stepper, einmal
  groß daneben. Setzen?
- **Etappe 6:** `COVER_PARTLY_PCT` (15 %) und `COVER_BLOCKED_PCT` (30 %) sind
  unbelegt. Kilians Entscheidung vom 03.09.: nicht als „Erfahrungswert der
  E-App" abhaken, sondern offen lassen, bis eine Quelle da ist oder die
  Schwelle überdacht wird. Der Abstands-Fall ist mit den 30 cm belegt, der
  Flächen-Fall nicht.

**Beim Schreiben dieser Datei aufgefallen** – nicht geändert, nur notiert:

- **Das Demo-Ergebnis zeigt seinen Messwert nicht.** `demoProfile.ts` schreibt
  `details: { centimeters: 4 }`; gelesen wird `distanceCm`. Es fehlen außerdem
  die `ans_*`-Schlüssel, weshalb der Demo-Schirm in den Legacy-Zweig fällt und
  die alte allgemeine Empfehlungsliste statt der Befunde zeigt. Betrifft nur
  das Demo-Profil, nicht echte Ergebnisse.
- **Zwei Locale-Schlüssel sind tot:** `run.radiatorTitle` und
  `run.underfloorTitle` in beiden Sprachen. Sie stammen aus der Zeit vor
  `run.headings.<transfer>` und haben keine Lesestelle mehr.
- **`result.tips.none` ist ein leeres Array.** Konsequent (der Check erscheint
  dort nicht), aber es ist der einzige Eintrag, der nie gelesen werden kann.

---

## 12. Wenn du etwas änderst

1. **Eine Grenze ändern** → nur in `furnitureSpacing.ts`. Der Wissensbereich
   zieht nach, weil `measurementThresholds.ts` die Werte **importiert** statt
   sie abzuschreiben – dort steht keine dieser Zahlen im Quelltext. Die Tests
   in `furnitureSpacing.test.ts` prüfen gegen dieselben Konstanten und bleiben
   deshalb grün; was du selbst nachziehen musst, sind die Beschriftungen der
   Richtwert-Tabelle („Frei / Eng / Blockiert") und die Quelle daneben.
2. **Eine Zahl in einem Text nennen** → nicht ausschreiben, Platzhalter setzen
   (`{{target}}`) und aus dem Modul füllen. Genau hier lief es am 05.09. schon
   einmal auseinander: Zwei Texte nannten 10 cm, während die App mit 30
   rechnete.
3. **Eine Frage hinzufügen** → `FindingKey` erweitern, in `ALL_FINDING_KEYS`
   **und** den passenden `*_KEYS`-Satz eintragen, `WEIGHTS` ergänzen, Texte in
   beiden Sprachen. Drei Tests fallen sofort, wenn eins davon fehlt. Und
   bedenken: Der Satz wächst dann auf vier Fragen – siehe Entscheidung 6.
4. **Eine neue Bauart hinzufügen** → `HeatTransferType`, eigener `*_KEYS`-Satz,
   `TRANSFER_CODES` (**neuen Code anhängen, nie einen bestehenden umnummerieren**
   – gespeicherte Ergebnisse werden nicht migriert), `TRANSFER_ICONS`,
   `TRANSFER_OPTIONS`, `run.headings.*`, `result.mechanisms.*`, `result.tips.*`.
5. **Einen Euro-Betrag einführen** → dann `yieldsSaving` im Katalog setzen und
   Abschnitt 10.1 widerlegen. Ohne belegte Kostenbasis nicht.
6. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte mit allen Befunden: `docs/gefundene-probleme.md`,
Punkte 6, 7, 9, 29 und 37. Die Richtwert-Diskussion: `docs/verbesserungen-etappen.md`,
Etappe 6.
