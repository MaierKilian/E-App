# Fragebogen-Umbau – Etappen-Tracker

> **Arbeitsdokument.** Konzept und Begründungen stehen in
> `questionnaire-concept.md`; hier steht der Arbeitsstand und was je Etappe als
> „fertig“ gilt.
>
> **Nach jeder abgeschlossenen Etappe wird dieses Dokument aktualisiert** –
> Status, Datum, Commit. Es ist die einzige Quelle für „wo stehen wir“.

## So wird gearbeitet

Eine Etappe pro Session. Der Einstieg ist immer derselbe:

```
/etappe          → nimmt die nächste offene Etappe
/etappe 3        → nimmt gezielt Etappe 3
/etappe status   → nur der Stand, ohne zu arbeiten
```

Jede Etappe endet mit: Typecheck grün, ESLint grün, Tests grün, Commit auf dem
Arbeits-Branch, Merge nach `main`, Push – und einer aktualisierten Statuszeile
hier. Der Auto-Deploy nach Firebase Hosting und GitHub Pages läuft dann von
selbst (siehe `deployment.md`).

## Stand

| # | Etappe | Status | Abgeschlossen | Commit |
|---|---|---|---|---|
| 0 | Vorarbeit: Fortschrittszahlen aus einer Quelle | ✅ fertig | 2026-08-24 | `d403a63` |
| 1 | Räume robust machen | ✅ fertig | 2026-08-24 | `4a1629a` |
| 2 | Zähler entsperren | ✅ fertig | 2026-08-24 | `581b390` |
| 3 | Registry und Schrittzustände | ⬜ offen | – | – |
| 4 | Neue Schrittfolge und kurzer Schnellstart | ⬜ offen | – | – |
| 5 | Modernisierung und Erzeuger-Alter | ⬜ offen | – | – |
| 6 | Gerätebestand, Keller, Ziele | ⬜ offen | – | – |

**Abhängigkeiten:** 4 braucht 1 und 3 · 5 braucht 3 · 6 braucht 4.
1, 2 und 3 sind untereinander unabhängig und in beliebiger Reihenfolge machbar.

---

## Etappe 0 – Vorarbeit (abgeschlossen)

Fortschrittszahlen der Checks kamen aus drei verschiedenen Rechnungen; die
Gewerke-Kacheln fanden Ergebnisse mit Raum- oder Entnahmestellen-Schlüssel nie
(„Ring 9/9, Heizung 0/2“). Neu bündelt `src/features/measurements/progress.ts`
alle Regeln; Ring, Zuhause-Karte, Empfohlen-Liste und Kacheln rechnen daraus.
Übersprungene Räume fallen aus Zähler und Nenner.

Diese Datei ist die Grundlage für Etappe 6 (`skipped` für ganze Checks).

---

## Etappe 1 – Räume robust machen

> **Ziel:** Jeder Check läuft, auch wenn noch kein einziger Raum angelegt ist.
> Referenz: Konzept Abschnitt 5.

### Ausgangslage

Drei Checks brauchen Räume und scheitern ohne sie:

| Check | Verhalten heute |
|---|---|
| Raumklima (`perRoom`) | `RoomPicker` zeigt „Du hast noch keine Zimmer ausgewählt“ – Sackgasse |
| Möbelabstand (`perRoom`) | dito |
| Beleuchtung | `LightingRun` rendert eine **leere Liste**, ohne Hinweis |

### Umfang

1. **`RoomTypePicker` als geteiltes Bauteil**
   Die Raumtyp-Auswahl aus `Step3Rooms` (13 Typen, drei Gruppen, Icons aus
   `roomIcons.ts`) wird eine eigene Komponente. Zwei Verwendungen:
   Fragebogen-Schritt (mit Anzahl, Fläche) und Check-Sheet (nur Typ antippen).

2. **`RoomPicker` bekommt „Raum anlegen“**
   In `MeasurementRunner.tsx`. Ohne Räume ist das Anlegen die Hauptaktion, mit
   Räumen eine Zeile unter der Liste. Neuer Raum:
   `{ type, count: 1, heatTransfer: 'radiator' }`. Existiert der Typ schon,
   `count` erhöhen und die **neue** Instanz ansteuern (`bedroom#1`).

3. **`LightingRun` mit Raumanlage** statt leerem Schirm.

