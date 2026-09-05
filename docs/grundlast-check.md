# Grundlast-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er misst, warum er
> so rechnet, was ihn außerhalb seines Ordners berührt, welche Entscheidungen
> bereits gefallen sind – samt Begründung, damit niemand sie versehentlich
> rückgängig macht – und was beim Schreiben dieser Datei auffiel.

---

## 1. Was der Check tut

Er ermittelt die **Dauerleistung**, die der Haushalt rund um die Uhr zieht –
Standby-Geräte, Kühl-/Gefriergeräte, Router, ggf. die Heizungspumpe – wenn
niemand aktiv etwas nutzt. Das Ergebnis ist eine **Diagnose**, keine
Maßnahme: Es zeigt die Grundlast in Watt und eine grobe €/Jahr-Orientierung,
aber es **trägt bewusst nicht zum Gesamt-Sparpotenzial bei**. Die konkreten,
bezifferten Einsparungen liefern die Folge-Checks (vor allem Standby,
Kühl-/Gefrierschrank) – sonst würde derselbe Watt-Betrag doppelt gezählt: einmal
als „Grundlast" und noch einmal als „Standby-Gerät X spart Y €".

**Zwei Erfassungswege** (`MeterMode`):
- **`instant`** – der Zähler zeigt die Leistung direkt in Watt an. Schnell,
  aber eine Momentaufnahme: Taktet der Kühlschrank-Kompressor gerade, misst man
  ihn mit oder nicht.
- **`readings`** – zwei Zählerstände mit zeitlichem Abstand (Stunden, meist
  über Nacht). Der ehrlichere Weg: funktioniert mit jedem Zähler (auch der
  alten Ferraris-Drehscheibe) und mittelt über mehrere Kühlschrank-Zyklen.

**Die frühere Stoppuhr-Messung ist ersatzlos entfallen.** Sie verlangte,
Minuten lang vor dem Zähler zu warten, in denen sich dessen Anzeige – je nach
Auflösung – gar nicht bewegen konnte. Der Check merkt sich stattdessen seinen
Startpunkt im **Draft-Store** (`measurementDraftStore`, `readDraft`/`setDraft`):
Der Nutzer legt das Handy weg und kommt am nächsten Morgen wieder, so wie es
Kühlschrank- und Gefriertruhen-Check schon halten.

**Messgeräte:** `instruments: [{ type: 'power_meter', required: true }]` im
Katalog. **Pflicht, aber ohne Anschaffung** – gemeint ist der Stromzähler des
Hauses selbst, kein zusätzliches Gerät.

**Kein `yieldsSaving`.** Der Check speichert bewusst **kein** `avoidableCost`
und kein `yearlySaving`. Grund und Riegel dazu in Abschnitt 8.

---

## 2. Die Bewertung: Anteil bevorzugt, Watt als Rückfall

```
rateBaseLoad(watts, share?):
  wenn share bekannt (0…1):
    share <= 0,25   → good
    share <= 0,35   → medium
    share <= 0,5    → elevated
    sonst           → high
  sonst (Rückfall auf absolute Watt):
    watts <= 70      → good
    watts <= 150      → medium
    watts <= 250      → elevated
    sonst             → high
```

**Der Anteil am Jahresverbrauch ist der bevorzugte Maßstab.** „180 W" sagt
niemandem etwas, „ein Drittel deiner Stromrechnung" schon – und der Anteil
macht die Zahl **unabhängig von der Haushaltsgröße**, für die absolute
Watt-Schwellen zwangsläufig unfair sind: „Eine Familie im Haus mit
Gefriertruhe liegt immer über 70 W, egal wie sparsam sie lebt" (Kommentar im
Code). Die Watt-Schwellen greifen deshalb **nur**, solange kein
Jahresverbrauch aus dem Monitoring vorliegt.

`baseLoadShare()` berechnet den Anteil aus dem hochgerechneten Jahresverbrauch
der Strom-Ablesungen (`stats()` aus `monitoring/readings`). Sie liefert
`undefined`, solange keine belastbare Ableshistorie da ist – dann gibt es
schlicht nichts zu vergleichen, und `rateBaseLoad` fällt auf Watt zurück.

