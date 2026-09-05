# Duschkopf-Test – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er misst, warum er
> so rechnet, was ihn außerhalb seines Ordners berührt, und welche
> Entscheidungen bereits gefallen sind – samt Begründung, damit niemand sie
> versehentlich rückgängig macht.

---

## 1. Was der Check tut

Der Nutzer hält ein Gefäß bekannten Volumens (Standard 5 L) unter den
Duschkopf und stoppt die Zeit, bis es voll ist. Daraus:

```
Durchfluss [L/min] = Liter ÷ Sekunden × 60
```

Gerundet auf eine Nachkommastelle. Das ist der `primaryValue` des Ergebnisses,
Einheit `L/min`.

**Messgeräte:** keine. `instruments: []` im Katalog – die Stoppuhr bringt die
App mit, der Messbecher ist Haushaltsgerät. Das ist die gültige Aussage
„braucht keins", kein vergessener Eintrag.

---

## 2. Die Zahlen und wo sie stehen

Alle in `src/features/measurements/showerhead/showerhead.ts`. **Nirgends
sonst.** Wer eine Grenze ändert, ändert sie dort; Wissensbereich, Bericht und
Empfehlungen importieren sie.

| Konstante | Wert | Bedeutung |
|---|---|---|
| `GOOD_MAX` | 9 L/min | bis hier „Sparsam" |
| `MEDIUM_MAX` | 12 L/min | bis hier „Mittel", darüber „Hoch" |
| `EFFICIENT_FLOW_LPM` | 8 L/min | Referenz-Sparduschkopf, gegen den gerechnet wird |
| `SHOWERS_PER_PERSON_PER_DAY` | 1 | Annahme, nur für die Jahresmenge |
| `MINUTES_PER_SHOWER` | 5 | Annahme, nur für die Jahresmenge |

**Achtung, zwei verschiedene Grenzen:** Bewertet wird gegen 9, gerechnet gegen
8. „Sparsam" heißt unter 9 L/min; ein Sparduschkopf bringt auf 8. Ein Test
(`showerheadWording.test.ts`) hält fest, dass sie verschieden bleiben.

