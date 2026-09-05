# LED-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er erhebt, warum
> er keine Rechnung mehr macht, was ihn außerhalb seines Ordners berührt,
> welche Entscheidungen bereits gefallen sind – samt Begründung, damit niemand
> sie versehentlich rückgängig macht – und was beim Schreiben dieser Datei
> auffiel.

---

## 1. Was der Check tut

Ein Rundgang durch die Wohnung, **ein Schirm für alle Räume** – anders als die
raumweisen Checks (Raumklima, Möbelabstand). Je Raum genau eine Frage: „Hängt
hier noch mindestens eine Lampe, die keine LED ist?", Antwort `old` oder `led`.

Kein Zählen, keine Brenndauer-Abfrage, kein Euro-Betrag. Das Argument fürs
Umrüsten (LED braucht ~80–90 % weniger Strom bei gleicher Helligkeit) steht als
Text über der Raumliste, weil es für jeden Haushalt gleich gilt und keine
Eingabe braucht.

**Die Reihenfolge des Tauschs ist die eigentliche Leistung des Checks** – und
sie kostet den Nutzer keine einzige zusätzliche Eingabe. Sie folgt allein aus
dem Raumtyp: Wo Licht typischerweise am längsten brennt (Küche, Wohnzimmer,
Büro), lohnt der Tausch zuerst.

**Messgeräte:** keine. `instruments: []` im Katalog.

**Kein `yieldsSaving`.** Der Check rechnet bewusst keinen Euro-Betrag mehr
(Abschnitt 3). Der Eintrag im Katalog ist zugleich der Riegel, der ein
Altergebnis mit gespeichertem `yearlySaving` aus Wirkungs-Summe und Bericht
heraushält (Abschnitt 8).

---

## 2. Kein `Intro`, keine `context.ts`

Anders als Möbelabstand oder Duschkopf hat der LED-Check **keinen eigenen
Intro-Schirm**. Die Erklärung („Warum sich der Tausch lohnt") steht als erste
Karte direkt im Run-Schirm – die Registry vermerkt das ausdrücklich:

```ts
lighting: {
  // Ohne Intro: die Erklärung steht über der Raumliste im Run-Schirm.
  Run: LightingRun,
  Result: LightingResult,
},
```

Es gibt auch **keine `context.ts`**: Der Check verknüpft sich mit keiner
anderen Messung im selben Raum (anders als Möbelabstand mit dem Raumklima-
Check). Der Grund liegt im Zuschnitt selbst – es gibt keinen zweiten Wert, der
mit „hängt hier noch eine alte Lampe?" zusammen eine neue Aussage ergäbe.

---

## 3. Warum es keine Rechnung mehr gibt

Ein früherer Stand zählte Lampen je Typ, fragte die Brenndauer ab und rechnete
daraus einen Euro-Betrag. Das Problem: Von den Größen dieser Rechnung waren
**nur zwei** Nutzereingaben (Lampenzahl, Brenndauer) – Wattdifferenz,
LED-Preis und Amortisationszeit waren Konstanten. Verrechnet man Konstanten mit
zwei geschätzten Eingaben, entsteht kein persönliches Ergebnis, sondern eine
Tabelle mit Nutzerdaten als Dekoration – und der ganze Aufwand, diese Zahl
gegen ihre eigene Unsicherheit abzusichern.

Der Check erhebt seither nur noch, was der Nutzer **wirklich weiß**: in
welchen Räumen noch alte Lampen hängen. Die Rangfolge des Tauschs ersetzt die
frühere Brenndauer-Abfrage – sie steckt schon im Raumtyp (`ROOM_PRIORITY`),
nicht in einer Schätzung.

**Kein Archiv.** Anders als beim Duschkopf-Umbau (`archiv/duschkopf-warmwasserquelle/`)
gibt es für die alte Zähl-Fassung keinen archivierten Code – sie wurde ersetzt,
nicht stillgelegt. Was von ihr blieb, ist die Altdaten-Behandlung in
Abschnitt 8.

---

## 4. Die Priorität je Raumtyp

`ROOM_PRIORITY` in `lighting.ts`, drei Stufen:

| Priorität | Raumtypen | Begründung |
|---|---|---|
| **3** (viel Licht) | `living_room`, `kitchen`, `office` | Dort brennt Licht typischerweise am längsten |
| **2** (mittel) | `dining_room`, `children_room`, `bedroom`, `bathroom`, `hallway` | |
| **1** (selten Licht) | `toilet`, `utility_room`, `basement`, `staircase`, `attic` | Nebenräume, kurze Nutzung |

`roomPriority(type)` fällt für einen unbekannten Raumtyp auf `1` zurück
(`ROOM_PRIORITY[type] ?? 1`).

**Keine Quelle, keine Zahl im eigentlichen Sinn.** Der Wissensbereich markiert
das explizit als `origin: own(...)`: „Keine Messgrenze, sondern eine
Gewichtung … bewusst grob – eine feinere Skala täuschte eine Genauigkeit vor,
die die Frage „ist da noch alte Beleuchtung?" nicht hergibt." Es gibt hier
also **keinen** `ThresholdOrigin: 'pending'` zu klären – die Gewichtung ist als
Setzung der App deklariert, nicht als offener Beleg.

---

## 5. Die Bewertung

```
rateLighting(rooms, openKeys):
  score = Summe von roomPriority(type) über alle offenen Räume

  score === 0        → good     „Alles auf LED"
  score <= 2          → medium   „Wenig offen"
  score <= 5          → elevated „Spürbar offen"
  sonst               → high     „Viel offen"
```

**Gewicht statt bloßer Anzahl** – das ist der Kern: Vier Kellerräume (Gewicht
1 × 4 = 4) wiegen weniger als eine einzelne Küche (Gewicht 3) plus ein
Wohnzimmer (Gewicht 3) = 6. Ein Test hält fest, dass der Score monoton steigt,
wenn Räume hinzukommen.

Die Schwellen `<= 2` / `<= 5` sind keine eigenen Konstanten (anders als bei
Möbelabstand oder Duschkopf), sondern direkt im Code der einzigen Funktion, die
sie braucht.

---

## 6. Die Dateien

```
src/features/measurements/lighting/
├── lighting.ts          106 Z. – reine Fachlogik, kein React
├── LightingRun.tsx       176 Z. – ein Schirm für die ganze Wohnung
└── LightingResult.tsx     96 Z. – Rangliste statt Rechnung
```

Kein `Intro.tsx`, keine `context.ts` (Abschnitt 2). `lighting.ts` ist reine
Funktion ohne React-Import, deshalb direkt testbar und deshalb dürfen
`measurementThresholds.ts`, `resultValue.ts`, `buildTips.ts` und
`measurementsStore.ts` daraus importieren, ohne eine Komponente mitzuziehen.

### Der Run-Schirm

Drei Karten von oben nach unten:
1. **Warum sich der Tausch lohnt** – Fließtext + Knopf „Woran erkenne ich eine
   LED?" (Modal mit vier Erkennungsmerkmalen: wird sie heiß, leuchtet sie
   sofort voll hell, braucht sie Sekunden, sichtbarer Glühdraht).