4. **Raum-Chip im Check-Kopf**
   Der Raumname ist heute ein toter Text-Suffix in der Überschrift. Künftig
   antippbar: wechseln oder neuen Raum anlegen.

5. **„Speichern & nächster Raum“** (Konzept 5.7)
   Auf dem Ergebnis-Schirm zwei Primär-Knöpfe statt einem; der Knopf **nennt**
   den nächsten Raum. Ohne offenen Raum nur „Speichern & zur Übersicht“. Bei
   Checks ohne Raumbezug unverändert ein Knopf. `SavedInterstitial` springt
   nicht mehr überraschend, sondern zum gewählten Ziel – und kürzer, wenn es
   weitergeht.

6. **Wärmeübergabe-Nachfrage im Möbelabstand-Check**
   `FurnitureSpacingRun` liest heute `heatTransfer` und unterstellt bei
   fehlender Angabe stillschweigend „Heizkörper“. Künftig: einmal fragen,
   Antwort ins Profil zurückschreiben, sichtbar machen dass sie für alle Räume
   dieses Typs gilt.

### Berührte Dateien

```
neu     src/features/onboarding/RoomTypePicker.tsx
        src/features/measurements/MeasurementRunner.tsx        (RoomPicker, Chip, Save-Ziele)
        src/features/measurements/lighting/LightingRun.tsx
        src/features/measurements/furniture_spacing/FurnitureSpacingRun.tsx
        src/features/onboarding/steps/Step3Rooms.tsx           (nutzt RoomTypePicker)
        src/store/onboardingStore.ts                           (addRoom-Aktion)
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [x] Mit **null** Räumen ist jeder der neun Checks bis zum Ergebnis durchführbar.
- [x] Ein im Check angelegter Raum erscheint anschließend im Fragebogen-Schritt
      „Räume“, in der Raum-Ansicht und im Fortschritt – ohne Neuladen.
- [x] Ein zweiter Raum desselben Typs landet als eigene Instanz (`bedroom#1`),
      und der Check startet in **dieser** Instanz.
- [x] Der Ergebnis-Schirm eines Pro-Raum-Checks nennt den nächsten offenen Raum
      beim Namen; ohne weiteren Raum steht dort „zur Übersicht“.
- [x] Der Möbelabstand-Check fragt die Wärmeübergabe nur, wenn das Profil sie
      nicht kennt, und schreibt sie zurück.
- [x] Typecheck, ESLint und `npx vitest run` grün.

Abnahme gefahren mit `tests/unit/roomCreation.test.ts` (Store-Ebene) und einem
Playwright-Durchlauf gegen die laufende App (Bedienebene, Skript im Scratchpad
der Session).

### Unterwegs entschieden

- **`RoomEntry.heatTransfer` ist jetzt optional.** „Noch nicht beantwortet“
  musste ein eigener Zustand werden – sonst kann kein Check erkennen, ob das
  Profil die Antwort kennt oder nur den Default `'radiator'` trägt. Neue Räume
  entstehen ohne Wert, bestehende Profile behalten ihren.
- **„Speichern & weiter“ überspringt die Erklärseite** (`begin=1`). Beim Test
  fiel auf, dass der nächste Raum sonst wieder auf der Info-Phase startet – bei
  sechs Räumen sechsmal dieselbe Anleitung.
- Der **Beleuchtungs-Check** brauchte dieselbe Raumanlage wie die beiden
  Pro-Raum-Checks; das war in der ursprünglichen Analyse untergegangen.

### Offene Entscheidung

Instanz-genaue Abweichungen (`RoomEntry.overrides`, Konzept 5.5) kommen
**später**. Bis dahin schreibt der Check auf Typ-Ebene zurück und sagt das auch
(„gilt für alle Räume vom Typ Küche“).

---

## Etappe 2 – Zähler entsperren

> **Ziel:** Kein Zähler hängt hinter einer Fragebogen-Antwort.
> Referenz: Konzept Abschnitt 9.

### Ausgangslage

`activeEnergyTypes(data)` leitet aus `heatGenerators` und `hasPV` ab, welche
Zähler existieren. `MeterDetailPage` leitet bei nicht-aktiven Trägern hart auf
die Übersicht um – wer im Schnellstart keine PV angegeben hat, kann seine
Erzeugung nie erfassen.

### Umfang

1. `energyConfig.ts`: `ALL_ENERGY_TYPES` (= `ORDER`, immer verfügbar) und
   `suggestedEnergyTypes(data)` (bisherige Logik, steuert Vorbelegung und
   Erinnerungen).
