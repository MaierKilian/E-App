# Gefrierschrank-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er erhebt, warum
> er keine Rechnung mehr macht, was ihn außerhalb seines Ordners berührt,
> welche Entscheidungen bereits gefallen sind – samt Begründung, damit niemand
> sie versehentlich rückgängig macht – und was beim Schreiben dieser Datei
> auffiel (inklusive zwei bereits bekannter, noch offener Punkte).

---

## 1. Was der Check tut

Zwei Fragen, mehr nicht: **Ist das Gerät vereist?** Falls ja: **wie stark?**
Drei Stufen (`spots` / `thin` / `thick`) statt der früheren zwei
(„leicht"/„stark") – dazwischen liegt der halbe Effekt, und beide hätte man
vorher „leicht" genannt.

**Die Antwort des Checks ist eine Empfehlung, keine Zahl.** Bis August 2026
war der Hauptwert ein geschätzter Euro-Betrag, der auf zwei Annahmen beruhte:
einem Fallback-Jahresverbrauch von 200 kWh, den niemand eingetragen hatte, und
einem Standard-Strompreis. Beim Standardpreis kamen dabei **immer dieselben
zwei Zahlen** heraus (8 € bzw. 21 €) – im Ergebnis-Schirm ohne Währungszeichen
dargestellt und damit vollends unverständlich. Der Check sagt jetzt, **was zu
tun ist** (`DefrostAdvice`), und beziffert die Wirkung als **Anteil am
Verbrauch** – ohne Euro-Betrag.

**Quellen zur Vereisung** (Kommentar in `freezer.ts`): ~1 cm Eis → +10–15 %,
dick/lange nicht abgetaut bis +50 % Mehrverbrauch (Verivox, BUND Hessen,
klimaaktiv).

**Messgeräte:** keine. `instruments: []` im Katalog – bewusst leer, mit einem
Verweis im Kommentar auf Punkt 15 der Fundliste (Abschnitt 12): „Der Check
schätzt die Vereisung mit dem Auge. Eine Temperatur-Eingabe gibt es hier nicht
– der Info-Tab verspricht sie zu Unrecht."

**Gerät statt Raum:** Der Check läuft **je Gerät**, nicht je Raum
(`perAppliance: true`), und ist zusätzlich **hinter einer Gerätefrage
verriegelt** (`ApplianceGate`, Abschnitt 5) – anders als die raumbasierten
Checks (Möbelabstand, Raumklima).

---

## 2. Die Vereisungsstufen und ihre Wirkung

```ts
FrostStage = 'none' | 'spots' | 'thin' | 'thick'
FROST_STAGES = ['spots', 'thin', 'thick']   // Abfrage-Reihenfolge, ohne 'none'
```

| Stufe | Beschreibung | Mehrverbrauch (`EXTRA_SHARE`) | Bewertung | Empfehlung (`DefrostAdvice`) |
|---|---|---|---|---|
| `none` | Eisfrei | 0 % | `good` | `notNeeded` |
| `spots` | Nur wenige Millimeter an ein paar Stellen | 5 % | `medium` | `canWait` |
| `thin` | Flächendeckend dünn vereist | 12 % | `elevated` | `worthwhile` |
| `thick` | Vollständig durchvereist | 30 % | `high` | `now` |

Jede Stufe ist **eine Bewertungsklasse strenger** als die vorherige – ein Test
hält das als Invariante fest, nicht nur als Einzelwerte.