2. **Die Raumliste** – je Raum zwei Knöpfe (`old` / `led`). Ohne angelegte
   Räume steht dort der geteilte Leerlauf-Hinweis
   (`measurements.roomPicker.emptyHint`) statt einer stillen leeren Liste –
   das traf jeden Schnellstart-Nutzer, bevor der Hinweis da war. Am Ende der
   Liste ein Knopf, neue Räume über `RoomCreateSheet` anzulegen, ohne den
   Check zu verlassen.
3. **Fortschritt** – „x von y Räumen beantwortet", Häkchen bei Vollständigkeit.

Auswerten lässt sich schon ab **einer** beantworteten Frage (`disabled={answered
=== 0}`) – der Check verlangt keine vollständige Antwort über alle Räume, um
ein Ergebnis abzugeben.

### Der Ergebnis-Schirm

Zwei Zustände:
- **Alles auf LED** (`ranked.length === 0`): eigener kurzer Erfolgs-Schirm mit
  `ResultHero rating="good"` (fest verdrahtet, nicht `result.rating`) und dem
  Hinweis, beim Nachkaufen weiter auf LED zu achten.
- **Offene Räume**: `ResultHero` mit `result.rating`, darunter eine
  **nummerierte** Liste – wichtigster Raum zuerst, mit Prioritäts-Etikett
  („viel Licht" / „mittel" / „selten Licht"). Bewusst **ohne große Zahl** als
  Hauptwert: „Die Anzahl steht schon in der nummerierten Liste darunter, und
  die Reihenfolge ist das Ergebnis – nicht ihre Länge" (Kommentar im Code).
  Ein Knopf „Beim Kauf beachten" öffnet ein Modal mit Fassung/Kelvin/Lumen –
  bewusst hinter einem Knopf, nicht zwischen Ergebnis und „Speichern", weil man
  das erst im Laden braucht.

---

## 7. Was das Ergebnis speichert

`MeasurementResult.details` (nur Zahlen, siehe `CLAUDE.md`):

| Schlüssel | Inhalt |
|---|---|
| `room:<roomKey>` | `1` = noch alte Lampen, `0` = alles LED, je beantwortetem Raum |
| `openRooms` | Anzahl der Räume mit `old` |
| `checkedRooms` | Anzahl der beantworteten Räume (auch `led`-Antworten zählen mit) |

`primaryValue` = `openRooms`, `unit` = `''` **im gespeicherten Ergebnis** – die
tatsächliche Einheit („Raum"/„Räume") entsteht erst bei der Anzeige
(Abschnitt 9), damit sie der Sprache folgt und ihre Pluralform bekommt.

**Kein `roomKey` am Ergebnis selbst** – anders als bei `perRoom`-Messungen trägt
dieses eine Ergebnis für die ganze Wohnung keinen Raumbezug auf oberster Ebene;
die Räume stecken in den `room:*`-Schlüsseln der `details`.

### Migrationsriegel statt Migration

`isCurrentLightingResult(details)` prüft `details?.checkedRooms !== undefined`.
Ergebnisse der **früheren Zähl-Fassung** trugen `totalBulbs` statt
`checkedRooms` und außerdem **ein Ergebnis je Raum**
(`lighting@wohnzimmer#0`) statt eines einzigen für die Wohnung. Ohne diese
Prüfung läse der Ergebnis-Schirm dort „0 offene Räume" und meldete fälschlich
„alles auf LED".

Anders als bei Möbelabstand oder Duschkopf reicht ein reiner
Format-Umschalter im Lesecode hier **nicht**: Der `measurementsStore`
entfernt solche Altergebnisse aktiv beim Laden (`dropLegacyResults`,
`store/measurementsStore.ts`) – weil sie nicht nur ein anderes Feld tragen,
sondern unter einem anderen Schlüssel (`lighting@<room>` statt `lighting`)
liegen und dort für immer ungelesen stehen blieben. Der Store filtert sie beim
Hydrieren aus `results` heraus; `buildTips.ts` und `measurementsReportData.ts`
prüfen zusätzlich selbst mit `isCurrentLightingResult`, weil sie auch
`previousResults` und rohe Store-Daten lesen können, die den Store-Filter nicht
durchlaufen haben.

---

## 8. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | Katalogeintrag: `wholeHome: true`, `difficulty 1`, 2 min, Kategorie `electricity`, `instruments: []`. Kein `yieldsSaving` – Kommentar dort nennt den LED-Check ausdrücklich als Beispiel: „Schafft ein Check seine Euro-Rechnung ab – wie der LED-Check es getan hat –, trüge ein Altergebnis den Betrag sonst weiter durch Bericht und Summe." |
| `measurements/impact.ts` | `resultSavingsEur()` ist der eine Ort, an dem der Riegel wirkt: `if (!getMeasurementMeta(result.id)?.yieldsSaving) return 0`. Der Kommentar dort hält sogar den konkreten Vorfall fest, den das verhinderte: „Genau so stand auf einer Berichtskarte einmal „0 Räume · Sehr gut · Sparpotenzial 45 €"." |
| `measurements/registry.ts` | Verdrahtung ohne `Intro` (Abschnitt 2) |
| `measurements/resultValue.ts` | `UNIT_I18N_KEY.lighting = 'measurements.lighting.unit'` – die einzige Messung mit **Wort-Einheit** statt physikalischer Einheit. `hasWordUnit()` erkennt sie, `resultUnitLabel()` löst sie mit `count: primaryValue` auf und **ignoriert bewusst** eine im Ergebnis gespeicherte Einheit – ältere Ergebnisse können dort noch einen unaufgelösten Schlüssel stehen haben. |
| `store/measurementsStore.ts` | `dropLegacyResults()` – entfernt alte `lighting@<room>`-Ergebnisse beim Hydrieren (Abschnitt 7) |
| `education/measurementThresholds.ts` | Eigene Tabelle ohne physikalische Einheit: „Gewicht der Räume mit alter Beleuchtung", vier Stufen nach Score, `origin: own(...)`. **Siehe die widersprüchliche Restnotiz in Abschnitt 11.** |
| `education/educationContent.ts` | Mess-Hintergrund „Beleuchtung" – Wirkung, Fehler, FAQ |
| `tips/buildTips.ts` | Filtert zuerst mit `isCurrentLightingResult`, dann `rankOpenRooms()` für den ersten (wichtigsten) offenen Raum. Tipp trägt `effortMinutes: 20`, **`costEur: 25`** (Anschaffung, keine Ersparnis) und `params: { count }` für die Text-Interpolation. |
| `reports/measurementsReportData.ts` | Rückfalleinheit `'Räume'`, falls keine im Ergebnis steht |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis für die ganze Wohnung, korrekt im aktuellen Format (`checkedRooms`/`openRooms`/`room:*`) |

**Nicht berührt:** `instrumentNeeds.ts` – der Check braucht keine Geräte, also
keine Zeile in der Geräte-Übersicht.

---

## 9. Die Wort-Einheit – eine Besonderheit dieses Checks

Jede andere Messung trägt eine feste Einheit (`°C`, `L/min`, `cm`, …). Der
LED-Check ist die einzige mit einer **Einheit aus Wörtern mit Pluralform**
(„Raum" / „Räume"). Das lässt sich nicht als String im Ergebnis speichern,
ohne die Übersetzung und die Grammatik-Regel (Singular/Plural je nach Zahl) zu
verlieren – deshalb der eigene Mechanismus in `resultValue.ts`:

```
UNIT_I18N_KEY = { lighting: 'measurements.lighting.unit' }
hasWordUnit(id)        → true nur für lighting
resultUnitLabel(t, r)  → t(key, { count: r.primaryValue })  // löst Singular/Plural
```

Wer eine weitere Messung mit Wort-Einheit einführt, trägt sie hier ein – nicht
im Katalog und nicht in der Komponente.

---

## 10. Was die Tests festhalten

`tests/unit/lighting.test.ts` (einzige eigene Testdatei):

| Bereich | Prüft |
|---|---|
| `lightingDetails` / `openRoomKeys` | Antworten je Raum, unbeantwortete Räume zählen nicht mit, leere Antworten funktionieren |
| Reihenfolge des Tauschs | folgt allein dem Raumtyp, nennt nur gemeldete offene Räume, ignoriert Schlüssel ohne zugehörigen Raum im Profil, jeder Raumtyp hat eine Priorität, Wohnräume wiegen mehr als Nebenräume |
| `rateLighting` | „fertig" bei nichts offen, Gewicht statt bloßer Anzahl, **Monotonie** beim Hinzufügen von Räumen |
| Altdaten | frühere Zähl-Fassung wird als ungültig erkannt, aktuelle bleibt unangetastet |
| Plural-Interpolation | `count` bleibt eine Zahl, sonst wählt i18next keine Pluralform |
| Texte | alle Schlüssel in beiden Sprachen vorhanden |
| Anzeige des Hauptwerts | ganze Zahlen ohne „,0"; `hasWordUnit('lighting') === true`, `hasWordUnit('base_load') === false`; eine gespeicherte Wort-Einheit aus älteren Daten wird ignoriert |

Verstreut in weiteren Testdateien:

| Datei | Was sie über `lighting` prüft |
|---|---|
| `tests/unit/impact.test.ts` | Ein `yearlySaving` im Detail-Objekt eines `lighting`-Ergebnisses zählt **nicht** in die Wirkungs-Summe – der Riegel aus Abschnitt 1 wirkt |
| `tests/unit/remeasure.test.ts` | `lighting` löst (wie erwartet) keine „erneut messen"-Aufforderung aus |
| `tests/unit/thresholdReference.test.ts` | Die Richtwert-Tabelle im Wissensbereich |
| `tests/unit/measurementsReportData.test.ts` | Berichts-Aufbereitung |
| `tests/unit/instrumentNeeds.test.ts` | Leeres `instruments`-Array ist eine gültige, geprüfte Aussage |

---

## 11. Entscheidungen, die schon gefallen sind

1. **Kein €-Betrag im Ergebnis.** Die frühere Rechnung verrechnete Konstanten
   mit zwei geschätzten Eingaben – kein persönliches Ergebnis, sondern
   Scheingenauigkeit. Siehe Abschnitt 3.
2. **`yieldsSaving` bleibt im Katalog ungesetzt**, damit ein vor dem Umbau
   gespeichertes `yearlySaving` nicht über `resultSavingsEur` zurück in
   Wirkungs-Summe und Bericht kommt. Derselbe Riegel wurde später für den
   Duschkopf-Umbau übernommen (`docs/gefundene-probleme.md`, Punkt 36–37).
3. **Die Rangfolge ersetzt die Brenndauer-Frage vollständig** – sie steckt im
   Raumtyp, nicht in einer Nutzereingabe. Eine feinere, nutzerabhängige
   Brenndauer-Schätzung wäre dieselbe Scheingenauigkeit wie die alte Rechnung.
4. **Die Gewichte in `ROOM_PRIORITY` sind bewusst grob** (drei Stufen) und als
   `ThresholdOrigin: 'own'` deklariert, nicht als offene Quellenfrage. Eine
   feinere Skala würde eine Genauigkeit vortäuschen, die die Frage „ist da noch
   alte Beleuchtung?" nicht hergibt.
5. **Der Tipp trägt trotzdem einen Euro-Betrag** (`costEur: 25` in
   `buildTips.ts`) – das ist die **Anschaffungskosten-Schätzung** für
   Ersatz-LEDs, keine Ersparnis-Rechnung. Widerspricht Entscheidung 1 nicht:
   Der Check selbst rechnet nichts, der Tipp-Text nennt nur einen groben
   Richtpreis fürs Nachkaufen.
6. **Der „Alles auf LED"-Zustand hat einen eigenen, festen `ResultHero`**
   (`rating="good"` fest verdrahtet statt `result.rating` zu lesen). Das ist
   konsistent, weil `rateLighting()` in diesem Fall ohnehin immer `good`
   liefert (`score === 0`) – aber es bedeutet, dass dieser Zweig nicht über die
   Rating-Logik läuft, sondern eigenständig prüft `ranked.length === 0`.

---

## 12. Was offen ist

Kein Eintrag zum LED-Check steht in `docs/gefundene-probleme.md` – der Umbau
weg von der Euro-Rechnung war Teil der Verbesserungsliste, aber ohne offene
Rückfrage.

**Beim Schreiben dieser Datei aufgefallen** – nicht geändert, nur notiert:

- **`result.summary.good/medium/elevated/high` in den Locales ist tot.**
  `LightingResult.tsx` ruft nur `t('measurements.lighting.result.summary',
  {count, room})` auf – i18next löst das über die Pluralformen
  `summary_one`/`summary_other` auf, nicht über das verschachtelte
  `summary.<rating>`-Objekt. Die vier Rating-Texte (u. a. „In vielen und stark
  genutzten Räumen hängen noch alte Lampen – hier liegt das größte, am
  schnellsten hebbare Sparpotenzial.") werden nirgends gelesen. Weder Code noch
  Test verweisen auf `summary.<rating>` – nur auf `summary_one`/`_other`.
- **Ein widersprüchlicher Rest-Kommentar in `measurementThresholds.ts`.**
  Direkt vor dem `lighting`-Eintrag steht der Kommentar „Der LED-Check misst
  keine Größe … die Tabelle sagt stattdessen, wie gewichtet wird" (korrekt –
  die Tabelle folgt). Direkt **danach**, außerhalb des Objekts, steht aber noch
  ein zweiter, gegenteiliger Kommentar: „`lighting` bekommt bewusst keine
  Tabelle: … dafür gibt es keine Messgröße mit Schwellen, nur einen Befund."
  Das widerspricht der Tabelle, die drei Zeilen darüber tatsächlich existiert –
  vermutlich ein Rest aus einer früheren Version, bevor die Gewichtstabelle
  ergänzt wurde, der beim Ergänzen nicht entfernt wurde.

---

## 13. Wenn du etwas änderst

1. **Eine Priorität ändern** → nur `ROOM_PRIORITY` in `lighting.ts`. Der
   Wissensbereich beschreibt die Gewichtung nur in Prosa (keine Zahl
   importiert), also von Hand nachziehen, falls sich die Größenordnung ändert.
2. **Die Ampelschwellen ändern** (`<= 2`, `<= 5` in `rateLighting`) → dieselbe
   Datei; die Tabelle in `measurementThresholds.ts` nennt die Schwellen als
   Text („bis Gewicht 2", „bis Gewicht 5") – von Hand nachziehen.
3. **Eine weitere Messung mit Wort-Einheit einführen** → in
   `resultValue.ts` (`UNIT_I18N_KEY`), nicht im Katalog.
4. **Einen Euro-Betrag wieder einführen** → dann `yieldsSaving: true` im
   Katalog setzen, `resultSavingsEur` und die Wirkungs-Summe prüfen, und
   Abschnitt 1/3 dieser Datei widerlegen. Ohne belastbare Kostenbasis nicht.
5. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte: Der Umbau selbst liegt vor dem aktuellen
Etappen-Tracking und hat keinen eigenen Punkt in
`docs/gefundene-probleme.md`; der Riegel-Mechanismus (`yieldsSaving`) wird dort
unter Punkt 36–37 (Duschkopf-Umbau) noch einmal erklärt, weil er dort erneut
angewendet wurde.
