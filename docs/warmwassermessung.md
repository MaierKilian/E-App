# Warmwassermessung – Materialsammlung für die schriftliche Ausarbeitung

> **Zweck dieser Datei.** Sie ist die Übergabe an die nächste KI-Session, die
> für Kilian den Text der Hausarbeit / Dokumentation über die
> **Warmwassermessung der E-App** schreiben soll. Sie enthält alles, was dafür
> nötig ist: das Messverfahren, die Rechnung, die Konstanten mit ihrer
> Herkunft, die Designentscheidungen samt Begründung, die Einbettung in die
> übrige App, die abgesicherten Zusagen, die bekannten Grenzen – und am Ende
> konkrete Hinweise, wie daraus ein Fließtext wird.
>
> Stand: 05.09.2026, Branch `claude/sync-r50n1f` (deckungsgleich mit `main`,
> Commit `0b7d1fc`).
>
> **Wichtig für die schreibende KI:** Alle Zahlen, Formeln und Zitate in dieser
> Datei sind aus dem Quelltext übernommen, nicht aus dem Gedächtnis. Wo eine
> Aussage unbelegt ist, steht das ausdrücklich dabei (→ Abschnitt 6 und 12).
> Bitte diese Kennzeichnung in den Text übernehmen, statt sie wegzuglätten:
> Die Ehrlichkeit über die eigenen Annahmen ist der methodisch interessanteste
> Teil dieses Checks und trägt einen ganzen Abschnitt der Ausarbeitung.

---

## 1. Begriffsklärung: Was „die Warmwassermessung" genau ist

Die E-App hat **zwei** Messungen im Themenbereich Warmwasser
(`category: 'hot_water'` im Katalog). Der Text sollte gleich zu Beginn
klarstellen, welche gemeint ist – sonst vermischen sich Zahlen.

| Check | ID | Was gemessen wird | Einheit | Ordner |
|---|---|---|---|---|
| **Warmwasser-Wartezeit** | `hot_water_wait` | Sekunden, bis warmes Wasser an der Zapfstelle ankommt | `s` | `src/features/measurements/hot_water_wait/` |
| Duschkopf-Durchfluss | `showerhead` | Liter pro Minute am Duschkopf | `L/min` | `src/features/measurements/showerhead/` |

**Diese Datei behandelt den Wartezeit-Check** (`hot_water_wait`) – das ist
„die Warmwassermessung" im engeren Sinn. Der Duschkopf-Check kommt vor,
weil beide gekoppelt sind (→ Abschnitt 7); seine eigene, vollständige
Beschreibung liegt in **`docs/duschkopf-test.md`** und sollte nicht hier
nacherzählt werden.

Wenn die Ausarbeitung „Warmwassermessung" als Oberbegriff für beide meint,
lässt sich das gut gliedern: der Duschkopf-Check misst **wie viel** Wasser
fließt, der Wartezeit-Check misst **wie lange es dauert, bis es brauchbar
ist**. Der zweite benutzt das Ergebnis des ersten.

---

## 2. Was der Check tut – die Nutzersicht

Der Ablauf in der App hat drei Schritte, und die Oberfläche zeigt sie in
genau dieser Reihenfolge (`HotWaterWaitRun.tsx`):

1. **Entnahmestelle wählen** – Dusche, Badewanne, Küche oder Waschbecken.
2. **Hahn voll auf warm stellen und die Stoppuhr starten** – im selben Moment.
3. **Stoppen, sobald das Wasser spürbar warm ist.**

Die App zeigt danach: die gestoppte Wartezeit als Hauptzahl mit vierstufiger
Bewertung, die dabei ungenutzt abgeflossene Wassermenge je Zapfung, die
Hochrechnung aufs Jahr, die zugehörigen Wasserkosten – und eine aufklappbare
Übersicht „So gerechnet", die jede Eingangsgröße als *gemessen* oder
*angenommen* ausweist.