**Kein Beleg für die genauen Prozentsätze selbst.** Die drei Werte 5/12/30 %
sind nicht in `measurementThresholds.ts` referenziert (anders als die
Temperatur-Schwellen, Abschnitt 4) – sie stehen nur im Kommentar über den
Quellenangaben als grobe Einordnung („~1 cm Eis → +10–15 %"), nicht als
`ThresholdOrigin`-Eintrag mit eigener Herkunftszeile.

---

## 3. Zwei Migrationsformate – Vereisung und Methode

### Vereisungsgrad: drei Kodierungen in einem Feld

`readFrostStage(details)` liest, in dieser Reihenfolge:
1. **`frostStage`** (aktuelles Format) – Code `0/1/2/3` = `none/spots/thin/thick`
2. **`frost`** (Altformat) – Code `0/1/2` = `none/thin/thick` (nur zwei Stufen;
   „leicht" entspricht der heutigen flächigen dünnen Schicht, „stark" dem
   Durchvereisten)
3. Fällt beides aus, `'none'`

**Kein Index in ein Array** – bewusst als benannte Codes: „Sobald eine Stufe
dazukommt, bedeuten alle gespeicherten Zahlen etwas anderes. Diese Codes
bleiben, was sie sind" (Kommentar im Code).

### Methode: `estimate` vs. das nicht mehr existierende `measured`

`FreezerMethod = 'estimate' | 'none'` – **`'measured'` gibt es im Typ nicht
mehr**. Neue Ergebnisse tragen ausschließlich `method: 1` (= `estimate`) oder
implizit `method: 0` (= `none`, bei eisfrei). **Gespeicherte** Ergebnisse
können aber weiterhin `method: 2` tragen – aus der Zeit, als der Check
optional mit einem Energiekostenmessgerät vor und nach dem Abtauen maß.
`FreezerResult` liest das als `measured = (details?.method ?? 0) === 2` und
zeigt für solche Altergebnisse einen anderen Text
(`effectMeasured` statt `effectEstimated`).

---

## 4. Die Innentemperatur – erhoben, aber nicht mehr abgefragt

`freezer.ts` definiert vollständige Schwellen:

```
TEMP_OPTIMAL = -18 °C
TEMP_TOO_WARM = -16 °C   (wärmer als das = zu warm)
TEMP_TOO_COLD = -20 °C   (kälter als das = zu kalt)
```

`freezerTempStatus(temp)` wertet sie aus, `FreezerResult` zeigt bei
vorhandener `details.temperature` eine Zeile „Temperatur X: optimal
eingestellt / zu warm / zu kalt".

**Das ist bereits als offener Punkt #15 in `docs/gefundene-probleme.md`
dokumentiert, nicht neu:** Der Info-Tab des Checks nennt als dritten Schritt
„Optional Temperatur messen" und zwei der fünf Detail-Tipps erklären, wie man
das Thermometer legt – aber **`FreezerRun.tsx` hat kein Eingabefeld dafür**.
`details.temperature` entsteht ausschließlich aus **Altergebnissen**, die noch
über eine frühere Version des Checks gemessen wurden. Der Textbaustein
`measurements.freezer.run.tempToggle` existiert in beiden Sprachen, wird aber
nirgends im Code referenziert – bestätigt beim Schreiben dieser Datei
(`grep` über `src/` findet keine Verwendung außerhalb der Locale-Dateien).

**Kilians Entscheidung steht noch aus** (siehe „Offene Fragen" in
`docs/gefundene-probleme.md`): Eingabe nachrüsten (dann wird der Info-Text
wahr) oder Temperatur-Text aus dem Info-Tab streichen.

Der Wissensbereich (`measurementThresholds.ts`) importiert die drei
Temperatur-Konstanten unter Alias (`FREEZER_OPTIMAL` usw.) und zeigt eine
vollständige Richtwert-Tabelle „Innentemperatur", **obwohl der Check selbst
diese Größe nicht mehr erhebt** – dieselbe Lücke wie oben, nur an einer
zweiten Stelle sichtbar.

---

## 5. `ApplianceGate` – der Check ist hinter einer Gerätefrage verriegelt

`registry.ts` verdrahtet nicht `FreezerRun` direkt, sondern
`GatedFreezerRun` aus `ApplianceGate.tsx`:

```ts
export function GatedFreezerRun(props: RunProps) {
  return (
    <ApplianceGate kind="freezer">
      <FreezerRun {...props} />
    </ApplianceGate>
  )
}
```

**Als Hülle um die Run-Komponente, nicht als Zeile auf der Erklärseite** – so
bleibt der Check selbst frei von der Frage, ob es sein Gerät überhaupt gibt,
und die Frage lässt sich **nicht** durch „weiter"-Sprünge (`begin=1`,
gespeicherter Entwurf) übergehen, die die Erklärseite auslassen würden.

