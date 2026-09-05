# Kühlschrank-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er misst, warum er
> so rechnet, was ihn außerhalb seines Ordners berührt, welche Entscheidungen
> bereits gefallen sind – samt Begründung, damit niemand sie versehentlich
> rückgängig macht – und **einen beim Schreiben gefundenen echten Bug**, der
> mehrere Kühlschränke betrifft (Abschnitt 6 – das Wichtigste zuerst lesen).

---

## 1. Was der Check tut

Eine einzige Eingabe: die **aktuelle Innentemperatur**. Ist sie zu kalt, zeigt
das Ergebnis das Sparpotenzial bis zur empfohlenen Temperatur (~7 °C) als
**Prozentwert** – nicht als Euro-Betrag. Ein Euro-Betrag bräuchte entweder eine
echte Strommessung oder einen angenommenen Jahresverbrauch; beides ist bewusst
entfallen (Abschnitt 3).

**Derselbe Check dient zweimal:** beim ersten Mal der Diagnose, danach –
sofern das letzte Ergebnis nicht gut war – dem **Nachweis**, was die
angepasste Stufe tatsächlich gebracht hat. Ein eigener Schalter dafür ist
bewusst nicht vorgesehen: „derselbe Temperatur-Check dient beim ersten Mal der
Diagnose und danach dem Nachweis" (Kommentar in `FridgeRun.tsx`). **Das ist
zugleich die Stelle, an der der in Abschnitt 6 beschriebene Bug sitzt.**

**Faustregel:** ~6 % Mehrverbrauch je °C kälter (mehrere Quellen, teils 6–10 %).

**Messgeräte:** `instruments: [{ type: 'temperature_sensor', required: true }]`
im Katalog – anders als beim Gefrierschrank-Check **Pflicht**, weil hier die
Temperatur die einzige Eingabe überhaupt ist.

**Gerät statt Raum, aber ohne eigene Verriegelung wie der Gefrierschrank:**
`perAppliance: true`, `rooms: ['kitchen', 'basement']` – der Zweitkühlschrank
im Keller ist verbreitet, „beide Checks liefern ein Ergebnis fürs ganze
Zuhause – die zusätzliche Zuordnung ändert deshalb nur, in welcher
Raum-Kachel sie auftauchen, nicht die Zählung" (Kommentar im Katalog). Wie der
Gefrierschrank-Check läuft er hinter `GatedFridgeRun` (`ApplianceGate`,
ausführlich in `docs/gefrierschrank-check.md`, Abschnitt 5 – dieselbe
Mechanik, hier nicht wiederholt).

---

## 2. Die Bewertung

```
GOOD_MIN = 5 °C, GOOD_MAX = 7 °C     // gutes Band
TOO_COLD_MAX = 2 °C                  // <3 °C = zu kalt (im Sinn der Ampel)
TOO_WARM_MIN = 8 °C                  // >8 °C = zu warm (im Sinn der Ampel)

rateFridge(temp):
  5 <= temp <= 7        → good
  temp < 3 || temp > 8  → high
  sonst (3 ≤ temp < 5 oder 7 < temp ≤ 8) → medium

fridgeStatus(temp):     // unabhängige, zweite Einteilung – Abschnitt 2.1
  temp < 5   → tooCold
  temp > 7   → tooWarm
  sonst      → optimal
```

### 2.1 Zwei verschiedene Bänder für dieselbe Zahl – bewusst, aber lückenhaft dokumentiert

**`rateFridge`** (die Ampel: good/medium/high) und **`fridgeStatus`** (die
Aussage: zu kalt/optimal/zu warm) benutzen **unterschiedliche Grenzen**
(5–7 °C für „optimal", aber 5–8 °C für „nicht high"). Das ist beabsichtigt und
notwendig: Die Ampel gibt gestufte Dringlichkeit, der Status entscheidet, in
welche Richtung Handeln sinnvoll ist – **nur „zu kalt" hat ein Sparpotenzial**
(Abschnitt 3).

**Der Wissensbereich zeigt davon nur einen Ausschnitt.** Die Richtwert-Tabelle
in `measurementThresholds.ts` hat genau drei Zeilen:

| Ampel | Text | Bereich laut Tabelle |
|---|---|---|
| `high` | „Zu kalt" | unter 3 °C |
| `good` | „Richtig" | 5–7 °C |
| `medium` | „Zu warm" | über 8 °C |

**Das lässt zwei Bereiche ohne eigene Zeile:** 3–5 °C (dort rechnet
`rateFridge` bereits `medium`, aber `fridgeStatus` sagt „zu kalt" – die Zeile
„Zu warm" träfe hier nicht zu, es gibt aber auch keine „medium, zu kalt"-Zeile)
und 7–8 °C (ebenfalls `medium`, aber laut `fridgeStatus` bereits „zu warm" –
die Tabelle nennt „über 8 °C", nicht „über 7 °C"). Ein Nutzer, der z. B. 7,5 °C
misst, bekommt ein `medium`-Ergebnis, das laut Tabelle gar nicht vorkommen
dürfte (die Tabelle deckt für „medium/zu warm" nur „über 8 °C" ab).

Dies **ist kein Fehler in der Bewertung selbst** – `rateFridge` und
`fridgeStatus` sind beide getestet und intern konsistent (Abschnitt 8) –,
sondern eine **lückenhafte Übersetzung der beiden Bänder in eine einzige,
dreizeilige Anzeige-Tabelle**. Nur notiert, nicht geändert (Abschnitt 12).

---

## 3. Warum es keinen Euro-Betrag mehr gibt

Bis August 2026 gab es zusätzlich eine optionale echte Strommessung
(Energiekostenmessgerät vorher/nachher) und einen Jahresverbrauch laut
Energielabel, aus denen sich ein Euro-Betrag ergab. Beides ist entfernt: „Ein
Wert, der auf einem angenommenen Jahresverbrauch beruht, ist ohnehin nur eine
Schätzung – der Prozentwert sagt dasselbe, ohne einen Euro-Betrag
vorzutäuschen, den niemand nachrechnen kann" (Kommentar in `fridge.ts`).

**Ein Potenzial gibt es nur bei „zu kalt".** Bis September 2026 rechnete
`calcFridgeSaving` bis 7 °C hoch, **egal wie die Temperatur bewertet war** –
das ist genau der in Punkt 16 von `docs/gefundene-probleme.md` dokumentierte
Bug: Wer 5,0 °C maß, bekam „Sehr gut · Optimal eingestellt · Weiter so" und
direkt darunter „Mögliches Sparpotenzial ≈ 12 %". **Das widersprach sich
selbst und dem Rest der App:** Die Empfehlungsliste legt erst unter 5 °C
einen Tipp an (`FRIDGE_COLD_C` in `buildTips.ts`), der Ergebnis-Schirm zeigte
aber schon ab 6,9 °C einen Kasten.

**Behoben an zwei Stellen** (Punkt 16, umgesetzt): `calcFridgeSaving` rechnet
nur noch bei `status === 'tooCold'`, und `FridgeResult` blendet den Kasten
nur bei `status === 'tooCold'` ein (nicht bei `rating === 'good'`/`'high'` o.ä.
– der Status entscheidet, nicht die Ampel). Die zweite Bedingung ist **nicht
doppelt gemoppelt**, sondern deckt Altergebnisse ab, die ein bis 7 °C
hochgerechnetes `savingPct` in den Details tragen und nicht migriert werden.

```ts
calcFridgeSaving(tempBefore):
  status = fridgeStatus(temp)
  warmupDegrees = status === 'tooCold' ? max(0, 7 − temp) : 0
  savingPct = 0,06 × warmupDegrees
```

Ein Test hält den Gleichlauf mit der Empfehlungsliste fest: Die
Sparpotenzial-Schwelle in `fridge.ts` (`GOOD_MIN = 5`) und die
Tipp-Schwelle in `buildTips.ts` (`FRIDGE_COLD_C = 5`) sind **dieselbe Zahl an
zwei Stellen** – nicht importiert voneinander, aber durch einen Test
zusammengehalten.

---

## 4. Die Folgemessung – Vorher/Nachher ohne eigenen Schalter

