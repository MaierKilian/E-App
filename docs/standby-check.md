# Standby-Check – alles, was man vor einer Änderung wissen muss

> Stand: 05.09.2026. Diese Datei ist die Übergabe an die nächste KI-Session
> (und an Kilian). Sie beschreibt den Check vollständig: was er misst, warum er
> so rechnet, was ihn außerhalb seines Ordners berührt, welche Entscheidungen
> bereits gefallen sind – samt Begründung, damit niemand sie versehentlich
> rückgängig macht – und was beim Schreiben dieser Datei auffiel (darunter ein
> drittes, bisher nicht dokumentiertes Demo-Profil mit veraltetem Format).

---

## 1. Was der Check tut

Der Nutzer misst mit einem **Energiekosten-Messgerät** die Standby-Leistung
**einzelner Geräte** (Fernseher, Konsole, Router, Ladegerät …) und trägt sie
mit einem frei gewählten Namen ein. Aus der **Summe** aller Geräte ergeben
sich Jahresverbrauch, Jahreskosten und eine Bewertung.

**Anders als bei den meisten anderen Checks ist der Euro-Betrag hier echt –
kein geschätzter Anteil, keine Faustregel.** Jedes Watt kommt aus einer
tatsächlichen Messung, deshalb rechnet der Check ohne Einschränkung mit
Jahreskosten und **vermeidbaren** Kosten (Abschnitt 3). Die einzige
Vereinfachung: „nur der Strom-Arbeitspreis angesetzt (kein Grundpreis, keine
Nutzungsmuster) und durchgängig 24 h/Tag Standby angenommen" (Kommentar in
`standby.ts`) – Standby läuft per Definition rund um die Uhr, das ist keine
zusätzliche Schätzung, sondern die Bedeutung des Wortes.

**Messgeräte:** `instruments: [{ type: 'power_meter', required: true }]` –
**Pflicht**, ohne Steckdosen-Energiemessgerät gibt es keine Wattzahl
einzugeben.

**Ein Ergebnis fürs ganze Zuhause** (`wholeHome: true`), keine Pro-Raum- oder
Pro-Gerät-Speicherung wie bei Kühl-/Gefrierschrank – die einzelnen Geräte
leben stattdessen **innerhalb** des einen Ergebnisses (Abschnitt 4).

---

## 2. Die Bewertung

```
GOOD_MAX = 5 W, MEDIUM_MAX = 20 W

rateStandby(totalW):
  totalW <= 5    → good
  totalW <= 20   → medium
  sonst          → high
```

**Beide Schwellen sind unbelegt** (`ThresholdOrigin: 'pending'`), wie beim
Grundlast- und Warmwasser-Wartezeit-Check – ein Test hält aktiv fest, dass
genau diese drei Messungen offen bleiben (`measurementInfos.test.ts`,
ausführlich in `docs/grundlast-check.md` Abschnitt 3). Der Wissensbereich
nennt explizit, warum die einzig greifbare Referenzzahl **nicht** taugt: „Die
Ökodesign-Verordnung (EU) 2023/826 begrenzt den Bereitschaftsbetrieb neuer
Geräte auf 0,5 W – das ist eine Bauvorschrift, kein Maßstab für ein
Bestandsgerät am Messgerät."

**Die Bewertung bleibt leistungsbasiert (Watt), obwohl der Hauptwert im
Ergebnis die Jahreskosten in € sind.** Das ist eine bewusste Trennung: Watt
ist die stabile, vom Strompreis unabhängige Größe für die Ampel; Euro ist die
verständlichere Zahl für die Anzeige. Ein Test und ein Kommentar im Code
(`primaryValue = calc.annualCost … die Bewertung bleibt jedoch
leistungsbasiert`) halten das ausdrücklich fest, damit niemand versehentlich
beides an derselben Größe festmacht.

---

## 3. Vermeidbare Kosten – anders als „Sparpotenzial" bei den übrigen Checks

```ts
avoidableCost = rating === 'good' ? 0 : annualCost
```