**Unmöglicher Anteil.** Übersteigt die Grundlast **95 %** des
Jahresverbrauchs (`IMPLAUSIBLE_SHARE`), kann die Messung nicht stimmen – die
Grundlast ist per Definition eine Teilmenge des Gesamtverbrauchs. Dann liefen
bei der Messung vermutlich noch aktiv genutzte Geräte mit, oder ein
Zählerstand wurde vertippt. Die App zeigt in diesem Fall **keine Bewertung**,
sondern einen Hinweis, die Messung zu prüfen (`share.implausible`,
Abschnitt 6) – lieber keine Zahl als eine falsche.

---

## 3. Die Zahlen und ihr Belegstand

Alle in `baseLoad.ts`, alle exportiert außer den Anteils-Schwellen (Abschnitt
11.1).

| Konstante | Wert | Belegstand |
|---|---|---|
| `GOOD_MAX` | 70 W | **Unbelegt.** Bewusst grob und „zwangsläufig unfair" – reiner Rückfall, solange kein Anteil bekannt ist |
| `MEDIUM_MAX` | 150 W | **Unbelegt** |
| `ELEVATED_MAX` | 250 W | **Unbelegt** |
| `GOOD_MAX_SHARE` | 0,25 | **nicht exportiert** – siehe Abschnitt 11.1 |
| `MEDIUM_MAX_SHARE` | 0,35 | **nicht exportiert** |
| `ELEVATED_MAX_SHARE` | 0,5 | **nicht exportiert** |
| `IMPLAUSIBLE_SHARE` | 0,95 | Physikalische Grenze (Grundlast ⊆ Gesamtverbrauch), keine Empfehlung |
| `CYCLE_SAFE_MS` | 3 h | Mindestdauer, damit die Messung mehrere Kühlschrank-Kompressorzyklen abdeckt (grob ⅓ der Zeit an, ~80 W) |
| `MAX_USABLE_UNCERTAINTY` | 0,5 | Ab hier ist die Zahl nur noch Rauschen und wird verworfen |
| `GOOD_UNCERTAINTY` | 0,1 | Bis hierher gilt die Messung als genau |
| `ASSUMED_WATTS` | 100 W | Nur zur **Vorab-Schätzung** der empfohlenen Wartezeit, bevor überhaupt gemessen wurde |
| `SNAPSHOT_UNCERTAINTY` | 0,25 | Angenommene Unsicherheit einer Momentaufnahme (`instant`) – hat keine gemessene Genauigkeit |
| `MIN_TOLERANCE_W` | 5 W | Untergrenze der Vorher/Nachher-Toleranz – zwei Nächte sind nie exakt gleich |

**Kilians Entscheidung vom 03.09.2026:** Die drei Watt-Schwellen (`GOOD_MAX`,
`MEDIUM_MAX`, `ELEVATED_MAX`) bleiben **ausdrücklich offen**
(`ThresholdOrigin: 'pending'`) statt als „Erfahrungswert der E-App"
abgehakt zu werden. Ein Test hält das aktiv fest: `measurementInfos.test.ts`
prüft, dass genau `base_load`, `hot_water_wait` und `standby` als `pending`
markiert sind – wer eine Quelle findet, stellt hier auf `reference` um, sonst
bleibt der Test ein Erinnerungsposten.

---

## 4. Messqualität: wann eine Zwei-Ablesungen-Messung etwas taugt

`readingsQuality(startKwh, endKwh, elapsedMs, resolutionKwh)` bewertet, wie
belastbar zwei Zählerstände sind – **aus der Auflösung des Displays und der
verstrichenen Zeit**, nicht aus der Watt-Zahl selbst:

```
uncertainty = min(1, resolutionKwh / (endKwh − startKwh))
longEnough  = elapsedMs >= CYCLE_SAFE_MS (3 Std.)
usable      = uncertainty <= 0,5
level       = !usable            → 'poor'
              uncertainty <= 0,1 && longEnough → 'good'
              sonst                              → 'fair'
```

**Genau hier scheiterte die frühere Stoppuhr-Messung:** Bei 0,1 kWh Auflösung
und fünf Minuten Wartezeit steht der Zähler noch auf demselben Wert
(`uncertainty = 1`, `usable = false`). Statt eines toten Buttons kann die App
jetzt sagen, dass es schlicht zu früh ist (`quality.tooEarly` im Run-Schirm).

