# Der Grundlast-Check der E-App – Referenz für die schriftliche Ausarbeitung

**Zweck dieses Dokuments.** Es beschreibt den Grundlast-Check der E-App: wozu
er da ist, wie er misst, wie er bewertet und welche Fehler in seiner
Entwicklung auftraten und wie sie behoben wurden. Es ist als **Faktenquelle**
für ein Kapitel der Hausarbeit gedacht, nicht als fertiger Fließtext – die
Formulierungen dürfen frei umgeschrieben werden, Zahlen, Formeln und
Dateiverweise nicht.

**Stand:** 06.09.2026, Commit `2585731` („Grundlast-Check: grobe Zähler
ehrlich rechnen, Unsinnswerte abfangen, Impuls-Messung"). Alle Angaben sind
aus `src/features/measurements/base_load/baseLoad.ts` (reine
Berechnungslogik, keine UI-Abhängigkeiten) sowie den zugehörigen
UI-Komponenten und Tests belegt.

**Projektkontext in einem Satz:** Die E-App ist eine deutschsprachige
Energie-Analyse-Anwendung (React 19, TypeScript, Tailwind CSS v4); der
Grundlast-Check ist eine von neun Messungen im Bereich „Strom" (Kategorie
`electricity`), Schwierigkeit 2 von 3, veranschlagte Dauer 5 Minuten
(`measurements/catalog.ts`).

---

## 1. Wozu der Check da ist

Die „Grundlast" ist der Strom, den ein Haushalt **rund um die Uhr** zieht,
auch wenn niemand ihn aktiv nutzt: Kühlschrank, Router, Standby-Geräte,
Heizungspumpe. Sie ist in der Stromrechnung unsichtbar, weil sie nie als
eigener Posten auftaucht – nur als Sockel, der immer mitläuft.

**Zentral für das Verständnis des Checks:** Er ist als **Diagnose** angelegt,
nicht als Maßnahme. Er beziffert *dass* dauerhaft Strom fließt und *wie
viel*, aber nicht *wodurch*. Deshalb trägt er im Unterschied zu den meisten
anderen Checks bewusst **keinen eigenen Sparwert** – die konkrete,
bezifferte Einsparung liefert der nachgelagerte Standby-Check, der Gerät für
Gerät durchgeht. Diese Trennung ist im Code ausdrücklich als Vorkehrung gegen
**Doppelzählung** kommentiert:

> „Bewusst KEIN avoidableCost/yearlySaving: Grundlast ist Diagnose, die € 
> beziffern die Folge-Checks (kein Doppelzählen)."
> (`BaseLoadRun.tsx`)

Fällt die Grundlast auffällig hoch aus, verlinkt das Ergebnis direkt in den
Standby-Check (`funnelTitle`/`funnelCta` in `BaseLoadResult.tsx`); dieselbe
Weiterleitung erzeugt einen Eintrag im Empfehlungssystem, aber nur, solange
der Standby-Check noch nicht gemacht wurde (`buildTips.ts`, Zeile ~543 ff.):

```ts
const bl = worstRating(results, 'base_load')
if (bl && bl !== 'good' && !results['standby']) {
  tips.push({ id: 'base_load', linkTo: '/measurements/standby', … })
}
```

---

## 2. Warum die Messung an sich schwierig ist

Zwei Eigenschaften des realen Verbrauchs machen die Grundlast schwerer zu
messen, als „einmal ablesen" vermuten lässt:

1. **Der Kühlschrank taktet.** Sein Kompressor läuft nur einen Teil der
   Zeit (grob ein Drittel, mit merklicher Leistung, ~80 W). Eine kurze
   Momentaufnahme erwischt „an" oder „aus" – der Fehler daraus ist größer
   als jede Zähler-Ungenauigkeit und lässt sich nur durch **Zeit**
   herausmitteln.
2. **Nicht jeder Zähler zeigt Watt an.** Ältere und viele digitale Zähler
   zeigen nur einen kumulativen Zählerstand in kWh, keine Momentanleistung.