`ApplianceGate` zeigt die Gerätefrage nur, solange `appliancesAnswered` falsch
ist **oder** kein passendes Gerät im Profil steht. `KINDS.freezer = ['freezer',
'fridge_freezer']` – ein Kühl-Gefrier-Kombigerät zählt auch als Gefriergerät.
Antwortet der Nutzer „keines", schreibt `setAppliances` das ins Profil zurück
**und navigiert sofort in die Übersicht** – der Check steht dort ab sofort
weder im Zähler noch im Nenner des Fortschritts (`countingAppliances` in
`progress.ts` liefert dann eine leere Liste).

Dieselbe Mechanik wie bei der Wärmeübergabe-Nachfrage im Möbelabstand-Check:
Wer über den Schnellstart gekommen ist, wird nicht zurück in den Fragebogen
geschickt, aber die hier gegebene Antwort landet trotzdem im Profil.

---

## 6. Mehrere Geräte – `perAppliance`, `ApplianceChooser`, Altergebnis-Vererbung

`perAppliance: true` im Katalog bedeutet: **Ein Ergebnis pro Gerät**, nicht
eines pro Haushalt. Bei mehr als einem Gefriergerät zeigt `ApplianceChooser`
eine Auswahlliste, bevor der eigentliche Check startet; bei genau einem Gerät
springt der Runner direkt weiter.

**Vor Etappe 12b lag jedes Ergebnis unter dem nackten Schlüssel `freezer`,
egal wie viele Geräte es gab** – ein zweites Gerät überschrieb das Ergebnis
des ersten, ohne Warnung. `applianceResult()` (`progress.ts`) löst das für
Bestandsdaten auf:

```ts
applianceResult(results, 'freezer', applianceId, isFirst)
  = results['freezer@' + applianceId] ?? (isFirst ? results['freezer'] : undefined)
```

Der **neue, gerätespezifische Schlüssel gewinnt**; nur das **erste** Gerät
seiner Art erbt ein Altergebnis unter dem nackten Schlüssel – sonst erbten
zwei Gefriertruhen dasselbe Altergebnis, und der Fortschritt zählte eine
Messung doppelt, die es nur einmal gab. Sobald ein Gerät neu gemessen wird,
gewinnt sein eigener Schlüssel dauerhaft.

`buildTips.ts` nutzt dieselbe Logik über `perAppliance()` (dort lokal
implementiert, `keyForAppliance` in `followUps.ts` ist das Gegenstück für die
Abtau-Erinnerung, Abschnitt 8) – ein Tipp **je Gerät**, nicht einer für alle:
„Ein Betrag aus vier Geräten an einer einzelnen Empfehlung wäre eine
Behauptung über fremde Arbeit."

---

## 7. Die Umgebungstemperatur – erste Verbindung zwischen zwei Checks

`ambientTemperature.ts` beschreibt sich selbst als **„die erste Verbindung
zwischen zwei Checks in dieser App"**: Steht ein Gefriergerät in einem Raum,
den der **Raumklima-Check** bereits gemessen hat, nutzt `FreezerResult` diese
gemessene Temperatur statt einer Annahme – und sagt im Ergebnis, dass er das
tut (`AmbientNote`, `ambient.measured`).

```ts
ambientFor(results, appliance):
  Raum bekannt + Raumklima-Ergebnis vorhanden → { celsius: gemessen, measured: true }
  sonst                                        → { celsius: Komfortband-Mitte, measured: false }
```

**Kein Check macht einen anderen zur Voraussetzung.** Ohne Raumklima-Ergebnis
gilt die Mitte des Komfortbands dieses Raumtyps (`DEFAULT_COMFORT_BAND`/
`COMFORT_BANDS` aus `room_temperature/roomClimate.ts`), ohne Raumangabe der
Wohnraum-Wert.

