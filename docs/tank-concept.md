# Tank-Konzept – Vorrat statt Zählwerk

> Stand: 2026-08-30 · Spezifikation für Energieträger, die nicht gezählt,
> sondern **bevorratet** werden: Öltank, Flüssiggastank, Pelletlager.
> **Noch nicht umgesetzt** – dies ist die abgestimmte Zielvorstellung, nicht der
> Ist-Zustand.
>
> Arbeitsstand und Etappenschnitt: `tank-etappen.md`.
> Berührt die Monitoring-Rechenkette in `src/features/monitoring/readings.ts`
> und deren Zweitfassung in `src/features/reports/monitoringReportData.ts`.

---

## 0. Leitgedanke

> **Ein Tank ist ein Zähler, rückwärts gelesen – plus Lieferungen.**

Daraus folgt die tragende Entscheidung dieses Konzepts: Der Füllstandsverlauf
wird in einen **virtuellen Zählerstand** übersetzt (kumulierter Verbrauch), und
dieser läuft durch die *unveränderte* vorhandene Auswertung. Es gibt keine
zweite Rechenkette für Tanks.

Drei Regeln tragen den Rest des Dokuments:

1. **Ein Rechenweg für beide Modelle.** Zähler und Tank unterscheiden sich
   darin, *wie abgelesen* wird – nie darin, wie hochgerechnet, verglichen oder
   bepreist wird.
2. **Kein bestehender Zähler kippt still um.** Ein Träger, für den schon
   abgelesen wurde, bleibt in seinem Modus, bis der Nutzer ausdrücklich
   umschaltet. Eine stille Umdeutung würde jeden gespeicherten Verlauf
   zerstören.
3. **Der Tank schuldet eine Antwort, die kein Zähler geben kann.** Wenn der
   Umbau am Ende nur „dasselbe in Prozent" zeigt, hat er sich nicht gelohnt.
   Die Antwort heißt **Reichweite** (Abschnitt 6).

---

## 1. Warum das heute falsch ist

Öl, Pellets und Flüssiggas sind in der App als aufsteigende Zähler modelliert:
`ENERGY_META` gibt ihnen die Einheiten `l`, `kg`, `m³`
(`src/features/monitoring/energyConfig.ts:21`), und `consumptionSegments()`
unterstellt eine monoton wachsende Zahl.

Nur: **Die allermeisten Öl- und Pelletshaushalte haben gar keinen Zähler.** Sie
haben einen Peilstab, eine Schwimmeranzeige oder ein Ultraschallgerät – und
alle drei zeigen einen *Vorrat*, der fällt. Für sie ist die App heute nicht
umständlich, sondern unbenutzbar:

| Stelle | Verhalten mit fallenden Werten |
|---|---|
| `consumptionSegments` (`readings.ts:198`) | verwirft jedes Segment wegen `kwh < 0` – **jeder** Abschnitt fällt weg |
| Auffüllen | der einzige *steigende* Sprung wird als Verbrauch gezählt |
| `stats`, Trend, Jahreswert | ohne Segmente leer bzw. grotesk falsch |
| `OdometerInput` (6-stelliges Zählwerk) | falsche Metapher für einen Peilstab |

Das ist also kein Feature-Wunsch, sondern eine Korrektur.

---

## 2. Der virtuelle Zählerstand

Der Vorrat wird beim Lesen in einen kumulierten Verbrauch übersetzt:

| Datum | Eintrag | Füllstand | virtueller Zähler |
|---|---|---|---|
| 01.10. | Füllstand | 2.600 l | 0 |
| 01.11. | Füllstand | 2.100 l | 500 |
| 15.11. | **Lieferung 3.000 l** | 5.100 l | 500 |
| 01.12. | Füllstand | 4.300 l | 1.300 |

Die Regel ist ein Einzeiler. Für jeden Eintrag *i*:

```
standVor(i)   = value(i) − (refill(i) ?? 0)
verbrauch(i)  = standVor(i−1 … i) = value(i−1) − standVor(i)
zähler(i)     = zähler(i−1) + max(0, verbrauch(i))
```

Der Lieferungs-Eintrag fällt damit von selbst heraus: Sein `standVor` ist der
Stand *vor* der Betankung, also genau der Punkt, an dem die Verbrauchsrechnung
weiterläuft. Ein und dieselbe Formel deckt beide Eintragsarten ab.

### Was dadurch unverändert bleibt

Alles, was auf `MeterReading[]` rechnet, bekommt die virtuelle Reihe und merkt
nichts:

```
readings.ts        consumptionSegments · stats · consumptionTrend
                   yearOverYearTrend · perDaySeries
seasonality.ts     seasonalShareBetween  (Jahres-Hochrechnung)
specificValues.ts  kWh/m²·a, l/Person·Tag
Sparkline · MeterTrend · EnergySummaryCard · PDF-Bericht
```

Das ist der eigentliche Gewinn des Ansatzes: **eine Adapterfunktion statt einer
zweiten Rechenkette.**

### Wo der Rohwert stehen bleiben muss

Zwei Stellen zeigen den *absoluten* Wert und dürfen den virtuellen Zähler
**nicht** bekommen:

- `AbsoluteLineChart` auf der Detailseite (`MeterDetailPage.tsx:387`) – hier
  gehört der Füllstandsverlauf hin, die Sägezahn-Kurve mit den
  Lieferungs-Sprüngen. Sie ist das wiedererkennbare Tank-Bild.
- Die Ablesungs-Liste und der Bearbeiten-Screen – dort steht, was der Nutzer
  eingetragen hat.

### Die zweite Fassung nicht vergessen

`src/features/reports/monitoringReportData.ts` rechnet **nicht** über
`readings.ts`, sondern hat mit `consumptionOf` (Zeile 127) und `segmentsOf`
(Zeile 146) eine eigene, gleichlautende Segment-Bildung. Der Adapter muss dort
genauso angewandt werden, sonst weicht der Bericht von der App ab. Diese
Doppelung ist eine bestehende Altlast; sie wird hier nicht aufgelöst, aber
benannt (siehe „Was offen bleibt").

---

## 3. Datenmodell

### 3.1 Der Eintrag

`MeterReading` bekommt zwei **optionale** Felder. Alle bestehenden Ablesungen
bleiben ohne Migration gültig – ein Eintrag ohne `refill` ist eine gewöhnliche
Ablesung, genau wie bisher.

```ts
export interface MeterReading {
  id: string
  date: string
  /** Zählerstand (counter) ODER Füllstand nach dem Eintrag (level). */
  value: number
  createdAt?: string
  /** Gelieferte Menge in der Einheit des Trägers – markiert eine Lieferung. */
  refill?: number
  /** Rechnungsbetrag der Lieferung in € – ergibt den echten Arbeitspreis. */
  refillCostEur?: number
}
```

### 3.2 Warum die Lieferung ein eigener Eintrag ist

Ohne sie ist der Verbrauch im Auffüll-Zeitraum **nicht berechenbar**. Ein
Sprung von 800 l auf 1.500 l kann heißen:

- „700 l aufgefüllt, nichts verbraucht", oder
- „1.200 l geliefert, davon 500 l verbraucht".

Beide Deutungen passen zu denselben zwei Ablesungen. Nur die gelieferte Menge
löst das auf – und die steht ohnehin auf jedem Lieferschein, zusammen mit dem
Betrag. Ein Tank ist dadurch am Ende **genauer bepreist als ein Gaszähler**,
weil der Preis gemessen statt geschätzt ist (Abschnitt 7).

`value` trägt bei einer Lieferung den Stand *danach*. Das ist bewusst
gespeichert und nicht abgeleitet: Meist ist der Tank danach voll, und der
Nutzer weiß das sicherer, als eine Kette aus geschätzten Vorwerten es je
rekonstruieren könnte.

### 3.3 Die Konfiguration je Träger

```ts
export type ReadingMode = 'counter' | 'level'

export interface MeterConfig {
  mode: ReadingMode
  /** Fassungsvermögen in der Einheit des Trägers (l, kg, m³) – optional. */
  capacity?: number
}
```

Sie gehört in den **`readingsStore`**, nicht in den `tariffStore`:

- Sie beschreibt den Zähler, nicht den Preis.
- `readings` hängt bereits im Cloud-Sync (`src/features/sync/stores.ts:32`) –
  ein neuer Store müsste dort erst verdrahtet werden und wäre eine weitere
  Stelle, an der ein Profil unvollständig ankommen kann.

**Tank-fähig sind nur `oil`, `pellets` und `gas`.** Strom, Wasser, Wärmepumpe,
PV und Solarthermie kennen keinen Vorrat; für sie wird die Auswahl gar nicht
angeboten.

### 3.4 Standard und Umschalten

| Fall | Modus |
|---|---|
| Neuer Öl- oder Pellets-Zähler | **`level`** |
| Neuer Gas-Zähler | `counter` (Erdgas ist der Regelfall; Flüssiggas wird umgestellt) |
| Träger mit bereits vorhandenen Ablesungen | bleibt `counter` |
| Alle übrigen Träger | `counter`, nicht umschaltbar |

Die dritte Zeile ist die wichtige. Würde der Standard rückwirkend greifen,
läse die App die gespeicherten aufsteigenden Zahlen als fallende Füllstände –
der Verlauf wäre Unsinn, und zwar *still*. Ein fehlender `meters`-Eintrag
bedeutet deshalb immer `counter`.

Umschalten bleibt jederzeit möglich, aber nur ausdrücklich und mit klarer
Ansage, was mit den vorhandenen Ablesungen geschieht: Sie werden ab sofort als
Füllstände gelesen. Der Screen bietet an, sie stattdessen zu verwerfen. Die
Entscheidung trifft der Nutzer, nicht die App.

---

## 4. Kapazität ist optional – und das ist Absicht

Für die **Reichweite** wird das Fassungsvermögen gar nicht gebraucht: 62 % →
48 % in 30 Tagen sind 0,47 %/Tag, also noch rund 100 Tage. Erst Liter, kWh, €
und die spezifischen Kennwerte brauchen es.

Daraus folgt eine saubere Abstufung statt einer Pflichtangabe:

| Angabe | Ohne Kapazität | Mit Kapazität |
|---|---|---|
| Füllstandsanzeige, Verlauf | ✅ in % | ✅ in % **und** l/kg |
| Reichweite, Nachbestell-Warnung | ✅ | ✅ |
| Verbrauch in l/kg, Kosten | – | ✅ |
| kWh/m²·a (`specificValues`) | – | ✅ |

Wer die Größe seines Tanks nicht auswendig weiß, wird also nicht ausgesperrt –
er bekommt weniger, aber sofort etwas. Das folgt derselben Linie wie
„Der Fragebogen ist ein Startpunkt, kein Türsteher" aus
`questionnaire-concept.md`.

Intern wird **immer in der Einheit des Trägers gespeichert** (l, kg, m³), nie
in Prozent. Prozent ist eine Eingabe- und Anzeigeform, kein Datenformat – sonst
bräuchte jede auswertende Stelle die Kapazität. Ist keine Kapazität hinterlegt,
gilt ersatzweise `capacity = 100`, der gespeicherte Wert *ist* dann der
Prozentwert. Die Rechnung bleibt dieselbe, nur die Einheit ist eine andere.

---

## 5. Bedienung

### 5.1 Zwei Aktionen statt einer

Auf der Detailseite eines Tanks stehen nebeneinander:

- **Füllstand eintragen** – der Regelfall, monatlich oder nach Gefühl.
- **Lieferung eintragen** – Datum, Menge, optional Rechnungsbetrag, und der
  Stand danach (vorbelegt mit „voll", also der Kapazität).

### 5.2 Die Eingabe selbst

Der `OdometerInput` (6-stelliges Zählwerk, `DIGITS = 6` in
`AddReadingScreen.tsx:32`) ist für einen Peilstab die falsche Metapher. Für
`level` tritt an seine Stelle eine **Füllstands-Eingabe**: ein Regler bzw. eine
antippbare Tank-Silhouette in Prozent, darunter die Umrechnung im Klartext –
„62 % · ca. 1.860 von 3.000 l". Die Tastatureingabe bleibt als Nebenweg für
alle, die einen absoluten Wert ablesen (Ultraschallanzeigen zeigen oft Liter).

Der **Kamera-Scan entfällt für `level`**. Die Cloud Function `scanMeter` ist auf
Zählwerke geprompted (siehe `docs/gemini-scan-setup.md`); eine
Schwimmeranzeige ist eine andere Aufgabe. Der Knopf wird nicht deaktiviert,
sondern gar nicht erst gezeigt.

### 5.3 Widget und Detailseite

- **Widget:** statt der Zählwerkszahl eine Füllstandsanzeige in % mit dem
  typ-eigenen Akzent, darunter die Reichweite im Klartext („reicht bis
  ~14. Februar"). Die Sparkline zeigt den Vorrat, nicht den Tagesverbrauch –
  die Sägezahn-Kurve ist auf einen Blick als Tank erkennbar.
- **Detailseite:** oben der Füllstandsverlauf (Rohwerte, mit markierten
  Lieferungen), darunter unverändert Verbrauch, Trend, Jahreswert und
  Kennwerte – die kommen jetzt aus dem virtuellen Zähler und sehen aus wie
  überall sonst.

---

## 6. Reichweite – die Antwort, die kein Zähler geben kann

Ein Zähler kann nur mahnen: „lies mich ab". Ein Tank kann etwas sagen, das
wirklich zählt: **wie lange der Vorrat noch reicht** – und wann bestellt werden
muss.

### 6.1 Jahreszeitlich gewichtet, nicht linear

500 l im Oktober reichen deutlich kürzer als 500 l im April. Eine lineare
Rechnung (Restvorrat ÷ Tagesverbrauch) läge im Herbst zu optimistisch und im
Frühjahr zu pessimistisch – und zwar um ein Vielfaches, wie das Monatsprofil in
`seasonality.ts` zeigt.

Da dieses Profil bereits existiert, ist die bessere Rechnung fast geschenkt:
Vom heutigen Tag an wird der jahreszeitliche Tagesanteil aufsummiert, bis er
mit dem Restvorrat multipliziert am Jahresverbrauch dessen Höhe erreicht. Der
Tag, an dem das eintritt, ist das voraussichtliche Leerdatum. Höchstens 365
Iterationen, also keine spürbare Rechenlast.

Grundlage ist `stats().projectedYearKwh` – die Funktion, die für saisonale
Träger ohnehin schon über das Monatsprofil hochrechnet.

### 6.2 Die Warnung

Ausgelöst wird nach **Reichweite, nicht nach Prozent**. Eine Öllieferung hat
Vorlauf; „unter 25 %" kann im Dezember zu spät und im Mai unnötig früh sein.
Standard: Warnung, sobald die Reichweite unter **sechs Wochen** fällt.

`due.ts` bekommt dafür einen zweiten Zweig neben der Termin-Frequenz. Die
bestehende Regel bleibt bestehen: ohne eine einzige Ablesung wird nie
gewarnt – sonst mahnte die App jeden Haushalt zu Pellets, nur weil der Träger
existiert.

---

## 7. Preis aus dem Lieferschein

Ein Lieferungs-Eintrag mit Menge und Betrag ergibt den **gemessenen**
Arbeitspreis: `refillCostEur / refill`. Der schlägt den Standardwert aus
`priceConfig.ts` (1,10 €/l für Öl, 0,35 €/kg für Pellets) um Längen, denn
Heizöl schwankt im Jahresverlauf um mehr als ein Drittel.

Vorgesehen ist der **gewichtete Mittelwert der letzten zwölf Monate**, nicht
der letzten Lieferung: Ein Verbrauch aus dem Sommer wurde mit Öl aus dem
Vorjahr gedeckt. Der Wert wird als Vorschlag in den `tariffStore` geschrieben
und ist dort wie jeder andere Preis überschreibbar (`PriceEntry.custom` bleibt
die Wahrheit des Nutzers und wird nie überschrieben).

Im PDF-Bericht kommt eine **Lieferübersicht** hinzu – Datum, Menge, Betrag,
€/Einheit. Das ist die Jahresaufstellung, die Ölkunden ohnehin führen, und
einer der wenigen Fälle, in denen der Bericht etwas kann, was die App-Ansicht
nicht besser zeigt.

---

## 8. Was offen bleibt

- **Doppelte Segment-Logik.** `monitoringReportData.ts` rechnet neben
  `readings.ts` ein zweites Mal. Der Adapter wird an beiden Stellen angewandt;
  die Zusammenführung selbst gehört in einen eigenen Aufräumschritt, nicht in
  dieses Vorhaben.
- **Nutzbarer Anteil.** Öltanks werden nur zu etwa 95 % befüllt, und die
  untersten Zentimeter sind nicht entnehmbar. Ein `usableShare` wäre der
  richtige Ort dafür; bis dahin trägt der Nutzer die nutzbare Größe als
  Kapazität ein.
- **Mehrere Tanks.** Die App führt einen Zähler je Energieträger. Zwei
  getrennte Öltanks lassen sich nur als Summe abbilden. Das ist dieselbe
  Grenze wie heute und wird hier nicht verschoben.
- **Peilstab-Kennlinie.** Bei liegenden Zylindertanks ist die Höhe nicht
  proportional zum Volumen – 50 % Höhe sind rund 50 % Volumen, 25 % Höhe aber
  nur etwa 20 %. Wer in Zentimetern misst, braucht eine Umrechnungstabelle.
  Erst sinnvoll, wenn die Tankform erfasst wird.
- **Scan der Schwimmeranzeige.** Denkbar über dieselbe Cloud Function mit
  eigenem Prompt, aber ein eigenes Vorhaben mit eigener Genauigkeitsfrage.
