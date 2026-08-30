# Tank-Umbau – Etappen-Tracker

> **Arbeitsdokument.** Konzept und Begründungen stehen in `tank-concept.md`;
> hier steht der Arbeitsstand und was je Etappe als „fertig“ gilt.
>
> **Nach jeder abgeschlossenen Etappe wird dieses Dokument aktualisiert** –
> Status, Datum, Commit. Es ist die einzige Quelle für „wo stehen wir“.

## So wird gearbeitet

Eine Etappe pro Session. Der Einstieg ist immer derselbe:

```
/tank          → nimmt die nächste offene Etappe
/tank 3        → nimmt gezielt Etappe 3
/tank status   → nur der Stand, ohne zu arbeiten
```

Jede Etappe endet mit: Typecheck grün, ESLint grün, Tests grün, Commit auf dem
Arbeits-Branch, Push – und einer aktualisierten Statuszeile hier. Den Merge
nach `main` macht Kilian (siehe „Der Merge nach `main` gehört dem Menschen“ in
`CLAUDE.md`); der Auto-Deploy läuft erst danach.

## Stand

| # | Etappe | Status | Abgeschlossen | Commit |
|---|---|---|---|---|
| 1 | Modell und virtueller Zähler | ✅ fertig | 2026-08-30 | `c6ca126` |
| 2 | Eingabe und Anzeige | ✅ fertig | 2026-08-30 | `11f502f` |
| 3 | Reichweite und Nachbestellen | ⬜ offen | – | – |
| 4 | Preis aus Lieferungen, Bericht | ⬜ offen | – | – |

**Abhängigkeiten:** 2 braucht 1 · 3 braucht 1 und 2 · 4 braucht 1 und 2.
Etappe 1 trägt alles Weitere: Ist der Adapter sauber und getestet, ist der Rest
Oberfläche.

---

## Etappe 1 – Modell und virtueller Zähler

> **Ziel:** Ein Träger kann als Tank geführt werden, und die vorhandene
> Auswertung rechnet damit richtig – **ohne jede sichtbare Änderung**.
> Referenz: Konzept Abschnitte 2 und 3.

### Ausgangslage

`consumptionSegments` (`src/features/monitoring/readings.ts:198`) verwirft jedes
Segment mit `kwh < 0`. Bei fallenden Füllständen fällt damit jeder Abschnitt
weg, und allein der Auffüll-Sprung zählt als Verbrauch. Die Zweitfassung in
`monitoringReportData.ts` (Zeilen 127 und 146) hat denselben Fehler.

### Umfang

1. **`MeterReading` um `refill` und `refillCostEur` erweitern** – beide
   optional, keine Migration nötig. Ein Eintrag ohne `refill` ist wie bisher
   eine gewöhnliche Ablesung.

2. **`meters: Partial<Record<EnergyType, MeterConfig>>` im `readingsStore`**
   mit den Aktionen `setMeterMode(type, mode)` und `setCapacity(type, value)`.
   Im `merge`-Block des `persist`-Aufrufs mitziehen, wie es `readings` und
   `reminderFrequency` dort schon tun – ein fehlender Eintrag bedeutet immer
   `counter`.

3. **`addRefill(type, { date, amount, value, costEur })`** als eigene Aktion
   neben `addReading`, damit die Eintragsart nicht am Aufrufer hängt.

4. **`meterMode(type, config, hasReadings)`** – die Standardregel aus Konzept
   3.4 an einer Stelle: `level` für neue Öl- und Pellets-Zähler, `counter`
   sobald Ablesungen existieren oder kein Eintrag vorliegt.

5. **`counterSeries(entries, config): MeterReading[]`** – der Adapter. Bei
   `counter` gibt er die Eingabe unverändert zurück (identisch, nicht nur
   gleich – die Kosten dürfen für den Regelfall nicht steigen). Bei `level`
   baut er die virtuelle Reihe nach Konzept 2 auf.

6. **Alle rechnenden Aufrufer über den Adapter führen:**
   `MeterDetailPage.tsx:126`, `WidgetBoard.tsx:366` und `:468`,
   `EnergySummaryCard.tsx:39`, `monitoringReportData.ts:181`.
   **Nicht** umgestellt werden `AbsoluteLineChart` (Zeile 387 der Detailseite),
   die Ablesungs-Liste und der Bearbeiten-Screen: Dort gehört der Rohwert hin.

7. **`isTankType(type)`** in `energyConfig.ts` – nur `oil`, `pellets`, `gas`.

### Berührte Dateien