**Bei mehreren gleichartigen Räumen zählt die jüngste Messung** –
`measuredRoomTemp()` iteriert alle Ergebnis-Schlüssel mit dem Präfix
`room_temperature@<raumtyp>#` und nimmt das mit dem spätesten `completedAt`.
Ein Gerät kennt nur den Raum**typ** (`ApplianceEntry.room`), nicht die
konkrete Rauminstanz – „genauer ginge es nur, wenn das Gerät die Instanz
trüge; das erfragt der Fragebogen nicht, und dafür eine Frage mehr zu stellen
wäre der schlechtere Tausch" (Kommentar im Code).

**Zwei Konstanten, bewusst ohne Prozentzahl daneben:**

| Konstante | Wert | Bedeutung |
|---|---|---|
| `AMBIENT_COLD_MIN_C` | 10 °C | Untergrenze, ab der ein Haushaltsgerät zuverlässig kühlt – angelehnt an Klimaklasse SN. **Erfahrungswert der E-App**, keine Norm. |
| `AMBIENT_WARM_MIN_C` | 20 °C | Ab hier arbeitet das Gerät gegen ein spürbar größeres Temperaturgefälle. **Erfahrungswert der E-App.** |

`AmbientNote` zeigt **bewusst weder Euro-Betrag noch Prozentzahl**: „Dass der
Standort zählt, ist belegbar; wie viel Mehrverbrauch daraus folgt, hängt an
Dämmung, Alter und Dichtung des Geräts – Größen, die dieser Check nicht
kennt." Ohne Raumangabe zeigt die Komponente gar nichts (`if (!ambient.room)
return null`) – „dein Gerät steht in einem durchschnittlich warmen Raum" wäre
keine Aussage.

---

## 8. Die Abtau-Erinnerung – `followUps.ts`, nicht Teil dieses Ordners

Anders als beim Grundlast-Check (`remeasure.ts` liegt **im** Check-Ordner)
lebt die Wiedervorlage-Logik für den Gefrierschrank **außerhalb**, in
`measurements/followUps.ts` – gemeinsam mit der Kühlschrank-Wiedervorlage.

`defrostRecheckDue(result, defrostDoneAt, now)`:
1. Das Abtauen wurde als erledigt markiert (`defrostDoneAt` aus dem
   `tipsStore`, Zeitpunkt, an dem der Tipp „Gefrierfach abtauen" abgehakt
   wurde).
2. Seither ist **`DEFROST_RECHECK_DAYS` = 182 Tage** (ein halbes Jahr)
   vergangen.
3. Es gab seither **keine neue Messung** dieses Geräts.

**Warum ein halbes Jahr:** „Direkt nach dem Abtauen ist die Truhe erwartbar
eisfrei – eine Messung am nächsten Tag bestätigt nur die eigene Arbeit. Erst
wenn sich wieder Eis bilden konnte, sagt das Ergebnis etwas Neues."

Bedingung 3 räumt den Hinweis von selbst wieder ab, sobald neu gemessen
wurde. Der Zeitstempel gilt **je Gerät** – die Truhe im Keller kann wieder
dran sein, während das Gefrierfach in der Küche es noch nicht ist.

`keyForAppliance()` (`followUps.ts`) trägt dieselbe Rückfallkette wie
`applianceResult()` in Abschnitt 6, aus demselben Grund: „Ohne sie verlöre ein
Bestandsnutzer seine Abtau-Erinnerung, weil sein Ergebnis und sein abgehakter
Tipp beide unter `freezer` liegen."

`pendingFollowUps()` erzeugt daraus einen Eintrag `{ key, id: 'freezer' }` je
Gerät mit fälliger Abtau-Wiedervorlage – speist dieselben kleinen
Hinweispunkte in unterer Navigation und Messungsliste wie beim
Grundlast-Anstoß.

---

## 9. Die Dateien

```
src/features/measurements/freezer/
├── freezer.ts        195 Z. – Vereisungsstufen, Empfehlung, Temperatur-Schwellen (reine Fachlogik)
├── FreezerIntro.tsx    72 Z. – Hero-Bild + 1-2-3-Anleitung
├── FreezerRun.tsx     135 Z. – zwei Fragen, Draft-Persistenz
└── FreezerResult.tsx   94 Z. – Empfehlung, Wirkung, Umgebungstemperatur-Hinweis
```

Kein eigenes `remeasure.ts` (liegt für diesen Check in `followUps.ts`, Abschnitt
8), keine eigene `context.ts` (die Verknüpfung mit dem Raumklima-Check liegt
in der geteilten `ambientTemperature.ts`, Abschnitt 7). `freezer.ts` ist reine
Funktion ohne React-Import, deshalb direkt testbar und deshalb dürfen
`measurementThresholds.ts` und `buildTips.ts` daraus importieren, ohne eine
Komponente mitzuziehen.

### Der Run-Schirm

Zwei Karten: „Ist die Gefriertruhe vereist?" (Ja/Nein) und – nur bei „Ja" –
„Wie stark ist die Vereisung?" mit drei ausformulierten Optionen
untereinander (nicht nebeneinander, weil die Beschreibungen zu lang für
liegende Chips sind). Bei „Nein" erscheint sofort ein bestätigender Hinweis
(„Top – eisfrei läuft die Truhe effizient").

**Persistenz über den Draft-Store**, wie bei Grundlast und Kühlschrank: Der
Nutzer kann die Eingabe unterbrechen und später weitermachen. Der Entwurf
liest **beide** Vereisungs-Formate (`readFrostStage(d)`), damit ein
zwischengespeicherter Altentwurf nicht verloren geht.

`canEvaluate` verlangt nur `iced !== undefined` – bei „Nein" lässt sich sofort
auswerten, ohne eine Stufe zu wählen (die Stufe ist dann irrelevant, `stage`
fällt intern auf `'none'`).

### Der Ergebnis-Schirm

`ResultHero` mit der **Empfehlung** als Zusammenfassung (nicht
`result.summary.<rating>` – siehe Abschnitt 12) → Wirkungs-Karte (Prozent,
nur wenn vereist und `extraPercent > 0`) → „Abtauen"-Chip (nur wenn vereist)
→ Temperatur-Hinweis (nur bei vorhandenem `details.temperature`, also nur bei
Altergebnissen) → `AmbientNote` (Standort-Hinweis, Abschnitt 7).

---

## 10. Was das Ergebnis speichert

`MeasurementResult.details` (nur Zahlen, siehe `CLAUDE.md`):

| Schlüssel | Inhalt |
|---|---|
| `iced` | `1` = vereist, `0` = eisfrei |
| `frostStage` | Code `0–3` (Abschnitt 3) |
| `extraPercent` | geschätzter Mehrverbrauch in % (0 bei eisfrei) |
| `method` | `1` = `estimate` (neue Ergebnisse), `0` = `none`. **Nie `2`** aus neuen Ergebnissen – `2` (`measured`) kommt nur noch aus Altdaten vor. |
| `savingEstimated` | **immer `1`** bei neuen Ergebnissen – markiert die Schätzung als Schätzung für `isMeasuredSaving()` (Abschnitt 11) |

`primaryValue` = `extraPercent`, `unit` = `'%'`.

**Kein `roomKey` in dem Sinn wie bei Raum-Checks** – `roomKey` trägt hier die
**Geräte-ID** (`instanceKey('freezer', applianceId)`), nicht einen Raumtyp;
dieselbe Konvention wie beim Kühlschrank-Check.

---

## 11. Das Sparpotenzial – `yieldsSaving: true`, aber trotzdem nie in der Summe

**Auffällig im Vergleich zu Lighting und Grundlast:** Dort steht
`yieldsSaving` bewusst **nicht** im Katalog, damit ein Altergebnis mit
gespeichertem `yearlySaving` nicht über `resultSavingsEur()` zurück in
Wirkungs-Summe und Bericht kommt. **Beim Gefrierschrank-Check ist es
umgekehrt: `yieldsSaving: true` steht im Katalog** – und zwar **genau deshalb**,
weil ältere Ergebnisse mit `method: 2` (echte Vorher/Nachher-Messung mit
Energiekostenmessgerät) einen echten `avoidableCost` trugen, der weiterhin
zählen soll.

**Der Riegel gegen die *neue*, geschätzte Wirkung sitzt an einer anderen
Stelle:** Jedes neue Ergebnis setzt `savingEstimated: 1` (Abschnitt 10).
`isMeasuredSaving(details)` in `savingsDisplay.ts` prüft genau dieses Feld:

```ts
isMeasuredSaving(details) = (details?.savingEstimated ?? 0) !== 1
```

`impactSummary()` (`impact.ts`) gated die **Anzeige** eines Betrags zusätzlich
über `measured` – ein geschätzter Anteil in der Summe macht die ganze Summe
zur Schätzung. Ergebnis: Ein neues Gefrierschrank-Ergebnis trägt zwar
`yieldsSaving: true` im Katalog, aber weil es immer `savingEstimated: 1`
setzt, **erscheint sein Betrag nirgends** – weder in der Wirkungs-Summe noch
im einzelnen Tipp (`buildTips.ts`: `savingEur: isMeasuredSaving(...) && saving
> 0 ? saving : undefined`). Nur ein **Altergebnis** mit `method: 2` (das kein
`savingEstimated` gesetzt hatte) kann noch einen echten Betrag beisteuern.

**Kurz:** `yieldsSaving` entscheidet, ob eine Messung *grundsätzlich* zur
Summe beitragen darf; `savingEstimated` entscheidet, ob ein *einzelnes*
Ergebnis das tatsächlich darf. Der Gefrierschrank-Check ist der einzige, bei
dem beide Mechanismen gemeinsam und in entgegengesetzter Richtung wirken:
Katalog offen, aktuelle Ergebnisse selbst geschlossen.

---

## 12. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | `rooms: ['kitchen', 'basement', 'utility_room']` (die Gefriertruhe steht typisch nicht in der Küche allein), `difficulty 1`, 5 min, Kategorie `electricity`, `yieldsSaving: true` (Abschnitt 11), `perAppliance: true`, `instruments: []` mit explizitem Verweis auf Punkt 15 der Fundliste. |
| `measurements/registry.ts` | Verdrahtet `GatedFreezerRun` (nicht `FreezerRun` direkt) |
| `measurements/ApplianceGate.tsx` | Die Gerätefrage vor dem Check (Abschnitt 5) |
| `measurements/ApplianceChooser.tsx` | Geräteauswahl bei mehr als einem Gefriergerät |
| `measurements/progress.ts` | `applianceResult()`, `countingAppliances()` – Fortschritt je Gerät statt je Haushalt (Abschnitt 6) |
| `measurements/followUps.ts` | `defrostRecheckDue()` – die Abtau-Wiedervorlage (Abschnitt 8) |
| `measurements/ambientTemperature.ts` / `AmbientNote.tsx` | Umgebungstemperatur aus dem Raumklima-Check desselben Raums (Abschnitt 7) – geteilt mit dem Kühlschrank-Check |
| `measurements/impact.ts` | `resultSavingsEur()`/`isMeasuredSaving()` – der doppelte Riegel aus Abschnitt 11 |
| `onboarding/appliances.ts` | `applianceInstances()`, `hasAppliance()` – Geräteliste aus dem Profil |
| `onboarding/AppliancePicker.tsx` | UI der Gerätefrage in `ApplianceGate` |
| `education/measurementThresholds.ts` | Temperatur-Tabelle unter Alias importiert – **zeigt eine Größe, die der Check nicht mehr abfragt** (Abschnitt 4) |
| `education/educationContent.ts` | Mess-Hintergrund „Gefrierschrank" – Wirkung, Fehler; nennt Reif explizit als „größten Einzelfaktor" |
| `tips/buildTips.ts` | Ein Tipp **je Gerät** (`perAppliance()`), ausgelöst bei `iced === 1`; `savingEur` nur bei Altergebnissen mit echter Messung (Abschnitt 11); `effortMinutes: 60`, `costEur: 0` |
| `reports/measurementsReportData.ts` | Einheit `'%'` als Rückfall – Kommentar erklärt ausdrücklich den Wechsel von kWh/Tag (früher) zu Anteil (seit August 2026) |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis, `rating: 'elevated'`, 12 %, korrekt im aktuellen Format |
| `store/measurementDraftStore` | Persistiert die laufende Eingabe |
| `store/measurementsStore` | Liefert `results` für `AmbientNote`/`ambientFor` |
| `store/onboardingStore` | Liefert `appliances` für `ambientFor` und die Gerätefrage |

---

## 13. Was die Tests festhalten

| Datei | Prüft |
|---|---|
| `tests/unit/freezer.test.ts` | Drei Stufen statt zwei, jede Stufe eine Klasse strenger, jede Stufe eine Handlungsempfehlung; `readFrostStage` liest aktuelles Format, liest Altformat, bevorzugt das aktuelle bei beiden vorhanden, fällt bei Unsinn auf eisfrei zurück; `calcFreezerSaving` empfiehlt bei eisfrei nichts, schätzt als Anteil statt Euro, staffelt nach Stufe, liefert bei jeder Stufe eine Schätzung (**„der Check misst nicht mehr"** – expliziter Testname) |
| `tests/unit/followUps.test.ts` | Alle Bedingungen aus Abschnitt 8 (Abtauen erledigt + Zeit vergangen + keine neue Messung), inkl. der geräteweisen Zeitstempel-Trennung (zwei Geräte, nur das fällige meldet sich) |
| `tests/unit/buildTips.test.ts` | Der abgeleitete Tipp je Gerät |
| `tests/unit/measurementsReportData.test.ts` | Berichts-Aufbereitung |
| `tests/unit/thresholdReference.test.ts` | Die Temperatur-Tabelle im Wissensbereich (unabhängig davon, ob der Check die Größe noch erhebt) |
| `tests/unit/appliances.test.ts` | `applianceInstances`, `hasAppliance` – geteilt mit dem Kühlschrank-Check |
| `tests/unit/applianceProgress.test.ts` | Fortschritt je Gerät, Altergebnis-Vererbung ans erste Gerät |
| `tests/unit/measurementProgress.test.ts` | Fortschritt insgesamt, inkl. „keines" nimmt den Check aus Zähler und Nenner |

**Keine eigene Text-Vollständigkeitsprüfung** (wie beim Grundlast-Check) –
kein Test gleicht jeden verwendeten `t(...)`-Schlüssel gegen beide
Locale-Dateien ab. Der tote Schlüssel `run.tempToggle` (Abschnitt 4) würde
durch die Testsuite nicht auffallen.

---

## 14. Entscheidungen, die schon gefallen sind

1. **Kein Euro-Betrag mehr für neue Messungen.** Ein Fallback-Jahresverbrauch
   mal ein Standardpreis ergab für alle denselben Betrag – Scheingenauigkeit,
   nicht Personalisierung.
2. **Drei Vereisungsstufen statt zwei.** Die Grenze zwischen „ein paar
   Millimetern" und „flächig" trägt den halben Effekt.
3. **Die Vorher/Nachher-Messung mit Energiekostenmessgerät ist ersatzlos
   entfallen** (Punkt 14 in `docs/gefundene-probleme.md`). Sie passte nicht in
   diesen Check: ein Vorgang über Tage in einem Bildschirm, den man in einem
   Zug ausfüllt. Mitgegangen: der Rechenzweig `'measured'`, `FreezerEnergy`,
   `avoidableCost`, `workPriceCt` im Check selbst, das Hilfsmodul
   `energyMeter.ts` (einziger Nutzer war dieser Check) und mehrere
   Textbausteine.
4. **Gespeicherte Altergebnisse mit `method: 2` bleiben lesbar und werden
   weiter als „gemessen" ausgewiesen** – nicht migriert, nicht stillschweigend
   auf „geschätzt" umgedeutet.
5. **`yieldsSaving: true` bleibt im Katalog**, obwohl neue Ergebnisse nie
   einen Betrag beisteuern – der Riegel für neue Ergebnisse läuft über
   `savingEstimated`, nicht über den Katalog-Flag (Abschnitt 11). Der
   Katalog-Flag bleibt offen, damit alte, echt gemessene Beträge nicht
   verloren gehen.
6. **Die Temperatur-Frage ist noch nicht entschieden** (Punkt 15, offen seit
   dem Aufräumen von Punkt 14). Weder „Eingabe nachrüsten" noch „Info-Text
   streichen" wurde bisher umgesetzt.

---

## 15. Was offen ist

**Bereits in `docs/gefundene-probleme.md` dokumentiert** (nicht neu, hier nur
zusammengefasst, weil es diesen Check betrifft):

- **Punkt 15 / „Offene Fragen":** Temperatur-Eingabe im Gefrierschrank-Check
  nachrüsten (dann stimmt der Info-Tab) oder die Temperatur aus dem Info-Tab
  streichen? Kilians Entscheidung steht aus.

**Beim Schreiben dieser Datei aufgefallen** – nicht geändert, nur notiert:

- **`result.summary.good/medium/elevated/high` in den Locales ist tot** –
  dasselbe Muster wie beim LED-Check. `FreezerResult.tsx` nutzt für die
  `ResultHero`-Zusammenfassung ausschließlich
  `t('measurements.freezer.result.advice.${advice}')`, nie
  `result.summary.<rating>`. Die vier Rating-Texte werden nirgends gelesen –
  weder im Code noch in einem Test.
- **Der Textbaustein `run.tempToggle` ist tot** – bestätigt dieselbe Lücke wie
  in Punkt 15, aber als separater, ungenutzter i18n-Schlüssel: Er existiert in
  beiden Sprachen, wird aber von keiner Codezeile referenziert (nicht einmal
  von einem inzwischen entfernten Feature-Rest – er scheint nie verdrahtet
  worden zu sein).
- **Die drei Mehrverbrauch-Prozentsätze (5/12/30 %) haben keinen
  `ThresholdOrigin`-Eintrag**, obwohl der Code-Kommentar drei Quellen nennt
  (Verivox, BUND Hessen, klimaaktiv). Anders als die Temperatur-Schwellen
  (Abschnitt 4, die einen `ref(...)`-Eintrag mit Link tragen) stehen die
  Vereisungs-Prozentsätze nur als Prosa-Kommentar im Code, nicht als
  Wissensbereich-Eintrag mit eigener Herkunftszeile.

---

## 16. Wenn du etwas änderst

1. **Eine Vereisungsstufe hinzufügen oder ihre Prozentzahl ändern** → nur in
   `freezer.ts` (`FROST_STAGES`, `EXTRA_SHARE`, `RATING_BY_STAGE`,
   `ADVICE_BY_STAGE`, `STAGE_CODE`/`STAGE_BY_CODE`). Neue Stufen brauchen einen
   **neuen** Code – nie einen bestehenden umnummerieren, gespeicherte
   Ergebnisse werden nicht migriert.
2. **Die Temperatur-Eingabe nachrüsten** → `FreezerRun.tsx` bekäme ein neues
   Eingabefeld, `handleEvaluate` müsste `details.temperature` setzen, und der
   tote Textbaustein `run.tempToggle` bekäme endlich eine Verwendung. Vorher
   mit Kilian klären (Punkt 15).
3. **Den Riegel für das Sparpotenzial ändern** → nicht `yieldsSaving` im
   Katalog anfassen, sondern `savingEstimated` in `FreezerRun.tsx`. Ein
   Entfernen von `savingEstimated: 1` würde sofort neue geschätzte Beträge in
   Wirkungs-Summe und Bericht durchlassen (Abschnitt 11) – vermutlich nicht
   gewollt, ohne eine echte Rechnung dahinter.
4. **Ein weiteres Gerät mit `perAppliance` einführen** → `applianceResult()`
   und `keyForAppliance()` sind zwei getrennte Implementierungen derselben
   Rückfallkette (`progress.ts` und `followUps.ts`) – beide anpassen, wenn
   sich das Muster ändert, oder zusammenführen.
5. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte: `docs/gefundene-probleme.md`, Punkte 14, 15
und 16 (Nachbar-Fund beim Kühlschrank-Check, derselbe Ordner-übergreifende
Mechanismus).