**Bei „medium" oder „high" gelten die gesamten Jahreskosten als vermeidbar**,
nicht nur ein Anteil: „eine schaltbare Steckdosenleiste / ein Smart-Plug kann
den Standby quasi eliminieren" (Kommentar in `standby.ts`). Das unterscheidet
diesen Check von allen anderen mit Sparpotenzial – dort ist die Ersparnis
typischerweise ein Bruchteil des Gesamtverbrauchs (z. B. Duschkopf: Prozent
weniger Durchfluss; Kühlschrank: nur die Differenz bis zur Empfehlung). Beim
Standby-Check ist die Ersparnis **binär**: entweder komplett vermeidbar (die
Steckdosenleiste ist an oder aus) oder gar nicht (schon „good").

---

## 4. Mehrere Geräte in einem Ergebnis – Kodierung ohne `perAppliance`

Anders als Kühl-/Gefrierschrank (`perAppliance: true`, eigenes Ergebnis je
Gerät) speichert der Standby-Check **alle Geräte in einem einzigen
Ergebnis-Objekt**. `encodeDevices()` (`StandbyRun.tsx`) kodiert die Liste:

```ts
details: { dev0: 12.3, dev1: 4.1, ... }   // Index → Watt
labels:  { dev0: "Fernseher Wohnzimmer" } // nur bei vorhandenem Namen
```

**Namenlose Geräte bekommen keinen Eintrag in `labels`** – die
Ergebnis-Ansicht nummeriert sie dann durch (`t('measurements.standby.run
.deviceLabel', { index })`). `dev{index}` bezieht sich auf die **Position
nach dem Sortieren** (absteigend nach Watt, `calcStandby` sortiert vor dem
Kodieren) – der größte „Stromfresser" ist also immer `dev0`, unabhängig von
der Eingabereihenfolge.

### Zwei Kodierungsformate – wie beim LED-Check, aber anders benannt

`decodeDevices()` (`StandbyResult.tsx`) liest zwei Formate:
- **Aktuell:** `dev{index}` → Watt, Name in `labels` unter demselben Schlüssel
- **Alt** (vor August 2026): `dev{index}_{type}` → Watt, wobei `{type}` einer
  von sieben festen Gerätetypen ist (`LegacyStandbyDeviceType`: `tv`,
  `console`, `pc`, `router`, `audio`, `charger`, `other`). Damals wählte der
  Nutzer je Gerät einen Typ – „nicht weil die Rechnung ihn brauchte, sondern
  weil `details` nur Zahlen aufnimmt und die Ergebnis-Ansicht sonst keine
  Beschriftung gehabt hätte" (Kommentar in `standby.ts`). Seit die
  Bezeichnung in `labels` mitwandert, entfällt die Typ-Auswahl; für bereits
  gespeicherte Ergebnisse bleibt der Typ als Beschriftung erhalten.

`buildTips.ts` hat für denselben Zweck eine **eigene, dritte** Regex-basierte
Leseroutine (`biggestStandbyDevice()`), die dieselben zwei Formate parst, aber
unabhängig implementiert ist – keine gemeinsame Funktion mit
`decodeDevices()`. Wer das Kodierformat ändert, muss **beide** Stellen
anpassen.

---

## 5. Gerätewiedererkennung – `deviceHistory.ts`

„Der Standby-Check wird mehrfach durchgeführt – nach einer Steckdosenleiste,
nach einem Neukauf." Zwei reine Hilfsfunktionen machen daraus eine
Kontinuität, ohne eine Gerätekennung wie bei Kühl-/Gefrierschrank zu brauchen:

- **`previouslyMeasured(lastResult, name)`** – vergleicht über den
  **normalisierten Namen** (getrimmt, klein geschrieben, mehrfacher
  Leerraum zusammengefasst). Findet er eine Übereinstimmung im vorherigen
  Ergebnis, zeigt `StandbyRun` sofort beim Eintippen des Namens einen Hinweis
  „zuletzt gemessen: X W" – **ohne den alten Wert vorzubelegen**, nur als
  Information.
- **`duplicateIndices(names)`** – markiert **nur den späteren** von zwei
  gleichnamigen Einträgen **in derselben, aktuell laufenden** Eingabe. „Der
  erste bleibt unmarkiert, sonst stünde der Hinweis an beiden und keiner wäre
  der ‚richtige'."

**Beides sind Hinweise, keine Sperren:** Ein doppelter Name kann gewollt sein
(zwei baugleiche Geräte), und ein früher gemessenes Gerät soll man gerade
erneut messen dürfen – der alte Wert ist dann der Vergleich, kein Verbot.

**Die Wiedererkennung wirkt nur über das allerletzte Ergebnis**
(`results.standby`), nicht über die gesamte Historie – ein Gerät, das vor
zwei Messungen zuletzt vorkam, aber in der letzten Runde nicht erneut
eingetragen wurde, verschwindet aus dem Vergleich.

---

## 6. Keine Entwurfs-Persistenz – anders als Grundlast, Kühl- und Gefrierschrank

**`StandbyRun.tsx` nutzt `measurementDraftStore` nicht.** Die drei anderen
elektrischen Checks mit längerer oder unterbrechbarer Eingabe (Grundlast,
Kühlschrank, Gefrierschrank) persistieren ihren Zwischenstand explizit über
`readDraft`/`setDraft`, damit der Nutzer die App schließen und später
weitermachen kann. Der Standby-Check tut das an keiner Stelle – die
gesamte, potenziell mehrgerätige Eingabeliste (`entries`) lebt ausschließlich
im React-`useState` der Komponente und **geht beim Verlassen des Checks
(Navigation, Reload, Browser-Zurück) vollständig verloren**, ohne Warnung.

Das mag beabsichtigt sein – anders als eine Zwei-Ablesungen-Grundlastmessung
(Stunden Wartezeit) oder eine Vereisungs-Einschätzung (Sekunden) ist eine
Runde Standby-Messungen typischerweise ein zusammenhängender Rundgang durch
die Wohnung, bei dem eine Unterbrechung untypisch ist. **Nicht geprüft, nur
notiert** (Abschnitt 11) – es gibt keine dokumentierte Entscheidung dazu in
`docs/gefundene-probleme.md`.

---

## 7. Die Dateien

```
src/features/measurements/standby/
├── standby.ts         118 Z. – Bewertung, Summen, Kosten (reine Fachlogik)
├── deviceHistory.ts    56 Z. – Namensvergleich, Wiedererkennung, Dubletten (reine Fachlogik)
├── StandbyIntro.tsx    76 Z. – Hero-Bild + 1-2-3-Anleitung
├── StandbyRun.tsx     249 Z. – wachsende Geräteliste, laufende Summe
└── StandbyResult.tsx  197 Z. – Kosten-Hero, Mini-Kacheln, Geräte-Aufschlüsselung
```

`standby.ts` und `deviceHistory.ts` sind reine Funktionen ohne React-Import –
direkt testbar, deshalb dürfen `measurementThresholds.ts` und `buildTips.ts`
daraus importieren, ohne eine Komponente mitzuziehen.

### Der Run-Schirm

Eine **wachsende Liste** von Geräte-Karten (Start: eine leere Karte), je Karte:
Name-Feld, +/− -Buttons plus Zahlenfeld für Watt (0,5er-Schritte, Obergrenze
200 W), optionaler Lösch-Button (das letzte verbleibende Gerät lässt sich
nicht entfernen). Darunter „Gerät hinzufügen", die laufende Summe, dann
„Auswerten" – aktiv sobald **mindestens ein** Gerät mit `watts > 0` erfasst
ist.

Ein Hinweis erscheint je nach Lage: **Dublette** (amber, warnend) hat Vorrang
vor **„zuletzt gemessen"** (neutral, informativ) – beide werden nie
gleichzeitig gezeigt (`!isDuplicate && seenBefore !== undefined`).

### Der Ergebnis-Schirm

`ResultHero` mit **Jahreskosten** als Hauptzahl (nicht Watt!), Monatskosten
klein darunter, optional ein „geschätzt"-Badge (Abschnitt 8) → zwei
Mini-Kacheln (Standby-Leistung in W, Jahresverbrauch in kWh) → **Geräte-
Aufschlüsselung** als horizontale Balken, absteigend sortiert, Balkenbreite
relativ zum größten Gerät (Mindestbreite 6 %, damit auch kleine Werte
sichtbar bleiben) → Tipp-Chips (Steckdosenleiste/Smart-Plug, oder „gut" bei
`good`) → vermeidbarer Betrag als Fließtext (nur bei `!isGood` und `> 0`).

---

## 8. Der Tarif-Hinweis – Schätzung des Preises, nicht der Messung

```ts
tariffCustom: tariffIsCustom ? 1 : 0   // 1 = Nutzer hat einen eigenen Preis eingetragen
isEstimated = (details?.tariffCustom ?? 0) === 0
```

**Das ist eine andere Art von „geschätzt" als bei den übrigen Checks.** Bei
Duschkopf, Kühl-/Gefrierschrank markiert eine Schätzung eine unsichere
**Messgröße** (`savingEstimated`, `isMeasuredSaving()`). Hier ist die
**Messung selbst felsenfest** (echte Watt-Zahl vom Energiekostenmessgerät) –
unsicher ist nur der **Strompreis**, falls der Nutzer keinen eigenen Tarif
hinterlegt hat. Der Check zeigt den Euro-Betrag deshalb **immer** an (anders
als bei `savingEstimated`, wo der Betrag ganz verschwindet), aber mit einem
kleinen „geschätzt"-Badge, solange der Standardpreis gilt.

---

## 9. Wer den Check von außen berührt

| Ort | Was er tut |
|---|---|
| `measurements/catalog.ts` | `wholeHome: true`, `difficulty 2`, 12 min, Kategorie `electricity`, **`yieldsSaving: true`** (echte Messung, kein Riegel nötig), `instruments: [{ power_meter, required: true }]` |
| `measurements/registry.ts` | Standard-Verdrahtung (Intro/Run/Result), kein `Gated*`-Wrapper |
| `measurements/base_load/remeasure.ts` | `standby` ist eines von drei `LOWERING_MEASUREMENTS` – löst den „Grundlast erneut messen"-Anstoß aus (ausführlich in `docs/grundlast-check.md` Abschnitt 9) |
| `measurements/base_load/BaseLoadResult.tsx` | Die „Verursacher finden"-Trichterkarte verlinkt hierher (`navigate('/measurements/standby')`), wenn die Grundlast nicht gut ist |
| `education/measurementThresholds.ts` | Tabelle unter Alias importiert (`STANDBY_GOOD_MAX`/`STANDBY_MEDIUM_MAX`), `origin: pending(...)` – einer von drei offenen Richtwerten |
| `education/educationContent.ts` | Mess-Hintergrund „Standby-Verbrauch" – Wirkung, Fehler (Netzteile übersehen, während des Herunterfahrens messen, schwankende Aufnahme bei Druckern/Konsolen in einem Moment erfassen) |
| `tips/buildTips.ts` | Ein Tipp bei `standby > 0` (also fast immer außer bei „good"), mit **eigener** Geräte-Dekodierung (`biggestStandbyDevice()`, Abschnitt 4); nennt das größte Gerät beim Namen, sonst den Gerätetyp; `savingEur` ist der **volle** vermeidbare Betrag (kein Anteil, Abschnitt 3) |
| `reports/measurementsReportData.ts` | Feste Einheit `'€/Jahr'` |
| `demo/demoProfile.ts` | Ein Demo-Ergebnis in **veraltetem Format** – Abschnitt 10 |
| `store/tipsStore.ts` | Nutzt die Tipp-ID `"standby"` als Beispiel im eigenen Kopf-Kommentar für „stabile Tip-id" |
| `store/tariffStore` | Liefert `electricityWorkPrice` und `isCustom` für die Kostenrechnung und den Schätz-Badge |
| `store/measurementsStore` | Liefert `results.standby` für die Gerätewiedererkennung |

---

## 10. Ein drittes stales Demo-Profil – nach Möbelabstand und Kühlschrank

**Das Standby-Demo-Ergebnis ist im falschen Format**, dasselbe Muster wie bei
`fridge` (`docs/kuehlschrank-check.md` Abschnitt 7) und `furniture_spacing`:

```ts
result('standby', 'high', 31, 'W', 19, { details: { watts: 31 } })
```

**Erwartet wäre:** `primaryValue` = Jahreskosten in €, `unit: '€/Jahr'`,
`details: { totalWatts, annualKwh, annualCost, avoidableCost, tariffCustom,
dev0, ... }`. Stattdessen steht hier `unit: 'W'` und ein einzelner Schlüssel
`watts`, der in keinem der beiden von `decodeDevices()` erkannten Formate
vorkommt.

**Konkrete Auswirkung, nachvollzogen am Lesecode:**
- `annualCost = result.details?.annualCost ?? result.primaryValue ?? 0` → da
  `details.annualCost` fehlt, greift der Rückfall auf `primaryValue` = **31**
  – die Hero-Zahl zeigt „≈ 31 €/Jahr", obwohl 31 eigentlich als **Watt**
  gemeint war.
- `totalW = result.details?.totalWatts ?? 0` → **0 W**, weil der Schlüssel
  `watts` statt `totalWatts` heißt – die Mini-Kachel „Standby-Leistung" zeigt
  „0,0 W".
- `annualKwh = result.details?.annualKwh ?? 0` → **0 kWh** – die zweite
  Mini-Kachel zeigt „0 kWh".
- `decodeDevices()` findet **keinen** Schlüssel, der `dev{index}` oder
  `dev{index}_{type}` entspricht → die Geräte-Aufschlüsselung bleibt
  **komplett ausgeblendet** (`devices.length > 0` ist falsch).

**Das Demo zeigt also einen sichtbar unvollständigen Ergebnis-Schirm:**
Kosten-Zahl vorhanden (aber inhaltlich die falsche Größe), beide Mini-Kacheln
bei Null, keine Geräteliste. Ungetestet – `tests/unit/profileReport.test.ts`
prüft das Demo-Profil nur für den PDF-Steckbrief, nicht für einzelne
Mess-Ergebnis-Schirme.

---

## 11. Was die Tests festhalten

| Datei | Prüft |
|---|---|
| `tests/unit/standbyDevices.test.ts` | `normalizeDeviceName` (Groß/Klein, Leerraum, leerer Name), `previouslyMeasured` (findet Gerät, erkennt trotz abweichender Schreibweise, meldet nichts bei Unbekanntem/fehlendem Namen/fehlender Vormessung/Altergebnis ohne `labels`), `duplicateIndices` (nur der spätere markiert, schreibweiseunabhängig, leere Namen keine Dubletten) |
| `tests/unit/lookupSearch.test.ts` | (Suchfunktion, die den Standby-Check als ein durchsuchbares Element einschließt – Berührung, keine standby-eigene Logik) |
| `tests/unit/remeasure.test.ts` | `standby` als eine der `LOWERING_MEASUREMENTS` |
| `tests/unit/thresholdReference.test.ts` | Die Richtwert-Tabelle im Wissensbereich |
| `tests/unit/buildTips.test.ts` | Der abgeleitete Tipp, inkl. Gerätename vs. Gerätetyp |
| `tests/unit/impact.test.ts` | `avoidableCost` zählt korrekt als **gemessener** Betrag in die Wirkungs-Summe (kein Riegel wie bei den geschätzten Checks) |
| `tests/unit/measurementsReportData.test.ts` | Berichts-Aufbereitung |
| `tests/unit/measurementInfos.test.ts` | `standby` unter den drei aktiv offenen (`pending`) Richtwerten |

**Keine Tests für `calcStandby()` selbst als eigene `describe`-Gruppe** – die
Rechenfunktion wird nur indirekt über `buildTips.test.ts`/`impact.test.ts`
berührt, nicht direkt in `standbyDevices.test.ts` (das sich ausschließlich auf
`deviceHistory.ts` konzentriert, trotz des Namens „standbyDevices"). Keine
Tests für `StandbyRun`/`StandbyResult` als Komponenten, keine Tests, die das
Fehlen der Entwurfs-Persistenz (Abschnitt 6) oder das stale Demo-Format
(Abschnitt 10) prüfen würden.

---

## 12. Entscheidungen, die schon gefallen sind

1. **Der Euro-Betrag ist echt, nicht geschätzt** – jedes Watt kommt aus einer
   Messung, deshalb kein `savingEstimated`-Riegel wie bei Duschkopf, Kühl-
   oder Gefrierschrank.
2. **Bei „medium"/„high" gilt der volle Jahresbetrag als vermeidbar**, nicht
   ein Anteil – eine Steckdosenleiste eliminiert Standby praktisch vollständig.
3. **Die Ampel bleibt leistungsbasiert (Watt), die Anzeige kostenbasiert
   (Euro)** – zwei verschiedene Größen für zwei verschiedene Zwecke, bewusst
   getrennt gehalten.
4. **Keine Gerätekennung wie bei Kühl-/Gefrierschrank.** Ein Ergebnis fürs
   ganze Zuhause, Geräte nur über Position (`dev{index}`) und optionalen Namen
   unterschieden – Wiedererkennung läuft über den **Namen**, nicht über eine
   stabile ID.
5. **Hinweise statt Sperren** bei Dubletten und Wiedererkennung – beides sind
   legitime, bewusste Nutzeraktionen, kein Fehler.
6. **Die Typ-Auswahl (`LegacyStandbyDeviceType`) ist entfallen**, seit die
   Bezeichnung in `labels` mitwandert – Altergebnisse bleiben über das zweite
   Kodierformat lesbar.

---

## 13. Was offen ist

Kein eigener Punkt zum Standby-Check steht in `docs/gefundene-probleme.md`.

**Beim Schreiben dieser Datei aufgefallen** – nicht geändert, nur notiert:

- **Das Demo-Profil für `standby` ist im falschen Format** (Abschnitt 10) –
  dasselbe wiederkehrende Muster wie bei `fridge`
  (`docs/kuehlschrank-check.md`) und `furniture_spacing`
  (`docs/moebel-abstands-check.md`). Mit diesem dritten Fall lohnt sich
  vermutlich ein **einmaliger Durchgang durch das gesamte Demo-Profil**
  gegen jedes aktuelle Ergebnisformat, statt jeden Fall einzeln beim
  Vorbeikommen zu entdecken.
- **Keine Entwurfs-Persistenz** (Abschnitt 6) – ob das Absicht oder Lücke ist,
  steht nirgends dokumentiert.
- **Drei unabhängige Implementierungen derselben Geräte-Dekodierung**
  (`decodeDevices()` in `StandbyResult.tsx`, `biggestStandbyDevice()` in
  `buildTips.ts`, und implizit die Kodierung in `StandbyRun.tsx`) – funktional
  synchron, aber nicht als eine gemeinsame Funktion geteilt. Ändert sich das
  Kodierformat, müssen alle drei Stellen einzeln nachgezogen werden.

---

## 14. Wenn du etwas änderst

1. **Eine Watt-Schwelle ändern** → nur `standby.ts`. Wissensbereich zieht über
   den Alias-Import nach; die `pending`-Kennzeichnung bleibt, bis eine Quelle
   gefunden ist.
2. **Das Kodierformat der Geräte ändern** → `encodeDevices()` (`StandbyRun.tsx`),
   `decodeDevices()` (`StandbyResult.tsx`) **und** `biggestStandbyDevice()`
   (`buildTips.ts`) gemeinsam anpassen – keine gemeinsame Quelle, leicht zu
   vergessen (Abschnitt 13).
3. **Eine Entwurfs-Persistenz nachrüsten** → Vorbild `FreezerRun.tsx`
   (`measurementDraftStore`, `readDraft`/`setDraft`), aber die Struktur ist
   hier komplexer (eine variable Liste statt fester Felder) – der Entwurf
   müsste die ganze `entries`-Liste serialisieren, nicht nur einzelne Zahlen.
4. **Das Demo-Profil korrigieren** → `demoProfile.ts`, `standby`-Eintrag auf
   `primaryValue` = Jahreskosten, `unit: '€/Jahr'`,
   `details: { totalWatts, annualKwh, annualCost, avoidableCost,
   tariffCustom, dev0, … }` umstellen (Abschnitt 10) – idealerweise im
   selben Zug wie der `fridge`-Fix aus `docs/kuehlschrank-check.md`.
5. **Immer:** `npx vitest run tests/unit`, `npx eslint .`, `npm run build`.

Vollständige Vorgeschichte: Kein eigener Punkt in
`docs/gefundene-probleme.md`. Die drei offenen Richtwerte (inkl. `standby`)
sind in `docs/verbesserungen-etappen.md`, Etappe 6, besprochen.
