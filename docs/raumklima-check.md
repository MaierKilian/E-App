# Raumklima-Check – alles, was man vor einer Änderung wissen muss

> **Zweck dieser Datei.** Übergabe an die nächste KI-Session (und an Kilian).
> Sie beschreibt den Raumklima-Check vollständig: was er misst, wie er rechnet,
> woher jede Zahl stammt, was ihn außerhalb seines Ordners berührt, welche
> Entscheidungen bereits gefallen sind – und was offen oder kaputt ist.
> Sie taugt zugleich als Materialsammlung für eine schriftliche Ausarbeitung;
> Hinweise dazu stehen in Abschnitt 14.
>
> Stand: 05.09.2026, Branch `claude/sync-r50n1f`.
>
> **Zwei Dinge vorweg, die beim Lesen sofort wichtig sind:**
>
> 1. Der Check ist der **größte** der App – drei Messgrößen, vier Rechenmodule,
>    46 Testfälle, zwei Verbindungen zu anderen Checks. Er ist nicht mit dem
>    Duschkopf- oder Wartezeit-Check vergleichbar.
> 2. **Abschnitt 12 enthält einen verifizierten Fehler**, durch den die
>    €-Ersparnis dieses Checks seit dem 05.09.2026 nie mehr erscheint. Er ist
>    dokumentiert, aber **nicht behoben** – nach Projektregel wird ohne Kilians
>    „umsetzen" kein Code geändert.

---

## 1. Was der Check tut

Der Nutzer erfasst für **einen konkreten Raum** drei Dinge:

| Größe | Pflicht? | Eingabe | Wertebereich |
|---|---|---|---|
| **Raumtemperatur** | ja | Stepper | 10–35 °C, Schritt 0,5 · Start 21 °C |
| **Luftfeuchte** | nein (Schalter) | Stepper | 0–100 %, Schritt 5 · Start 50 % |
| **Zugluft** | ja (Vorgabe „keine") | Chips | keine / spürbar / stark |

Daraus entstehen: eine Teilbewertung je Dimension, ein Gesamt-Rating, bei zu
warmen Räumen eine anteilige Heiz-Ersparnis – und im Keller eine
Taupunkt-Warnung, die mit der Prozentzahl nichts zu tun hat.

**Der Check läuft je Raum** (`perRoom: true` im Katalog). Ergebnisse liegen
unter `room_temperature@bedroom#a1b2c3d4`. Weitere Katalogdaten:
`category: 'heating'`, `difficulty: 1`, `estimatedMinutes: 5`,
`yieldsSaving: true`.

**Messgeräte** (`catalog.ts`, Zeilen 142–145) – der einzige Check mit einem
*optionalen* zweiten Gerät:

```ts
instruments: [
  { type: 'temperature_sensor', required: true },
  { type: 'humidity_sensor', required: false },
]
```

Der Kommentar daneben begründet es: „Die Temperatur ist die Messung; die
Luftfeuchte ist der optionale Zusatzschritt, aus dem der Taupunkt und damit die
Schimmelwarnung entsteht." Die Geräte-Übersicht im Fragebogen wird aus diesen
Einträgen hergeleitet, nie danebengeschrieben.

### Der Messhinweis, an dem die Aussagekraft hängt

Aus dem Intro-Modal (`intro.details`), wörtlich:

> „Lege das Thermometer etwa auf Sitzhöhe in die Raummitte – nicht direkt an
> Heizung, Fenster oder Außenwand." · „Warte einige Minuten, bis sich der Wert
> stabilisiert, bevor du ihn abliest."

Dieselben Punkte stehen im Wissensbereich als typische Messfehler, ergänzt um
„Direkt nach dem Lüften messen" und „In der Sonne messen: Direkte Einstrahlung
verfälscht jedes Thermometer."

---

## 2. Die Bewertung – drei Dimensionen, ein Rating

Alles in `roomClimate.ts` (306 Zeilen), Funktion `calcRoomClimate`.

### Das Komfortband hängt am Raumtyp

**Die zentrale Entscheidung des Checks.** Die Begründung steht im Code:

> „Ein Schlafzimmer bei 21 °C ist nicht ‚optimal', sondern überheizt – für
> Schlafräume gelten 16–18 °C als Empfehlung, für Bäder dagegen 22–24 °C. Ein
> einheitliches Band für alle Räume hätte genau die Fälle als ideal bewertet,
> in denen sich Absenken lohnt."

`COMFORT_BANDS` deckt **alle 13 Raumtypen** ab:

| Raumtyp | Band | Raumtyp | Band |
|---|---|---|---|
| `living_room` | 20–22 °C | `bathroom` | 22–24 °C |
| `dining_room` | 20–22 °C | `toilet` | 18–20 °C |
| `children_room` | 20–22 °C | `hallway` | 16–18 °C |
| `office` | 20–22 °C | `utility_room` | 16–18 °C |
| `bedroom` | **16–18 °C** | `basement` | 14–18 °C |
| `kitchen` | 18–20 °C | `staircase` | 15–18 °C |
| | | `attic` | 18–20 °C |

`DEFAULT_COMFORT_BAND = { min: 20, max: 22 }` gilt ohne Raumbezug.

### Das Feuchte-Band hängt ebenfalls am Raumtyp – aber nur für zwei Räume

`DEFAULT_HUMIDITY_BAND = { min: 40, max: 60 }`. Abweichend nur:

```ts
HUMIDITY_BANDS = {
  basement:     { min: 50, max: 65 },
  utility_room: { min: 50, max: 65 },
}
```

Die Begründung, warum **nur** diese zwei, ist ein Musterbeispiel für bewusste
Selbstbeschränkung:

> „Nur Keller und Waschküche weichen ab: Beide sind kühl, beide tragen
> regelmäßig Feuchte ein (Erdreich, Wäsche), und in beiden ist ein höherer Wert
> normal statt auffällig. Alle übrigen Räume behalten den Wohnraum-Wert – ein
> eigenes Band je Raumtyp wäre eine Genauigkeit, die die Sache nicht hergibt."

### Die Extremschwellen sind relativ, nicht absolut

```ts
const TEMP_EXTREME_TOLERANCE = 3   // °C außerhalb des Bands → „high"
const HUM_EXTREME_TOLERANCE  = 10  // %  außerhalb des Bands → „high"
```

Auch das ist begründet:

> „Bewusst relativ statt als zweites Zahlenpaar: Für den Wohnraum ergibt das
> genau die bisherigen Grenzen (30 % / 70 %), für den Keller verschieben sie
> sich mit dem Band. Eine Regel statt zweier Tabellen, die auseinanderlaufen
> können."

### Die Rating-Logik

```
high    ← Temperatur > 3 °C außerhalb des Bands
       ODER Feuchte > 10 % außerhalb ihres Bands
       ODER Zugluft = „stark"

good    ← Temperatur im Band
       UND (Feuchte im Band ODER gar nicht erfasst)
       UND Zugluft = „keine"

medium  ← alles andere
```

Der Check kennt damit **nur drei Stufen** (`good`/`medium`/`high`), nicht die
vier des Wartezeit-Checks. Das ist konsistent: `result.summary` in den
Sprachdateien hat auch nur drei Einträge.

Die sieben Teil-Status (`DimensionStatus`) sind feiner: `optimal`, `tooCold`,
`tooWarm`, `tooDry`, `tooHumid`, `draftNoticeable`, `draftStrong`. Sie tragen
die Statuszeilen im Ergebnis, nicht das Rating.

---

## 3. Der Taupunkt – die eigentliche Aussage des Kellerteils

`dewPoint.ts` (67 Zeilen). **Das inhaltlich stärkste Stück des Checks** und der
beste Kandidat für ein eigenes Kapitel in jeder Ausarbeitung.

### Warum eine eigene Rechnung

Wörtlich aus dem Modulkopf:

> „Schimmel entsteht nicht bei einer Prozentzahl, sondern wenn feuchte Luft auf
> eine Oberfläche trifft, die kälter ist als der Taupunkt dieser Luft – dort
> schlägt sich das Wasser nieder. Eine reine Feuchte-Bewertung übersieht
> deshalb den gefährlichsten Fall und meldet gleichzeitig einen unauffälligen
> Keller als ‚zu feucht'."

### Die Formel

Magnus-Formel mit den Koeffizienten nach **Sonntag (1990)** – „dieselben Werte,
die auch der DWD nutzt", gültig etwa −45 bis +60 °C:

```
a = 17.62 ,  b = 243.12 °C

α  = ln(RH/100) + (a · T) / (b + T)
Td = (b · α) / (a − α)
```

Rückgabe `undefined` bei RH ≤ 0 oder RH > 100. Begründung im Code: „Eine
Feuchte von 0 % hat keinen Taupunkt (der Logarithmus divergiert) – das ist kein
Messwert, sondern ein defektes Hygrometer."

### Die Wandtemperatur ist eine Annahme, und sie sagt es

```ts
export const ASSUMED_BASEMENT_WALL_C = 12
```

> „Kellerwände liegen am Erdreich und folgen dessen Temperatur, nicht der Luft:
> In Deutschland liegt sie in 1–2 m Tiefe ganzjährig bei etwa 8–12 °C. Wir
> rechnen mit dem oberen Rand – die vorsichtigere Annahme, weil sie seltener
> warnt und damit keine Warnung erzeugt, die niemand ernst nimmt.
>
> Eine Messung wäre besser als eine Annahme; ein Infrarot-Thermometer an der
> Wand ist aber ein Gerät, das der Fragebogen nicht voraussetzt."

Das ist eine **explizit begründete Abwägung zwischen Genauigkeit und
Zugangsschwelle** – zitierfähig.

### Der Sommerfall, um den es geht

`condensationRisk(T, RH, wall = 12)` ist wahr, wenn `Td ≥ wall`. Der Kommentar
erklärt das Kontraintuitive daran:

> „Das ist der Sommerfall: Warme Außenluft mit 20 °C und 70 % hat einen
> Taupunkt von rund 14 °C und schlägt sich an einer 12 °C kalten Wand nieder –
> ein gelüfteter Keller ist im Sommer deshalb feuchter als ein geschlossener,
> obwohl das Lüften sich richtig anfühlt."

Der Warntext in der App (`result.dewPoint`) sagt genau das:

> **Achtung beim Lüften** – „Diese Luft kondensiert an einer {{wall}} °C kalten
> Kellerwand – ihr Taupunkt liegt bei {{dewPoint}} °C. Schimmel entsteht nicht
> durch eine Prozentzahl, sondern genau hier."
> „Im Sommer nachts oder früh morgens lüften, nicht mittags: Warme Außenluft
> bringt mehr Feuchte herein, als sie hinausträgt."

### Nachgerechnete Werte (aus `dewPoint.test.ts`)

| T (°C) | RH (%) | Taupunkt (°C) | Kondensat an 12 °C-Wand? |
|---|---|---|---|
| 16 | 65 | 9,42 | nein – der unauffällige Keller |
| 20 | 50 | 9,26 | nein |
| **20** | **70** | **14,36** | **ja – der Sommerfall** |
| 25 | 60 | 16,69 | ja |
| 30 | 30 | 10,53 | nein |
| 0 | 50 | −9,2 | – |

Der Test nennt seine Herkunft ausdrücklich: „Die Vergleichswerte sind mit der
Magnus-Formel von Hand nachgerechnet (Sonntag 1990) und decken sich mit
gängigen Taupunkt-Tabellen."

### Wie das Ergebnis den Keller erkennt

Der Ergebnis-Schirm kennt den Raum **nicht** – er bekommt nur das Ergebnis.
Deshalb wird das angewandte Feuchte-Band mitgespeichert, und die Erkennung
läuft darüber:

```ts
const isBasementBand = humBand.max === HUMIDITY_BANDS.basement?.max
```

Kommentar: „Der Kellerhinweis hängt am angewandten Band, nicht am Raumnamen."

---

## 4. Die Ersparnis – die Kette und ihre vier Module

Das ist der aufwendigste Teil und berührt vier Dateien.

### Die Formel

```
ΔT              = max(0, gemessene Temperatur − Komfort-Obergrenze)
Flächenanteil   = Raumfläche ÷ Wohnfläche          (auf 1 gedeckelt)
relative Ersparnis = ΔT × 6 %
€/Jahr          = Heizkosten ohne Warmwasser × Flächenanteil × ΔT × 6 %
```

### Die 6 % je Grad – und ihre Geschichte

```ts
// Rund 6 % Heizenergie je 1 °C weniger. Quelle: Verbraucherzentrale
// Rheinland-Pfalz, „Raumtemperaturen und Heizzeiten" (geprüft 09/2026).
//
// Die Zahl trägt jede Heiz-Ersparnis, die diese App ausweist – sie stand bis
// September 2026 mit einem ungeprüften Verweis („Hochschule Biberach 2011")
// hier und war damit die unbelegteste Zahl im ganzen Projekt.
export const PERCENT_PER_DEGREE = 0.06
```

Wer über Belegpflicht schreibt, hat hier den besten Fall der ganzen App: eine
Zahl, die **alles** trägt, lief jahrelang mit einer Quellenangabe, die niemand
geprüft hatte. Commit `b010db5` (03.09.2026) hat das behoben.

### Der Bezugspunkt ist die **Ober**grenze – und warum das entscheidend ist

```ts
export const SAVING_REFERENCE_TEMP = DEFAULT_COMFORT_BAND.max
```

> „Wichtig, damit Bewertung und Ersparnis nicht widersprüchlich sind: Ein Raum
> innerhalb des Komfortbands wird als ‚optimal' bewertet – dann darf die App
> nicht gleichzeitig zum Absenken raten. Sparpotenzial gibt es erst, wenn die
> Temperatur das Band nach oben verlässt."

Der erste Test der Suite prüft genau diese Widerspruchsfreiheit über das ganze
Band (20 / 20,5 / 21 / 21,5 / 22 °C) und für **jeden** Raumtyp einzeln.

### Die Heizkosten (`heatingCost.ts`)

```ts
export const WARM_WATER_SHARE = 0.15   // temperaturunabhängiger Anteil
const RELIABLE_SPAN_DAYS = 300         // ab hier gilt die Hochrechnung als belastbar
```

`annualHeatingCostEur()` bildet aus den Monitoring-Ablesungen eine
Jahres-Hochrechnung je Heizträger (Gas / Öl / Pellets / Wärmepumpe) und
summiert sie. Sie liefert `undefined`, wenn kein Heizträger mindestens zwei
Ablesungen hat – **dann gibt es keinen Euro-Betrag, nur die Prozentaussage.**
Als `estimated` gilt sie, wenn ein Default-Preis benutzt wird **oder** die
Datenspanne unter 300 Tagen liegt.

Die 15 % Warmwasseranteil werden vorher abgezogen: Wer die Raumtemperatur
senkt, spart am Warmwasser nichts.

### Die Raumfläche (`roomAreas.ts`)

`TYPICAL_AREA_SQM` ist ausdrücklich **kein** Absolutwert, sondern ein Gewicht:

| Raumtyp | Gewicht | Raumtyp | Gewicht |
|---|---|---|---|
| `living_room` | 28 | `bathroom` | 8 |
| `dining_room` | 14 | `hallway` | 6 |
| `bedroom` | 14 | `utility_room` | 6 |
| `attic` | 14 | `staircase` | 6 |
| `children_room` | 12 | `toilet` | 3 |
| `office` | 12 | | |
| `basement` | 12 | | |
| `kitchen` | 10 | | |

`resolveRoomArea(rooms, livingArea, roomKey)` arbeitet dreistufig:

1. Hat der Raum eine **eingetragene** Fläche → die gilt, `estimated: false`.
2. Sonst: Wohnfläche **minus alle eingetragenen Flächen**, der Rest nach
   Gewichten auf die übrigen Räume verteilt. Damit summieren sich alle Räume
   exakt auf die angegebene Wohnfläche (ein Test prüft das).
3. Ohne Wohnfläche → der typische Wert der Raumart.

Ein vierter Fall ist eigens abgedeckt: ein **verwaister Schlüssel** (der Raum
wurde gelöscht, sein Messergebnis blieb) liest die Raumart noch aus dem
Schlüssel, „die Rechnung darf deshalb nicht bei 0 m² landen".

### Die Grenzen des Modells – im Code benannt

> „Die 6 %/°C gelten für die *gesamte* beheizte Fläche; die Aufteilung erfolgt
> hier nach Grundfläche, während die tatsächliche Heizlast eines Raums von
> seiner Hüllfläche (Außenwände, Fenster) abhängt. Bei Absenkung eines
> *einzelnen* Raums fließt zudem Wärme aus Nachbarräumen nach. Der Wert ist
> damit eine Größenordnung, keine Prognose."

Genau das sagt auch der Text in der App: „Grober Orientierungswert (≈6 % je
°C), keine Prognose."

---

## 5. Was gespeichert wird

```ts
details: {
  temperature,          // gemessen
  draft,                // 0 = keine, 1 = spürbar, 2 = stark  (Index!)
  bandMin, bandMax,     // das angewandte Komfortband
  // nur wenn die Feuchte erfasst wurde:
  humidity,
  humMin, humMax,       // das angewandte Feuchte-Band
  // nur wenn der Raum zu warm war:
  savingDeltaT,
  savingPercent,        // ganzzahlige Prozent
  savingReference,      // die Bezugstemperatur
  yearlySaving,         // nur wenn ≥ 20 € (bereits gerundet!)
  savingEstimated,      // 1 = Fläche geschätzt oder Heizkosten geschätzt
}
```

**Die Bänder werden mitgespeichert – das ist die wichtigste Eigenschaft
dieses Datensatzes.** Zwei Kommentare erklären warum:

> „Das Komfortband ist raumtypabhängig und wird beim Messen mitgespeichert – so
> bleibt ein altes Ergebnis stimmig, auch wenn sich Defaults später ändern."

> „Der Ergebnis-Schirm bekommt nur das Ergebnis, nicht den Raum – ohne diese
> beiden Zahlen könnte er einen Keller nicht als Keller bewerten."

Altergebnisse ohne diese Felder fallen auf die Wohnraum-Defaults zurück –
„genau die Bewertung, mit der sie damals entstanden sind". Das ist die
Projektkonvention „Gespeicherte Messergebnisse bleiben lesbar" in Reinform, und
ein eigener Test hält sie fest.

**Besonderheit gegenüber allen anderen Checks:** `yearlySaving` wird hier schon
**beim Speichern** durch `displaySavingEur()` gefiltert und auf 5 € gerundet.
Andere Checks legen den Rohwert ab und filtern erst bei der Anzeige. Wer den
Schwellenwert später ändert, ändert damit nichts an bereits gespeicherten
Ergebnissen.

---

## 6. Zwei Verbindungen zu anderen Checks

### (a) Kühl-/Gefriergerät nimmt die gemessene Raumtemperatur

`ambientTemperature.ts` – der Modulkopf nennt sie selbst:

> „**Die erste Verbindung zwischen zwei Checks in dieser App.** […] Ein
> Kühlschrank im 22 °C warmen Wohnzimmer arbeitet gegen ein anderes Gefälle als
> einer im 16 °C kühlen Keller.
>
> **Ohne Messung bleibt es beim Richtwert.** Kein Check macht einen anderen zur
> Voraussetzung; ohne Raumklima-Ergebnis gilt die Mitte des Komfortbands dieses
> Raumtyps, und ohne Raumangabe der Wohnraum-Wert."

Zwei eigene Schwellen, beide ausdrücklich als **Erfahrungswerte der E-App**
markiert:

- `AMBIENT_COLD_MIN_C = 10` – angelehnt an Klimaklasse SN; darunter schaltet
  der Thermostat älterer Geräte womöglich nicht mehr richtig. „Nicht aus einer
  Norm übernommen: Der Wert steht hier als Hinweisschwelle, nicht als
  Prüfkriterium."
- `AMBIENT_WARM_MIN_C = 20` – „Bewusst keine Prozentzahl daneben: Wie viel
  Mehrverbrauch daraus folgt, hängt an Dämmung, Alter und Dichtung des Geräts –
  Größen, die dieser Check nicht kennt. Er sagt deshalb, *dass* der Standort
  zählt, und behauptet nicht, *wie viel*."

Eine bekannte Unschärfe steht ebenfalls im Code: Ein Gerät kennt nur den
Raum**typ**, nicht die Instanz. Bei mehreren gleichartigen Räumen zählt deshalb
die **jüngste** Messung unter ihnen. „Genauer ginge es nur, wenn das Gerät die
Instanz trüge; das erfragt der Fragebogen nicht, und dafür eine Frage mehr zu
stellen wäre der schlechtere Tausch."

### (b) Möbelabstand liest das Raumklima desselben Raums

`FurnitureSpacingResult.tsx` holt sich das Ergebnis unter
`instanceKey('room_temperature', result.roomKey)` und speist Raumtemperatur und
Komfort-Untergrenze in `contextNotes()`. Kommentar: „Erst daraus entstehen
Aussagen, die diese Messung allein nicht hergibt."

Hier wird – anders als bei (a) – der **volle Instanz-Schlüssel** benutzt, also
exakt derselbe Raum.

---

## 7. Die fünf Empfehlungen, die der Check auslöst

`buildTips.ts`, Zeilen 634–727. Der Check ist damit der **produktivste
Tipp-Geber der App**:

| Tipp-ID | Auslöser | Aufwand / Kosten |
|---|---|---|
| `room_temperature` | Temperatur > Bandobergrenze (wärmster Raum steht im Text) | 2 min / 0 € |
| `room_cold` | Temperatur < Banduntergrenze − 2 °C (`ROOM_COLD_MARGIN_C`) | 5 min / 0 € |
| `humidity_high` | Feuchte > 60 % (`HUMID_MAX`) | 5 min / 0 € |
| `humidity_low` | Feuchte < 40 % (`HUMID_MIN`) | 5 min / 0 € |
| `draft` | Zugluft-Index ≥ 1 (spürbar oder stark) | 20 min / 8 € |

Der Temperatur-Tipp trägt **keinen Euro-Betrag**, sondern die Prozentzahl. Die
Begründung im Code:

> „Kein Euro-Betrag: Die 6 %/°C sind eine Faustregel für die gesamte beheizte
> Fläche, und der Raumanteil wird nach Grundfläche verteilt, während die
> Heizlast an der Hüllfläche hängt. Was das Modell wirklich behauptet, ist die
> relative Einsparung – die steht hier."

`bandOf(result)` liest dabei das **gespeicherte** Band, mit Rückfall auf den
Default – die Tipps bewerten ein Altergebnis also so, wie es entstanden ist.

⚠️ **Für Feuchte gilt das nicht** – siehe Abschnitt 12, Punkt 2.

---

## 8. Der Wissensbereich

`measurementThresholds.ts` zeigt fünf Bänder als Beispielzeilen (Wohn-/
Arbeitsräume, Schlafräume, Küche, Bad, Keller) – alle mit `rating: null`, weil
ein Komfortband keine Bewertungsstufe ist, sondern ein Zielbereich.

**Die `note` ist der ehrlichste Text der ganzen Richtwert-Tabelle** und
unterscheidet innerhalb einer einzigen Messung zwischen Belegtem und
Nicht-Belegtem:

> „Belegt sind die Werte für Wohnräume, Schlafzimmer, Küche und Bad sowie die
> Feuchte in Wohnräumen. Keller, Waschküche und die angenommene Wandtemperatur
> sind Richtwerte dieser App."

`origin`: **`ref(...)`** – Umweltbundesamt „Richtiges Heizen" ·
Verbraucherzentrale Energieberatung (Bad). Der Raumklima-Check gehört damit zu
den **belegten** Checks – anders als Wartezeit, Grundlast und Standby.

Hintergrundtext (`educationContent.ts`, Eintrag `room_temperature`) mit vier
Hebeln und **fünf** FAQ-Fragen: Thermostat-Zahlen (1 ≈ 12 °C … 5 ≈ 28 °C, das
häufigste Missverständnis), Nachtabsenkung (bei Wärmepumpen kontraproduktiv),
Heizkurve, einzelne Räume abdrehen (Untergrenze ~16 °C), richtig lüften
(Stoßlüften statt Kipp). Quelle: Wikipedia – wie projektweit noch offen.

---

## 9. Qualitätssicherung: 46 Testfälle in vier Dateien

| Datei | Fälle | Deckt ab |
|---|---|---|
| `roomClimate.test.ts` | 22 | Bewertung ↔ Ersparnis, Komfortbänder, Feuchte-Bänder, €-Darstellung |
| `dewPoint.test.ts` | 9 | Magnus-Formel gegen Handrechnung, Kondensat-Fälle, Fehleingaben |
| `ambientTemperature.test.ts` | 9 | Kopplung zum Geräte-Check |
| `roomAreas.test.ts` | 6 | Flächenverteilung |

Bemerkenswerte Zusagen, die dort festgeschrieben sind:

- **Kein Widerspruch zwischen Bewertung und Rat.** „Ein Raum im Komfortband
  wird als ‚optimal' bewertet – dann darf die App nicht gleichzeitig zum
  Absenken raten. Das prüft hier ein Test, statt sich auf die Abstimmung zweier
  getrennter Konstanten zu verlassen." Geprüft für **jeden** Raumtyp einzeln
  („bewertet in jedem Raumtyp die Bandmitte als optimal ohne Sparhinweis").
- **Jeder Raumtyp hat ein plausibles Band** – ein neuer Raumtyp ohne Eintrag
  lässt den Test rot werden.
- **Der Taupunkt liegt nie über der Lufttemperatur** (Kreuzprüfung über 30
  Kombinationen) und **bei 100 % genau darauf**.
- **Gespeicherte Ergebnisse bleiben gültig** – ein Ergebnis ohne `humMin`/
  `humMax` wird weiter nach Wohnraum-Maßstab bewertet.
- **Die Extremschwelle verschiebt sich mit dem Band**, statt fest zu stehen.
- **Kein Check ist Voraussetzung eines anderen** – ein eigener Test in
  `ambientTemperature.test.ts` sichert das ab.

---

## 10. Dateiverzeichnis

```
src/features/measurements/room_temperature/
├── roomClimate.ts             306 Z.  Bänder, Bewertung, Einsparformel
├── dewPoint.ts                 67 Z.  Magnus-Formel + Kondensat-Prüfung
├── heatingCost.ts              66 Z.  Jahres-Heizkosten aus dem Monitoring
├── roomAreas.ts                77 Z.  Flächenverteilung je Raum
├── RoomTemperatureIntro.tsx    76 Z.  Reiter „Info"
├── RoomTemperatureRun.tsx     192 Z.  Reiter „Messen"
└── RoomTemperatureResult.tsx  218 Z.  Reiter „Ergebnis"

tests/unit/roomClimate.test.ts · dewPoint.test.ts · ambientTemperature.test.ts
tests/unit/roomAreas.test.ts   · roomMigration.test.ts · roomLabel.test.ts

Außerhalb:
src/features/measurements/ambientTemperature.ts     Kopplung → Kühl-/Gefriergerät
src/features/measurements/rooms.ts                  Raumschlüssel, Labels
src/features/measurements/furniture_spacing/FurnitureSpacingResult.tsx
src/features/education/measurementThresholds.ts     Richtwert-Tabelle
src/features/education/educationContent.ts          Hintergrundtext + 5 FAQ
src/features/tips/buildTips.ts                      fünf Empfehlungen
src/features/onboarding/steps/Step3Rooms.tsx        Flächen-Platzhalter
src/features/reports/measurementsReportData.ts      Einheit °C
src/features/demo/demoProfile.ts                    drei Beispielergebnisse
src/store/readingsStore.ts · tariffStore.ts · onboardingStore.ts
```

---

## 11. Chronologie

| Datum | Commit | Was |
|---|---|---|
| 03.09.2026 | `02832f3` | „der Standort benennt, bewertet und verbindet" – `ambientTemperature.ts`, die erste Kopplung zwischen zwei Checks |
| 03.09.2026 | `b010db5` | „zwei belegte Quellen nachtragen, vier Werte auf offen setzen" – die 6 %/°C bekommen ihre geprüfte Quelle |
| 05.09.2026 | `7a16fe0` | „Räume einzeln benennen, bemessen und löschen" – `RoomEntry` trägt `instances`; `resolveRoomArea` rechnet je Raum statt je Raumart. **Hier entsteht der Fehler aus Abschnitt 12.** |

Kellerklima nach Keller-Maßstäben (Taupunkt statt Wohnraum-Prozentwert) und die
Feuchte-Bänder stammen aus der Verbesserungsrunde vom 04.09. – siehe `CLAUDE.md`.

---

## 12. Was offen oder kaputt ist

### 1. ⛔ Die €-Ersparnis erscheint seit dem 05.09.2026 nie mehr (verifiziert)

**Fundstelle:** `RoomTemperatureRun.tsx`, Zeile 75.

```ts
const area = roomType
  ? resolveRoomArea(profile.rooms, profile.livingArea, roomType)   // ← roomType
  : { areaSqm: 0, estimated: true }
```

`resolveRoomArea` erwartet dort seit Commit `7a16fe0` einen **Raum-Schlüssel**
(`'bedroom#a1b2c3d4'`), nicht einen **Raumtyp** (`'bedroom'`). Vorher war die
Signatur `(rooms, livingArea, type: RoomType)` – der Umbau hat den Parameter
gewechselt, `RoomTemperatureRun.tsx` wurde dabei **nicht angefasst**.

Der Typecheck greift nicht: `RoomType` ist ein String-Union und damit einem
`string`-Parameter zuweisbar.

**Wirkungskette:**

```
instances.find(inst => inst.key === 'bedroom')  → undefined   (Keys sind 'bedroom#…')
parseRoomKey('bedroom')                          → null        (Regex verlangt '#')
  → type = undefined → fallback = 0
  → areaSqm = remaining × 0 / weight = 0
  → share  = 0
  → yearlySaving = undefined   (die Bedingung `share > 0` scheitert)
```

Nachgestellt mit den echten Funktionskörpern: mit Schlüssel `66 m²`, mit Typ
`0 m²`.

**Was der Nutzer sieht:** Die Sparkarte erscheint weiterhin (sie hängt an
`savingDeltaT`, nicht am Betrag), zeigt aber **immer** die Prozentvariante
„−12 % Heizenergie" plus den Link „Heizverbrauch & Preis eintragen" – auch
dann, wenn er längst Ablesungen und Preise eingetragen hat. Kein Datenverlust,
keine falsche Zahl; die App verspricht nur dauerhaft etwas, das sie nach
Eintragen der Daten nicht einlöst.

**Warum kein Test das fängt:** `roomAreas.test.ts` ruft die Funktion immer mit
korrektem Schlüssel auf. Der einzige fehlerhafte Aufruf steht im
Runner-Component, und für Komponenten gibt es keine Tests.

**Naheliegende Behebung** (nicht ausgeführt – Projektregel):
`roomKey` statt `roomType` durchreichen, also
`roomKey ? resolveRoomArea(profile.rooms, profile.livingArea, roomKey) : …`.
`roomKey` liegt im selben Scope als `RunProps`-Feld bereits vor. Dazu ein Test,
der `calcRoomTempSaving` mit einer aus `resolveRoomArea` aufgelösten Fläche
gegen einen echten Instanz-Schlüssel prüft.

### 2. ⚠️ Die Feuchte-Tipps ignorieren das raumtypabhängige Band

`buildTips.ts` filtert mit den festen Konstanten `HUMID_MAX = 60` und
`HUMID_MIN = 40`, während der Check selbst gegen `humidityBand(roomType)`
bewertet – und die Bänder für Keller und Waschküche eigens dafür mitspeichert
(`humMin`/`humMax` in `details`).

**Folge:** Ein Keller mit 65 % wird im Ergebnis korrekt als „Optimal" bewertet,
löst aber trotzdem den Tipp „zu feucht" aus. Genau der Fall, den die
Band-Einführung beheben wollte.

Für die Temperatur ist das bereits gelöst – `bandOf(result)` liest das
gespeicherte Band. Ein Gegenstück `humBandOf(result)` fehlt.

*(Beobachtung aus dem Code, kein gemeldeter Befund.)*

### 3. Der Zugluft-Wert ist rein subjektiv

Drei Chips ohne Messgröße. Er kann allein ein `high`-Rating auslösen („stark").
Das ist bewusst so – ohne Anemometer gibt es nichts zu messen – aber es ist die
einzige Stelle des Checks, an der eine Selbsteinschätzung dieselbe Wirkung hat
wie ein Messwert.

### 4. Die Wandtemperatur ist eine Annahme, keine Messung

`ASSUMED_BASEMENT_WALL_C = 12` – im Code begründet (Abschnitt 3). Eine echte
Messung bräuchte ein Infrarot-Thermometer, das der Fragebogen nicht
voraussetzt. Die Richtwert-Tabelle weist die Annahme aus.

### 5. Die Heizlast hängt an der Hüllfläche, verteilt wird nach Grundfläche

Im Code benannt (Abschnitt 4). Ein Eckzimmer mit zwei Außenwänden und großem
Fenster hat bei gleicher Grundfläche eine deutlich höhere Heizlast als ein
Innenzimmer. Die App weiß von Außenwänden und Fenstern nichts.

### 6. Nachströmende Wärme aus Nachbarräumen

Ebenfalls im Code benannt: Senkt man **einen** Raum, fließt Wärme von nebenan
nach. Die berechnete Ersparnis ist damit systematisch eine Obergrenze.

### 7. `showValue={false}` ist im Raumklima nicht gesetzt

Der gemeinsame `Stepper` kann seit dem 05.09. seinen Rohwert verbergen. Hier
steht der Wert zweimal – einmal roh im Stepper, einmal formatiert daneben
(„21,0 °C"). Offene Frage an Kilian (Befund 37 in `docs/gefundene-probleme.md`).

### 8. Die Quelle des Hintergrundtextes zeigt auf Wikipedia

Projektweit offen; die Umstellung auf Primärquellen braucht Netzzugang zum
Prüfen der URLs.

---

## 13. Wenn du etwas änderst

1. **Ein Band ändern** → nur in `roomClimate.ts` (`COMFORT_BANDS`,
   `HUMIDITY_BANDS`). Wissensbereich und Tipps ziehen nach.
   `measurementInfos.test.ts` und `roomClimate.test.ts` prüfen das.
2. **Einen Raumtyp hinzufügen** → er braucht einen Eintrag in `COMFORT_BANDS`
   **und** in `TYPICAL_AREA_SQM`, sonst wird der Test rot („hält für jeden
   Raumtyp ein plausibles Band vor").
3. **Ein neues `details`-Feld** → daran denken, dass Altergebnisse es nicht
   tragen. Nie mit `?? 0` auffüllen – prüfen, ob es da ist, und sonst sagen,
   dass nichts gemessen wurde (die Lehre aus Befund 8 beim Wartezeit-Check).
4. **Die Einsparformel anfassen** → zuerst den Test „weist im Komfortband kein
   Sparpotenzial aus" lesen. Bewertung und Rat dürfen sich nie widersprechen.
5. **Am Taupunkt rechnen** → die Testwerte in `dewPoint.test.ts` sind von Hand
   nachgerechnet; wer die Koeffizienten ändert, ändert sie mit Begründung.
6. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.
   *In der Session vom 05.09. war das nicht möglich – der Container hatte kein
   `node_modules`. Wer als Nächstes hier arbeitet, prüft das zuerst.*

---

## 14. Hinweise für eine schriftliche Ausarbeitung

Falls aus dieser Datei ein Kapitel werden soll – wie beim Wartezeit-Check
(`docs/warmwassermessung.md`):

**Möglicher Aufbau**

1. Einordnung: drei Messgrößen, ein Rating, je Raum
2. Warum ein Komfortband je Raumtyp – Bewertung ohne Kontext bewertet falsch
3. Der Taupunkt: warum eine Prozentzahl die falsche Frage ist (Abschnitt 3)
4. Die Einsparkette und ihre vier Module – und wo sie ehrlich wird
   (Abschnitt 4)
5. Verbundene Messungen: der Kühlschrank nimmt die gemessene Raumtemperatur
6. Absicherung: 46 Tests, und was sie zusagen
7. Grenzen: Hüllfläche, Nachbarräume, Wandtemperatur – **und der Fehler aus
   Abschnitt 12**

**Der stärkste inhaltliche Punkt** ist der Taupunkt: Die App ersetzt eine
naheliegende, aber falsche Kennzahl (relative Feuchte) durch die physikalisch
richtige Frage (kondensiert diese Luft an dieser Wand?) – und begründet
zugleich, warum die dafür nötige Wandtemperatur eine Annahme bleiben muss.

**Der stärkste methodische Punkt** ist die Widerspruchsfreiheit: Bewertung und
Handlungsempfehlung stammen aus derselben Quelle, und ein Test hält fest, dass
sie sich nie widersprechen können.

**Was der Text nicht behaupten darf:**
- dass die Ersparnis eine Prognose sei – der Code nennt sie eine Größenordnung
- dass Keller-Feuchtewerte und Wandtemperatur belegt seien – sie sind
  ausdrücklich Richtwerte der E-App
- dass die €-Ersparnis derzeit funktioniere (Abschnitt 12, Punkt 1)
- dass die Zugluft gemessen werde – sie ist eine Selbsteinschätzung

**Zitierfähige Sätze aus dem Code:**

> „Schimmel entsteht nicht bei einer Prozentzahl, sondern wenn feuchte Luft auf
> eine Oberfläche trifft, die kälter ist als der Taupunkt dieser Luft."

> „Wir rechnen mit dem oberen Rand – die vorsichtigere Annahme, weil sie
> seltener warnt und damit keine Warnung erzeugt, die niemand ernst nimmt."

> „Ein eigenes Band je Raumtyp wäre eine Genauigkeit, die die Sache nicht
> hergibt."

> „Eine Regel statt zweier Tabellen, die auseinanderlaufen können."