`recommendedWaitMs(resolutionKwh)` schlägt eine Wartezeit vor: Ziel sind zehn
Anzeige-Schritte (±10 %) bei angenommenen 100 W, **mindestens aber
`CYCLE_SAFE_MS`** – ein feiner Zähler wird zwar schneller genau, die
Momentaufnahme dadurch aber nicht repräsentativer für den getakteten
Kühlschrank. Drei wählbare Auflösungen (`METER_RESOLUTIONS`): 0,1 / 0,01 /
0,001 kWh, je nachdem, welche letzte Stelle der Zähler anzeigt.

`canEvaluate` im Run-Schirm verlangt bei `readings` **`quality.usable`** –
eine zu früh gemessene Zwei-Ablesungen-Messung lässt sich gar nicht erst
auswerten, egal was für eine Zahl `wattsFromTimed` daraus errechnet.

---

## 5. Vorher/Nachher – der einzige Nachweis ohne Schätzung

`baseLoadChange(previous, current, workPriceCt)` ist, laut eigenem Kommentar,
„der eine Punkt, an dem die App nicht schätzt, sondern nachweist": Wer
Dauerverbraucher abgeschafft hat, sieht hier, was es **tatsächlich** gebracht
hat – nicht, was ein Modell verspricht.

**Die Toleranz entscheidet, ob der Unterschied echt ist:**

```
err(p) = p.watts × (p.uncertainty ?? SNAPSHOT_UNCERTAINTY)   // 0,25 bei Momentaufnahmen
toleranceWatts = max(MIN_TOLERANCE_W, √(err(previous)² + err(current)²))
deltaWatts     = previous.watts − current.watts
significant    = |deltaWatts| > toleranceWatts
annualEur      = significant && direction === 'down' ? … : 0
```

Die Unsicherheiten werden **quadratisch addiert** (sie sind unabhängig
voneinander), mit `MIN_TOLERANCE_W` (5 W) als Untergrenze – zwei Nächte sind
nie exakt gleich. Zwei Messungen mit je ±9 % lassen einen Unterschied von 8 W
nicht als Erfolg erkennen; ihn trotzdem auszuweisen wäre eine Erfindung.

**Nur eine belegte Senkung trägt einen Euro-Betrag** (`direction === 'down' &&
significant`). Ein Anstieg wird als solcher benannt („Ein neuer
Dauerverbraucher?"), aber nicht beziffert – ebenso wenig eine Veränderung
unterhalb der Messgenauigkeit.

---

## 6. Die Dateien

```
src/features/measurements/base_load/
├── baseLoad.ts         322 Z. – Bewertung, Messqualität, Vorher/Nachher (reine Fachlogik)
├── remeasure.ts          73 Z. – „Lohnt sich erneutes Messen?" (reine Fachlogik)
├── BaseLoadIntro.tsx     72 Z. – Hero-Bild + 1-2-3-Anleitung
├── BaseLoadRun.tsx      389 Z. – beide Erfassungswege, Draft-Persistenz
├── ReadingCapture.tsx   149 Z. – Vollbild-Ablese-Dialog mit Scanner-Anbindung
└── BaseLoadResult.tsx   205 Z. – Ampel, Anteil, Vorher/Nachher, Trichter zum Standby-Check
```

`baseLoad.ts` und `remeasure.ts` sind reine Funktionen ohne React-Import –
direkt testbar, und deshalb dürfen `measurementThresholds.ts`, `followUps.ts`
und `MeasurementsPage.tsx` daraus importieren, ohne eine Komponente
mitzuziehen.

### Der Run-Schirm

Von oben nach unten:
1. **Meter-Wahl** – Chips „Zähler zeigt Watt" / „Zwei Ablesungen".
2. Je nach Wahl:
   - `instant`: ein Zahlenfeld (W), mit Hinweis auf die Kompressor-Taktung.
   - `readings`, noch keine erste Ablesung: Auflösungs-Wahl (drei Chips) +
     Knopf „Zählerstand erfassen" → öffnet `ReadingCapture`.
   - `readings`, erste Ablesung liegt vor, zweite noch nicht: laufende Uhr
     (`fmtDuration`, sekündlich aktualisiert über `setInterval`), Hinweis „noch
     X warten" oder „bereit", Knopf „Zweite Ablesung erfassen".
   - `readings`, beide Ablesungen vorhanden: beide Werte, gemessene Dauer,
     Qualitätshinweis (✓ oder ⚠, mit Prozentangabe der Unsicherheit).
   - Ein „Neu beginnen"-Knopf setzt beide Ablesungen zurück (nicht die
     Auflösungswahl).