**Herkunft:** Die Bewertungsgrenzen sind in
`src/features/education/measurementThresholds.ts` als `'reference'` markiert,
Quelle Verbraucherzentrale („Warmwasser im Alltag sparen"). Sie sind belegt –
anders als die Grundlast-, Standby- und Wartezeit-Schwellen.

---

## 3. Die Ersparnis: Prozent, kein Euro

**Das ist die wichtigste Entscheidung dieses Checks. Bitte nicht zurückdrehen,
ohne den folgenden Absatz zu widerlegen.**

```
savingPct = (Durchfluss − 8) ÷ Durchfluss
```

### Warum das mehr ist als eine Vereinfachung

Kosten **und** Wassermenge sind beide *linear* im Durchfluss. Die Kosten je
Jahr sind

```
Liter/Jahr × (Wasserpreis + ΔT × spez. Wärme × Arbeitspreis)
```

und `Liter/Jahr = Durchfluss × Personen × Duschen/Tag × Minuten/Dusche × 365`.
Bildet man das Verhältnis der Ersparnis zu den Kosten, steht der ganze rechte
Klammerausdruck **und** der ganze Nutzungsteil in Zähler und Nenner gleich –
und kürzt sich weg. Übrig bleibt allein der gemessene Durchfluss.

Der Prozentsatz ist damit die **einzige Kennzahl des Checks, in der nichts
steckt, was nicht gemessen wurde.** Er gilt gleichermaßen für die Wassermenge
und für die Energie, die dieses Wasser erwärmt – deshalb der Ergebnistext „an
Wasser und an der Energie, die es erwärmt".

Ein Test in `tests/unit/showerheadEnergy.test.ts` bindet die Eigenschaft fest:
dieselbe Messung bei einem Ein- und einem Fünf-Personen-Haushalt ergibt
denselben Prozentsatz (ein Euro-Betrag hätte um den Faktor fünf
auseinandergelegen).

### Warum der Euro-Betrag weg ist

Zwei Gründe, beide unabhängig voneinander ausreichend:

1. **Er brauchte eine Frage, die nichts entschied.** Der Check fragte vor der
   Stoppuhr nach dem Warmwasser-Energieträger, um den Arbeitspreis zu wählen.
   Nach der Rechnung oben konnte diese Antwort am Prozentsatz nie etwas
   ändern – und der Fragebogen kannte sie ohnehin schon. Kilians Beobachtung
   im Live-Test hat genau darauf gezeigt.
2. **Er lief an der eigenen Regel der App vorbei.** Der Check markiert seine
   Details mit `savingEstimated: 1`. Damit liefert `isMeasuredSaving()`
   `false`, und Empfehlungen, Wirkungs-Summe und PDF-Bericht zeigten den
   Betrag längst nicht mehr. Nur der Ergebnis-Schirm griff über
   `displaySavingEur()` direkt auf den Rohwert zu – die einzige €-Anzeige der
   App, die diesen Filter umging.

Ein Test verbietet die Rückkehr: `showerheadWording.test.ts` prüft, dass in
**keinem** Text des Checks (de und en) ein „€", „EUR" oder „Euro" vorkommt.

### Was noch Annahmen enthält

Genau eine Zahl: `litersSavedPerYear`. Sie läuft über Personen, eine Dusche pro
Person und Tag und fünf Minuten je Dusche. Sie steht deshalb **hinter** dem
Prozentsatz, kleiner und als „Hochgerechnet auf deinen Haushalt".

---

## 4. Die Dateien

```
src/features/measurements/showerhead/
├── showerhead.ts          Rechnung + Konstanten (die einzige Zahlenquelle)
├── ShowerheadIntro.tsx    Reiter „Info": Video, 1-2-3-Anleitung, Details-Modal
├── ShowerheadRun.tsx      Reiter „Messen"
└── ShowerheadResult.tsx   Reiter „Ergebnis"
```

Registriert in `measurements/registry.ts`, Metadaten in
`measurements/catalog.ts`.

### Der Mess-Schirm folgt dem Ablauf des Tuns

Reihenfolge (seit 05.09.2026, Punkt 37 der gefundenen Probleme):

1. **Stoppuhr** als einzige große Karte, mit einem Satz darüber, was zu tun
   ist. Sie ist das Messgerät – wer mit dem Eimer unter der Dusche steht,
   braucht zuerst „Start", nicht eine Einstellung.
2. **Manuelle Zeiteingabe** erscheint *erst nach dem Stoppen*, in derselben
   Karte, beschriftet „Zeit korrigieren". Vorher standen Stoppuhr und
   Eingabefeld gleichzeitig da und stellten dieselbe Frage zweimal.
3. **Füllmenge** als schmale Zeile darunter – sie bleibt fast immer bei 5 L.
   Über den gemeinsamen `Stepper` mit `step={0.1}` und `showValue={false}`.
4. **Kein ausgegrauter Knopf.** Solange nichts auszuwerten ist, steht dort ein
   Satz, was noch fehlt.

Vorbild für 2. und 4. ist der Warmwasser-Wartezeit-Check
(`hot_water_wait/HotWaterWaitRun.tsx`) – wer hier etwas ändert, schaut dort
zuerst nach, ob es die Frage schon beantwortet hat.

**Warum der gemeinsame `Stepper` und kein eigener:** Der Check hatte bis zum
05.09. vier handgebaute Knöpfe (±1, ±0,1). Die konnten das beschleunigte
Halten aus Punkt 7 nicht – das steckt nur im gemeinsamen `Stepper`. Der
bekam dafür zwei Ergänzungen: `showValue` (sonst stünde der Wert zweimal da,
einmal roh, einmal formatiert) und Rundung auf die Nachkommastellen der
Schrittweite (bei `step = 0,1` lieferte fortgesetztes Addieren sonst
5,199999999999999).

---

## 5. Was das Ergebnis speichert

```ts
details: {
  liters,               // gemessen
  seconds,              // gemessen
  savingPct,            // (Durchfluss − 8) / Durchfluss, gerundet
  litersSavedPerYear,   // hochgerechnet
  savingEstimated: 1,   // gilt den Details als Ganzes (wegen litersSavedPerYear)
}
```

**Gespeicherte Ergebnisse werden nie migriert** (siehe CLAUDE.md). Deshalb:

- Ergebnisse **vor** dem 05.09.2026 tragen `yearlyCost`, `yearlySaving` und
  `hwSource`, aber kein `savingPct`. `ShowerheadResult` rechnet den
  Prozentsatz dann aus dem gespeicherten `primaryValue` nach
  (`savingShareForFlow`), statt „0 %" zu zeigen.
- Die alten `yearlySaving`-Werte kommen **nirgends** mehr an: `yieldsSaving`
  fehlt im Katalog, und `resultSavingsEur()` liefert damit 0. Das ist derselbe
  Riegel, den der LED-Check schon nutzt – ohne ihn stünde auf einer
  Berichtskarte irgendwann „Sehr gut · Sparpotenzial 45 €".

---

## 6. Wer den Check von außen berührt

| Ort | Was er nimmt |
|---|---|
| `hot_water_wait/HotWaterWaitRun.tsx` | den **gemessenen Durchfluss** (`primaryValue`) statt eines Pauschalwerts für die Liter je Zapfung |
| `tips/buildTips.ts` | löst den Duschkopf-Tipp aus, wenn `primaryValue > GOOD_MAX`; Menge aus `litersSavedPerYear` |
| `education/measurementThresholds.ts` | `GOOD_MAX` und `MEDIUM_MAX` für die Richtwert-Tabelle im Wissensbereich |
| `education/educationContent.ts` | Hintergrundtext „Duschkopf-Durchfluss" (`MEASUREMENT_INFOS`) |
| `reports/measurementsReportData.ts` | Einheit `L/min` als Fallback für Altdaten |
| `landing/GuidedSection.tsx` | zeigt Video **und** Anleitungsschritte des Checks als Beispiel auf der Landing Page |
| `demo/demoProfile.ts` | ein Beispielergebnis (11,4 L/min, „medium") |

**Achtung Landing Page:** `measurements.showerhead.intro.steps` wird nicht nur
im Check gelesen, sondern auch auf der Startseite. Wer die Anleitung umformuliert,
ändert damit die Landing Page mit.

**Achtung Tipp-Auslöser:** Er hing bis zum 05.09. an einem Euro-Betrag. Mit
dem Betrag wäre der Tipp verschwunden – deshalb hängt er jetzt am Durchfluss.
Wer die Bedingung anfasst, prüft `tests/unit/buildTips.test.ts`
(„hängt den Duschkopf-Tipp am Durchfluss, nicht an einem Euro-Betrag").

---

## 7. Was die Texte behaupten dürfen – und was nicht

`tests/unit/showerheadWording.test.ts` bindet vier Zusagen fest. Sie sind alle
aus konkreten Befunden entstanden:

1. **Kein „lohnt sich".** Was sich lohnt, hängt an Preis und Einbausituation –
   beides kennt die App nicht.
2. **Die Gewinde-Bedingung wird genannt.** Ein Sparaufsatz nützt nichts ohne
   passendes Gewinde (½ Zoll, der Normalfall).
3. **Warnung vor Werbebegriffen.** „Eco" und „sparsam" sind nicht geschützt –
   ein so beworbener Duschkopf kann 15 L/min haben. Das ist zugleich die
   Begründung, warum es diesen Check überhaupt gibt: *Man muss messen, weil
   das Etikett nichts garantiert.*
4. **Kein Euro-Betrag, keine Warmwasserquelle** (siehe Abschnitt 3).

Dazu: Jede Zahl im Text steht als Platzhalter (`{{target}}`, `{{flow}}`,
`{{percent}}`) und wird aus dem Mess-Modul gefüllt – keine Grenze wird im
Übersetzungstext wiederholt.

---

## 8. Entscheidungen, die schon gefallen sind

| Entscheidung | Wann | Warum |
|---|---|---|
| Kein automatisches Weiterspringen nach „Speichern & Fertig" | 04.09. | Kilians Wunsch, gilt für sechs Checks |
| Wassermenge statt Euro in der Empfehlung | 04.09. | Die Menge folgt aus der Messung, der Betrag nicht |
| Tipp `hot_water_electric` entfernt | 05.09. | Er entstand als einziger ohne jede Messung – reiner Preisvergleich (Punkt 33) |
| Ersparnis als Prozentsatz, Warmwasserquelle entfernt | 05.09. | Abschnitt 3 |
| Mess-Schirm nach dem Ablauf des Tuns | 05.09. | Abschnitt 4 |
| Bewertung gegen 9, Rechnung gegen 8 | – | Zwei verschiedene Aussagen, bewusst |

---

## 9. Was offen ist

- **`hotWaterType` hat keinen funktionalen Abnehmer mehr.** Die
  Warmwasser-Frage im Fragebogen hatte am 05.09. noch zwei: den Tipp
  `hot_water_electric` (mit Punkt 33 entfernt) und die Vorauswahl in diesem
  Check (mit Punkt 36 entfernt). Sie steht jetzt nur noch im Steckbrief des
  PDF-Berichts. Bei
  Kamin/Ofen, Smart-Home, Gebäudeteil und Postleitzahl war genau das der
  Grund, die Frage zu streichen. **Kilians Entscheidung steht aus** – siehe
  „Offene Fragen" in `docs/gefundene-probleme.md`.
- **Die Stoppuhr behält nach dem Korrigieren ihren alten Stand.** Trägt man
  21 s ein, während die Uhr 1,5 s zeigt, bleiben beide stehen. Der
  Wartezeit-Check verhält sich genauso. Offen, ob das Feld die Uhr
  zurücksetzen soll.
- **Das Demo-Ergebnis trägt keine `litersSavedPerYear`.** Es verhält sich
  damit wie ein Altergebnis: Der Prozentsatz erscheint (nachgerechnet), die
  Literzeile nicht. Funktioniert korrekt, ist aber nicht die vollständige
  Anzeige.

---

## 10. Wenn du etwas änderst

1. **Eine Grenze ändern** → nur in `showerhead.ts`. Wissensbereich und Bericht
   ziehen nach; `tests/unit/thresholdReference.test.ts` und
   `measurementInfos.test.ts` prüfen das.
2. **Eine Zahl in einem Text nennen** → nicht ausschreiben, Platzhalter setzen
   und aus dem Modul füllen.
3. **Eine Kennzahl hinzufügen** → vorher fragen, ob sie ohne Annahmen
   auskommt. Wenn nicht: hinter den Prozentsatz, und `savingEstimated` bleibt.
4. **Einen Euro-Betrag einführen** → dann auch `yieldsSaving` im Katalog
   wieder setzen, `savingEstimated` überdenken und `displayableSavingEur()`
   benutzen statt `displaySavingEur()`. Und Abschnitt 3 widerlegen.
5. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.
   Die Runde dauert unter einer Minute.

Vollständige Vorgeschichte mit allen Befunden: `docs/gefundene-probleme.md`,
Punkte 8, 33, 36 und 37. Der stillgelegte Code samt Begründung:
`archiv/duschkopf-warmwasserquelle/README.md`.