`fridgeChange(beforeTemp, afterTemp)` ist das Gegenstück zu
`baseLoadChange()` beim Grundlast-Check, nur bezogen auf Temperatur statt
Watt – **allerdings ohne dessen statistische Toleranz-Rechnung**:

```ts
fridgeChange(before, after):
  deltaDegrees = after − before
  warmedDegrees = max(0, min(deltaDegrees, 7 − before))   // gedeckelt bei der Empfehlung
  savingPct = 0,06 × warmedDegrees
  direction = deltaDegrees > 0,2 ? 'up' : deltaDegrees < -0,2 ? 'down' : 'none'
```

**Gedeckelt bei der Empfehlung:** Wer von 3 °C auf 9 °C stellt, bekommt nur die
Ersparnis bis 7 °C angerechnet (4 °C, nicht 6 °C) – alles darüber ist „zu
warm", kein zusätzliches Sparpotenzial.

**Nur bei „wärmer gestellt" wird ein Betrag gezeigt** (`direction === 'up' &&
savingPct > 0`). Ein Kälterstellen wird nicht als Ersparnis ausgewiesen –
das erhöht den Verbrauch.

**Anders als beim Grundlast-Check gibt es hier keine Unsicherheits-Toleranz.**
`baseLoadChange` verlangt einen Unterschied **über** einer berechneten
Messgenauigkeit, bevor er ihn als „belegt" ausweist; `fridgeChange` benutzt
stattdessen eine **feste** Nebenbedingung (`> 0,2 °C` bzw. `< -0,2 °C`), um
Rundungsrauschen von echter Änderung zu trennen – kein statistisches Modell,
sondern eine feste Toleranzgrenze.

---

## 5. Die Dateien

```
src/features/measurements/fridge/
├── fridge.ts        98 Z. – Bewertung, Status, Sparpotenzial, Vorher/Nachher (reine Fachlogik)
├── FridgeIntro.tsx   71 Z. – Hero-Bild + 1-2-3-Anleitung
├── FridgeRun.tsx    111 Z. – eine Temperatur-Eingabe, Folgemessungs-Hinweis
└── FridgeResult.tsx 128 Z. – Ampel, Status, Sparpotenzial oder Vorher/Nachher
```

`fridge.ts` ist reine Funktion ohne React-Import – direkt testbar, und deshalb
darf `measurementThresholds.ts` daraus importieren, ohne eine Komponente
mitzuziehen.

### Der Run-Schirm

Ein `Stepper` (0–15 °C, Schritt 0,5) für die aktuelle Temperatur, vorbelegt
mit 5 °C. Ohne vorherige schlechte Messung ein Erklär-Hinweis darunter; **mit**
einer vorherigen schlechten Messung stattdessen eine Info-Karte über der
Eingabe, die die vorherige Temperatur und ihren Status nennt (Abschnitt 6 –
hier liegt der Bug). Auswerten ist immer möglich, ohne Bedingung.

### Der Ergebnis-Schirm

`ResultHero` (Temperatur, Ampel, Status als Zusammenfassungstext) → Status-Chip
→ **entweder** die Vorher/Nachher-Karte (nur bei Folgemessung) **oder** die
Sparpotenzial-Karte (nur bei Erstmessung, nur bei „zu kalt") → `AmbientNote`
(Standort-Hinweis, geteilt mit dem Gefrierschrank-Check, siehe
`docs/gefrierschrank-check.md` Abschnitt 7).

---

## 6. Der Bug: Mehrere Kühlschränke teilen sich Entwurf und Folgemessungs-Hinweis

**Das ist der wichtigste Fund dieser Datei.** `CLAUDE.md` verzeichnet unter den
abgeschlossenen Vorhaben: „Mehrere Geräte gleicher Art (z. B. zwei
Kühlschränke) lassen sich einzeln erfassen, benennen und getrennt messen –
vorher überschrieb ein zweites Gerät automatisch das Ergebnis des ersten." Das
stimmt für das **gespeicherte Ergebnis** – `MeasurementRunner.tsx` hängt vor
dem Speichern automatisch die Geräte-ID an (`full.roomKey = result.roomKey ??
roomKey`) und speichert unter `instanceKey('fridge', roomKey)`, also z. B.
`fridge@kuehlschrank-keller`. **Das trifft aber nicht auf zwei andere Stellen
in `FridgeRun.tsx` selbst zu:**

```ts
export function FridgeRun({ onEvaluate }: RunProps) {
  // roomKey wird NICHT destrukturiert und NICHT verwendet!
  const key = instanceKey('fridge')                          // ← ohne roomKey
  const d = readDraft(key)
  const lastResult = useMeasurementsStore((s) => s.results['fridge'])  // ← fester Schlüssel
  const previous = lastResult && lastResult.rating !== 'good' ? lastResult : undefined
  ...
```

Zum Vergleich: `FreezerRun.tsx` (derselbe Ordner-übergreifende Mechanismus,
`docs/gefrierschrank-check.md` Abschnitt 9) destrukturiert `roomKey` korrekt
und bildet den Entwurfs-Schlüssel daraus: `const key = instanceKey('freezer',
roomKey)`. `FridgeRun` tut das nicht.

**Zwei konkrete Auswirkungen bei mehr als einem Kühlschrank:**

1. **Entwurf-Kollision.** Beginnt man, die Temperatur für Kühlschrank A
   einzugeben, verlässt den Check und beginnt später Kühlschrank B, liest
   `readDraft(key)` in `FridgeRun` **denselben** Entwurfs-Schlüssel
   (`'fridge'`, ohne Geräte-ID) – Kühlschrank B startet mit dem
   liegengebliebenen Zwischenstand von Kühlschrank A vorbelegt, statt mit dem
   Standardwert 5 °C. Der übergeordnete `MeasurementRunner` prüft an anderer
   Stelle korrekt `instanceKey(id, roomKey)`, um zu wissen, ob **überhaupt**
   ein Entwurf vorliegt (`hasDraft`) – aber `FridgeRun` selbst liest unter dem
   falschen (zu kurzen) Schlüssel.
2. **Der Folgemessungs-Hinweis feuert praktisch nie für aktuelle
   Mehrgeräte-Profile.** `lastResult = results['fridge']` sucht nach einem
   Ergebnis unter dem **nackten** Schlüssel – das existiert bei
   `perAppliance`-Messungen nur noch als **Altergebnis** aus der Zeit vor
   Etappe 12b (ein Haushalt mit genau einem Kühlschrank, gemessen vor der
   Geräte-Unterscheidung). Ein Haushalt, der heute über die Geräteauswahl zwei
   (oder auch nur ein neu angelegtes) Gerät misst, speichert sein Ergebnis
   unter `fridge@<geräte-id>` – **`lastResult` findet es nie**, egal wie
   schlecht die letzte Messung war. Damit:
   - erscheint der Hinweis „Deine letzte Messung war bei X °C (zu kalt) …" in
     `FridgeRun` nicht, wenn er eigentlich sollte,
   - bleibt `FridgeResult`s Vorher/Nachher-Karte (Abschnitt 4) ebenso aus – sie
     hängt an genau demselben Muster (`stored = results['fridge']`,
     `storedBefore = previousResults['fridge']`, Zeilen 61–64 in
     `FridgeResult.tsx`),
   - und die gesamte Erzähllinie „miss, stell wärmer, miss erneut, sieh die
     Ersparnis" – für die `fridgeChange()` extra existiert – **lässt sich mit
     einem individuell benannten oder zweiten Kühlschrank praktisch nicht mehr
     auslösen.**

**Was davon nicht betroffen ist:** Der **generische** Folgemessungs-Hinweis in
der unteren Navigation/Messungsliste (`followUps.ts`, `pendingFollowUps()`)
iteriert korrekt über `applianceKeys(results, 'fridge', appliances)` und
funktioniert je Gerät richtig – nur der Hinweis **innerhalb** des Checks
selbst (in `FridgeRun`/`FridgeResult`) ist betroffen. Ebenso unbetroffen: die
**gespeicherten Ergebnisse** selbst (korrekt keyed durch den Runner) und die
**Tipps** aus `buildTips.ts` (lesen `results` direkt über `entriesForId()`,
nicht über den hartkodierten Schlüssel).

**Nicht behoben, nur dokumentiert** – dies ist eine Beobachtung dieser
Session, keine vorherige Rückfrage aus `docs/gefundene-probleme.md`. Der
naheliegende Fix: `FridgeRun` müsste `roomKey` aus `RunProps` destrukturieren
und sowohl den Entwurfs-Schlüssel (`instanceKey('fridge', roomKey)`) als auch
die Vorher-Suche (`results[instanceKey('fridge', roomKey)]`) danach bilden –
analog zu `FreezerRun`. `FridgeResult` bräuchte dieselbe Korrektur für seine
`stored`/`storedBefore`-Lookups (dort ließe sich `result.roomKey` verwenden,
das im Ergebnis selbst bereits korrekt steht).

---

## 7. Was das Ergebnis speichert

`MeasurementResult.details` (nur Zahlen, siehe `CLAUDE.md`):

| Schlüssel | Inhalt |
|---|---|
| `savingPct` | Sparpotenzial als Anteil (0,06 = 6 %), nur > 0 bei „zu kalt" |

`primaryValue` = die gemessene Temperatur, `unit` = `'°C'`. `roomKey` trägt
die Geräte-ID (korrekt vom `MeasurementRunner` angehängt, Abschnitt 6).

**Das Demo-Profil weicht davon vollständig ab.** `demoProfile.ts` trägt für
`fridge`: `unit: 'kWh/Tag'`, `details: { kwhPerDay: 0.82, watts: 34 }` –
weder `primaryValue` noch `unit` noch `details` entsprechen dem aktuellen
Format. Das sieht nach einem **noch älteren** Format aus als selbst die
„früher gab es eine echte Strommessung"-Ära in Abschnitt 3 – vermutlich ein
Rest aus einer Zeit, in der der Check den Tagesverbrauch in kWh direkt maß,
nicht die Temperatur. Ungetestet: `tests/unit/profileReport.test.ts` prüft
das Demo-Profil nur für den PDF-Steckbrief, nicht für die
Mess-Ergebnis-Darstellung selbst. Nur notiert, nicht geändert (Abschnitt 12).

---

## 8. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | `rooms: ['kitchen', 'basement']`, `difficulty 2`, 10 min, Kategorie `electricity`, `perAppliance: true`, `instruments: [{ temperature_sensor, required: true }]`. **Kein `yieldsSaving`** – derselbe Kommentar wie beim Möbelabstand-Check nennt `fridge` als Beispiel für „qualitativer Befund" (Abschnitt 9). |
| `measurements/registry.ts` | Verdrahtet `GatedFridgeRun` (nicht `FridgeRun` direkt) |
| `measurements/ApplianceGate.tsx` | Die Gerätefrage vor dem Check – identischer Mechanismus wie beim Gefrierschrank-Check (`KINDS.fridge = ['fridge', 'fridge_freezer']`) |
| `measurements/ApplianceChooser.tsx` | Geräteauswahl bei mehr als einem Kühlschrank |
| `measurements/progress.ts` | `applianceResult()`, `countingAppliances()` – Fortschritt je Gerät, Altergebnis-Vererbung ans erste Gerät (identisch zum Gefrierschrank-Check) |
| `measurements/followUps.ts` | Der **generische**, korrekt geräteweise funktionierende Folgemessungs-Hinweis (`for (const key of applianceKeys(results, 'fridge', appliances)) { if (result.rating !== 'good') … }`) – **nicht** betroffen vom Bug in Abschnitt 6 |
| `measurements/ambientTemperature.ts` / `AmbientNote.tsx` | Umgebungstemperatur aus dem Raumklima-Check desselben Raums – geteilt mit dem Gefrierschrank-Check, ausführlich in `docs/gefrierschrank-check.md` Abschnitt 7 |
| `education/measurementThresholds.ts` | Temperatur-Tabelle unter Alias importiert (`FRIDGE_GOOD_MIN` usw.) – **mit den in Abschnitt 2.1 beschriebenen Lücken** |
| `education/educationContent.ts` | Mess-Hintergrund „Kühlschrank" – Wirkung, Fehler beim Messen (zu früh ablesen, warme Einkäufe, Stufenanzeige statt Thermometer) |
| `tips/buildTips.ts` | **Zwei** Tipps je Gerät möglich: „zu kalt → wärmer stellen" (`FRIDGE_COLD_C = 5`) und „zu warm → kälter stellen" (`FRIDGE_WARM_C = 7`) – unabhängig voneinander über `perAppliance()`, kein Euro-Betrag (derselbe Grund wie in Abschnitt 3); Kommentar im Code erwähnt explizit toten Restcode, der früher `yearlySaving` aus Altergebnissen addierte |
| `reports/measurementsReportData.ts` | Feste Einheit `'°C'` |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis in **veraltetem Format** (Abschnitt 7) |
| `store/measurementDraftStore` | Persistiert die laufende Eingabe – **unter falschem Schlüssel bei mehreren Geräten** (Abschnitt 6) |
| `store/measurementsStore` | Liefert `results`/`previousResults` – **unter falschem Schlüssel abgefragt** in `FridgeRun`/`FridgeResult` (Abschnitt 6) |
| `store/onboardingStore` | Liefert `appliances` für `ambientFor` und die Gerätefrage |

---

## 9. `yieldsSaving` bleibt ungesetzt – derselbe Grund wie beim Möbelabstand-Check

Anders als der Gefrierschrank-Check (der `yieldsSaving: true` trägt, um alte
echte Messungen weiter zählen zu lassen – `docs/gefrierschrank-check.md`
Abschnitt 11) hat der Kühlschrank-Check **kein** `yieldsSaving` im Katalog.
Der Kommentar in `catalog.ts` führt `fridge` gemeinsam mit
`furniture_spacing` als Beispiel für „qualitativer Befund" auf. Das ist
konsistent mit dem Rest dieses Checks: Es gibt keine Altergebnis-Ära mit
einem echten `avoidableCost`-Feld, das hier zurückgehalten werden müsste –
`savingPct` war schon vor dem Umbau ein Prozentwert, nie ein Euro-Betrag im
`details`-Objekt.

---

## 10. Was die Tests festhalten

| Datei | Prüft |
|---|---|
| `tests/unit/fridge.test.ts` | `rateFridge`/`fridgeStatus`-Bandgrenzen (aber **nicht** die Zwischenwerte 3,5 °C/7,5 °C aus Abschnitt 2.1), `calcFridgeSaving` (kein Potenzial bei „optimal", Hochrechnung bei „zu kalt", kein Potenzial bei „zu warm", Gleichlauf mit der Tipp-Schwelle), `fridgeChange` (Erwärmung gedeckelt bei der Empfehlung, keine Anrechnung über die Empfehlung hinaus, kein „Sparen" bei Kälterstellen) |
| `tests/unit/appliances.test.ts` | `applianceInstances`, `hasAppliance` – geteilt mit dem Gefrierschrank-Check |
| `tests/unit/applianceProgress.test.ts` | Fortschritt je Gerät, Altergebnis-Vererbung ans erste Gerät |
| `tests/unit/measurementProgress.test.ts` | Fortschritt insgesamt |
| `tests/unit/buildTips.test.ts` | Die beiden abgeleiteten Tipps (zu kalt/zu warm) je Gerät |
| `tests/unit/thresholdReference.test.ts` | Die Temperatur-Tabelle im Wissensbereich (prüft Struktur, nicht die in Abschnitt 2.1 beschriebene Lückenhaftigkeit) |
| `tests/unit/measurementsReportData.test.ts` | Berichts-Aufbereitung |

**Keine Tests für `FridgeRun`/`FridgeResult` als Komponenten** – der Bug aus
Abschnitt 6 liegt vollständig außerhalb dessen, was `fridge.test.ts` prüft
(reine Logik in `fridge.ts`, nicht die Schlüsselbildung in den React-Dateien).
Kein Test legt zwei Kühlschränke an und prüft, ob der Entwurf oder der
Folgemessungs-Hinweis pro Gerät getrennt bleibt.

---

## 11. Entscheidungen, die schon gefallen sind

1. **Kein Euro-Betrag.** Ein angenommener Jahresverbrauch mal ein angenommener
   Strompreis ist Scheingenauigkeit – der Prozentwert sagt dasselbe ehrlicher.
2. **Sparpotenzial nur bei „zu kalt", nicht mehr pauschal bis 7 °C
   hochgerechnet** (Punkt 16, behoben) – Ampel und Status dürfen sich nicht
   widersprechen.
3. **Derselbe Check dient Diagnose und Nachweis**, ohne eigenen Umschalter –
   ob eine Messung eine Folgemessung ist, entscheidet sich daran, ob die
   vorherige Messung nicht gut war (in der Absicht, nicht in der aktuellen
   Umsetzung – Abschnitt 6).
4. **`fridgeChange` deckelt die angerechnete Erwärmung bei der Empfehlung** –
   wer über 7 °C hinaus wärmer stellt, bekommt dafür kein zusätzliches
   Sparpotenzial gutgeschrieben.
5. **Kein `yieldsSaving`** – es gibt keine Altergebnis-Ära mit echtem
   Euro-Betrag, die hier zurückzuhalten wäre.

---

## 12. Was offen ist

**Neu bei dieser Durchsicht gefunden, nicht in `docs/gefundene-probleme.md`:**

- **Der Bug aus Abschnitt 6** – `FridgeRun`/`FridgeResult` verwenden bei
  mehreren Kühlschränken einen zu kurzen, geräteübergreifenden Schlüssel für
  Entwurf und Vorher-Suche, obwohl das gespeicherte Ergebnis selbst korrekt
  je Gerät abgelegt wird. Das ist der bedeutendste Fund dieser Datei –
  Kilian sollte entscheiden, ob das ein Fix-jetzt oder ein
  Sammellisten-Eintrag wird.
- **Die Richtwert-Tabelle im Wissensbereich hat zwei unbenannte Bänder**
  (3–5 °C, 7–8 °C – Abschnitt 2.1), in denen `rateFridge` bereits `medium`
  liefert, ohne dass die Tabelle das zeigt.
- **Das Demo-Profil für `fridge` ist in einem veralteten Format**
  (`kwhPerDay`/`watts`/`'kWh/Tag'` statt Temperatur in `°C`, Abschnitt 7) –
  ungetestet, weil `profileReport.test.ts` nur den PDF-Steckbrief prüft.

**Bereits bekannt, nur zur Einordnung erwähnt:** Punkt 37 in
`docs/gefundene-probleme.md` (doppelte Wertanzeige im `Stepper`, „Kühlschrank,
Raumklima und Möbelabstand") nennt den Kühlschrank-Check explizit als einen
von drei Orten, an denen `showValue={false}` noch nicht gesetzt ist – bewusst
zurückgestellt, siehe „Offene Fragen" dort.

---

## 13. Wenn du etwas änderst

1. **Den Bug aus Abschnitt 6 beheben** → `roomKey` in `FridgeRun` aus
   `RunProps` destrukturieren, Entwurfs- und Vorher-Schlüssel danach bilden
   (`instanceKey('fridge', roomKey)`); in `FridgeResult` denselben Schlüssel
   über `result.roomKey` bilden statt der hartkodierten `'fridge'`. Danach
   einen Test ergänzen, der zwei Kühlschränke anlegt und prüft, dass Entwurf
   und Folgemessungs-Hinweis getrennt bleiben – es gibt aktuell keinen.
2. **Eine Bewertungsschwelle ändern** → nur `fridge.ts`. Prüfen, ob die
   Richtwert-Tabelle im Wissensbereich danach noch lückenhafter oder gerade
   vollständiger wird (Abschnitt 2.1) – ein guter Anlass, die Tabelle gleich
   mit zu überarbeiten.
3. **Das Demo-Profil korrigieren** → `demoProfile.ts`, `fridge`-Eintrag auf
   `primaryValue` = Temperatur, `unit: '°C'`, `details: { savingPct }`
   umstellen (Abschnitt 7).
4. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte: `docs/gefundene-probleme.md`, Punkt 16 (der
behobene Ampel/Status-Widerspruch) und Punkt 37 (offene Frage zur doppelten
Wertanzeige). Der Bug aus Abschnitt 6 ist in keiner bestehenden Datei
dokumentiert – diese Datei ist seine erste Erwähnung.