```
        src/store/readingsStore.ts                     (Felder, Aktionen, merge)
neu     src/features/monitoring/counterSeries.ts       (Adapter, Modus-Regel)
        src/features/monitoring/MeterDetailPage.tsx
        src/features/monitoring/WidgetBoard.tsx
        src/features/home/EnergySummaryCard.tsx
        src/features/reports/monitoringReportData.ts   (+ ReportsPage reicht `meters` durch)
neu     tests/unit/counterSeries.test.ts
        tests/unit/monitoringReport.test.ts
```

### Unterwegs entschieden

- **Der Modus hängt nicht am Zustand der Ablesungsliste.** Geplant war
  `meterMode(type, config, hasReadings)` – „Öl ohne Ablesungen ist ein Tank".
  Das ist abgeleiteter Zustand und kippt: Wer alle Ablesungen löscht und neu
  beginnt, hätte plötzlich einen Tank. Jetzt gilt `meterMode(config)` mit der
  Regel *ohne Konfiguration immer `counter`*; `level` entsteht ausschließlich
  durch eine ausdrückliche Entscheidung. `defaultMeterMode(type)` trägt die
  Neuanlage-Regel (Öl und Pellets → Vorrat) als reine Funktion und wird erst
  in Etappe 2 gerufen, wenn ein Zähler tatsächlich angelegt wird. Damit ist
  diese Etappe für jeden bestehenden Nutzer wirklich folgenlos.

- **`isTankType` liegt in `counterSeries.ts`, nicht in `energyConfig.ts`.**
  Der Store müsste `energyConfig` sonst zur Laufzeit laden und zöge damit
  lucide-react in die Zustands-Schicht. Modus-Regel und Adapter gehören
  ohnehin zusammen.

- **Ein Füllstand, der ohne Lieferung steigt, wird zum fallenden virtuellen
  Zähler** – nicht auf null Verbrauch geklemmt. Nachgelagert greift dann
  dieselbe Behandlung wie bei einem zurückgesetzten Zählwerk: Der Abschnitt
  gilt als nicht auswertbar und fällt aus Zähler *und* Nenner. Ein geklemmter
  Nullwert hätte dagegen behauptet, in diesen Tagen sei nichts verbraucht
  worden, und den Tagesschnitt gedrückt.

- **Für Etappe 2:** `value` einer Lieferung ist der Stand *danach*, und
  `value − refill` ist damit der Stand *davor*. Die Eingabe sollte diesen Wert
  nicht mit „letzter Stand + Menge" vorbelegen – dann wäre der Verbrauch
  zwischen letzter Ablesung und Lieferung rechnerisch null. Besser aus der
  bisherigen Tagesrate hochrechnen; die Kette bleibt sonst korrekt, aber der
  Verbrauch wird unterschätzt.

### Fertig, wenn

- [x] Eine Füllstandsreihe mit Lieferung dazwischen ergibt denselben
      Jahresverbrauch wie die entsprechende Zählerreihe – als Test, der beide
      Modelle gegeneinander stellt.
- [x] Bei `counter` gibt `counterSeries` die **identische** Referenz zurück.
- [x] Ein Träger mit vorhandenen Ablesungen bleibt `counter`, auch wenn er
      Öl oder Pellets ist (keine stille Umdeutung). Schärfer als geplant: Ohne
      ausdrückliche Konfiguration gilt **jeder** Träger als Zählwerk, siehe
      „Unterwegs entschieden".
- [x] Zwei Lieferungen zwischen zwei Füllständen werden korrekt aufsummiert.
- [x] Unsinnige Eingaben (Füllstand steigt ohne Lieferung, `NaN`, Ablesung und
      Lieferung am selben Tag) erzeugen keine negativen Segmente und keine
      `NaN`. **Nicht** geprüft: Lieferung größer als die Kapazität – der
      Adapter kennt die Kapazität nicht, das ist eine Eingabeprüfung und
      gehört in Etappe 2.
- [x] PDF-Bericht und App zeigen für denselben Tank denselben Verbrauch
      (`monitoringReport.test.ts`, stellt beide Module gegeneinander).
- [x] Typecheck, ESLint und `npx vitest run` grün (587 Tests; der
      Firestore-Rules-Test bleibt ohne Emulator übersprungen).

---

## Etappe 2 – Eingabe und Anzeige

> **Ziel:** Ein Tank lässt sich einrichten, ablesen und befüllen – und sieht
> wie ein Tank aus, nicht wie ein Zählwerk.
> Referenz: Konzept Abschnitte 4 und 5.

### Umfang