2. `MonitoringPage`: Board zeigt Träger **mit Ablesungen ∪ vorgeschlagene**;
   ein „+ Zähler“-Knopf öffnet die vollständige Liste.
3. `MeterDetailPage`: Sperre entfällt. Ein unbekannter Träger führt weiterhin
   zurück – ein bekannter, aber „nicht aktiver“ nicht mehr.
4. `due.ts`: erinnert an Träger **mit mindestens einer Ablesung** oder
   vorgeschlagene. Sonst würde jeder Haushalt an Pellets erinnert.
5. `EnergySummaryCard`, `monitoringReportData`: rechnen über Träger mit
   Ablesungen statt über Profil-Träger.
6. **PV-Erinnerung**: Aus `hasPV === 'yes'` ohne PV-Ablesungen folgt ein
   Anstoß auf der Monitoring-Seite – „Du hast eine PV-Anlage angegeben.
   Erzeugung erfassen?“ Ein Hinweis, kein Schalter.

### Berührte Dateien

```
src/features/monitoring/energyConfig.ts
src/features/monitoring/MonitoringPage.tsx
src/features/monitoring/MeterDetailPage.tsx
src/features/monitoring/due.ts
src/features/home/EnergySummaryCard.tsx
src/features/reports/monitoringReportData.ts
src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [x] Ein Profil ohne PV kann einen PV-Zähler anlegen und Ablesungen erfassen.
- [x] Ein Profil ohne Gasheizung wird **nicht** an Gas-Ablesungen erinnert.
- [x] Ein Profil **mit** Gas-Ablesungen wird erinnert, auch wenn im Fragebogen
      keine Gasheizung steht.
- [x] Die PV-Erinnerung erscheint bei `hasPV: 'yes'` ohne Ablesungen und
      verschwindet nach der ersten.
- [x] Berichte enthalten die tatsächlich erfassten Träger.
- [x] Typecheck, ESLint und Tests grün.

Abnahme gefahren mit `tests/unit/energyTypes.test.ts` (Rechenebene) und einem
Playwright-Durchlauf gegen die laufende App (Bedienebene).

### Unterwegs entschieden

- **Drei Rollen statt einer Funktion.** `ALL_ENERGY_TYPES` (erfassbar) ·
  `suggestedEnergyTypes` (Vorbelegung und Erinnerungen) · `boardEnergyTypes`
  (Vorgeschlagenes ∪ mit Ablesungen). Die dritte war nicht geplant, ist aber
  nötig: Ohne sie verschwände ein selbst angelegter Zähler nach dem ersten
  Eintrag wieder vom Board.
- **Ein Zähler „existiert“, sobald er eine Ablesung hat.** Kein zusätzliches
  Feld für „vom Nutzer hinzugefügt“ – der Picker öffnet direkt die Erfassung.
- **`pvPromptDismissed`** im `settingsStore`: Ein Hinweis, den man nicht
  loswird, ist eine Mahnung.
- **`EnergySummaryCard` verliert ihre `data`-Prop** – sie hängt nicht mehr am
  Profil, sondern nur noch an den Ablesungen.
- Auch `ReportsPage` zog mit (Träger-Auswahl im Bericht), das stand nicht in der
  Dateiliste dieser Etappe.

---

## Etappe 3 – Registry und Schrittzustände

> **Ziel:** Eine Liste, aus der Flow, Titel, Profil-Hub, Abschnitts-Status und
> Fortschritt folgen. Die Fragen selbst ändern sich noch **nicht**.
> Referenz: Konzept Abschnitte 2 und 12.

### Ausgangslage

Die Schrittreihenfolge ist an fünf Stellen unabhängig kodiert:
`QUICK_TOTAL`/`DETAILED_TOTAL`, zwei Key-Arrays in `getStepTitle`, zwei
`switch`-Blöcke, `SECTIONS` im `ProfileHub`, die Reihenfolge in `sectionStatus`.
Daher auch der Widerspruch: `profileChecks` prüft 16 Felder, `sectionStatus` 19 –
der Prozentbalken kann 100 % zeigen, während Kacheln darunter offen sind.

### Umfang

1. **`src/features/onboarding/sections.ts`** – Registry mit `SectionField`
   (`id`, `answered`, `optional?`, `quick?`) und `OnboardingSection`
   (`id`, `titleKey`, `icon`, `Component`, `fields`).
2. `OnboardingPage.tsx` rendert aus der Registry: `QuickStepContent`,
   `DetailedStepContent`, beide Totals, beide Key-Arrays und `getSectionTitle`
   entfallen.
3. `ProfileHub` nutzt die Registry statt eines eigenen `SECTIONS`-Arrays und
   deckt damit **alle** Abschnitte ab (Konzept 12.4).
4. `sectionStatus.ts` und `profileChecks` in `estimateEnergy.ts` verschmelzen zu
   Aggregationen über die Registry. Optionale Felder zählen nicht in den Nenner.
5. **`visitedSections`** im `onboardingStore` plus `markVisited`, gesetzt beim
   Rendern eines Abschnitts.
6. **Drei Zustände** in `StepIndicator` und in den Hub-Kacheln:
   offen · **angefangen** · vollständig. „Angefangen“ ist die auffälligste
   Stufe, nicht die leiseste (Konzept 12.3).

### Berührte Dateien

```
neu     src/features/onboarding/sections.ts
neu     tests/unit/sections.test.ts
        src/features/onboarding/OnboardingPage.tsx
        src/features/onboarding/ProfileHub.tsx
        src/features/onboarding/StepIndicator.tsx
        src/features/onboarding/sectionStatus.ts     (geht auf)
        src/features/home/estimateEnergy.ts          (profileChecks geht auf)
        src/store/onboardingStore.ts
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] Prozentbalken und Abschnitts-Kacheln im Profil-Hub widersprechen sich in
      keiner Datenlage – ein Test hält das fest.