3. Ergebnisvorschau (aktuelle Watt-Zahl oder „–").
4. Auswerten-Knopf, aktiv nur wenn `canEvaluate`.

**Persistenz über den Draft-Store:** Bei jeder Änderung schreibt ein
`useEffect` **alle** Felder auf einmal (`resolution`, `startKwh`, `startAt`,
`endKwh`, `endAt`) – bewusst vollständig, weil `setDraft` nur ergänzt und
nichts entfernt: Ausgelassene Schlüssel behielten sonst nach „Neu beginnen"
ihren alten Wert. Liegt beim Wiedereinstieg bereits eine erste Ablesung im
Zwischenspeicher, startet der Schirm **direkt im `readings`-Modus** – sonst
verschwände der Zwischenstand hinter dem Watt-Eingabefeld, obwohl er noch da
ist.

Ein Zeitstempel von `0` gilt als „keine Ablesung", weil der Draft-Store nur
Zahlen kennt und kein „gelöscht" – ein Zählerstand von `0` selbst ist aber
gültig, deshalb unterscheidet der Code explizit `d.startAt ? d.startKwh :
undefined` statt eines simplen Falsy-Checks auf `startKwh`.

### `ReadingCapture` – der Ablese-Dialog

Ein Vollbild-Dialog (`position: fixed; inset: 0`), gemeinsam für erste und
zweite Ablesung. **Freitext-Feld statt Zählwerk** (`OdometerInput`): Für die
Grundlast ist die **Nachkommastelle** die eigentliche Messgröße, und ein
Zählwerk kennt nur ganze Zahlen. Nutzt denselben Kamera-Scanner wie das
Monitoring (`MeterScanner`, lazy geladen wegen Tesseract.js/WASM) – dessen
On-Device-OCR liefert nur Ziffernfolgen, der Vorschlag landet deshalb im
Textfeld, wo der Nutzer das Komma ergänzt und bestätigt. Ein Zählerstand
**unter** dem vorherigen wird als Tippfehler abgewiesen (`tooLow`) – Zähler
laufen vorwärts.

### Der Ergebnis-Schirm

Reihenfolge: `ResultHero` (Watt, Ampel, Zusammenfassung) → Vorher/Nachher-Karte
(nur mit vorherigem Ergebnis) → Verbrauch/Jahr + Kosten/Jahr (zwei Kacheln) →
Anteils-Karte **oder** Unplausibel-Warnung **oder** Link ins Monitoring →
Orientierungs-Hinweis → Trichter-Karte zum Standby-Check (nur wenn
`rating !== 'good'`).

**Vorher/Nachher braucht einen kleinen Kniff**, weil der Ergebnis-Schirm
erscheint, **bevor** gespeichert wird: Dann steht in `results` noch die
vorherige Messung, `previousResults` ist leer. Nach dem Speichern ist es
umgekehrt. Der Code prüft deshalb beides und nimmt die Messung, die **nicht**
die gerade gezeigte ist:

```ts
const previous =
  stored && stored.completedAt !== result.completedAt ? stored : storedBefore
```

---

## 7. Was das Ergebnis speichert

`MeasurementResult.details` (nur Zahlen, siehe `CLAUDE.md`):

| Schlüssel | Inhalt |
|---|---|
| `watts` | Grundlast, auf eine Nachkommastelle gerundet |
| `annualKwh` | Jahres-Dauerverbrauch, gerundet |
| `annualEur` | Grobe Jahreskosten, gerundet – **reine Orientierung, kein Sparwert** |
| `measuredMs` | nur bei `mode === 'readings'`: die tatsächlich verstrichene Zeit |
| `uncertainty` | nur bei `mode === 'readings'`: relative Unsicherheit, auf 2 Nachkommastellen gerundet |

`primaryValue` = `watts`, `unit` = `'W'`.

**Bewusst KEIN `avoidableCost`/`yearlySaving`** – der Kommentar im Code sagt es
direkt: „Grundlast ist Diagnose, die € beziffern die Folge-Checks (kein
Doppelzählen)." Ohne `measuredMs`/`uncertainty` (bei `instant`) weiß der
Vorher/Nachher-Vergleich, dass er die pauschale `SNAPSHOT_UNCERTAINTY`
ansetzen muss statt der tatsächlich gemessenen.

---

## 8. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | Katalogeintrag: `wholeHome: true`, `difficulty 2`, 5 min, Kategorie `electricity`, `instruments: [{ power_meter, required: true }]`. Kein `yieldsSaving` – der Kommentar dort nennt `base_load` explizit als Beispiel für „Diagnose – die € beziffern die Folge-Checks". |
| `measurements/impact.ts` | `resultSavingsEur()` prüft `yieldsSaving` aus dem Katalog, bevor sie `avoidableCost`/`yearlySaving` aus den Details liest – ein `avoidableCost` im Detail-Objekt eines `base_load`-Ergebnisses zählt trotzdem **nicht** in die Wirkungs-Summe. Ein Test deckt genau das ab. |
| `measurements/followUps.ts` | `pendingFollowUps()` ruft `remeasurePrompt()` auf und meldet bei Treffer einen Eintrag `{ key: 'base_load', id: 'base_load' }` – speist die kleinen Hinweispunkte in unterer Navigation und Messungsliste. |
| `measurements/MeasurementsPage.tsx` | Zeigt bei Treffer die ausführliche `RemeasureCard` (eigene Komponente, nicht Teil des Check-Ordners) mit Link zurück zum Grundlast-Check. |
| `education/measurementThresholds.ts` | Importiert `GOOD_MAX`/`MEDIUM_MAX`/`ELEVATED_MAX` unter Alias (`BASE_GOOD_MAX` etc.), Tabelle mit vier Watt-Stufen, `origin: pending(...)`. **Zeigt nur die Watt-Rückfallschwellen, nicht die bevorzugten Anteils-Schwellen** – siehe Abschnitt 11.1. |
| `education/educationContent.ts` | Mess-Hintergrund „Grundlast" – Wirkung, Fehler, FAQ; nennt ausdrücklich, dass dieser Check „anders als die anderen … keine Ersparnis beziffert, sondern eine Diagnose stellt". |
| `tips/buildTips.ts` | Nur wenn `bl !== 'good'` **und** noch kein Standby-Ergebnis vorliegt (`!results['standby']`) – der Tipp führt in den Standby-Check statt zum Kauf eines Messgeräts zu raten. `effortMinutes: 20`, `costEur: 15`, `params: { watts }`, `linkTo: '/measurements/standby'`. |
| `reports/measurementsReportData.ts` | Feste Einheit `'W'` |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis, `rating: 'elevated'`, 132 W |
| `store/tariffStore` | Liefert `electricityWorkPrice` für die €/Jahr-Orientierung und den Vorher/Nachher-Betrag |
| `store/readingsStore` | Liefert die Strom-Ablesungen für `stats()` → `baseLoadShare()` |
| `store/measurementDraftStore` | Persistiert die laufende Zwei-Ablesungen-Messung über Stunden/Tage hinweg |
| `store/measurementsStore` | Liefert `results`/`previousResults` für den Vorher/Nachher-Vergleich |
| `monitoring/readings` (`stats()`, `ProjectionBasis`, `ReadingStats`) | Liefert den hochgerechneten Jahresverbrauch, auf dem der Anteil beruht |
| `monitoring/MeterScanner` | Kamera-OCR, lazy geladen, von `ReadingCapture` mitbenutzt |

**Nicht berührt:** `instrumentNeeds.ts` zwar indirekt (der Katalogeintrag trägt
`power_meter` als `required: true`), aber es gibt keine eigene Logik im
Check-Ordner dazu – die Geräte-Übersicht liest den Katalog wie bei jeder
anderen Messung.

---

## 9. `remeasure.ts` – der Anstoß zum Nachmessen

Der Grundlast-Check ist **die einzige Messung, deren Wirkung der Nutzer selbst
nachprüfen kann** – aber nur, wenn er ein zweites Mal misst. Von allein kommt
darauf niemand.

**Bedingungen für den Anstoß** (`remeasurePrompt`):
1. Es gibt bereits ein `base_load`-Ergebnis.
2. **Danach** wurde eine Messung abgeschlossen, die die Grundlast senken kann:
   `LOWERING_MEASUREMENTS = ['standby', 'fridge', 'freezer']`. Der
   **Duschkopf-Check gehört bewusst nicht dazu** – er spart Warmwasser, nicht
   Strom rund um die Uhr; der **LED-Check** auch nicht – er spart Strom nur
   beim Leuchten, keinen Dauerverbrauch. Beides würde in der Grundlast nicht
   sichtbar.
3. Seither sind mindestens `SETTLE_DAYS` = 2 Tage vergangen. Wer den
   Standby-Check gerade erst beendet hat, hat noch keinen Stecker gezogen –
   ein sofortiger Anstoß liefe ins Leere.
4. Bei mehreren auslösenden Messungen zählt die **jüngste**.

Der Anstoß **verschwindet von selbst**, sobald neu gemessen wurde – dann ist
die Grundlast wieder die jüngste Messung, und Bedingung 2 greift nicht mehr.

---

## 10. Was die Tests festhalten

| Datei | Prüft |
|---|---|
| `tests/unit/baseLoad.test.ts` | `baseLoadShare` (Verhältnis, Unplausibilität, fehlende Ableshistorie, fehlende Grundlast, Basis-Durchreichung), `wattsFromTimed`, `readingsQuality` (Nachtmessung belastbar, Stoppuhr-Fall zu früh, kurze Messung trotz feiner Anzeige nur „brauchbar", Robustheit gegen Unsinn), `recommendedWaitMs` (Nachtmessung beim groben Zähler, nie unter der Kühlschrank-Taktung), `rateBaseLoad` (Rückfall auf Watt, Bewertung am Anteil, Unabhängigkeit von der Haushaltsgröße, unbrauchbarer Jahresverbrauch wird ignoriert), `baseLoadChange` (belegte Senkung beziffert, Änderung unter Messgenauigkeit nicht ausgewiesen, zwei Momentaufnahmen belegen kaum etwas, Anstieg erkannt, keine verwertbaren Messungen) |
| `tests/unit/remeasure.test.ts` | Alle Bedingungen aus Abschnitt 9 einzeln, inkl. „ignoriert Messungen, die die Grundlast gar nicht senken" und „nimmt die jüngste auslösende Messung" |
| `tests/unit/impact.test.ts` | Ein `avoidableCost` in den Details zählt **nicht** in die Wirkungs-Summe – der Riegel aus Abschnitt 8 |
| `tests/unit/buildTips.test.ts` | Der abgeleitete Tipp, inkl. der Bedingung „nur ohne Standby-Ergebnis" |
| `tests/unit/measurementsReportData.test.ts` | Berichts-Aufbereitung |
| `tests/unit/measurementInfos.test.ts` | Genau `base_load`, `hot_water_wait`, `standby` sind als `pending` markiert (Abschnitt 3) |

**Keine eigene Text-Vollständigkeitsprüfung** (anders als `lighting.test.ts`
oder `furnitureSpacing.test.ts`, die jeden i18n-Schlüssel gegen den Code
abgleichen). Die Locale-Texte des Grundlast-Checks werden nirgends
automatisiert auf Vollständigkeit in beiden Sprachen geprüft.

---

## 11. Entscheidungen, die schon gefallen sind

1. **Kein Sparpotenzial aus diesem Check.** Er ist Diagnose; die Folge-Checks
   (Standby, Kühl-/Gefrierschrank) beziffern die Einsparung, um
   Doppelzählung zu vermeiden. `yieldsSaving` bleibt im Katalog ungesetzt.
2. **Die Stoppuhr-Messung ist ersatzlos entfallen**, nicht durch eine feinere
   Variante ersetzt. Der Draft-Store trägt den Startpunkt über beliebig lange
   Zeit, statt eine Wartezeit im Vordergrund zu erzwingen.
3. **Anteil vor Watt.** Watt-Schwellen sind ein Rückfall, kein gleichwertiger
   zweiter Bewertungsweg – sie greifen nur ohne Monitoring-Ablesungen.
4. **Ein unplausibler Anteil (> 95 %) bekommt keine Bewertung**, sondern einen
   Prüfhinweis. Eine Zahl, die physikalisch nicht stimmen kann, ist schlimmer
   als keine Zahl.
5. **Die drei Watt-Schwellen bleiben aktiv als `pending` markiert**
   (Kilians Entscheidung 03.09.2026), nicht als „eigener Erfahrungswert"
   abgehakt – ein Test hält die Liste der offenen Werte exakt fest.
6. **Vorher/Nachher zeigt nur eine belegte Senkung mit Euro-Betrag.** Ein
   Anstieg wird benannt, aber nicht beziffert; eine Änderung unter der
   Messgenauigkeit wird nicht als Erfolg oder Rückschritt ausgewiesen.

---

## 12. Was offen ist

Kein eigener Punkt zum Grundlast-Check steht in `docs/gefundene-probleme.md`.
Die einzige dort dokumentierte offene Frage berührt ihn nur indirekt über die
gemeinsame Richtwert-Tabelle: `docs/verbesserungen-etappen.md`, Etappe 6,
listet die Grundlast-Schwellen (70/150/250 W) unter den vier unbelegten
Richtwerten, für die Kilian am 03.09.2026 entschieden hat, sie offen zu lassen
statt sie als App-eigene Setzung zu deklarieren.

**Beim Schreiben dieser Datei aufgefallen** – nicht geändert, nur notiert:

- **Die bevorzugten Anteils-Schwellen (`GOOD_MAX_SHARE`, `MEDIUM_MAX_SHARE`,
  `ELEVATED_MAX_SHARE`) sind in `baseLoad.ts` nicht exportiert.** Der
  Wissensbereich (`measurementThresholds.ts`) kann sie deshalb gar nicht
  importieren und dokumentiert nur die Watt-**Rückfallschwellen** – obwohl der
  Code den Anteil als bevorzugten Maßstab behandelt, sobald er bekannt ist.
  Ein Nutzer, dessen Bewertung tatsächlich am Anteil hängt (weil er im
  Monitoring Strom abliest), findet im Wissensbereich also nur die Zahlen, die
  seine eigene Bewertung gar nicht bestimmt haben. Auch die 95-%-Unplausibel-
  Grenze taucht dort nicht auf.
- **Keine automatisierte Text-Vollständigkeitsprüfung** für diesen Check
  (Abschnitt 10) – anders als beim LED- und Möbelabstand-Check gibt es keinen
  Test, der jeden verwendeten `t(...)`-Schlüssel gegen beide Locale-Dateien
  abgleicht. Ein fehlender Übersetzungs-Schlüssel in einer der beiden Sprachen
  würde hier nicht durch die Testsuite auffallen, sondern erst beim Anzeigen.

---

## 13. Wenn du etwas änderst

1. **Eine Watt-Schwelle ändern** → nur in `baseLoad.ts`. Der Wissensbereich
   zieht automatisch nach (Import unter Alias), aber die Beschriftung
   („Niedrig"/„Mittel"/…) und der `pending`-Text bleiben von Hand zu pflegen.
2. **Eine Anteils-Schwelle ändern oder exportieren** → ebenfalls
   `baseLoad.ts`. Willst du sie im Wissensbereich zeigen, musst du sie zuerst
   exportieren (Abschnitt 11.1) und dort eine zweite Tabelle oder einen
   zusätzlichen Hinweis ergänzen – die App zeigt aktuell nur eine Tabelle pro
   Messung.
3. **Die Mindestmessdauer oder Wartezeit-Logik ändern**
   (`CYCLE_SAFE_MS`, `recommendedWaitMs`) → prüfen, ob `readingsQuality`
   dieselbe Konstante nutzt; beide hängen an derselben physikalischen
   Annahme (Kompressor-Taktung).
4. **Einen weiteren „Anstoß zum Nachmessen" für eine andere Messung
   einführen** → `remeasure.ts` ist bewusst auf `base_load` zugeschnitten
   (`results['base_load']` fest verdrahtet); ein zweiter Anlass braucht eine
   eigene Funktion oder eine Parametrisierung, keine Kopie mit anderem
   Schlüssel.
5. **Einen Euro-Betrag als Sparpotenzial einführen** → dann `yieldsSaving:
   true` im Katalog setzen und Abschnitt 1/11.1 dieser Datei widerlegen. Ohne
   eine Rechnung, die Doppelzählung mit den Folge-Checks ausschließt, nicht.
6. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte: Die offene Richtwert-Frage steht in
`docs/verbesserungen-etappen.md`, Etappe 6.