**Messgeräte: keine.** Im Katalog steht `instruments: []`
(`src/features/measurements/catalog.ts`, Zeile 128). Das ist in diesem
Projekt eine ausdrückliche Aussage („braucht keins"), kein vergessener
Eintrag – die Konvention dazu steht in `CLAUDE.md`. Die Stoppuhr bringt die
App selbst mit (`src/components/ui/Stopwatch.tsx`, läuft über
`requestAnimationFrame`, Anzeige auf Zehntelsekunden). Für die Ausarbeitung
ist das ein eigener Punkt wert: **Der Check hat eine Zugangsschwelle von
null.** Weiter im Katalog: `difficulty: 1`, `estimatedMinutes: 2`,
`rooms: ['bathroom', 'kitchen']`, `yieldsSaving: true`.

### Die fachliche Begründung, warum das überhaupt eine Messung ist

Aus dem Hintergrundtext des Wissensbereichs
(`src/features/education/educationContent.ts`, Eintrag `hot_water_wait`),
wörtlich:

> „Die Sekunden, bis warmes Wasser am Hahn ankommt, sind kein Komfortproblem,
> sondern ein Verbrauch: Das kalte Wasser aus der Leitung läuft ungenutzt in
> den Abfluss, und die Wärme, die vorher darin steckte, ist längst an die
> Rohre abgegeben. Lange Wartezeiten verraten entweder weite Wege zum Erzeuger
> oder eine abgeschaltete Zirkulation."

Das ist der Kern für die Einleitung des Kapitels: Die Wartezeit ist ein
**Indikator zweier verschiedener Verluste** –
(a) das verworfene Trinkwasser (direkt messbar, die App rechnet es aus), und
(b) die Wärme, die die zuvor stehende Leitung an die Umgebung abgegeben hat
(**die App rechnet sie nicht** – siehe Abschnitt 12, das ist eine bewusste
Lücke und ein guter Diskussionspunkt).

Ebenfalls aus dem Wissensbereich, als Ursachen/Hebel hinterlegt:

- Zirkulationsleitung mit Zeitschaltung oder Anforderungstaster statt Dauerbetrieb
- Warmwasserleitungen dämmen – besonders im kalten Keller
- Bei sehr langen Wegen: dezentraler Durchlauferhitzer an der entfernten Zapfstelle
- Das erste kalte Wasser auffangen und nutzen, statt es wegzuschütten

Und als typische Messfehler (ebenfalls hinterlegt, für ein Kapitel
„Methodenkritik" direkt verwendbar):

- Direkt nach dem letzten Zapfen messen – die Leitung ist dann noch warm
- Am Einhebelmischer nicht ganz auf heiß stellen
- Die Wartezeit an der nächstgelegenen Zapfstelle messen statt an der entferntesten

Der erste dieser Fehler ist so wichtig, dass er als eigener Hinweis direkt im
Mess-Schirm steht (`run.stagnationHint`), wörtlich:

> „Miss, wenn die Leitung ausgekühlt ist – am besten morgens vor der ersten
> Zapfung. Kurz nach dem Duschen ist das Rohr noch warm und der Wert zu
> niedrig."

Fachlich ist das die **Stagnationsbedingung**: Gemessen werden soll der
ausgekühlte Zustand, nicht ein zufälliger Zwischenzustand. Ohne sie ist die
Messung nicht reproduzierbar. Das ist der stärkste methodische Punkt des
ganzen Checks und gehört in die Ausarbeitung.

---

## 3. Die Rechnung

Die gesamte Rechenlogik steht in **einer** Datei:
`src/features/measurements/hot_water_wait/hotWaterWait.ts` (152 Zeilen). Die
Oberflächen-Komponenten rechnen nicht selbst, sie rufen `calcHotWaterWait()`.

### Die Formelkette

```
(1)  Liter je Zapfung   = (Wartezeit [s] ÷ 60) × Durchfluss [L/min]
(2)  Liter je Jahr      = Liter je Zapfung × Zapfungen/Person/Tag × Personen × 365
(3)  Wasserkosten/Jahr  = (Liter je Jahr ÷ 1000) × Wasserpreis [€/m³]
```

Im Klartext steht dieselbe Kette auch in der App (`result.calculation.formula`):

> „Wartezeit × Durchfluss = ungenutzte Liter je Zapfung. Mal Zapfungen pro
> Person und Tag, mal Personen, mal 365 ergibt die Jahresmenge; mal dem
> Wasserpreis die Kosten."

### Rundung und Absicherung der Eingaben

Aus `calcHotWaterWait()`:

- `seconds` wird auf `≥ 0` geklemmt.
- `persons` wird auf **mindestens 1** geklemmt und abgerundet. Begründung im
  Code: „ein Profil ohne Angabe darf die Hochrechnung nicht auf null ziehen,
  sondern rechnet wie ein Ein-Personen-Haushalt". Ein Test sichert das ab.
- `waterPriceEurPerM3` wird auf `≥ 0` geklemmt; ein nicht endlicher Wert wird 0.
- `litersPerDraw` wird auf **eine** Nachkommastelle gerundet, `litersPerYear`
  und `yearlySaving` auf **ganze** Zahlen.

### Die Konstanten je Entnahmestelle

Aus `FIXTURES` in `hotWaterWait.ts`. **Diese Tabelle ist die einzige
Zahlenquelle des Checks** – Wissensbereich und Ergebnisanzeige importieren
sie, statt die Werte im Text zu wiederholen.

| Entnahmestelle | Schlüssel | Durchfluss-Richtwert | Zapfungen pro **Person** und Tag | empfohlen |
|---|---|---|---|---|
| Dusche | `shower` | 9 L/min | 0,75 | ja |
| Badewanne | `bath` | 12 L/min | 0,15 | ja |
| Küche | `kitchen` | 6 L/min | 2 | nein |
| Waschbecken | `washbasin` | 5 L/min | 2,5 | nein |

Dazu zwei weitere Exporte:

- `CALIBRATION_PERSONS = 2` – die Bezugsgröße der Kalibrierung (siehe unten).
- `FIXTURE_ORDER = ['shower', 'bath', 'kitchen', 'washbasin']` – zugleich die
  Anzeigereihenfolge.

### Warum die Häufigkeit **pro Person** zählt – und was „kalibriert" heißt

Ursprünglich stand dort ein Haushaltswert. Der Kommentar im Code benennt das
Problem unmissverständlich:

> „Früher stand hier ein Haushaltswert – ein Single und eine vierköpfige
> Familie bekamen damit dieselbe Jahreshochrechnung."

Die Umstellung auf Pro-Kopf-Werte war so gewählt, dass ein
**Zwei-Personen-Haushalt weiterhin exakt die bisherigen Haushaltszahlen
erhält**: Dusche 1,5/Tag, Wanne 0,3/Tag, Küche 4/Tag, Waschbecken 5/Tag.
Deshalb `CALIBRATION_PERSONS = 2`. Das ist ein sauberes Beispiel für eine
**verhaltenserhaltende Umstellung (Refactoring mit Invariante)**: Die
Modellstruktur wird besser, ohne dass Bestandsergebnisse sich unbegründet
verschieben. Zwei Tests binden beides fest (→ Abschnitt 10).

Für die Ausarbeitung eignet sich das als Beleg für einen bewussten Umgang mit
Modellannahmen: Die Annahme wurde nicht ersetzt, weil die alte falsch war,
sondern weil sie an der falschen Stelle saß (Haushalt statt Person) – und der
Umbau wurde am alten Verhalten geeicht.

### Die Empfehlungslogik der Entnahmestellen

`recommended` steuert **nur die Reihenfolge**, nicht ein Abzeichen. Die
Begründung steht im Code und ist zitierfähig:

> „Ein Badge an der Hälfte aller Optionen hätte nichts mehr ausgesagt."

Dusche und Badewanne stehen vorn, weil dort der größte Wasserdurchsatz
anfällt. In der Oberfläche trägt jede Kachel stattdessen einen
Ein-Wort-Grund: „größter Durchsatz", „häufig genutzt", „kurze Zapfungen".

---

## 4. Der Wasserpreis

- Kommt aus dem Tarif-Store (`useTariffStore`, `resolvePrice(s, 'water').work`).
- Standardwert: **2,40 €/m³** (`src/features/monitoring/priceConfig.ts`,
  Zeile 32: `water: { priceUnit: '€/m³', priceToEur: 1, defaultWork: 2.4, defaultBase: 0 }`).
- Im Mess-Schirm steht er als eigene Zeile ganz unten, mit Stift-Symbol, und
  öffnet das gemeinsame `TariffModal`. Die Begründung im Code: „Der Wasserpreis
  gehört zur Auswertung, nicht in den Messablauf."

Das ist eine bewusste Trennung: **Was gemessen wird, steht oben; was die
Messung nur bewertet, steht unten.** Denselben Gedanken zieht der Check
konsequent durch (→ Abschnitt 5).

---

## 5. Die Leitidee: „Was gemessen ist und was nicht"

**Das ist der wichtigste Abschnitt für die Ausarbeitung.** Der Check ist in
diesem Projekt der Modellfall dafür, wie mit unterschiedlich belastbaren
Zahlen umgegangen wird. Der Kopfkommentar von `hotWaterWait.ts` sagt es
selbst:

> „**Was gemessen ist und was nicht.** Die Wartezeit ist immer gemessen. Der
> Durchfluss der Dusche ist es, sobald der Duschkopf-Check gelaufen ist
> (`measuredShowerFlowLpm`) – sonst gilt der Richtwert aus `FIXTURES`. Die
> Häufigkeit der Zapfungen ist nie gemessen, sondern ein typischer Wert je
> Person. Belastbar ist deshalb vor allem die Wassermenge je Zapfung; der
> Euro-Betrag zeigt die Größenordnung […]"

Daraus ergibt sich eine **dreistufige Belastbarkeit**, die man als Tabelle in
die Arbeit übernehmen kann:

| Stufe | Größe | Herkunft | Wie die App damit umgeht |
|---|---|---|---|
| **gemessen** | Wartezeit in Sekunden | Stoppuhr des Nutzers | Hauptzahl, Grundlage der Bewertung |
| **gemessen oder Richtwert** | Durchfluss der Entnahmestelle | Duschkopf-Check (nur Dusche) bzw. `FIXTURES` | Wird im Ergebnis **als das eine oder das andere gekennzeichnet** (`flowMeasured`) |
| **Modellannahme** | Zapfungen pro Person und Tag | Literaturnahe Setzung, auf 2 Personen kalibriert | Nur für die Jahres-Hochrechnung; Ergebnis wird als „geschätzt" markiert |

### Wie sich das in der Oberfläche niederschlägt

1. **Die Kacheln trennen sichtbar.** `MetricTiles` bekommt für „pro Jahr" und
   „Wasserkosten/Jahr" das Flag `estimated: true`, für „pro Zapfung" nicht.
   Kommentar im Code: „Gemessen und hochgerechnet sichtbar getrennt."
2. **„So gerechnet" weist jede Zeile aus.** Die Komponente `CalculationNote`
   markiert pro Zeile `measured: true/false`. Ihr Kopfkommentar begründet den
   Aufklapper:

   > „Die Zahl ist die Aussage, die Herleitung die Fußnote. Offen gestellt
   > drängt sie sich vor das Ergebnis; ganz weggelassen ist sie eine
   > Behauptung, die niemand prüfen kann."

3. **Der Schlusssatz nennt die Kalibrierung** (`result.calculation.note`):

   > „Die Zapfungen pro Tag sind eine Modellannahme, keine Messung – kalibriert
   > auf einen {{persons}}-Personen-Haushalt. Die belastbare Zahl ist die Menge
   > je Zapfung; der Jahreswert ist eine Hochrechnung."

   Die `2` wird dabei aus `CALIBRATION_PERSONS` eingesetzt, nicht im
   Übersetzungstext ausgeschrieben. Projektregel: **Zahlen stehen an einer
   Stelle.**

4. **Das Ergebnis markiert sich selbst als geschätzt.** In `details` steht
   `savingEstimated: 1`. Das ist der projektweite Schalter, den
   `isMeasuredSaving()` (`measurements/savingsDisplay.ts`) liest. Der Kommentar
   an der Setzstelle in `HotWaterWaitRun.tsx`:

   > „Die Hochrechnung aufs Jahr multipliziert mit `drawsPerPersonPerDay` –
   > einer Modellkonstante (‚0,75 Duschen pro Tag'), nicht mit etwas
   > Gemessenem. Genau der Fall, für den `isMeasuredSaving` da ist: Gemessen
   > ist die Wartezeit, belastbar sind die Liter pro Entnahme; der Jahresbetrag
   > ist geschätzt."

### Die projektweite Regel dahinter (zitierfähig)

Aus `src/features/measurements/savingsDisplay.ts`:

> „Kriterium: **Jede Größe der Rechnung muss gemessen, vom Nutzer angegeben
> oder ein Preis sein.** Sobald eine Nutzungshäufigkeit oder ein Verbrauch
> geschätzt wird, entfällt der Betrag – dann zeigt die App stattdessen die
> Menge, die tatsächlich gemessen wurde (Liter, kWh, Prozent).
>
> Der Grund ist nicht Vorsicht, sondern Verteidigbarkeit: Eine Zahl, deren
> größte Unsicherheit in einer erfundenen Häufigkeit steckt (‚1,5 Duschen pro
> Tag'), lässt sich in keiner Vorführung begründen. Eine gemessene Wassermenge
> dagegen schon."

Dazu zwei Anzeigeregeln, die für alle Messungen gelten:

- `MIN_DISPLAY_EUR = 20` – unter 20 € wird **kein** Euro-Betrag gezeigt,
  „Kleinbeträge liegen innerhalb der Modellunsicherheit".
- `EUR_ROUNDING_STEP = 5` – gerundet wird auf 5 €, „ein Punktwert auf den Euro
  genau wäre Schein-Genauigkeit".

Konsequenz für diesen Check: Wegen `savingEstimated: 1` erscheint sein
Euro-Betrag **nicht** in der Wirkungs-Summe, **nicht** in den Empfehlungen und
**nicht** im PDF-Bericht (`displayableSavingEur()` liefert `undefined`). Er
steht nur auf dem Ergebnis-Schirm des Checks selbst – und dort als
„Wasserkosten/Jahr", also als Kostenangabe, nicht als Sparversprechen.
(→ Abschnitt 12, Punkt 5: Diese eine Anzeige umgeht die Schwelle von 20 €.)

### Warum die Empfehlung an der Menge hängt, nicht am Geld

Der zugehörige Tipp „Vorlaufwasser auffangen" wurde bewusst vom Euro-Betrag
gelöst (`buildTips.ts`, Kommentar):

> „Der Tipp hängt am Befund der Messung, nicht mehr am Euro-Betrag: Bei einem
> Wasserpreis von 0 oder einer Ersparnis unter der Anzeigeschwelle bleibt die
> gemessene Wassermenge ein gültiger Grund, den Vorlauf aufzufangen."

Auslöser ist deshalb: es existiert mindestens ein Ergebnis **und** die
schlechteste Bewertung ist nicht `good`. Also eine Wartezeit über 15 s.

---

## 6. Die Bewertungsschwellen – und ihr offener Beleg

Vierstufig, exportiert aus `hotWaterWait.ts`:

| Konstante | Wert | Bewertung | Label im Wissensbereich |
|---|---|---|---|
| `WAIT_GOOD_MAX_S` | 15 s | `good` | „Kurz" |
| `WAIT_MEDIUM_MAX_S` | 30 s | `medium` | „Spürbar" |
| `WAIT_ELEVATED_MAX_S` | 60 s | `elevated` | „Lang" |
| – | > 60 s | `high` | „Sehr lang" |

Die Funktion `rateWait(seconds)` ist eine reine Treppenfunktion. Die
Konstanten sind benannt und exportiert, mit dieser Begründung im Code:

> „Benannt und exportiert, damit der Wissensbereich sie **lesen** kann, statt
> dieselben Zahlen im Text zu wiederholen. Nackte Literale in `rateWait` waren
> von außen nicht erreichbar – und eine zweite Fassung im Fließtext wäre genau
> die Art Dopplung, die irgendwann auseinanderläuft."

### Der Beleg fehlt – und das steht so im Code

Das Projekt verlangt für jeden Richtwert eine Herkunftsangabe
(`ThresholdOrigin`: `'reference'` = belegte Quelle, `'own'` = eigener,
begründeter Richtwert, `'pending'` = noch offen). Für diesen Check steht in
`src/features/education/measurementThresholds.ts`:

```ts
origin: pending(
  'Ohne Beleg. Die Stufen sind gewachsen, nicht hergeleitet – vor dem nächsten
   Release entweder belegen oder überdenken.',
)
```

**Für die Ausarbeitung ist das nicht peinlich, sondern der interessanteste
Befund.** Es lohnt, das ausdrücklich zu behandeln:

- Die App **kennzeichnet** unbelegte Schwellen, statt sie als Fakten
  auszugeben. Die Herkunft erscheint im Wissensbereich neben der Tabelle.
- Ein Test hält den Zustand sogar fest: `tests/unit/measurementInfos.test.ts`
  (Zeile 148) prüft, dass genau drei Checks offene Richtwerte haben –
  `['base_load', 'hot_water_wait', 'standby']`. Wer einen belegt, muss den Test
  anfassen; wer einen neuen unbelegten einführt, bricht ihn.
- Zum Vergleich: Der Duschkopf-Check ist belegt (`'reference'`, Quelle
  Verbraucherzentrale, „Warmwasser im Alltag sparen"). Der Unterschied
  zwischen beiden Checks lässt sich also **innerhalb derselben App** zeigen.

Wer die Schwellen in der Arbeit fachlich einordnen will: Sie sind plausibel
(15 s entspricht bei 9 L/min gut 2 L Vorlauf), aber die App behauptet
ausdrücklich nicht, dass sie hergeleitet sind. Diese Formulierung bitte
beibehalten – keine Norm erfinden, die der Code nicht nennt.

---

## 7. Die Kopplung an den Duschkopf-Check

Der Wartezeit-Check liest den im Duschkopf-Check **gemessenen** Durchfluss:

```ts
const measuredShowerFlowLpm = useMeasurementsStore((s) => s.results['showerhead']?.primaryValue)
```

Kommentar an der Stelle:

> „Der Duschkopf-Check hat den Durchfluss der Dusche gemessen und legt ihn als
> `primaryValue` ab. Ihn hier zu ignorieren hieße, den besseren Wert zu haben
> und den schlechteren zu benutzen."

Die Übernahme ist an **drei Bedingungen** geknüpft (`calcHotWaterWait`):

1. Die gewählte Entnahmestelle ist `shower`.
2. Der Wert ist eine endliche Zahl.
3. Der Wert ist größer als 0.

Sonst gilt der Richtwert aus `FIXTURES`. Die Begründung für Bedingung 1 ist
methodisch und gehört in den Text:

> „Der gemessene Durchfluss schlägt den Richtwert – aber nur an der Dusche,
> denn dort wurde gemessen. Ein Waschbecken mit dem Duschkopf-Wert zu rechnen
> wäre schlechter als der Richtwert, nicht besser."

Das Ergebnis merkt sich, welcher Fall eingetreten ist (`flowMeasured`), und
zwar ausdrücklich für den Nutzer:

> „Steht im Ergebnis, weil der Unterschied den Nutzer angeht: Eine Zahl aus
> seiner eigenen Messung ist etwas anderes als ein Richtwert, und er soll
> sehen, welche von beiden er vor sich hat."

**Größenordnung des Effekts** (aus dem Test): Ein gemessener Duschkopf mit
14 L/min statt des Richtwerts 9 L/min ergibt rund **56 % mehr** ungenutztes
Wasser. Der Test prüft das Verhältnis exakt gegen `14/9`.

Für die Ausarbeitung: Hier lässt sich zeigen, dass die App aus einzelnen
Messungen ein **verbundenes Modell** macht, statt jeden Check isoliert zu
lassen – und dass die Verknüpfung an eine Gültigkeitsbedingung geknüpft ist
(gemessen wurde an der Dusche, also gilt der Wert nur dort).

---

## 8. Das Datenmodell – was gespeichert wird

Aus `HotWaterWaitRun.tsx`, `handleEvaluate()`:

```ts
{
  id: 'hot_water_wait',
  rating,                       // 'good' | 'medium' | 'elevated' | 'high'
  primaryValue: seconds,        // die gemessene Wartezeit
  unit: 's',
  completedAt: <ISO-Zeitstempel>,
  roomKey: fixture,             // 'shower' | 'bath' | 'kitchen' | 'washbasin'
  details: {
    seconds,                    // gemessen
    litersPerDraw,              // aus Messung + Durchfluss
    litersPerYear,              // hochgerechnet
    yearlySaving,               // hochgerechnet, in €
    savingEstimated: 1,         // Markierung „enthält Modellannahmen"
    flowLpm,                    // der tatsächlich verwendete Durchfluss
    flowMeasured,               // 1 = aus dem Duschkopf-Check, 0 = Richtwert
  },
}
```

Zwei Projektkonventionen sind hier sichtbar (beide in `CLAUDE.md`):

1. **`details` nimmt nur Zahlen auf** (`Record<string, number>`). Deshalb wird
   der Boolean `flowMeasured` als `1`/`0` abgelegt.
2. **Gespeicherte Messergebnisse werden nie migriert.** Der Ergebnis-Schirm
   muss daher alte und neue Formate lesen können.

### Die Entnahmestelle als `roomKey` – Merkmal und Schwachstelle zugleich

`roomKey: fixture` bedeutet: Der Speicherschlüssel lautet
`hot_water_wait@shower`, `hot_water_wait@washbasin` usw. Das erlaubt **ein
eigenes Ergebnis je Entnahmestelle** – aber nur eines pro Typ. Zwei Bäder mit
je einem Waschbecken teilen sich denselben Schlüssel; das zweite Ergebnis
überschreibt das erste. Das ist ein dokumentierter, offener Punkt
(→ Abschnitt 12, Punkt 2).

Die übrigen raumbezogenen Checks (`room_temperature`, `furniture_spacing`)
nutzen an dieser Stelle echte Rauminstanzen (`bathroom#0`, `bathroom#1`) mit
unveränderlichen, teils zufälligen Kennungen – eine eigene Konvention des
Projekts, samt Begründung in `CLAUDE.md` („Kennungen von Räumen und Geräten
sind unveränderlich"). Der Wartezeit-Check folgt ihr **nicht**. Das ist ein
sehr guter Vergleichspunkt für ein Kapitel über Datenmodellierung.

### Der Umgang mit Altergebnissen

`litersPerDraw`, `litersPerYear`, `flowLpm` und `flowMeasured` gibt es erst
seit dem 03.09.2026 (Commit `e06fa74`). Ältere Ergebnisse tragen sie nicht.
Der Ergebnis-Schirm prüft deshalb ausdrücklich auf Vorhandensein:

```ts
const hasQuantity =
  result.details?.litersPerDraw !== undefined && result.details?.litersPerYear !== undefined
```

mit dem Kommentar:

> „Ein `?? 0` würde daraus eine erfundene Nullmenge machen, statt zu zeigen,
> dass dafür schlicht keine Datengrundlage besteht."

Fehlen die Felder, zeigt die App „–" statt „0,0 L", einen eigenen
Erklärungstext (`explanationUnknown`) und einen eigenen Tipptext
(`hot_water_wait_unknown`) ohne jede Literzahl. Für den Durchfluss fällt sie
auf den Richtwert der Entnahmestelle zurück – „genau den, mit dem sie
gerechnet wurden".

Das ist die Behebung von **Befund 8** aus `docs/gefundene-probleme.md`
(→ Abschnitt 11 und 12). Ein hervorragendes Fallbeispiel für die Ausarbeitung:
Ein einzelnes `?? 0` verwandelte einen *fehlenden* Wert still in eine *echte
Null* – und die stand dann als „rund 0 L" im Empfehlungstext.

---

## 9. Wer den Check von außen berührt

| Ort | Was er nimmt / tut |
|---|---|
| `measurements/registry.ts` | verdrahtet Intro / Run / Result |
| `measurements/catalog.ts` | Metadaten: `category: 'hot_water'`, `difficulty: 1`, `estimatedMinutes: 2`, `rooms: ['bathroom','kitchen']`, `yieldsSaving: true`, `instruments: []` |
| `measurements/types.ts` | die ID `'hot_water_wait'` als Teil des Union-Typs |
| `education/measurementThresholds.ts` | liest die drei Schwellen für die Richtwert-Tabelle; Herkunft `pending` |
| `education/educationContent.ts` | Hintergrundtext „Warmwasser-Wartezeit", Quelle: Wikipedia „Zirkulationsleitung" |
| `tips/buildTips.ts` (Z. 588 ff.) | erzeugt den Tipp „Vorlaufwasser auffangen" |
| `reports/measurementsReportData.ts` (Z. 22) | Einheit `'s'` als Rückfall für Altdaten im PDF |
| `measurements/impact.ts` | schließt den Euro-Betrag wegen `savingEstimated: 1` aus der Wirkungs-Summe aus |
| `demo/demoProfile.ts` (Z. 82) | Beispielergebnis: 24 s, `medium`, `details: { seconds: 24 }` – verhält sich wie ein Altergebnis |
| `showerhead` | liefert `primaryValue` als gemessenen Duschdurchfluss |
| `showerhead/ShowerheadRun.tsx` | nimmt umgekehrt diesen Check als **Vorbild** für seinen Mess-Schirm |

### Der Tipp „Vorlaufwasser auffangen" im Detail

Text (deutsch, `tips.items.hot_water_wait.reason`):

> „Es dauert {{seconds}} s, bis warmes Wasser kommt – rund {{liters}} L laufen
> jedes Mal ungenutzt weg, über das Jahr etwa {{litersPerYear}} L. Stell eine
> Gießkanne oder einen Eimer darunter: für Pflanzen, zum Putzen oder für die
> Toilette."

Aufwand: `effortMinutes: 1`, Kosten: `costEur: 0`. Menge wird als
`tips.quantity.waterWasted` in Litern angegeben, **nie** in Euro.

Eine feine, aber lehrreiche Regel steckt in der Auswahl des schlechtesten
Ergebnisses:

> „Wartezeit und Menge je Zapfung müssen aus DEMSELBEN Ergebnis stammen. Zwei
> getrennte `Math.max` über alle Entnahmestellen ergaben sonst einen Satz,
> dessen Sekunden vom einen und dessen Liter vom anderen Hahn kamen
> (‚19 s … 3,5 L') – Zahlen, die zusammen nie gemessen wurden."

Die Jahresmenge dagegen wird **über alle** Entnahmestellen summiert – sie ist
eine Gesamtgröße, keine Einzelmessung. Diese Unterscheidung (Einzelbefund vs.
Aggregat) ist ein schöner Detailpunkt für die Ausarbeitung.

---

## 10. Qualitätssicherung: was die Tests festhalten

`tests/unit/hotWaterWait.test.ts` (128 Zeilen, 10 Testfälle in 3 Gruppen).
Für ein Kapitel „Absicherung" lässt sich jede Gruppe einem Risiko zuordnen:

**Gruppe „Entnahmestellen"** – Risiko: stille Inkonsistenz zwischen Daten und Anzeige
1. Jede Entnahmestelle kommt in `FIXTURE_ORDER` genau einmal vor.
2. Die empfohlenen Stellen stehen vorn (weil die Empfehlung *nur* an der
   Reihenfolge hängt, seit das Badge weg ist – „eine falsch sortierte Liste
   bliebe sonst unbemerkt").
3. + 4. Für **jede** Stelle existieren in **beiden** Sprachen Name und
   Kurzhinweis; ebenso die vier Hinweistexte des Mess-Schirms.

**Gruppe „Hochrechnung"** – Risiko: Modellfehler
5. Die Jahresmenge skaliert linear mit der Haushaltsgröße (4 Personen ≈ 4 × 1 Person).
6. Bei 2 Personen kommen exakt die alten Haushaltswerte heraus (die Kalibrierung).
7. Ein Profil ohne Personenangabe rechnet wie ein Ein-Personen-Haushalt.
8. Ohne Wasserpreis bleibt eine Menge übrig, aber **keine Euro-Behauptung**.

**Gruppe „gemessener Durchfluss schlägt den Richtwert"** – Risiko: Rückfall in den alten Zustand
9. Mit gemessenen 14 L/min ändert sich das Ergebnis nachweislich (Faktor 14/9).
10. Ohne Duschkopf-Messung rechnet der Check exakt wie zuvor – „keine stille
    Verschlechterung für Nutzer, die den einen Check nicht gemacht haben".
11. Der Duschwert wird **nicht** auf Wanne, Küche oder Waschbecken übertragen.
12. Unbrauchbare Werte (`0`, `-3`, `NaN`, `undefined`) werden ignoriert, statt
    mit ihnen zu rechnen.

Weitere Tests von außen:

- `tests/unit/measurementInfos.test.ts` – prüft, dass die Richtwert-Tabelle im
  Wissensbereich dieselbe Zahl trägt wie `WAIT_GOOD_MAX_S`, und dass genau
  `['base_load','hot_water_wait','standby']` als unbelegt geführt werden.
- `tests/unit/buildTips.test.ts` – Reihenfolge der Tipps, und der Fall mit
  zwei Entnahmestellen (`hot_water_wait@kitchen` / `@shower`).
- `tests/unit/measurementProgress.test.ts` – dass die Fortschrittsanzeige
  Ergebnisse unter `hot_water_wait@shower` findet und nicht nur unter
  `hot_water_wait`.

**Bemerkenswert für die Arbeit:** Fast jeder Test trägt einen Kommentar, der
den *Befund* nennt, aus dem er entstanden ist. Die Testsuite ist damit
zugleich die Fehlerchronik. Beispiel wörtlich:

> „Der Wartezeit-Check setzte für die Dusche pauschal 9 l/min an – auch dann,
> wenn der Duschkopf-Check längst 14 gemessen hatte. Die App hatte den besseren
> Wert und benutzte ihn nicht."

---

## 11. Chronologie

| Datum | Commit | Was |
|---|---|---|
| vor 03.09.2026 | – | Der Check existiert: Wartezeit stoppen, vierstufig bewerten. Durchfluss stets Richtwert, Zapfhäufigkeit als Haushaltswert. |
| 03.09.2026 | `e06fa74` | **„gemessener Durchfluss statt Richtwert, Rechnung aufklappbar"** – Übernahme des Duschkopf-Messwerts, Umstellung der Häufigkeit auf Pro-Kopf-Werte mit Kalibrierung auf 2 Personen, `CalculationNote` („So gerechnet"), neue `details`-Felder. |
| 04.09.2026 | `87820e6` | **„acht gemeldete Probleme direkt beheben, einen davon teilweise"** – u. a. Befund 8: kein „0 L" mehr bei Altergebnissen, eigener Text ohne Literzahl; kein automatisches Weiterspringen nach „Speichern & Fertig". |
| 05.09.2026 | `c34cdd9` u. a. | Der **Duschkopf**-Check übernimmt Muster dieses Checks (manuelle Korrektur erst nach dem Stoppen, kein toter Knopf) – Wirkung nach außen, ohne Änderung an diesem Check. |

Die vollständigen Befunde stehen in `docs/gefundene-probleme.md`, Punkte 8, 9,
36 und 37.

---

## 12. Was offen ist – ehrlich und vollständig

Für ein Kapitel „Grenzen und Ausblick". Alle Punkte sind belegt, nicht
vermutet.

**1. Die Bewertungsschwellen sind unbelegt.**
`origin: pending(...)`, siehe Abschnitt 6. Die App sagt es selbst; ein Test
hält den Zustand fest. Vor einem Release wären sie zu belegen oder zu
überdenken.

**2. Datenverlust bei mehreren gleichartigen Entnahmestellen** (Befund 9,
Status ⏸️ zurückgestellt).
Zwei Bäder mit je einem Waschbecken speichern beide unter
`hot_water_wait@washbasin` – das zweite überschreibt das erste kommentarlos.
Bewusst nicht ungefragt behoben, weil es eine echte UX-Entscheidung braucht:
zweistufige Auswahl (erst Raum, dann Entnahmestelle) oder kombinierte Liste je
Rauminstanz? Die Entscheidung von Kilian steht aus. Der Punkt ist in den
„Offenen Fragen" der Befundliste geführt.

**3. Richtwert-Liter für Wanne, Küche und Waschbecken** (Befund 8, Teil b,
Status ⚠️ teilweise umgesetzt).
Nur an der Dusche kann der Durchfluss gemessen sein. An den anderen drei
Stellen ist die Literzahl immer ein Richtwert. Kilians Vorschlag: dort gar
keine Literzahl zeigen, sondern nur den Fakt („hier läuft Wasser ungenutzt
weg"). Das wäre eine Verhaltensänderung über den Bugfix hinaus – offen.

**4. Die verlorene Wärme wird nicht gerechnet.**
Der Check bilanziert das verworfene **Trinkwasser** und dessen Wasserkosten.
Die Wärme, die die stehende Leitung zuvor abgegeben hat – der eigentlich
größere Posten – erscheint in keiner Zahl, nur im erklärenden Text des
Wissensbereichs. Das ist keine Fehlfunktion, sondern eine Folge derselben
Regel wie oben: Für diese Wärme fehlen belastbare Eingangsgrößen
(Rohrlänge, Dämmzustand, Ausgangstemperatur). **Diese Auslassung ist einer
der stärksten Punkte für die Diskussion in der Ausarbeitung** – sie zeigt den
Preis der Selbstbeschränkung.

**5. Der Ergebnis-Schirm zeigt den Euro-Betrag ungefiltert.**
`HotWaterWaitResult.tsx` gibt `≈ {yearlySaving} €` direkt aus `details` aus.
Er läuft damit **nicht** durch `displaySavingEur()` und unterschreitet die
projektweite Anzeigeschwelle von 20 € (Beispiel unten: rund 6 €). In
Empfehlungen, Wirkungs-Summe und Bericht taucht der Betrag korrekt nicht auf,
weil `savingEstimated: 1` dort greift. Beim Duschkopf-Check wurde genau
dieser Widerspruch am 05.09. behoben; hier besteht er weiter. Die Kachel ist
immerhin als „Wasserkosten/Jahr" beschriftet und mit `estimated: true`
markiert. *(Beobachtung aus dem Code, kein gemeldeter Befund – wenn die
Ausarbeitung ihn erwähnt, bitte als offene Beobachtung, nicht als behobenes
Problem.)*

**6. Die Stoppuhr behält nach dem Korrigieren ihren alten Stand.**
Trägt man 21 s ins Korrekturfeld ein, während die Uhr 1,5 s zeigt, bleiben
beide Anzeigen stehen. Der Duschkopf-Check verhält sich genauso. Offen, ob das
Feld die Uhr zurücksetzen soll oder ob die Uhr das Protokoll dessen bleibt,
was wirklich lief (Befund 37, in den „Offenen Fragen").

**7. Die Quelle des Hintergrundtextes zeigt auf Wikipedia**
(`wiki('Zirkulationsleitung')`). Projektweit offen: die Umstellung auf
Primärquellen braucht Netzzugang zum Prüfen der URLs (siehe
„Wissen-Ausbau" in `CLAUDE.md`).

---

## 13. Rechenbeispiel zum Nachvollziehen

Für die Ausarbeitung nützlich, weil man daran die ganze Kette zeigen kann.
Alle Zwischenwerte sind mit den Formeln aus Abschnitt 3 nachgerechnet.

**Annahmen:** Dusche, gestoppte Wartezeit 30 s, 2-Personen-Haushalt,
Wasserpreis 2,40 €/m³ (Standardwert).

**Fall A – ohne Duschkopf-Messung** (Richtwert 9 L/min):

```
Liter je Zapfung  = 30/60 × 9              = 4,5 L
Liter je Jahr     = 4,5 × 0,75 × 2 × 365   = 2.463,75 → 2.464 L
Wasserkosten/Jahr = 2,464 m³ × 2,40 €/m³   = 5,91 € → 6 €
Bewertung: 30 s ≤ 30 s → „medium" (Spürbar)
flowMeasured = false
```

**Fall B – mit gemessenen 14 L/min aus dem Duschkopf-Check:**

```
Liter je Zapfung  = 30/60 × 14             = 7,0 L      (+55,6 %)
Liter je Jahr     = 7,0 × 0,75 × 2 × 365   = 3.832,5 → 3.833 L
Wasserkosten/Jahr = 3,833 m³ × 2,40 €/m³   = 9,20 € → 9 €
Bewertung: unverändert „medium" – die Bewertung hängt allein an der Zeit
flowMeasured = true
```

**Was das Beispiel zeigt** (und was der Text daraus machen kann):

- Die **Bewertung** ändert sich nicht: Sie hängt ausschließlich an der
  gemessenen Zeit. Der Durchfluss beeinflusst nur die Mengenaussage. Das ist
  konsistent – bewertet wird, was gemessen wurde.
- Die **Menge** ändert sich um über die Hälfte. Ohne die Kopplung an den
  Duschkopf-Check läge die App hier um 1.369 L pro Jahr daneben.
- Der **Euro-Betrag** liegt in beiden Fällen unter der projektweiten
  Anzeigeschwelle von 20 € – ein guter Beleg dafür, warum die App die
  Mengenaussage in den Vordergrund stellt und den Betrag nur als
  Größenordnung führt.

---

## 14. Vollständiges Dateiverzeichnis

```
src/features/measurements/hot_water_wait/
├── hotWaterWait.ts           152 Z.  Rechnung + Konstanten (einzige Zahlenquelle)
├── HotWaterWaitIntro.tsx      72 Z.  Reiter „Info": Hero-Bild, 1-2-3-Anleitung, Details-Modal
├── HotWaterWaitRun.tsx       187 Z.  Reiter „Messen": Auswahl, Stoppuhr, Korrektur, Wasserpreis
└── HotWaterWaitResult.tsx    126 Z.  Reiter „Ergebnis": Hauptzahl, Kacheln, „So gerechnet", Ideen

tests/unit/hotWaterWait.test.ts  128 Z.  10 Testfälle in 3 Gruppen

Berührte Dateien außerhalb:
src/features/measurements/registry.ts, catalog.ts, types.ts, savingsDisplay.ts, impact.ts
src/features/measurements/CalculationNote.tsx, MetricTiles.tsx, ResultHero.tsx
src/components/ui/Stopwatch.tsx
src/features/education/measurementThresholds.ts, educationContent.ts
src/features/tips/buildTips.ts
src/features/reports/measurementsReportData.ts
src/features/monitoring/priceConfig.ts, TariffModal.tsx
src/store/tariffStore.ts, measurementsStore.ts, onboardingStore.ts
src/i18n/locales/de.json, en.json   (Schlüssel: measurements.hot_water_wait.*)

Weiterführende Projektdokumente:
docs/duschkopf-test.md          der gekoppelte Check, vollständig beschrieben
docs/gefundene-probleme.md      Befunde 8, 9, 36, 37 + „Offene Fragen"
CLAUDE.md                       Projektkonventionen (Details nur Zahlen, keine Migration u. a.)
```

---

## 15. Hinweise für den Text der Hausarbeit

### Ein möglicher Aufbau

1. **Einordnung** – Was der Check misst und warum die Wartezeit ein Verbrauch
   ist, kein Komfortproblem (Abschnitt 2).
2. **Verfahren** – Ablauf, Stagnationsbedingung, kein Messgerät nötig
   (Abschnitt 2).
3. **Modell und Rechnung** – Formelkette, Konstanten, Kalibrierung
   (Abschnitt 3).
4. **Umgang mit Unsicherheit** – die dreistufige Belastbarkeit, wie sie in der
   Oberfläche und im Datenmodell sichtbar wird (Abschnitt 5). *Das ist der
   inhaltliche Schwerpunkt.*
5. **Verknüpfung mit dem Duschkopf-Check** – Datenwiederverwendung mit
   Gültigkeitsbedingung (Abschnitt 7).
6. **Absicherung** – die Tests als Fehlerchronik (Abschnitt 10).
7. **Grenzen und Ausblick** – die sieben offenen Punkte (Abschnitt 12).

### Der rote Faden, wenn einer gebraucht wird

> Der Check misst eine einzige Größe – Sekunden – und leitet daraus eine Kette
> von Aussagen ab, die mit jedem Schritt unsicherer wird. Die eigentliche
> Gestaltungsleistung liegt nicht in der Rechnung, sondern darin, diese Kette
> sichtbar zu lassen, statt sie hinter einer runden Jahreszahl zu verbergen.

Alle drei Elemente lassen sich am Code belegen: `savingEstimated: 1`,
`estimated: true` an den Kacheln, `measured: true/false` je Zeile in „So
gerechnet", `flowMeasured` im Ergebnis, `origin: pending` bei den Schwellen.

### Was der Text behaupten darf – und was nicht

**Darf er:**
- Die Formeln und Konstanten aus Abschnitt 3 – sie stehen so im Code.
- Dass die Bewertungsschwellen 15/30/60 s betragen **und unbelegt sind**.
- Dass der Duschkopf-Richtwert belegt ist (Verbraucherzentrale) – der
  Wartezeit-Check aber nicht.
- Die wörtlichen Code-Kommentare in dieser Datei als Zitate (Quelle:
  Dateiname + Funktionsname angeben).
- Das Rechenbeispiel aus Abschnitt 13.

**Darf er nicht:**
- Eine Norm oder Quelle für die Wartezeit-Schwellen erfinden. Es gibt keine.
- Behaupten, die App rechne die Wärmeverluste der Leitung. Tut sie nicht.
- Den Euro-Betrag als belastbare Ersparnis darstellen. Er ist ausdrücklich als
  geschätzt markiert und läuft in Bericht und Empfehlungen gar nicht mit.
- Den Duschkopf-Durchfluss als für alle Entnahmestellen gemessen darstellen.
  Er gilt nur an der Dusche.
- Behaupten, Befund 9 (Datenverlust bei zwei gleichartigen Entnahmestellen)
  sei behoben. Er ist bewusst zurückgestellt.

### Fachbegriffe, die im Text sauber eingeführt gehören

- **Vorlaufwasser / Stagnationswasser** – das kalte Wasser, das vor dem warmen
  aus der Leitung läuft. Die App nennt es im Tipp „Vorlaufwasser".
- **Zirkulationsleitung** – hält warmes Wasser dauerhaft in Bewegung; die
  häufigste Ursache kurzer Wartezeiten. Kosten laut Wissensbereich: 30–90 €
  Pumpenstrom im Jahr bei Dauerbetrieb, plus Wärmeverluste der ständig warmen
  Leitung; Zeitschaltuhr oder Anforderungstaster streichen den Großteil davon.
- **Dezentraler Durchlauferhitzer** – die Alternative bei sehr langen Wegen.
- **Kalibrierung (hier)** – die Pro-Kopf-Werte sind so gewählt, dass ein
  Zwei-Personen-Haushalt dieselben Ergebnisse erhält wie das frühere
  Haushaltsmodell.
- **Modellannahme vs. Messgröße** – der zentrale Gegensatz dieses Kapitels.

### Zwei Formulierungen, die sich als Schlusspointe eignen

Aus `savingsDisplay.ts`:

> „Der Grund ist nicht Vorsicht, sondern Verteidigbarkeit."

Aus `CalculationNote.tsx`:

> „Die Zahl ist die Aussage, die Herleitung die Fußnote. Offen gestellt drängt
> sie sich vor das Ergebnis; ganz weggelassen ist sie eine Behauptung, die
> niemand prüfen kann."

### Wenn Zahlen im Text nachgeprüft werden sollen

```bash
npx vitest run tests/unit/hotWaterWait.test.ts   # die 10 Testfälle
npx vitest run tests/unit                        # alles, unter einer Minute
```

Und die Zahlen selbst stehen ausschließlich in
`src/features/measurements/hot_water_wait/hotWaterWait.ts`. Wer dort etwas
ändert, ändert damit auch die Richtwert-Tabelle im Wissensbereich und die
Texte in der App – das ist so gebaut. Zahlen stehen an einer Stelle.
