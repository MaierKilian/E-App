# Das Onboarding der E-App – Referenz für die schriftliche Ausarbeitung

**Zweck dieses Dokuments.** Es beschreibt den Fragebogen („Onboarding") der
E-App: wozu er da ist, worin sich seine beiden Varianten unterscheiden und
welche Angabe sich wo in der übrigen App auswirkt. Es ist als **Faktenquelle**
für die Erstellung einer Dokumentation gedacht, nicht als fertiger Fließtext –
die Formulierungen dürfen frei umgeschrieben werden, die Zahlen, Feldnamen und
Wirkungsketten nicht.

**Stand:** 05.09.2026, Commit `aac9e33`. Alle Angaben sind aus dem Quellcode
belegt; die maßgebliche Datei steht jeweils dabei. Wo etwas offen oder
unfertig ist, sagt das Dokument es ausdrücklich (Abschnitt 10) – diese Stellen
sollten in einer Ausarbeitung nicht als gelöst dargestellt werden.

**Projektkontext in einem Satz:** Die E-App ist eine deutschsprachige
Energie-Analyse-Anwendung (React 19, TypeScript, Tailwind CSS v4), die
Haushalte beim Messen, Beobachten und Senken ihres Energieverbrauchs
unterstützt. Die Daten liegen clientseitig im `localStorage`, optional
zusätzlich in einem Firebase-Backend (Auth, Firestore).

---

## 1. Wozu das Onboarding da ist

Die App gibt keine allgemeinen Energiespartipps aus, sondern rechnet mit den
Gegebenheiten des konkreten Haushalts. Dafür braucht sie **Bezugsgrößen** und
**Struktur**:

1. **Bezugsgrößen für Kennzahlen.** Ein Verbrauch von „1400 m³ Gas" ist
   unbewertbar. Erst bezogen auf die Wohnfläche wird daraus „138 kWh/m²·a" –
   ein Wert, der sich mit den Richtwerten je Baujahr vergleichen lässt
   (`monitoring/specificValues.ts`). Wasser wird analog auf Liter je Person und
   Tag bezogen.
2. **Struktur für Messungen.** Mehrere Checks werden **je Raum** oder **je
   Gerät** durchgeführt. Ohne eine Raum- und Geräteliste gäbe es keine
   Instanzen, an denen ein Messergebnis hängen könnte
   (`measurements/catalog.ts`, Felder `perRoom`, `perAppliance`).
3. **Auswahl statt Vollsortiment.** Wer keine Gefriertruhe hat, soll den
   Gefrierschrank-Check nicht als dauerhaft offene Aufgabe angezeigt bekommen
   (`onboarding/appliances.ts`).
4. **Priorisierung.** Das Ziel des Nutzers gewichtet die Reihenfolge von
   Empfehlungen und empfohlenen Messungen (`tips/buildTips.ts`,
   `measurements/order.ts`).
5. **Dokumentation.** Der PDF-Bericht enthält einen „Haushalts-Steckbrief", der
   die Rahmenbedingungen der Auswertung festhält (`reports/profileReportData.ts`).

### 1.1 Ein architektonisches Leitprinzip: jede Frage braucht einen Abnehmer

Ein früherer Zustand des Projekts ist für eine Ausarbeitung methodisch
interessant: Etwa die Hälfte der Fragen wurde erhoben, gespeichert, in die
Cloud synchronisiert – und danach **nie gelesen**. Das fiel nicht auf, weil es
keine Stelle gab, an der es hätte auffallen können.

Als Gegenmaßnahme existiert seither die Registry
`src/features/onboarding/fieldUsage.ts`: Sie ordnet **jedem** Feld von
`OnboardingData` zu, welcher der vier Bereiche es verwertet
(`measurements` | `monitoring` | `report` | `tips`) und begründet das im
Klartext. Der Mechanismus ist zweifach abgesichert:

- Ein `satisfies Record<keyof OnboardingData, FieldUsage>` lässt den
  **Typecheck** scheitern, sobald ein Feld ohne Eintrag hinzukommt.
- `tests/unit/fieldUsage.test.ts` hält die Liste der Felder **ohne** Abnehmer
  exakt fest; ein neues abnehmerloses Feld macht den Test rot.

Der Fragebogen selbst zählt dabei ausdrücklich **nicht** als Abnehmer: Eine
Frage, die nur ihre eigene Zusammenfassung füttert, gilt als unverwertet.

Dasselbe Registry-Muster („eine Liste, alles andere leitet sich ab") wiederholt
sich im Projekt mehrfach: `sections.ts` für die Schrittfolge, `goals.ts` für die
Ziele, `measurements/catalog.ts` für die Messungen. Es ersetzt jeweils mehrere
unabhängige Kopien derselben Information.

---

## 2. Die beiden Varianten: Schnellstart und Vollständig

Beim ersten Start wählt der Nutzer zwischen zwei Wegen
(`OnboardingData.mode`: `'quick' | 'detailed'`). Der Schnellstart ist **keine
eigene Ablaufsteuerung**, sondern eine Teilmenge derselben Schrittfolge: Jeder
Abschnitt in `sections.ts` trägt ein Flag `quick: boolean`, und
`sectionsFor(mode)` filtert danach. Reihenfolge und Inhalte sind identisch, dem
Schnellstart fehlen lediglich drei Schritte.

| | Schnellstart (`quick`) | Vollständig (`detailed`) |
|---|---|---|
| Schritte | 5 | 8 |
| angegebene Dauer | 3–5 Min | 8–10 Min |
| Beschreibung in der App | „Schneller Überblick" | „Maximale Genauigkeit", als empfohlen markiert |
| Pflichtangaben | 7 | 10 |

**Schrittfolge vollständig** (Titel wie in der App): Dein Zuhause → Dein Ziel →
Räume → Heizung & Warmwasser → Preise & Kosten → Kühl- & Gefriergeräte →
Ausstattung → Prüfen & Speichern.

**Schrittfolge Schnellstart:** Dein Zuhause → Dein Ziel → Heizung & Warmwasser →
Preise & Kosten → Prüfen & Speichern.

**Der Unterschied sind genau drei Schritte:** `rooms`, `appliances`,
`equipment`. Ein Test (`tests/unit/sections.test.ts`, „unterscheidet die beiden
Wege in genau drei Schritten") hält das fest, damit die beschreibenden Texte auf
der Auswahlseite nicht davon abweichen können.

### 2.1 Was der Schnellstart konkret kostet

Nicht die Genauigkeit einzelner Zahlen leidet, sondern der **Funktionsumfang**:

| entfallener Schritt | Folge im Schnellstart |
|---|---|
| Räume | Keine Rauminstanzen ⇒ die Pro-Raum-Checks (Raumtemperatur, Möbelabstand) haben kein Bezugsobjekt. Keine Angabe zur Wärmeübergabe je Raum. |
| Geräte | `appliancesAnswered` bleibt `false` ⇒ Kühl- und Gefrier-Check bleiben sichtbar, auch wenn es kein Gerät gibt, und werden weder ausgeblendet noch mehrfach instanziiert. |
| Ausstattung | Reine Informationsseite („Was du zum Messen brauchst"); es entfällt keine Angabe, nur eine Erklärung. |

Die Zimmerzahl (`roomsCount`) ist der einzige Fall, in dem der Schnellstart
etwas **erhebt, was der vollständige Weg nicht erhebt**: Dort ersetzt die
Raumliste sie durch die genauere Wahrheit. Im Schnellstart trägt sie die
Plausibilitätsprüfung „m² je Zimmer" innerhalb des Fragebogens.

### 2.2 Der Modus ist keine Einbahnstraße

- Während des Fragebogens führt „Zurück" von Schritt 1 zurück zur Modus-Wahl
  (`OnboardingPage.tsx`).
- Nach Abschluss zeigt der **Profil-Hub** alle acht Abschnitte als Kacheln –
  auch die im Schnellstart übersprungenen (`hubSections()`). Angaben lassen
  sich also jederzeit nachtragen; ein expliziter „Modus wechseln"-Schalter
  existiert danach allerdings nicht mehr.
- Die Profil-Vollständigkeit in Prozent (`profileCompleteness`) misst **immer**
  am vollständigen Fragebogen. Nach einem Schnellstart steht dort daher bewusst
  kein 100 %: Der Wert beschreibt das Profil, nicht den gewählten Weg.

---

## 3. Die Schritte im Einzelnen

Quelle: `src/features/onboarding/sections.ts`. „Pflicht" bedeutet: zählt in den
Nenner der Fortschrittsanzeige; „optional" bedeutet: wird erfragt, zählt aber
nicht.

### Schritt 1 – Dein Zuhause (`home`, beide Wege)
| Feld | Art | Inhalt |
|---|---|---|
| `profileName` | Pflicht | Name der Wohnung |
| `livingArea` | Pflicht | Wohnfläche in m² |
| `personsCount` | Pflicht | Personen im Haushalt |
| `buildingYear` | Pflicht | Baujahr |
| `roomsCount` | (nur Schnellstart) | Zimmerzahl |
| `profileImage` | optional | Bild zur Wiedererkennung |

### Schritt 2 – Dein Ziel (`goals`, beide Wege)
| Feld | Art | Inhalt |
|---|---|---|
| `goals` | Pflicht | Mehrfachauswahl aus fünf Zielen |

Die fünf Ziele (`onboarding/goals.ts`): `save_costs`, `reduce_co2`,
`improve_comfort`, `track_readings`, `curiosity`.

### Schritt 3 – Räume (`rooms`, nur vollständig)
| Feld | Art | Inhalt |
|---|---|---|
| `rooms` | Pflicht | Raumtypen mit einzeln benennbaren Instanzen |
| `heatTransfer` je Instanz | Pflicht | Wärmeübergabe: `radiator`, `underfloor`, `infrared`, `stove`, `none` |
| `areaSqm` je Instanz | optional | Raumfläche |

### Schritt 4 – Heizung & Warmwasser (`heating`, beide Wege)
| Feld | Art | Inhalt |
|---|---|---|
| `heatGenerators` | Pflicht | Mehrfachauswahl: `gas_boiler`, `oil_boiler`, `heat_pump`, `wood_stove`, `pellets`, `solar_thermal`, `electric_direct` (Infrarot, Konvektoren, Nachtspeicher), `unknown` |
| `hotWaterType` | Pflicht | `same_as_heating`, `separate_system`, `partially_combined`, `unknown` |
| `heatGeneratorYears` | optional | Baujahr je Erzeuger |
| `hasPV` | optional | Photovoltaik: `yes` / `no` |

### Schritt 5 – Preise & Kosten (`prices`, beide Wege)
Keine Pflichtangabe. Die Tarife liegen nicht in `OnboardingData`, sondern im
`tariffStore`; leere Felder behalten die Standardwerte aus
`monitoring/priceConfig.ts` (Strom 35 ct/kWh, Wasser 2,40 €/m³, Gas 1,20 €/m³,
Öl 1,10 €/l, Pellets 0,35 €/kg, Wärmepumpe 30 ct/kWh). Der Abschnitt gilt als
erledigt, sobald er besucht wurde.

### Schritt 6 – Kühl- & Gefriergeräte (`appliances`, nur vollständig)
| Feld | Art | Inhalt |
|---|---|---|
| `appliances` | Pflicht | Kühl-/Gefriergeräte mit Art (`fridge`, `freezer`, `fridge_freezer`), Name und Raum |
| `appliancesAnswered` | – | Merkt, **dass** geantwortet wurde – auch mit „keines" |

### Schritt 7 – Ausstattung (`equipment`, nur vollständig)
Reine Auskunftsseite ohne Frage; sie trägt die Übersicht „Was du zum Messen
brauchst". Ihr Inhalt wird aus
`measurements/catalog.ts` **hergeleitet** (`measurements/instrumentNeeds.ts`
dreht die Zuordnung Messung → Messgerät um), nicht danebengeschrieben.

### Schritt 8 – Prüfen & Speichern (`review`, beide Wege)
Abschluss ohne Eingaben, mit der Aufstellung „Wofür wir das nutzen"
(`FieldUsageSummary.tsx`): Sie zeigt je Bereich, welche Angaben dort etwas
bewirken, und ist aus derselben Tabelle gespeist wie der Test – die Anzeige kann
also nicht behaupten, was der Code nicht liest. Dieselbe Aufstellung steht auch
im Profil-Hub.

---

## 4. Das Wirkungsmodell: vier Abnehmer

Jede Angabe wirkt über genau einen oder mehrere von vier Bereichen. Diese
Vier-Teilung ist die zentrale Ordnungsidee und eignet sich als Gliederung:

| Abnehmer | Was er tut |
|---|---|
| **measurements** | Bestimmt, welche Checks es gibt, an welchen Instanzen sie hängen und mit welchen Preisen/Quellen sie rechnen |
| **monitoring** | Zählerstands-Verfolgung: welche Zähler vorgeschlagen werden, worauf Kennzahlen bezogen und woran sie gemessen werden |
| **tips** | Empfehlungen: welche entstehen und in welcher Reihenfolge sie stehen |
| **report** | PDF-Bericht: Haushalts-Steckbrief und Handlungsplan |

---

## 5. Feld-für-Feld: welche Angabe wirkt wo

Vollständig aus `fieldUsage.ts` übernommen. **Aktiv erhoben:**

| Feld | Abnehmer | Wirkung |
|---|---|---|
| `profileName` | report | Benennt die Wohnung im Bericht und in der Wohnungs-Auswahl |
| `personsCount` | measurements, monitoring | Warmwasser- und Stromverbrauch hängen an der Personenzahl; Monitoring rechnet Kennwerte je Person |
| `livingArea` | measurements, monitoring | Bezugsgröße fast aller Kennwerte: Verbrauch je m² statt nackter Zahl |
| `buildingYear` | monitoring | Bestimmt den Heizwärme-Vergleichswert, an dem der eigene Verbrauch gemessen wird |
| `rooms` | measurements, tips, report | Trägt die Pro-Raum-Checks und entscheidet, welche Empfehlung für welchen Raum gilt |
| `heatGenerators` | measurements, monitoring | Entscheidet, welcher Energieträger zu erfassen ist und mit welchem Preis eine Heizersparnis gerechnet wird |
| `hotWaterType` | measurements | Der Duschkopf-Check rechnet je Warmwasserquelle mit einem anderen €/kWh-Preis |
| `heatGeneratorYears` | tips | Trägt die Empfehlung, den Wärmeerzeuger prüfen oder tauschen zu lassen |
| `hasPV` | monitoring, tips | Legt den Erzeugungszähler aufs Board; „Ja" trägt zusätzlich eine Empfehlung |
| `goals` | tips, measurements, report | Gewichtet Empfehlungen und Messreihenfolge; der Handlungsplan nennt die Ziele, nach denen er sortiert |
| `appliances` | measurements | Bestimmt, welche Kühl- und Gefriergeräte einzeln zu messen sind |
| `appliancesAnswered` | measurements | Unterscheidet „wir haben keines" von „noch nicht gefragt" |
| `mode` | monitoring | Bestimmt, wie viel das Monitoring voraussetzen darf |
| `completed` | measurements | Steuert, ob die App den Fragebogen oder den Messbereich zeigt |
| `profileImage` | – | Bild zur Wiedererkennung; braucht keinen Verwerter |
| `roomsCount` | – | Trägt nur die Plausibilitätsprüfung innerhalb des Fragebogens |

**Nicht mehr erhoben, aber im Datenmodell erhalten** (Bestandsprofile tragen
echte Werte; siehe Abschnitt 9): `buildingType`, `floors`, `postalCode`,
`locationMode`, `occupancyStatus`, `windowAge`, `insulationState`,
`ventilationType`, `renovations`, `smartHomeDevices`, `hasExtraFireplace`,
`instruments`, `lastRenovationYear`, `renovationItems`.

---

## 6. Die Wirkungsketten im Detail

Diese acht Ketten sind die eigentliche Antwort auf „wie wirkt sich das
Onboarding aus". Jede ist im Code nachvollziehbar.

### 6.1 Baujahr → Vergleichsmaßstab
`heatDemandBenchmark(buildingYear)` in `monitoring/specificValues.ts` liefert
den spezifischen Heizwärmebedarf eines unsanierten Baus der jeweiligen Epoche,
orientiert an den Bauvorschriften (WSchV 1977/1984/1995, EnEV, GEG):

| Baujahr | Richtwert |
|---|---|
| vor 1978 | 220 kWh/m²·a |
| 1978–1994 | 150 kWh/m²·a |
| 1995–2001 | 100 kWh/m²·a |
| 2002–2015 | 70 kWh/m²·a |
| ab 2016 | 50 kWh/m²·a |

Der gemessene Verbrauch wird gegen diesen Wert gestellt. Ohne Baujahr gibt es
keinen Maßstab (`undefined`).

### 6.2 Wohnfläche und Personenzahl → spezifische Kennwerte
`specificValue()` rechnet den Jahresverbrauch in eine vergleichbare Kennzahl um.
Der Nenner ist bewusst nicht überall derselbe:

- Gas, Öl, Pellets, Wärmepumpe, **Strom** → kWh je m² und Jahr (`perAreaKwh`),
  weil das die Größe des Energieausweises ist.
- Wasser → Liter je Person und Tag (`perPersonLiterDay`), weil l/m²·Tag keinem
  gebräuchlichen Vergleichswert entspräche.

Zähler messen Volumen oder Masse; die Umrechnung nutzt gängige Mittelwerte
(`DEFAULT_KWH_PER_UNIT`): Gas ~10 kWh/m³, Öl ~10 kWh/l, Pellets ~4,8 kWh/kg.

### 6.3 Wärmeerzeuger → Zähler-Board und Heizkosten
`suggestedEnergyTypes()` in `monitoring/energyConfig.ts` bildet die gewählten
Erzeuger über `HEAT_GENERATOR_MAP` auf Energieträger ab (`gas_boiler`→`gas`,
`oil_boiler`→`oil`, `pellets`→`pellets`, `heat_pump`→`heat_pump`,
`solar_thermal`→`solar_thermal`). Strom und Wasser kommen immer dazu.

**Wichtige Nuance:** Das Profil **schlägt vor**, es sperrt nichts. Ein selbst
angelegter Zähler bleibt auch dann auf dem Board, wenn das Profil ihn nicht
nahelegt (`boardEnergyTypes`). Frühere Versionen sperrten – wer im Schnellstart
keine PV angegeben hatte, konnte seine Erzeugung nie erfassen.

Dieselbe Zuordnung trägt die Jahres-Heizkosten
(`measurements/room_temperature/heatingCost.ts`), aus denen die €-Ersparnis
einer Raumtemperatur-Empfehlung folgt.

### 6.4 Warmwasserquelle → Duschkopf-Check
`defaultHotWaterSource()` in `measurements/showerhead/hotWaterEnergy.ts` leitet
aus `hotWaterType` und `heatGenerators` die Energiequelle des Warmwassers ab und
damit den €/kWh-Preis der Ersparnis. Die Logik:

- `separate_system` → elektrisch (eigenes Gerät)
- `same_as_heating`, `partially_combined`, **`unknown`** → der Wärmeerzeuger des
  Hauses

Dass auch `unknown` auf den Wärmeerzeuger fällt, ist eine bewusste Korrektur:
Vorher landete diese Antwort pauschal bei „elektrisch" – der teuersten aller
Quellen –, auch wenn ein Gaskessel im Profil stand. Wer die Frage nicht
beantworten konnte, bekam den unwahrscheinlichsten Fall unterstellt und eine
Zahl, die um ein Vielfaches danebenlag. Der Check zeigt zudem an, ob die
Vorbelegung aus einer Angabe stammt oder ein Rückfall ist
(`hotWaterSourceFromProfile`).

### 6.5 Räume → Pro-Raum-Checks
`appliesToRoom()` in `measurements/catalog.ts` entscheidet je Rauminstanz:

- `wholeHome`-Messungen (Beleuchtung, Grundlast, Standby) gelten nie je Raum.
- `skipWhenUnheated` lässt den Möbelabstand-Check in Räumen mit
  `heatTransfer === 'none'` entfallen – wo nichts heizt, gibt es nichts
  freizuhalten. Ohne dieses Flag stünde der Check in jedem Keller als offene
  Aufgabe und der Fortschritt käme nie auf 100 %.
- `perRoom`-Messungen (Raumtemperatur, Möbelabstand) gelten in jeder Instanz.
- Sonst entscheidet die Liste `rooms` des Katalogeintrags (z. B. Duschkopf nur
  im Bad).

### 6.6 Geräte → Sichtbarkeit der Kühl-Checks
`skippedMeasurements()` in `onboarding/appliances.ts`: Ist die Gerätefrage
beantwortet und fehlt ein Gerät für einen Check, fällt dieser aus Zähler **und**
Nenner der Fortschrittszählung. Das Dreiwertige ist der Punkt:

| `appliancesAnswered` | `appliances` | Folge |
|---|---|---|
| `false` | leer | Frage noch offen – es wird nichts ausgeblendet |
| `true` | leer | ausdrücklich „wir haben keines" – beide Checks entfallen |
| `true` | gefüllt | je Gerät eine eigene Messung (`perAppliance`) |

Die Antwort steht bewusst im Profil und nicht im Check: Dort ist sie sichtbar,
änderbar und zurücknehmbar. Wer sich später ein Gefriergerät anschafft, findet
die Stelle wieder.

### 6.7 Ziel → Reihenfolge und Landung
Zwei getrennte Wirkungen:

**(a) Reihenfolge.** `GOAL_CATEGORY_BONUS` in `tips/buildTips.ts` gewichtet
Gewerke je Ziel:

| Ziel | heating | hot_water | electricity |
|---|---|---|---|
| `reduce_co2` | 2 | 2 | 1 |
| `improve_comfort` | 2 | 1 | – |
| `save_costs`, `track_readings`, `curiosity` | – | – | – |

Ziele addieren sich nicht; es zählt das höchste Gewicht. Dieselbe Funktion
(`goalCategoryBonus`) gewichtet auch die empfohlene **Mess**reihenfolge
(`measurements/order.ts`) – zwei Gewichtungen für dieselbe Frage wären zwei
Gelegenheiten auseinanderzulaufen. Die Sortierung der Empfehlungen ist
mehrstufig: erst Sofortmaßnahmen, dann das Ziel, dann Ersparnis, Kosten,
Aufwand. Das Ziel steht **hinter** den Sofortmaßnahmen, weil deren Vorrang
(„etwas ohne Einkauf und Termin abhaken können") unabhängig vom Ziel gilt.

**(b) Landung.** `destinationFor()` in `onboarding/goals.ts` bestimmt, welcher
Bereich nach dem Speichern zuerst erscheint: `track_readings` → Monitoring,
`curiosity` → Wissensbereich, sonst → Messungen. Bei Mehrfachauswahl gewinnt
das speziellere Ziel. Es geht nur um den **ersten Bildschirm**; jeder Bereich
bleibt über die Navigation erreichbar.

### 6.8 Photovoltaik → Zähler und Empfehlung
`hasPV === 'yes'` legt den Erzeugungszähler aufs Monitoring-Board und trägt die
Empfehlung, große Verbraucher in die Mittagsstunden zu legen (Eigenverbrauch
ist so viel wert wie der Bezugspreis, Einspeisung nur so viel wie die
Vergütung).

---

## 7. Fortschritt und Vollständigkeit

Die Fortschrittslogik ist ein eigenes kleines Modell (`sections.ts`):

- `statusOf(section, data)` – Beantwortungsstand eines Abschnitts; **nur
  Pflichtangaben** zählen. Ein Abschnitt ohne Pflichtangabe gilt als voll.
- `stateOf(section, data, visited)` – drei Zustände: `open` (nie besucht),
  `started` (besucht, aber unvollständig), `complete`. Der mittlere Zustand ist
  die eigentliche Neuerung: Ein durchgeklickter, aber unvollständiger Schritt
  sah vorher aus wie ein fertiger.
- `profileCompleteness(data)` – Prozentwert, gemessen am vollständigen
  Fragebogen.

Optionale Angaben zählen bewusst **nicht** in den Nenner: Sonst wäre 100 % nur
mit Angaben erreichbar, die die App selbst als freiwillig beschriftet.

Auch hier ist die Vereinheitlichung der Punkt: Vorher war die Schrittreihenfolge
an fünf Stellen unabhängig kodiert; `profileChecks` prüfte 16 Felder,
`sectionStatus` 19 – der Fortschrittsbalken konnte 100 % zeigen, während die
Kacheln darunter offene Angaben meldeten.

---

## 8. Persistenz und Migration

- **Speicherung:** `zustand` mit `persist`-Middleware unter dem Schlüssel
  `eapp-onboarding` im `localStorage`; optional Cloud-Sync über Firestore.
- **Migrationsregel:** Feld-Migrationen gehören in `migrateOnboardingData`
  (`store/onboardingStore.ts`), **nicht** in den `merge`-Block des
  `persist`-Aufrufs. Grund: Zwei Wege laden ein Profil – der `persist`-Merge
  beim Start und der Cloud-Sync, der per `setState` direkt schreibt. Der zweite
  geht am `merge` vorbei; ein Altprofil aus der Cloud käme unmigriert an.
- **Unveränderliche Kennungen:** `RoomInstanceEntry.id` und `ApplianceEntry.id`
  werden beim Anlegen vergeben und nie geändert oder wiederverwendet, weil sie
  zugleich der Schlüssel der Messergebnisse sind
  (`room_temperature@children_room#a1b2c3d4`). Eine laufende Nummer würde beim
  Löschen nachrutschen: Entfernt man das erste von zwei Kinderzimmern, hieße das
  zweite plötzlich `children_room#0` und erbte die Messungen des gelöschten –
  der Nutzer sähe ein Ergebnis, das er in einem anderen Raum erhoben hat.
- **Ergebnisse werden nicht migriert.** Gespeicherte `MeasurementResult`-Objekte
  bleiben, wie sie sind; ändert sich ein Kodier-Format, muss die Ergebnis-Ansicht
  beide Formate lesen.

---

## 9. Entwicklungsgeschichte: der Fragebogen ist geschrumpft

Für eine Ausarbeitung ist die **Richtung** der Entwicklung aussagekräftig: Der
Fragebogen wurde nicht ausgebaut, sondern gekürzt – konsequent nach dem
Kriterium „hat diese Angabe einen Abnehmer?".

| entfallen | ehemals | Begründung |
|---|---|---|
| Schritt „Gebäudehülle & Modernisierung" | Schritt 5 von 8 | Vier Pflichtfragen (Fensteralter, Dämmzustand, Lüftung, Sanierungs-Log), deren gesamte Wirkung Zeilen im PDF-Steckbrief waren |
| Schritt „Standort & Wohnsituation" | Schritt 7 von 8 | Mieter/Eigentümer hätte genau einen Tipp gefiltert; übrig blieb die Postleitzahl mit zwei Ziffern im Steckbrief |
| Gebäudeteil, Etagenzahl | in „Dein Zuhause" | Pflichtangaben mit je einer Lesestelle im Steckbrief |
| Kamin/Ofen, Smart-Home-Geräte | in „Ausstattung" | keine funktionale Lesestelle |
| Messgeräte-Abfrage | Schritt „Ausstattung" | 24 wählbare Bauarten, deren einzige Wirkung ein vorangehakter Schalter war; ersetzt durch eine Informationsseite |
| PV-Antwort „geplant" | in „Heizung" | ein einziger Abnehmer; Bestandsprofile werden auf `'no'` migriert |

**Umgekehrt hinzugekommen** ist die Zielauswahl als eigener Schritt 2 – die
einzige Erweiterung, und sie kam mit einer neuen Wirkung (der Landung nach dem
Fragebogen), nicht als weitere Frage ohne Folgen. Nebenbei wurde dabei ein
Fehler behoben: Die Zielfrage wurde nur im vollständigen Fragebogen gestellt,
aber in **beiden** als Pflichtangabe gezählt – ein Schnellstart-Profil konnte
100 % nie erreichen.

Die entfernten Schritte liegen als Code unter `archiv/onboarding-*/`, die
Felder bleiben in `OnboardingData`, damit Bestandsprofile ihre Werte behalten.

---

## 10. Grenzen und offene Punkte

Diese Punkte sollten in einer Ausarbeitung nicht beschönigt werden:

1. **Der Fragebogen allein erzeugt kaum Empfehlungen.** Empfehlungen entstehen
   überwiegend aus **Messungen**. Ein Profil ohne jede Messung erhält nur dann
   eine Empfehlung, wenn ein Wärmeerzeuger ≥ 20 Jahre alt ist (`old_boiler`)
   oder eine PV-Anlage vorhanden ist (`pv_self_consumption`). Bei einer
   Gasheizung ohne eingetragenes Baujahr und ohne PV: **keine einzige**. Das ist
   strukturell so gewollt – die App will messen, nicht raten –, wurde auf der
   Modus-Auswahl aber lange als „Erste Spartipps" versprochen und ist erst am
   05.09.2026 korrigiert worden.
2. **Drei Richtwerte ohne belegte Quelle:** die Schwellen für
   Warmwasser-Wartezeit, Grundlast und Standby sowie die verdeckte
   Heizkörperfläche bei Fußbodenheizung. Sie sind im Code als solche markiert
   (`ThresholdOrigin`: `'reference'` | `'own'` | `'pending'`).
3. **Keine Regionalisierung.** Klimaregion, Gradtagzahlen und regionale Preise
   fehlen; die Postleitzahl wurde deshalb aus dem Fragebogen genommen, statt
   eine Genauigkeit vorzutäuschen, die es nicht gibt.
4. **Zeitangabe „8–10 Min"** für den vollständigen Weg ist optimistisch: Der
   Räume-Schritt allein verlangt Raumtypen wählen, Instanzen benennen und je
   Instanz die Wärmeübergabe angeben.
5. **Die Warmwasser-Wartezeit hat keine Raumzuordnung.** Bei mehreren
   gleichartigen Entnahmestellen (z. B. zwei Waschbecken) überschreibt ein
   Ergebnis das andere.
6. **Rechtstexte** (Impressum, Datenschutzerklärung, Einwilligung vor
   Analytics) sind nach bestem Wissen aufgebaut und benennen die tatsächlichen
   Verarbeitungen – eine juristische Prüfung ersetzen sie nicht.

---

## 11. Wo was im Quellcode steht

| Datei | Inhalt |
|---|---|
| `src/features/onboarding/sections.ts` | Schrittfolge, Pflichtfelder, Modus-Filter, Fortschrittslogik |
| `src/features/onboarding/fieldUsage.ts` | Feld → Abnehmer, mit Begründung |
| `src/features/onboarding/goals.ts` | Ziele und Landung nach dem Fragebogen |
| `src/features/onboarding/appliances.ts` | Geräte-Logik, Ausblenden von Checks |
| `src/features/onboarding/steps/` | Die Schritt-Komponenten |
| `src/store/onboardingStore.ts` | Persistenz, `migrateOnboardingData` |
| `src/types/index.ts` | `OnboardingData` und alle Aufzählungstypen |
| `src/features/measurements/catalog.ts` | Messungs-Registry, Raum-/Geräte-Zuordnung |
| `src/features/monitoring/energyConfig.ts` | Erzeuger → Energieträger, Zähler-Board |
| `src/features/monitoring/specificValues.ts` | Spezifische Kennwerte, Baujahrs-Richtwerte |
| `src/features/monitoring/priceConfig.ts` | Standardpreise je Energieträger |
| `src/features/tips/buildTips.ts` | Empfehlungen und ihre Sortierung |
| `src/features/reports/profileReportData.ts` | Haushalts-Steckbrief im PDF |
| `tests/unit/fieldUsage.test.ts` | Hält fest, welche Felder keinen Abnehmer haben |
| `tests/unit/sections.test.ts` | Hält die Schrittfolge und die Modus-Aufteilung fest |
| `docs/gefundene-probleme.md` | Befundliste aus dem Live-Test, mit Umsetzungsstand |

---

## 12. Hinweise für die Weiterverarbeitung

- **Zahlen und Feldnamen bitte unverändert übernehmen.** Sie sind aus dem Code
  belegt; freie Umformulierung betrifft nur den Fließtext.
- **Gute Kandidaten für Abbildungen:** die Schrittfolge beider Wege als
  Flussdiagramm (Abschnitt 2), das Vier-Abnehmer-Modell als Grafik
  (Abschnitt 4), die Wirkungsketten als gerichteter Graph von Feldern zu
  Funktionen (Abschnitt 6).
- **Gute Kandidaten für eine Diskussion/Reflexion:** die Regel „jede Frage
  braucht einen Abnehmer" samt Typecheck-Absicherung (1.1), das Schrumpfen des
  Fragebogens als Gegenentwurf zum Sammeln auf Vorrat (Abschnitt 9), und die
  Spannung zwischen Vollständigkeit des Profils und Abbruchquote im Fragebogen,
  die die Zweiteilung in Schnellstart und Vollständig zu lösen versucht.
- **Vorsicht bei Superlativen:** Formulierungen wie „vollständig", „automatisch"
  oder „genau" sollten an den Grenzen aus Abschnitt 10 gemessen werden.