- [ ] Ein durchgeklickter, aber unvollständiger Schritt ist im `StepIndicator`
      **und** im Hub als „angefangen“ erkennbar, unterscheidbar von „nie besucht“.
- [ ] Der Hub zeigt jeden Abschnitt der Registry, auch die, die der Schnellstart
      nie gezeigt hat.
- [ ] Optionale Felder (PLZ, Profilbild, Preise, Raumflächen) zählen nicht in
      den Nenner; 100 % ist ohne sie erreichbar.
- [ ] Die Schrittreihenfolge existiert nur noch **einmal** im Code.
- [ ] Typecheck, ESLint und Tests grün.

---

## Etappe 4 – Neue Schrittfolge und kurzer Schnellstart

> **Ziel:** Schnellstart unter 3 Minuten, vollständiger Fragebogen in sinnvoller
> Reihenfolge. Referenz: Konzept Abschnitte 3 und 4.
> **Setzt Etappe 1 und 3 voraus.**

### Umfang

1. **Vollständig: sieben Schritte** in der neuen Ordnung – Zuhause · Räume ·
   Heizung & Warmwasser · Preise & Kosten · Gebäude & Modernisierung ·
   Ausstattung · Standort & Wohnsituation. `Step5HeatTransfer` löst sich auf
   (Wärmeübergabe → Räume, Lüftung/Dämmung → Gebäude); `windowAge` und
   `energyCostRange` und `occupancyStatus` ziehen in ihre neuen Schritte.
   *Aus Etappe 1:* `heatTransfer` ist optional geworden, ein Raum ohne Angabe
   hat in der Wärmeübergabe-Tabelle also keine Vorauswahl mehr. Das ist
   beabsichtigt (unbeantwortet ≠ Heizkörper) und macht das Feld in der Registry
   aus Etappe 3 erst zählbar.
2. **Schnellstart: drei Schritte** – Zuhause · Heizung & Warmwasser · Preise,
   dann die Übersicht. Keine Messgeräte-Checkliste, kein Profilbild.
3. **Plausibilitätsprüfung** `onboarding/plausibility.ts` (reine Funktion):
   m² je Person (Hinweis unter 12, über 150), m² je Zimmer (unter 6, über 80).
   Hinweis, keine Sperre, mit „Passt so“. Auch auf der Übersicht und im Hub.
4. **Grundpreis** im Preis-Schritt erfassbar (geht schon heute in
   `estimateAnnualCostEur` ein, war aber nicht korrigierbar).
5. **Freischalt-Bilanz** auf der Übersicht statt eines reinen „Fertig“:
   was jetzt geht, was die nächste Angabe bringt.
6. Fortschritt als Nutzen statt als Restarbeit (Konzept 12.5).

### Berührte Dateien