1. **Einrichtung.** Beim Anlegen eines Öl-, Pellets- oder Gas-Zählers die Wahl
   „Zähler oder Vorrat?“, bei Öl und Pellets mit „Vorrat“ vorbelegt. Kapazität
   als **optionales** Feld mit dem Hinweis, was ohne sie fehlt (Konzept 4).
   Nachträglich änderbar in den Einstellungen des Zählers, mit klarer Ansage,
   was mit den vorhandenen Ablesungen geschieht, und der Möglichkeit, sie zu
   verwerfen.

2. **`FillLevelInput`** statt `OdometerInput` für `level`: Prozent-Regler bzw.
   antippbare Tank-Silhouette, darunter die Umrechnung im Klartext
   („62 % · ca. 1.860 von 3.000 l“). Tastatureingabe bleibt als Nebenweg für
   absolute Werte. Der Scan-Knopf wird für `level` nicht gezeigt.

3. **Lieferungs-Eintrag.** Datum, Menge, optional Betrag, Stand danach
   (vorbelegt mit der Kapazität). Erscheint in der Ablesungs-Liste erkennbar
   als Lieferung, nicht als Ablesung.

4. **Widget.** Füllstandsanzeige in % mit typ-eigenem Akzent statt der
   Zählwerkszahl; die Sparkline zeigt den Vorratsverlauf. Der Reichweiten-Text
   folgt in Etappe 3 – bis dahin steht dort der Stand in der Einheit.

5. **Detailseite.** `AbsoluteLineChart` zeigt den Füllstand mit markierten
   Lieferungen; alles darunter bleibt, wie es ist.

6. **i18n** für alle neuen Texte in `de.json` und `en.json`.

### Berührte Dateien

```
neu     src/features/monitoring/fillLevel.ts            (Prozent-Umrechnung, Schätzung)
neu     src/features/monitoring/FillLevelInput.tsx
neu     src/features/monitoring/MeterSetupScreen.tsx
neu     src/features/monitoring/AddRefillScreen.tsx
        src/features/monitoring/AddReadingScreen.tsx
        src/features/monitoring/MeterDetailPage.tsx
        src/features/monitoring/MonitoringPage.tsx
        src/features/monitoring/WidgetBoard.tsx
        src/features/monitoring/AbsoluteLineChart.tsx   (Lieferungs-Marker)
        src/i18n/locales/de.json, en.json
neu     tests/unit/fillLevel.test.ts
```

### Unterwegs entschieden

- **Die Einrichtung erscheint nur für einen wirklich neuen Zähler**
  (`isTankType && keine Konfiguration && keine Ablesungen`). Zuerst hing sie
  nur an der fehlenden Konfiguration – dann bekam ein Bestandsnutzer beim
  nächsten Eintragen die Modus-Wahl vorgesetzt, mit „Vorrat" vorbelegt, und
  hätte mit einem Tipp auf Speichern seinen ganzen Verlauf umgedeutet. Genau
  das, was Etappe 1 verhindern sollte. Umstellen führt jetzt ausschließlich
  über die Zähler-Einstellungen, mit Warnung. Aufgefallen erst im
  Browser-Durchlauf, nicht im Typecheck.

- **Zweite Sicherung im Setup-Screen:** Liegen Ablesungen vor, ist immer der
  gegenwärtige Modus vorausgewählt, nie `defaultMeterMode`. Der Wechsel muss
  angetippt werden.

- **Die Detailseite war eine zweite Tür.** Sie ist über die Board-Kachel direkt
  erreichbar; ohne eigene Weiche wäre der neue Öltank dort am Einrichten vorbei
  ins Zählwerk-Modell gelaufen. Beide Einstiege prüfen jetzt dieselbe
  Bedingung – als Regel in `fillLevel.test.ts` festgehalten, damit sie beim
  nächsten Umbau nicht auseinanderläuft.

- **`toPercent`/`fromPercent`/`estimateLevelAt` liegen in `fillLevel.ts`,**
  nicht in der Eingabe-Komponente: Die ESLint-Regel `react-refresh` verbietet
  gemischte Exporte, und rein gerechnete Funktionen sind so auch testbar.

- **Der Stand nach einer Lieferung wird hochgerechnet, nicht addiert** – wie in
  Etappe 1 notiert. Beispiel aus dem Durchlauf: letzter Stand 900 l vor 29
  Tagen, Tagesrate 24,6 l, Lieferung 2.000 l → Vorschlag 2.187 l statt 2.900 l.
  Die 713 l Verbrauch dazwischen bleiben so in der Rechnung.

### Fertig, wenn

- [x] Ein neuer Öl-Zähler startet als Vorrat, ein bestehender bleibt Zähler –
      und wird beim Eintragen nicht einmal gefragt.