Aus diesen beiden Problemen folgen die drei Messwege des Checks (Abschnitt 3)
und die Qualitätsprüfung der Zwei-Ablesungen-Methode (Abschnitt 4).

---

## 3. Die drei Messwege

Quelle: `baseLoad.ts`, Typ `MeterMode = 'instant' | 'impulse' | 'readings'`.

| Modus | Voraussetzung | Wie gemessen wird | Charakter |
|---|---|---|---|
| `instant` | Zähler zeigt Leistung direkt in Watt | Wert wird abgelesen und eingetippt | Momentaufnahme |
| `impulse` | Zähler hat Impuls-LED oder Ferraris-Drehscheibe (Typenschild) | Impulse werden mit Stoppuhr gezählt | Momentaufnahme, aber **exakt** statt geraten |
| `readings` | jeder Zähler mit kWh-Anzeige | zwei Zählerstände mit zeitlichem Abstand (i. d. R. über Nacht) | gemittelt über mehrere Kühlschrank-Zyklen |

### 3.1 Berechnungsformeln

```
wattsFromTimed(startKwh, endKwh, elapsedMs):
    P[W] = (endKwh − startKwh) × 1000 / (elapsedMs / 3.600.000)

wattsFromImpulses(impulses, seconds, impulsesPerKwh):
    P[W] = impulses × 3.600.000 / (impulsesPerKwh × seconds)
```