```
neu     src/features/onboarding/plausibility.ts
neu     tests/unit/plausibility.test.ts
        src/features/onboarding/sections.ts          (neue Ordnung, quick-Flags)
        src/features/onboarding/steps/*              (Felder wandern)
        gelöscht: steps/Step5HeatTransfer.tsx
        src/features/onboarding/steps/Step8Review.tsx
        src/features/home/MeasurementSummaryCard.tsx (Nutzen-Formulierung)
        src/store/tariffStore.ts                     (Grundpreis)
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] Der Schnellstart ist mit drei Schritten in unter drei Minuten machbar
      (einmal selbst durchklicken und die Zeit nennen).
- [ ] Kein Feld ist verlorengegangen: Jedes heute erhobene Feld ist im
      vollständigen Fragebogen erreichbar – ein Test über die Registry hält das
      fest.
- [ ] Nach dem Schnellstart zeigt der Ring einen Wert unter 100 %, und die
      Übersicht erklärt, was das bedeutet.
- [ ] 700 m² für 2 Personen erzeugt einen Hinweis, 9 m² je Person in einer WG
      lässt sich mit „Passt so“ dauerhaft bestätigen.
- [ ] Der Strom-Grundpreis wirkt sich auf die Jahreskosten-Schätzung aus.
- [ ] Typecheck, ESLint und Tests grün.

---

## Etappe 5 – Modernisierung und Erzeuger-Alter

> **Ziel:** Sanierungen als Ereignis-Log, Heizungsalter erfasst und ausgewertet.
> Referenz: Konzept Abschnitte 7 und 8. **Setzt Etappe 3 voraus.**

### Umfang

1. **`RenovationEvent { id, year, items, estimated? }`**, `renovations: []` in
   `OnboardingData`, chronologisch aufsteigend gehalten.
2. **`StepRenovationLog`** – je Sanierungsjahr eine Karte (Jahr + Maßnahmen-Chips),
   darunter ein **dauerhaft sichtbarer** Knopf „Weiteres Sanierungsjahr
   hinzufügen“. Einsortieren statt anhängen. Bereits erfasstes Jahr → vorhandene
   Karte statt Duplikat. „Nie saniert“ als eigener Zustand. Löschen je Karte.
   Validierung: Jahr ≥ Baujahr, ≤ heute – als Hinweis, nicht als Sperre.
3. **`renovationProjection.ts`** – Events → Bauteil-Zustand (je Bauteil das
   späteste Jahr) und Ableitung der Altfelder `lastRenovationYear` /
   `renovationItems`, die im Typ bleiben.
4. `estimateEnvelope` liest die Projektion. `ENVELOPE_FACTORS` und die
   Skalen-Rechnung bleiben unangetastet.
5. **Migration** alter Profile: ein Event aus `lastRenovationYear` +
   `renovationItems`, Jahr = Mitte der Spanne, `estimated: true`. Die Karte
   weist das aus („ungefähr 2005“).
6. **`heatGeneratorYears`** – je gewähltem Erzeuger ein optionales Baujahr, das
   unter dem Chip aufklappt (Muster von `InstrumentRow`). Slider plus Chip
   „weiß nicht“.
7. **Auswertung ab Tag 1**: Tipp bei Gas-/Ölkessel über 20 Jahren; Erzeuger-Hinweis
   **neben** dem Hüllen-Band, nicht darin. Im Modernisierungs-Log erscheint das
   Erzeuger-Alter als abgeleiteter, dort nicht editierbarer Eintrag mit Sprung
   zum Heizungs-Schritt.

### Berührte Dateien

```
neu     src/features/onboarding/steps/StepRenovationLog.tsx
neu     src/features/onboarding/renovationProjection.ts
neu     tests/unit/renovationProjection.test.ts
        gelöscht: steps/Step7Renovation.tsx  (Effizienz-Karte zieht um)
        src/types/index.ts
        src/store/onboardingStore.ts         (Defaults + Migration)
        src/features/home/estimateEnergy.ts
        src/features/onboarding/steps/Step4Heating.tsx
        src/features/tips/buildTips.ts
        src/features/demo/demoProfile.ts
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] Drei Sanierungsjahre lassen sich anlegen, bearbeiten, löschen; die Liste
      bleibt chronologisch.
- [ ] Der Hinzufügen-Knopf ist in jeder Listenlänge erreichbar.
- [ ] Ein Altprofil wird verlustfrei in ein Ereignis migriert und als geschätzt
      ausgewiesen.