- [x] Ein Tank ohne Kapazität ist vollständig bedienbar und zeigt Prozent.
- [x] Füllstand und Lieferung sind in der Liste auseinanderzuhalten
      (Lieferschein-Marke „+2.000" samt Betrag), im Verlauf als offener Ring.
- [x] Für `level` erscheint weder Zählwerk noch Scan-Knopf.
- [x] Der Umschalter warnt vor der Umdeutung, nennt die Zahl der betroffenen
      Ablesungen und bietet Behalten wie Verwerfen an.
- [x] Typecheck, ESLint und `npx vitest run` grün (602 Tests).

Abnahme gefahren mit `tests/unit/fillLevel.test.ts` (Rechenebene) und vier
Playwright-Durchläufen gegen die laufende App (Bedienebene: neuer Tank ohne
Kapazität, Tank mit Kapazität samt Lieferung, Historie und Umschalter,
Bestandszähler; Skripte im Scratchpad der Session).

---

## Etappe 3 – Reichweite und Nachbestellen

> **Ziel:** Die App sagt, wie lange der Vorrat reicht, und meldet sich
> rechtzeitig vor dem Bestellen. Referenz: Konzept Abschnitt 6.

### Umfang

1. **`rangeUntilEmpty(readings, level, yearlyConsumption, today)`** – das
   voraussichtliche Leerdatum, jahreszeitlich über `seasonality.ts` gewichtet
   statt linear. Höchstens 365 Iterationen. Liefert `undefined`, solange
   `stats().projectedYearKwh` fehlt – ohne belastbare Hochrechnung lieber keine
   Zahl als eine falsche, wie schon bei `MIN_PROJECTION_DAYS`.

2. **Anzeige** im Widget („reicht bis ~14. Februar“) und auf der Detailseite,
   dort mit der Grundlage benannt – analog zu `ProjectionBasis`, damit niemand
   eine Schätzung für eine Messung hält.

3. **Nachbestell-Warnung** in `due.ts` als zweiter Zweig neben der
   Termin-Frequenz: Schwelle sechs Wochen Reichweite. Ohne eine einzige
   Ablesung wird weiterhin nie gewarnt.

4. **`ReadingReminder`** erweitern: Bei einem Tank lautet der Anlass
   „Vorrat wird knapp“, nicht „Zeit zum Ablesen“.

### Berührte Dateien

```
neu     src/features/monitoring/range.ts
neu     tests/unit/range.test.ts
        src/features/monitoring/due.ts
        src/features/monitoring/WidgetBoard.tsx
        src/features/monitoring/MeterDetailPage.tsx
        src/features/monitoring/ReadingReminder.tsx
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] Derselbe Restvorrat ergibt im Oktober eine deutlich kürzere Reichweite
      als im April – als Test gegen das Monatsprofil.
- [ ] Ohne Jahres-Hochrechnung erscheint keine Reichweite, statt einer Null.
- [ ] Die Warnung greift genau einmal ab sechs Wochen und verstummt nach einer
      eingetragenen Lieferung.
- [ ] Typecheck, ESLint und `npx vitest run` grün.

---

## Etappe 4 – Preis aus Lieferungen, Bericht

> **Ziel:** Der Preis wird gemessen statt geschätzt, und der Bericht zeigt die
> Lieferungen. Referenz: Konzept Abschnitt 7.

### Umfang

1. **Gewichteter Preis der letzten zwölf Monate** aus `refillCostEur / refill`
   als Vorschlag für den `tariffStore`. Ein vom Nutzer gesetzter Preis
   (`PriceEntry.custom`) wird **nie** überschrieben.

2. **Sichtbar machen**, woher der Preis kommt – im `TariffModal` als Zeile
   „aus 3 Lieferungen berechnet: 0,98 €/l“ mit der Möglichkeit, ihn zu
   übernehmen oder eigene Werte zu behalten.

3. **Lieferübersicht im PDF-Bericht:** Datum, Menge, Betrag, €/Einheit,
   darunter die Jahressumme.

### Berührte Dateien

```
        src/features/monitoring/priceConfig.ts          (Preis aus Lieferungen)
        src/features/monitoring/TariffModal.tsx
        src/store/tariffStore.ts
        src/features/reports/monitoringReportData.ts
        src/features/reports/generateMonitoringPdf.ts
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] Drei Lieferungen zu verschiedenen Preisen ergeben den mengengewichteten
      Mittelwert, nicht den arithmetischen.
- [ ] Ein selbst gesetzter Preis bleibt unangetastet.
- [ ] Der Bericht listet die Lieferungen des gewählten Zeitraums mit Summe.
- [ ] Typecheck, ESLint und `npx vitest run` grün.