`impulse` ist der einzige Weg, der **ohne** Watt-Anzeige und **ohne**
stundenlanges Warten auskommt: Zehn Impulse bei angenommenen 355 W
dauern rund 100 Sekunden. Die Zählerkonstante (z. B. „1000 imp/kWh" oder
„75 U/kWh" bei Ferraris-Zählern) steht auf dem Typenschild des Zählers und
wird im Zwischenspeicher (Draft) gehalten, weil sie sich nie ändert – nur die
gestoppte Zeit gehört zu genau einem Messversuch.

### 3.2 Was der Check bewusst nicht mehr ist

Eine frühere Fassung sah eine Stoppuhr-Messung direkt am Zähler vor, die
verlangte, minutenlang davor zu stehen, obwohl sich die Anzeige in dieser
Zeit oft gar nicht bewegen konnte. Sie ist ersatzlos entfallen; an ihre
Stelle trat die Zwei-Ablesungen-Methode mit persistentem Zwischenspeicher
(„Handy weglegen, am nächsten Morgen wiederkommen") – dieselbe Erfassungsart,
die Kühlschrank- und Gefriertruhen-Check schon nutzen.

---

## 4. Qualitätssicherung der Zwei-Ablesungen-Methode

Diese Methode ist die einzige, die über mehrere Kühlschrank-Zyklen mittelt –
aber nur brauchbar, wenn Zähler-Auflösung und Wartezeit zueinander passen.
Die Prüfung dafür ist mehrstufig:

- **`METER_RESOLUTIONS`** – wählbare Anzeige-Auflösungen: `1`, `0,1`, `0,01`,
  `0,001` kWh (letzte angezeigte Stelle des Zählers).
- **`CYCLE_SAFE_MS`** (3 Stunden) – Mindestdauer, damit die Messung mehrere
  Kühlschrank-Takte abdeckt, nicht nur „an" oder „aus" erwischt.
- **`recommendedWaitMs(resolution)`** – empfohlene Wartezeit für zehn
  Anzeigeschritte bei einer angenommenen Grundlast von 100 W, mindestens
  aber `CYCLE_SAFE_MS`.
- **`readableOvernight(resolution)`** – ob die empfohlene Wartezeit
  innerhalb einer Nacht (12 Stunden) liegt. Ist sie das nicht (grober
  Zähler ohne Nachkommastelle bräuchte ~100 Stunden), zeigt die App einen
  Hinweis samt Knopf, der direkt in den `impulse`-Modus wechselt, statt eine
  unrealistische Wartezeit als Empfehlung hinzuschreiben.
- **`readingsQuality(startKwh, endKwh, elapsedMs, resolutionKwh)`** – die
  zentrale Prüffunktion. Sie liefert nicht nur ein `true`/`false`, sondern
  bei Nichtverwertbarkeit einen von drei benannten Gründen
  (`ReadingsProblem`), weil jeder eine andere Abhilfe braucht:

  | Grund | Bedeutung | Abhilfe |
  |---|---|---|
  | `tooLittleMovement` | Zähler hat sich zu wenig bewegt (Unsicherheit > 50 %) | länger warten |
  | `tooShort` | Zeitraum unter `CYCLE_SAFE_MS` (3 Std.) | länger warten |
  | `implausible` | errechnete Leistung ist physikalisch unmöglich | Zählerstand prüfen (vermutlich Tippfehler) |

  Eine Messung gilt erst als `usable`, wenn **keiner** der drei Gründe
  zutrifft; zusätzlich wird sie als `good` (Unsicherheit ≤ 10 %) oder `fair`
  (bis 50 %) eingestuft.

---

## 5. Die physikalische Plausibilitätsschranke

```ts
export const MAX_PLAUSIBLE_W = 43_000  // 3 × 63 A bei 230 V, üblicher Hausanschluss
export function plausibleWatts(watts: number): boolean {
  return Number.isFinite(watts) && watts > 0 && watts <= MAX_PLAUSIBLE_W
}
```

Die Begründung ist bewusst technisch, nicht statistisch: Ein üblicher
Hausanschluss ist mit 3 × 63 A abgesichert (~43 kW), eine Wohnung liegt mit
3 × 35 A darunter. Jeder errechnete Wert darüber kann keine reale
Haushaltsmessung sein – er ist ein Tippfehler im Zählerstand oder eine
zweite Ablesung Sekunden nach der ersten. Diese Schranke greift an zwei
Stellen: bei der Auswertung der Zwei-Ablesungen-Methode (Teil von
`readingsQuality`) und beim Vorher/Nachher-Vergleich (Abschnitt 7).

---

## 6. Bewertung: absolut oder relativ zum eigenen Verbrauch

```ts
export function rateBaseLoad(watts: number, share?: number): MeasurementRating
```

Die Bewertung erfolgt **vierstufig** (`good` / `medium` / `elevated` /
`high`) und bevorzugt, wo möglich, den **Anteil am Jahres-Stromverbrauch**
gegenüber einer absoluten Watt-Zahl:

| Maßstab | Schwellen | Grenzen |
|---|---|---|
| absolut (W) | ≤70 gut · ≤150 okay · ≤250 erhöht · >250 hoch | ignoriert Haushaltsgröße: eine Familie mit Gefriertruhe liegt immer über 70 W |
| Anteil am Jahresverbrauch | ≤25 % gut · ≤35 % okay · ≤50 % erhöht · >50 % hoch | unabhängig von der Haushaltsgröße, aber nur verfügbar mit belastbarer Ablesehistorie im Monitoring |

Der Anteil wird nur berechnet, wenn im Monitoring bereits eine
Jahres-Hochrechnung für Strom existiert (`baseLoadShare()`); ohne sie fällt
die Bewertung auf die absoluten Watt-Schwellen zurück. Zusätzlich gilt: Ein
Anteil über 95 % (`IMPLAUSIBLE_SHARE`) wird als **unmöglich** markiert statt
bewertet – die Grundlast ist per Definition eine Teilmenge des
Gesamtverbrauchs; kommt mehr heraus, liefen bei der Messung noch aktiv
genutzte Geräte mit, oder es liegt ein Zählerfehler vor.

**Eigene Beschriftungen statt der neutralen Skala.** Die vier Stufen tragen
eigene, für diesen Check formulierte Bezeichnungen (`Niedrig · Okay ·
Erhöht · Hoch`) statt der App-weiten generischen Skala, in der dieselbe
mittlere Stufe „Gut" hieße. Dieselbe Korrektur wurde im Projekt mehrfach
angewendet (Möbelabstand-Check, Standby-Check), nachdem aufgefallen war,
dass die neutrale Beschriftung bei einem Befund mit Handlungsbedarf
beschönigend wirkt.

---

## 7. Vorher/Nachher-Vergleich: der einzige Nachweis ohne Schätzung

```ts
export function baseLoadChange(
  previous: BaseLoadPoint,
  current: BaseLoadPoint,
  workPriceCt: number,
): BaseLoadChange | undefined
```

Der Check erlaubt einen Vergleich zweier eigener Messungen („Vorher/Nachher"),
wenn Dauerverbraucher abgeschafft wurden. Bemerkenswert dafür ist die
Kommentierung im Code selbst:

> „Das ist der eine Punkt, an dem die App nicht schätzt, sondern nachweist."

Die Berechnung berücksichtigt die **Messunsicherheit** beider Zeitpunkte:

- Momentaufnahmen (`instant`, `impulse`) tragen pauschal ±25 %
  (`SNAPSHOT_UNCERTAINTY`) – weil unbekannt ist, ob der
  Kühlschrank-Kompressor gerade lief.
- Die Zwei-Ablesungen-Methode trägt ihre tatsächlich berechnete Unsicherheit
  aus `readingsQuality()`.
- Beide Unsicherheiten werden **quadratisch addiert** (statistisch
  unabhängige Fehler), mit einer Untergrenze von 5 W (`MIN_TOLERANCE_W`) –
  „zwei Nächte sind nie exakt gleich".
- Ein Unterschied gilt nur dann als **belegt** (`significant`), wenn er
  größer ist als diese Toleranz. Erst dann wird eine jährliche
  Euro-Ersparnis ausgewiesen; sonst zeigt die App ausdrücklich, dass sich der
  Unterschied „nicht belegen" lässt.
- Beide verglichenen Messungen müssen zusätzlich für sich `plausibleWatts()`
  erfüllen (Abschnitt 5) – sonst wird der Vergleich verweigert.

Diese Vorsicht ist bewusst gewählt, um einen realen, in der Entwicklung
aufgetretenen Fehler dauerhaft auszuschließen (Abschnitt 8).

---

## 8. Entwicklungsgeschichte: drei Befunde vom 06.09.2026

Die Befundliste `docs/gefundene-probleme.md` dokumentiert einen konkreten
Fall, an dem sich Fehlerfindung und -behebung im Projekt nachvollziehen
lassen – gut geeignet als Fallbeispiel für ein Kapitel zur Qualitätssicherung.

### 8.1 Befund #38 – zehnfach zu gute Genauigkeit

Eine reale Messung (5751 → 5756 kWh in 14 Std. 4 Min., 355 W) zeigte
„Belastbare Messung, ±2 % genau" – obwohl der verwendete Zähler **keine**
Nachkommastelle anzeigt. Ursache: `METER_RESOLUTIONS` kannte nur `0,1 / 0,01
/ 0,001` kWh; wer einen gröberen Zähler hat, musste zwangsläufig die
nächstfeinere Stufe wählen und bekam deren (falsche) Genauigkeit
bescheinigt. Richtig gerechnet ergibt `1 / 5 = 20 %` Unsicherheit, nicht
`0,1 / 5 = 2 %`. Behoben durch Ergänzen der Stufe `1` in
`METER_RESOLUTIONS`.

### 8.2 Befund #39 – eine Ersparnis von 381.209 € im Jahr

Aus einer versehentlich sehr kurzen Messung (rekonstruiert: rund zwölf
Sekunden zwischen zwei Ablesungen) ergab sich eine Grundlast von
**145.703 W** – ein Vielfaches dessen, was ein Hausanschluss überhaupt
hergibt (~43 kW) – und daraus im Vorher/Nachher-Vergleich eine behauptete
Jahresersparnis von 381.209 €. Zwei Lücken hatten das ermöglicht:

1. `readingsQuality()` prüfte die verstrichene Zeit gar nicht als
   Ausschlusskriterium, nur die Bewegung des Zählerstands.
2. `wattsFromTimed()` und `baseLoadChange()` kannten keine Obergrenze für
   plausible Werte.

Behoben durch die Einführung von `MAX_PLAUSIBLE_W`/`plausibleWatts()`
(Abschnitt 5), eine harte Mindestdauer von drei Stunden
(`CYCLE_SAFE_MS`) als Ausschlusskriterium statt bloßem Abzug in der
Bewertung, und eine Verweigerung des Vorher/Nachher-Vergleichs, sobald
**eine** der beiden Messungen unmöglich ist – wichtig, weil gespeicherte
Altergebnisse nicht migriert werden und ein solcher Unsinnswert weiterhin
im Datenbestand liegen kann.

### 8.3 Verbesserung #40 – neuer Messweg „Impulse zählen"

Aus #38 folgte ein ungelöstes Problem: Mit einem Zähler ohne
Nachkommastelle ist die Zwei-Ablesungen-Methode grundsätzlich untauglich
(rechnerisch nötig wären rund 100 Stunden Wartezeit), eine Watt-Anzeige hat
ein solcher Zähler aber auch nicht. Die Lösung war kein Kompromiss bei der
Genauigkeit, sondern ein **dritter Messweg**: Fast jeder Zähler hat eine
Impuls-LED oder eine Ferraris-Drehscheibe, deren Takt sich mit einer
Stoppuhr zählen lässt – unabhängig vom Display. Dieser Weg (`impulse`,
Abschnitt 3.1) bleibt bewusst eine Momentaufnahme mit derselben ±25 %
Unsicherheit wie „Zähler zeigt Watt", weil dieselbe Unschärfe
(Kühlschrank-Kompressor an oder aus) gilt – nur ohne Ratewert, exakt am
tatsächlichen Zähler-Takt gemessen.

**Einordnung für die Ausarbeitung:** Alle drei Punkte entstanden aus einer
einzigen realen Nutzung mit einem bestimmten (grob anzeigenden) Zähler –
keinem synthetischen Testfall. Das zeigt exemplarisch, warum ein Live-Test
mit echten Geräten Fehlerklassen aufdeckt, die ein Test mit erfundenen
Zahlen leicht übersieht.

---

## 9. Einbettung in die App

- **Messgeräte:** Pflicht ist der Stromzähler des Hauses selbst
  (`instruments: [{ type: 'power_meter', required: true }]` in
  `catalog.ts`) – keine separate Anschaffung, „Pflicht, aber ohne
  Anschaffung".
- **Zählerstand erfassen:** wahlweise per Texteingabe oder per
  Kamera-Scan; der Scanner wird aus dem Monitoring-Bereich
  wiederverwendet (On-Device-Texterkennung, kein Cloud-Dienst) und liefert
  einen Vorschlag, den der Nutzer bestätigen muss – Kommastellen ergänzt er
  von Hand, weil sie bei dieser Messung die eigentliche Größe sind.
- **Kein eigener Sparwert** (`yieldsSaving` in `catalog.ts` bleibt für
  `base_load` unbesetzt) – bewusst, um Doppelzählung mit dem Standby-Check
  zu vermeiden (Abschnitt 1).
- **Persistenz während der Messung:** Start-Zählerstand und -Zeitpunkt
  liegen im `measurementDraftStore`, damit die App zwischen den beiden
  Ablesungen geschlossen werden kann, ohne den Zwischenstand zu verlieren.

---

## 10. Testabdeckung

`tests/unit/baseLoad.test.ts` prüft die reine Berechnungslogik aus
`baseLoad.ts` unabhängig von der Oberfläche: Bewertungsschwellen (absolut und
über den Anteil), beide Berechnungsformeln, die Qualitätsprüfung der
Zwei-Ablesungen-Methode mit allen drei `ReadingsProblem`-Fällen, die
Plausibilitätsschranke und den Vorher/Nachher-Vergleich samt
Toleranzberechnung. Die Korrektur aus Befund #39 (Mindestdauer als hartes
Ausschlusskriterium) kehrte dabei eine bestehende Testaussage bewusst um –
im Test dokumentiert als gewollte Verhaltensänderung, nicht als
Testanpassung zur Fehlerbehebung.

---

## 11. Grenzen und offene Punkte

Diese Punkte sollten in einer Ausarbeitung nicht beschönigt werden:

1. **Die absoluten Watt-Schwellen** (70/150/250 W) sind laut Code-Kommentar
   „bewusst grob – und zwangsläufig unfair": Ein Haushalt mit Gefriertruhe
   liegt strukturell über 70 W, unabhängig von seiner Sparsamkeit. Sie
   gelten nur als Rückfall ohne Ablesehistorie.
2. **Kein belegter Ursprung der Schwellen.** Weder die Watt- noch die
   Anteils-Schwellen tragen im Code einen Quellenverweis; nach der
   Projektkonvention „jeder Richtwert nennt seine Herkunft"
   (`ThresholdOrigin` in `measurementThresholds.ts`) zählt der Grundlast-
   Check zu den in `CLAUDE.md` genannten offenen Fällen ohne belegte Quelle.
3. **Die Impuls-Zählerkonstante wird nicht verifiziert**, außer über die
   Plausibilitätsschranke (ein vertippter Faktor 1 statt 1000 imp/kWh würde
   abgefangen, ein subtilerer Zahlendreher nicht zwangsläufig).
4. **Der Anteils-Maßstab braucht Vorlaufzeit:** Ohne bereits vorhandene
   Ablesehistorie im Monitoring bleibt nur der unfaire absolute Maßstab –
   ein Neunutzer sieht seine Grundlast also zunächst gegen den gröberen
   Vergleich bewertet.

---

## 12. Wo was im Quellcode steht

| Datei | Inhalt |
|---|---|
| `src/features/measurements/base_load/baseLoad.ts` | Reine Berechnungs- und Bewertungslogik (keine UI) |
| `src/features/measurements/base_load/BaseLoadIntro.tsx` | Erklärseite vor der Messung |
| `src/features/measurements/base_load/BaseLoadRun.tsx` | Durchführung, alle drei Messwege |
| `src/features/measurements/base_load/BaseLoadResult.tsx` | Ergebnis-Ansicht, Anteil, Vorher/Nachher |
| `src/features/measurements/base_load/ReadingCapture.tsx` | Zählerstand erfassen (Texteingabe/Kamera) |
| `src/features/measurements/catalog.ts` | Katalog-Eintrag `base_load` (Messgeräte, Kategorie) |
| `src/features/tips/buildTips.ts` | Verlinkung zum Standby-Check als Empfehlung |
| `tests/unit/baseLoad.test.ts` | Testabdeckung der Berechnungslogik |
| `docs/gefundene-probleme.md`, Punkte 38–40 | Fehlerhistorie mit Ursache und Fix |

---

## 13. Hinweise für die Weiterverarbeitung

- **Zahlen, Formeln und Schwellen bitte unverändert übernehmen** – sie sind
  aus dem Code belegt; freie Umformulierung betrifft nur den Fließtext.
- **Gute Kandidaten für Abbildungen:** die drei Messwege als
  Entscheidungsbaum („Zeigt der Zähler Watt an? → … Ist die Auflösung fein
  genug? → …", Abschnitte 3–4); die Fehlerkette von Befund #39 als
  Ursache-Wirkungs-Diagramm (Abschnitt 8.2).
- **Guter Kandidat für eine Diskussion/Reflexion:** Der Grundsatz „Diagnose
  statt Maßnahme" (Abschnitt 1) als bewusste Entwurfsentscheidung gegen
  Doppelzählung, und die Frage, wie viel Genauigkeit eine Selbstmessung mit
  Alltagsmitteln (Zählerstand, Stoppuhr) realistisch erreichen kann – die
  App beantwortet das nicht mit einer einzigen Zahl, sondern mit einer
  ausgewiesenen Unsicherheit (±X %).
- **Vorsicht bei Superlativen:** Formulierungen wie „genau" oder „exakt"
  sollten an Abschnitt 11 gemessen werden – der Check weist seine
  Unsicherheit aus, behauptet aber nirgends Fehlerfreiheit.