- [ ] Die Effizienz-Einordnung liefert für dieselben Bauteile dieselbe Zahl wie
      vorher – ein Test vergleicht alt gegen neu.
- [ ] Ein 24 Jahre alter Gaskessel erzeugt einen Tipp in der Gruppe „Braucht
      etwas Vorbereitung“.
- [ ] Demo-Profil, Firestore-Sync und die Übersichtsseite funktionieren.
- [ ] Typecheck, ESLint und Tests grün.

---

## Etappe 6 – Gerätebestand, Keller, Ziele

> **Ziel:** Der letzte Lückenfall im Feld-Inventar schließt sich, der Keller
> bekommt seine Checks, die Ziele wirken.
> Referenz: Konzept Abschnitte 5.6, 6 und 10. **Setzt Etappe 4 voraus.**

### Umfang

1. **`appliances` / `appliancesAnswered`** im Schritt „Ausstattung“ – Kühl- und
   Gefriergeräte mit Standort. Leer + beantwortet = „wir haben keines“.
2. **Nachfrage im Check**: `FridgeIntro` / `FreezerIntro` fragen, wenn das Profil
   nichts weiß, und schreiben zurück. Kein Feld lebt nur im Check.
3. **Keller-Zuordnung** in `catalog.ts`: `freezer` → `['kitchen', 'basement', 'utility_room']`,
   `fridge` → `['kitchen', 'basement']`. Der Raumtyp `basement` existiert bereits
   samt Komfortband (14–18 °C) und Typfläche.
4. **`skippedRooms` → `skipped`** im `measurementsStore`, nimmt zusätzlich
   Mess-Schlüssel auf. `countingRooms` und `countableMeasurements` in
   `progress.ts` filtern beide darüber. Migration im `merge`-Block.
5. **Ziel-Sortierung der Tipps**: `GOAL_CATEGORY_BONUS`, Ziel-Stufe zwischen
   Sofortmaßnahmen und Ersparnis. Ohne Ziel oder bei `save_costs` bleibt die
   Reihenfolge **exakt** wie heute.
6. **Sortierung benennen**: Zeile auf der Tipps-Seite – „Sortiert nach deinem
   Ziel: CO₂ senken · ändern“.

### Berührte Dateien

```
        src/types/index.ts
        src/store/onboardingStore.ts
        src/store/measurementsStore.ts               (skippedRooms → skipped)
        src/features/measurements/progress.ts
        src/features/measurements/catalog.ts
        src/features/measurements/fridge/FridgeIntro.tsx
        src/features/measurements/freezer/FreezerIntro.tsx
        src/features/onboarding/sections.ts
        src/features/tips/buildTips.ts
        src/features/tips/TipsPage.tsx
        tests/unit/measurementProgress.test.ts       (skipped für Checks)
        tests/unit/buildTips.test.ts
        src/i18n/locales/de.json, en.json
```

### Fertig, wenn

- [ ] „Wir haben kein Gefriergerät“ nimmt den Check aus Zähler **und** Nenner,
      und die Angabe ist im Profil-Hub sichtbar und zurücknehmbar.
- [ ] Der Gefrier-Check erscheint in der Raum-Ansicht unter „Keller“.
- [ ] Ohne Ziel ist die Tipp-Reihenfolge unverändert – ein Test hält das fest.
- [ ] Mit `improve_comfort` steht ein Komfort-Tipp ohne €-Betrag vor einem
      €-starken Strom-Tipp.
- [ ] Die Tipps-Seite benennt, wonach sortiert wurde.
- [ ] Typecheck, ESLint und Tests grün.

---

## Was nach Etappe 6 offen bleibt

- **Instanz-genaue Raum-Abweichungen** (`RoomEntry.overrides`, Konzept 5.5) –
  „Schlafzimmer 1 mit Fußbodenheizung, Schlafzimmer 2 ohne“.
- **Kellertypischer Feuchte-/Schimmel-Check** – der Raumklima-Check erfasst die
  Luftfeuchte bereits, bewertet sie aber am Wohnraum-Maßstab.
- **Gebäudetyp und Wohnstatus auswerten** – Sanierungs-Hebel filtern: Dach- und
  Kellerdämmung sind für Mieter in einer Wohnung nicht umsetzbar.
- **Duschverhalten** – die größte Einzel-Unsicherheit hinter den €-Beträgen der
  Warmwasser-Checks (heute aus der Personenzahl hochgerechnet).
