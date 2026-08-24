# Fragebogen-Konzept – zwei Wege, ein Profil

> Stand: 2026-08-24 · Spezifikation für den Umbau von Onboarding, Raum-Handling
> und den daran hängenden Anzeigen. **Noch nicht umgesetzt** – dies ist die
> abgestimmte Zielvorstellung, nicht der Ist-Zustand.
>
> Vorgelagerte Analyse: Session-Log vom 24.08.2026, Abschnitt 4 (Ist-Aufnahme
> beider Fragebögen und Nutzungsanalyse jedes Feldes).
> Verwandtes Dokument: `renovation-redesign.md` – dessen Bauteil-Modell wird
> hier **nicht verworfen, sondern abgeleitet** (siehe Abschnitt 7).

---

## 0. Leitgedanke

> **Der Fragebogen ist ein Startpunkt, kein Türsteher.**

Nichts in der App wird durch eine fehlende Antwort gesperrt. Was der Fragebogen
nicht weiß, fragt die App dort nach, wo sie es braucht – und schreibt die
Antwort ins Profil zurück. Der Fragebogen ist damit die *bequeme* Art, das
Profil zu füllen, nicht die einzige.

Daraus folgen drei Regeln, die den Rest des Dokuments tragen:

1. **Ein Datenmodell für beide Wege.** Schnellstart und vollständiger Fragebogen
   schreiben in dieselbe `OnboardingData`. Sie unterscheiden sich darin, *wann*
   gefragt wird – nie darin, *was* gespeichert wird.
2. **Jede Frage muss etwas bewirken** oder sichtbar für später vorgemerkt sein.
   Ein Feld, das nur den Fortschrittsring füllt, ist ein Fehler im Konzept.
3. **Fortschritt misst am vollständigen Fragebogen.** Der Schnellstart endet
   bewusst unter 100 %. Das wird benannt, nicht kaschiert.
4. **Kein Feld lebt nur im Check.** Jede Angabe, die ein Check braucht, steht im
   vollständigen Fragebogen *und* ist im Check nachtragbar. Nie nur an einer der
   beiden Stellen – sonst entsteht eine dritte Wahrheit (Abschnitt 5.6).
5. **Drei Wege zu jedem Feld.** Vollständiger Fragebogen · Profil-Hub unter
   „Zuhause“ · der Check, der die Angabe braucht. Alle drei schreiben in
   dasselbe Feld, keiner ist Voraussetzung für einen anderen.

---

## 1. Die zwei Wege im Überblick

| | **Schnellstart** | **Vollständig** |
|---|---|---|
| Zeitbudget | **≤ 3 Minuten** | 8–10 Minuten |
| Erfassungs-Schritte | 3 + Übersicht | 7 + Übersicht |
| Räume | **keine** – entstehen im Check | vollständig mit Anzahl und Fläche |
| Ergebnis-Fortschritt | ca. 35–40 % | bis 100 % |
| Sofort startbar | 6 von 9 Checks ohne jede Rückfrage, alle übrigen mit einer Raumanlage im Check | alle 9 |
| Nachtragen | jederzeit im Profil-Hub unter „Zuhause“ oder im Check | dito |

Der Schnellstart lässt **keinen Check unmöglich werden** – er verschiebt nur die
Raumangabe an die Stelle, an der sie gebraucht wird.

**Ohne angelegte Räume laufen heute sechs Checks** (Duschkopf, Warmwasser-Wartezeit,
Grundlast, Standby, Kühlschrank, Gefriergerät) und **drei nicht**:

| Check | Braucht | Heute ohne Räume |
|---|---|---|
| Raumklima | eine Raum-Instanz (`perRoom`) | Sackgasse im `RoomPicker` |
| Möbelabstand | eine Raum-Instanz (`perRoom`) | dito |
| Beleuchtung | die Raumliste – `LightingRun` fragt alle Räume auf einem Schirm ab | **leerer Schirm**, keine Fehlermeldung |

Der Beleuchtungs-Check ist dabei der unauffälligste Fall: Er ist nicht
`perRoom`, greift also nicht in die Raum-Auswahl, sondern rendert eine leere
Liste. Er braucht dieselbe Raumanlage wie die anderen beiden (Abschnitt 5.1).

---

## 2. Eine Schritt-Registry statt zweier Flows

**Problem heute:** Die Schrittreihenfolge ist an vier Stellen unabhängig
kodiert – `QUICK_TOTAL`/`DETAILED_TOTAL`, zwei Zweige in `getStepTitle` mit fest
verdrahteten Key-Arrays, zwei `switch`-Blöcke (`QuickStepContent` /
`DetailedStepContent`), dazu `SECTIONS` im `ProfileHub` und eine wieder eigene
Reihenfolge in `sectionStatus`. Fünf Listen, die dasselbe wissen müssen und
auseinanderlaufen können. Genau daran liegt auch der 16-vs-19-Widerspruch beim
Profil-Fortschritt.

**Vorschlag:** eine Registry, analog zu `MEASUREMENT_CATALOG` bei den Messungen
und zu der heute eingeführten `measurements/progress.ts`.

```ts
// src/features/onboarding/sections.ts

export interface SectionField {
  /** Stabiler Schlüssel – trägt zugleich den i18n-Key. */
  id: string
  /** Beantwortet? Eine Prüfung, überall dieselbe. */
  answered: (d: OnboardingData) => boolean
  /** Optionale Felder zählen nicht in den Fortschritts-Nenner. */
  optional?: boolean
  /** Wird dieses Feld schon im Schnellstart gefragt? */
  quick?: boolean
}

export interface OnboardingSection {
  id: string
  titleKey: string
  icon: LucideIcon
  Component: (p: StepProps) => ReactNode
  fields: SectionField[]
}

export const ONBOARDING_SECTIONS: OnboardingSection[] = [ /* … */ ]
```

Daraus werden abgeleitet:

| Bisher | Neu |
|---|---|
| `QUICK_TOTAL`, `DETAILED_TOTAL` | `sections.length` bzw. Anzahl mit Quick-Feldern |
| `getStepTitle` (zwei Key-Arrays) | `section.titleKey` |
| `QuickStepContent` / `DetailedStepContent` | `section.Component` mit `mode`-Prop |
| `SECTIONS` im `ProfileHub` | dieselbe Registry |
| `sectionStatus()` | Aggregation über `section.fields` |
| `profileChecks()` / `profileCompleteness()` | Aggregation über **alle** Felder |

**Wirkung:** Zwei `switch`-Blöcke, zwei Totals und drei Key-Arrays entfallen.
Der Widerspruch zwischen Prozentbalken und Abschnitts-Kacheln kann strukturell
nicht mehr entstehen – ein Feld, eine Prüfung, zwei Aggregationen.

---

## 3. Schnellstart – Ziel: unter 3 Minuten

### Schritt 1 · Zuhause · ~60 s

| Frage | Bedienung | Feld |
|---|---|---|
| Wohnung oder Haus? | 2 Kacheln | `buildingType` |
| Wohnfläche | Zahlenfeld | `livingArea` |
| Personen im Haushalt | Stepper | `personsCount` |
| Zimmer (ohne Bad und Flur) | Stepper | `roomsCount` |
| Baujahr | Slider | `buildingYear` |

Der Profilname wird mit „Mein Zuhause“ vorbelegt und steht als kleine,
antippbare Zeile darüber – wer will, tippt; niemand muss. Ein Profilbild wird
hier gar nicht angeboten (im Profil jederzeit nachrüstbar).

Unter den Feldern läuft die **Plausibilitätsprüfung** (Abschnitt 11) – der
einzige Grund, `roomsCount` überhaupt zu erheben, und zugleich seine Rettung
als bislang totes Feld.

### Schritt 2 · Heizung & Warmwasser · ~45 s

| Frage | Bedienung | Feld |
|---|---|---|
| Womit wird geheizt? | Mehrfachauswahl, 7 Optionen | `heatGenerators` |
| Wie wird Warmwasser erzeugt? | 4 Optionen | `hotWaterType` |
| Photovoltaik? | ja / nein / geplant | `hasPV` |

`hasPV` wandert bewusst in den Schnellstart – nicht als Freischaltung (die
entfällt, siehe Abschnitt 9), sondern weil daraus die Erinnerung entsteht, den
Erzeugungszähler anzulegen.

### Schritt 3 · Preise · ~45 s

Arbeits- **und** Grundpreis für Strom, dazu Wasser und die aus `heatGenerators`
abgeleiteten Träger. Leere Felder behalten die Standardwerte – wie heute.

Der Grundpreis ist neu: Er geht bereits in `estimateAnnualCostEur` ein, war
bisher aber nicht korrigierbar. Der Nutzer sah also eine Jahreskosten-Zahl,
deren zweiten Bestandteil er nicht beeinflussen konnte.

### Schritt 4 · Übersicht · ~20 s

Kein reines „Fertig“, sondern eine **Freischalt-Bilanz**:

> „Profil zu 38 % vollständig – das reicht für den Start.
> **Sofort möglich:** 7 Checks, alle Zähler, €-Beträge.
> **Noch nicht:** Raumklima und Möbelabstand – die Räume legst du beim ersten
> dieser Checks an, oder hier in zwei Minuten auf einmal.“

Damit ist der Fortschritt unter 100 % erklärt statt beschämend, und der Weg zum
vollständigen Fragebogen steht als Angebot da, nicht als Mahnung.

**Summe: ca. 2:50 Minuten.**

### Was aus dem heutigen Schnellstart verschwindet

| Heute im Schnellstart | Künftig | Warum |
|---|---|---|
| Messgeräte-Checkliste (5 Kategorien + Modelltypen) | nur vollständiger Fragebogen | Der zeitaufwendigste Schirm überhaupt, für genau eine Ja/Nein-Auskunft. Der Möbelabstand-Check fragt selbst, ob ein Messgerät zur Hand ist (Abschnitt 5.4). |
| Profilbild | Profil-Einstellungen | Kostet Zeit, trägt nichts zur Auswertung bei. |
| „Zimmeranzahl“ als totes Feld | bleibt, wird aber ausgewertet | Speist die Plausibilitätsprüfung und den Hinweis „3 von 4 Zimmern angelegt“. |

Nichts davon wird **gelöscht** – alle Felder bleiben erhalten und im
vollständigen Fragebogen erreichbar (siehe Vorgabe „alles unter 4.6 behalten“).

---

## 4. Vollständiger Fragebogen – neue Schrittfolge

Die Reihenfolge setzt die sechs Befunde aus Log-Abschnitt 4.7 um. Alle heute
vorhandenen Fragen bleiben erhalten; sie sitzen nur im passenden Schritt.

| # | Schritt | Inhalt | Herkunft |
|---|---|---|---|
| 1 | **Zuhause** | Profilname, Profilbild, Gebäudetyp, Baujahr, Wohnfläche, Etagen, Personen, Zimmeranzahl, Ziele | Step1 + Step2 |
| 2 | **Räume** | Raumtypen mit Anzahl und Fläche, **Wärmeübergabe je Raum** | Step3 + Wärmeübergabe aus Step5 |
| 3 | **Heizung & Warmwasser** | Wärmeerzeuger, **Alter je Erzeuger** (neu), Warmwasser, PV, zusätzlicher Kamin | Step4 |
| 4 | **Preise & Kosten** | Arbeits- und Grundpreis je Träger, **Energiekosten pro Monat** | StepPrices + `energyCostRange` aus Step6 |
| 5 | **Gebäude & Modernisierung** | Fensteralter, Dämmzustand, Lüftung, **Sanierungs-Historie** (neu), Effizienz-Einordnung | Step5-Rest + Step7Renovation + `windowAge` aus Step2 |
| 6 | **Ausstattung** | Messgeräte mit Modelltypen, Smart-Home-Geräte | Step6 |
| 7 | **Standort & Wohnsituation** | Postleitzahl, Mieter/Eigentümer | Step7Location + `occupancyStatus` aus Step1 |
| 8 | **Übersicht** | Zusammenfassung, Freischalt-Bilanz | Step8 |

### Was sich dadurch auflöst

- **`Step5HeatTransfer` verschwindet als Schritt.** Die Wärmeübergabe zieht in
  den Raum-Schritt, wo der Raum-Kontext ohnehin offen ist und der Nutzer bereits
  Raum für Raum denkt; Lüftung und Dämmzustand ziehen zum Gebäude-Schritt. Der
  heutige Schritt mischt eine raumweise Tabelle, eine Gebäudeangabe und eine
  Selbsteinschätzung auf einem Schirm.
- **Fenster stehen nur noch an einer Stelle.** `windowAge` und „Fenster saniert“
  landen im selben Schritt und können sich gegenseitig vorbelegen, statt in
  Schritt 2 und Schritt 7 unabhängig voneinander abgefragt zu werden.
- **Die Preise rücken von Position 9 auf 4.** Sie sind die einzige Angabe, die
  jeden €-Betrag der App direkt skaliert, und standen bisher dort, wo die
  Aufmerksamkeit am geringsten ist. Position 4 ist zugleich die früheste
  sinnvolle: Erst der Heizungs-Schritt bestimmt, welche Träger überhaupt
  abgefragt werden.
- **Mieter/Eigentümer verlässt den ersten Schritt.** Die Angabe entscheidet,
  welche Maßnahmen überhaupt in Frage kommen – sie gehört neben den Standort,
  nicht neben den Profilnamen.

---

## 5. Robuste Räume – Räume entstehen dort, wo sie gebraucht werden

Das Herzstück. Ein Schnellstart-Nutzer hat keine Räume; der Raumklima- und der
Möbelabstand-Check brauchen aber einen. Statt ihn zurück in den Fragebogen zu
schicken, legt er den Raum im Check an.

### 5.1 Drei Eintrittspunkte, ein Verhalten

| Eintritt | Raum bekannt? | Verhalten |
|---|---|---|
| **Raum-Ansicht** – Tippen auf eine Mess-Kachel in einer Raumgruppe | ja, aus der Kachel | Der Check startet direkt im Raum. Funktioniert heute schon (`ByRoomView` gibt den `roomKey` an die Kachel weiter). |
| **Gewerke-Ansicht** oder **Empfohlen-Liste** | nein | `RoomPicker` – vorhandene Räume zur Auswahl **und** „Raum anlegen“. |
| **Direktaufruf** `/measurements/room_temperature` | nein | dito |

`RoomPicker` existiert bereits in `MeasurementRunner.tsx` und zeigt heute bei
leerer Raumliste eine Sackgasse („Du hast noch keine Zimmer ausgewählt“). Genau
dort setzt der Umbau an: Ohne Räume ist **Raum anlegen** die Hauptaktion, mit
Räumen steht sie als Zeile unter der Liste.

### 5.2 Raumanlage als geteiltes Bauteil

Die Raumtyp-Auswahl aus `Step3Rooms` (13 Typen in drei Gruppen, mit Icons) wird
zu einer eigenständigen Komponente `RoomTypePicker` und an zwei Orten verwendet:

- im Fragebogen-Schritt „Räume“ (mit Anzahl, Fläche, Wärmeübergabe),
- im Check als Bottom-Sheet (nur Typ antippen – alles Weitere kann warten).

Ein im Check angelegter Raum bekommt `{ type, count: 1, heatTransfer: 'radiator' }`
– dieselbe Form wie aus dem Fragebogen. Existiert der Typ bereits, wird `count`
erhöht und die **neue Instanz** direkt angesteuert (`bedroom#1`), sodass der
Nutzer ohne Umweg im gerade angelegten Raum landet.

### 5.3 Raumwechsel im laufenden Check

Heute steht der Raumname nur als Suffix in der Überschrift. Künftig ist er ein
antippbarer Chip: „Bad ▾“ → wechseln oder neuen Raum anlegen. Ohne das ist ein
falsch gewählter Raum nur über den Rückweg zur Übersicht korrigierbar.

### 5.4 Checks füllen das Profil, statt es vorauszusetzen

Zwei Stellen, an denen ein Check heute stillschweigend eine Profilangabe
unterstellt:

| Check | Liest heute | Künftig |
|---|---|---|
| Möbelabstand | `heatTransfer` des Raumtyps – ohne Angabe **stillschweigend „Heizkörper“** | Weiß das Profil nichts, fragt der Check einmal „Heizkörper oder Fußbodenheizung?“ und **schreibt die Antwort ins Profil zurück**. |
| Möbelabstand | `instruments` enthält `distance_meter` → Abstandsmessung vorbelegt | Unverändert; der Check bietet die Messung ohnehin an- und abschaltbar an. Deshalb kann die Messgeräte-Frage ohne Verlust aus dem Schnellstart. |

Das ist der Kern der Robustheit: Jede Angabe, die ein Check braucht, kann er
selbst erheben. Der Fragebogen nimmt sie nur vorweg.

### 5.5 Bekannte Asymmetrie: Profil je Raumtyp, Messungen je Instanz

`RoomEntry` trägt `heatTransfer` und `areaSqm` **je Raumtyp**, die Messungen
laufen aber **je Instanz** (`bedroom#0`, `bedroom#1`). Bei „Schlafzimmer ×2“ mit
unterschiedlicher Wärmeübergabe ist das nicht abbildbar – und ein Rückschreiben
aus dem Check würde beide Zimmer überschreiben.

**Vorschlag ohne großen Umbau:** optionale Overrides je Instanz.

```ts
export interface RoomEntry {
  type: RoomType
  count: number
  heatTransfer: HeatTransferType
  areaSqm?: number
  /** Abweichungen einzelner Instanzen, Schlüssel = Instanz-Index. */
  overrides?: Record<number, { heatTransfer?: HeatTransferType; areaSqm?: number }>
}
```

`roomInstances()` löst sie auf und trägt die effektiven Werte in `RoomInstance`;
alle Leser (Möbelabstand, `roomAreas`, Raumklima) fragen die Instanz statt den
Typ. Migration entfällt – fehlt das Feld, gibt es keine Abweichungen. Bis zur
Umsetzung schreibt ein Check auf Typ-Ebene zurück und sagt das auch:
„gilt für alle Schlafzimmer“.

### 5.6 Feld-Inventar: kein Feld lebt nur im Check

Die Regel aus Abschnitt 0: Jede Angabe, die ein Check braucht, steht im
**vollständigen Fragebogen** *und* ist im **Check** nachtragbar – und im
**Profil-Hub** änderbar. Der Check ist nie der einzige Ort, an dem ein Feld
existiert; sonst hätte man eine Angabe, die man nach dem Erfassen nicht mehr
findet.

| Angabe | Braucht wer | Im vollständigen Fragebogen | Im Check | Zu tun |
|---|---|---|---|---|
| Raumliste | Raumklima, Möbelabstand, Beleuchtung | Schritt „Räume“ | Raumanlage (5.1–5.2) | Etappe 1 |
| Wärmeübergabe je Raum | Möbelabstand | Schritt „Räume“ | Nachfrage bei Unbekanntem, Rückschreiben | Etappe 1 |
| Messgerät (Zollstock) | Möbelabstand | Schritt „Ausstattung“ | schon heute an-/abschaltbar | ✓ vorhanden |
| Personen | Duschkopf, Wartezeit | Schritt „Zuhause“ | Schnellstart fragt es ohnehin | ✓ vorhanden |
| Warmwasser-Erzeugung | Duschkopf | Schritt „Heizung“ | Quelle im Check wählbar | ✓ vorhanden |
| Wohnfläche | Raumklima (Ersparnis) | Schritt „Zuhause“ | Schnellstart fragt es ohnehin | ✓ vorhanden |
| **Kühl-/Gefriergeräte** | Kühlschrank, Gefriergerät | **fehlt** | **fehlt** | **Etappe 6** |
| Raumfläche | Raumklima (Ersparnis) | Schritt „Räume“, optional | Schätzung greift automatisch | ✓ ausreichend |

**Der einzige echte Lückenfall sind die Kühl- und Gefriergeräte.** Beide Checks
unterstellen heute, dass es sie gibt, und fragen nichts. Die Lösung ist deshalb
**nicht** nur ein „überspringen“ im Check (so stand es in der ersten Fassung
dieses Konzepts), sondern ein Feld im vollständigen Fragebogen:

```ts
// OnboardingData, Schritt „Ausstattung"
export interface ApplianceEntry {
  kind: 'fridge' | 'freezer' | 'fridge_freezer'
  /** Wo es steht – speist die Raum-Zuordnung des Checks. */
  room?: RoomType
}
appliances: ApplianceEntry[]        // leer = noch nicht beantwortet
appliancesAnswered: boolean         // true + leer = „wir haben keines"
```

Im Check greift dann dieselbe Mechanik wie beim Raum: Ist die Frage unbeantwortet,
stellt der Check sie im Einstieg („Habt ihr ein Gefriergerät? Wo steht es?“) und
schreibt die Antwort ins Profil. „Nein“ nimmt den Check aus Zähler und Nenner
(Abschnitt 6.2) – aber als **Profilangabe**, nicht als lokale Ausblendung.

### 5.7 „Speichern und nächster Raum“

Wer alle Heizkörper hintereinander abarbeiten will, soll nicht nach jedem Raum
über die Übersicht laufen.

**Heute:** Auf dem Ergebnis-Schirm steht *ein* Speichern-Knopf. Danach zeigt
`SavedInterstitial` kurz den Erfolg und springt nach 1,6 s automatisch zum
nächsten offenen Raum. Der Nutzer hat keine Wahl – und weiß vorher nicht, wohin
es geht.

**Künftig:** Die Wahl wird auf dem Ergebnis-Schirm getroffen, wo sie hingehört.

```
[ Speichern & nächster Raum: Schlafzimmer 2 ]   ← Primär, nur wenn es einen gibt
[ Speichern & zur Übersicht ]                   ← Primär, wenn es keinen mehr gibt
[ Nochmal messen ]                              ← Sekundär, unverändert
```

- Der Knopf **nennt den nächsten Raum**. „Speichern und weiter“ ohne Ziel ist
  eine Zumutung, wenn danach ein Bildschirmwechsel folgt.
- Gibt es keinen offenen Raum mehr, erscheint nur „Speichern & zur Übersicht“.
- Bei Checks ohne Raumbezug (Standby, Grundlast) bleibt es beim einen Knopf.
- `SavedInterstitial` bleibt als Erfolgsmoment, springt aber nicht mehr
  überraschend: Es zeigt das Ziel, das der Nutzer gewählt hat.
- Bei „nächster Raum“ wird der Erfolgs-Zwischenschritt **kürzer** (oder
  übersprungen) – wer sechs Räume abarbeitet, will keine sechs Konfetti-Momente.

`MeasurementRunner.handleSave` berechnet den nächsten offenen Raum bereits
(`open = roomInstances(rooms).find(…)`). Es fehlt nur, das Ergebnis eine Phase
früher sichtbar zu machen und `handleSave` ein Ziel mitzugeben.

**Analog für die Raumanlage:** Ist kein offener Raum mehr da, aber der Nutzer
will einen weiteren anlegen, steht unter dem Erfolgs-Schirm „Weiteren Raum
anlegen“ – derselbe `RoomTypePicker` wie in 5.2.

---

## 6. Keller – vorhandener Raumtyp, fehlende Zuordnung

`basement` **existiert bereits**: als Raumtyp, in der Gruppe „Nebenräume“
(`ROOM_GROUPS.secondary`), mit Komfortband 14–18 °C (`COMFORT_BANDS`) und
Typfläche 12 m² (`TYPICAL_AREA_SQM`). Was fehlt, ist die Zuordnung von Checks:
`freezer` und `fridge` sind heute auf `rooms: ['kitchen']` festgenagelt, also
taucht im Keller nur auf, was ohnehin für jeden Raum gilt.

### 6.1 Zuordnung

| Check | Heute | Künftig | Warum |
|---|---|---|---|
| Gefriergerät (`freezer`) | `['kitchen']` | `['kitchen', 'basement', 'utility_room']` | Die Gefriertruhe steht typisch im Keller oder Hauswirtschaftsraum, nicht in der Küche. |
| Kühlschrank (`fridge`) | `['kitchen']` | `['kitchen', 'basement']` | Zweitkühlschrank im Keller ist verbreitet. |
| Raumklima (`room_temperature`) | perRoom, gilt überall | unverändert | Das Band 14–18 °C passt: zu kalt heißt Frostgefahr, zu warm heißt Feuchte an kalten Wänden. |
| Möbelabstand (`furniture_spacing`) | perRoom, gilt überall | unverändert, aber überspringbar | Viele Keller haben keinen Heizkörper – siehe 6.2. |

Weil `fridge` und `freezer` **ein Ergebnis fürs ganze Zuhause** liefern (nicht
`perRoom`), ändert die zusätzliche Raumzuordnung nur, in welchen Raum-Kacheln
der Check auftaucht – nicht die Zählung. Der Fortschritt bleibt unberührt.

### 6.2 „Nicht vorhanden“ verallgemeinern

Der offene Punkt aus der Analyse: Es gibt Checks für Kühlschrank und
Gefriergerät, aber keine Frage, ob überhaupt eines da ist. Ein Haushalt ohne
Gefriergerät bekommt einen Check, den er nie abschließen kann – und der seit
heute den Fortschrittsring blockiert.

**Lösung in zwei Teilen.** Die Angabe gehört ins Profil (Abschnitt 5.6:
`appliances` im Schritt „Ausstattung“, im Check nachtragbar) – *und* die
vorhandene Skip-Mechanik wird verallgemeinert, damit ein „nein“ auch in der
Zählung ankommt:

```ts
// measurementsStore
- skippedRooms: string[]
+ /** Übersprungen: Raum-Instanzen ODER Mess-Schlüssel („kein Gefriergerät"). */
+ skipped: string[]
```

`countingRooms()` und `countableMeasurements()` aus der heute eingeführten
`progress.ts` filtern beide über dieselbe Liste – übersprungene Checks fallen
aus Zähler *und* Nenner, genau wie übersprungene Räume.

Der Unterschied zur ersten Fassung dieses Konzepts: Das „nein“ kommt aus der
**Profilangabe** `appliances`, nicht aus einer lokalen Ausblendung im Check.
Damit ist es im Profil-Hub sichtbar und dort auch wieder zurücknehmbar – wer
sich ein Gefriergerät anschafft, findet die Stelle. Eine im Check versteckte
Ausblendung fände er nie wieder.

Migration: `skippedRooms` → `skipped` beim Laden übernehmen (der `merge`-Block
im Store ist dafür bereits die richtige Stelle).

*Ausblick, nicht Teil dieses Konzepts:* Ein kellertypischer Feuchte-/Schimmel-Check
wäre die naheliegende Ergänzung – der Raumklima-Check erfasst die Luftfeuchte
bereits, bewertet sie aber am Wohnraum-Maßstab.

---

## 7. Modernisierung – Ereignis-Log statt eines globalen Jahres

### 7.1 Warum

Heute: **ein** `lastRenovationYear` als grobe Spanne plus eine flache
Häkchenliste `renovationItems`. Real werden Fenster (z. B. 2005) und Heizung
(z. B. 2021) getrennt saniert – das Modell kann das nicht abbilden, und das Jahr
geht in keine Rechnung ein.

### 7.2 Neues Modell

```ts
export interface RenovationEvent {
  /** Stabile id für Bearbeitung und Löschen. */
  id: string
  /** Jahr der Maßnahme (vierstellig). */
  year: number
  /** In diesem Jahr durchgeführte Maßnahmen. */
  items: RenovationItem[]
  /** true = aus einem Altprofil abgeleitet, Jahr nur geschätzt. */
  estimated?: boolean
}

// OnboardingData
renovations: RenovationEvent[]   // chronologisch aufsteigend gehalten
```

### 7.3 Bedienung

- Je Sanierungsjahr **eine Karte**: Jahreszahl oben, darunter die Maßnahmen als
  Chips (dieselben `RenovationItem` wie heute, ohne `nothing`).
- Darunter ein **immer erreichbarer Knopf** „Weiteres Sanierungsjahr hinzufügen“.
  Er steht am Listenende und bleibt beim Scrollen sichtbar – nicht in einem Menü
  versteckt.
- Die Liste wird **chronologisch aufsteigend** dargestellt und liest sich damit
  als Zeitstrahl: Baujahr → erste Sanierung → … → heute. Beim Anlegen wird
  einsortiert, nicht angehängt.
- Ein bereits erfasstes Jahr wird beim Anlegen erkannt; der Nutzer landet in der
  vorhandenen Karte statt in einem Duplikat.
- **Explizit „nie saniert“** als eigener Zustand (ersetzt `lastRenovationYear: 'never'`),
  damit sich „nie saniert“ von „noch nichts eingetragen“ unterscheiden lässt.
- Löschen je Karte.
- **Validierung:** Jahr ≥ Baujahr und ≤ aktuelles Jahr. Ein Sanierungsjahr vor
  dem Baujahr ist ein Tippfehler und wird als Hinweis angezeigt, nicht blockiert.

### 7.4 Ableitung – der Punkt, an dem `renovation-redesign.md` aufgeht

Aus dem Ereignis-Log wird der **Bauteil-Zustand** projiziert: Für jedes Bauteil
gilt das *späteste* Jahr, in dem es genannt wird.

```
Events:  2005 → [windows]
         2018 → [roof_insulation, facade]
         2021 → [heating_system]

Projektion:  windows 2005 · roof_insulation 2018 · facade 2018
             heating_system 2021 · basement_ceiling nie
```

Damit gilt:

- **`estimateEnvelope` bleibt unverändert rechenfähig.** Es braucht nur die
  Menge der sanierten Bauteile – die Union über alle Events. `ENVELOPE_FACTORS`
  und die Skalen-Rechnung werden nicht angefasst.
- **Zusätzlich entsteht das Jahr je Bauteil**, das `renovation-redesign.md`
  fordert („Fenster 2005, Heizung 2021“) – ohne einen zweiten Erfassungsweg.
  Das dortige Bauteil-Modell ist damit die **Ableitung**, das Ereignis-Log die
  **Eingabe**. Ein Ort zum Eintragen, zwei Sichten.
- Ein gealtertes Bauteil lässt sich benennen: „Fenster seit 2005 – für die
  damalige Bauweise ordentlich, heutiger Standard liegt darüber.“

### 7.5 Kompatibilität und Migration

`lastRenovationYear` und `renovationItems` **bleiben im Typ** und werden
abgeleitet befüllt (spätestes Jahr → Spanne; Union aller Items). Demo-Profil,
Firestore-Sync, `sectionStatus` und `Step8Review` brechen nicht.

Migration bestehender Profile: ein Event aus `lastRenovationYear` +
`renovationItems`, Jahr = Mitte der Spanne, `estimated: true`. Die Karte weist
das aus („ungefähr 2005“) und lädt zur Präzisierung ein.

### 7.6 Verhältnis zum Erzeuger-Alter

`heating_system` als Maßnahme und das neue Erzeuger-Alter (Abschnitt 8)
beschreiben dieselbe Sache. **Ein Wert, zwei Ansichten:** Das Erzeuger-Alter wird
im Heizungs-Schritt erfasst; im Modernisierungs-Log erscheint es als abgeleiteter,
dort nicht editierbarer Eintrag mit Sprung zum Heizungs-Schritt. So entsteht
nicht die Doppelerfassung, vor der `renovation-redesign.md` warnt.

---

## 8. Alter des Wärmeerzeugers

### 8.1 Erfassung

`heatGenerators` ist eine Mehrfachauswahl – ein einzelnes Jahr wäre falsch.
Deshalb je gewähltem Erzeuger ein optionales Baujahr:

```ts
// OnboardingData
heatGeneratorYears?: Partial<Record<HeatGeneratorType, number>>
```

**Bedienung:** Ist ein Erzeuger gewählt, klappt darunter eine Jahreszeile auf –
genau das Muster, das `Step6Instruments` für die Modelltypen bereits verwendet
(`InstrumentRow`). Vorhandener Code, vorhandenes Interaktionsmuster.

Eingabe als `Slider` (Bereich: Baujahr des Gebäudes bis heute, konsistent mit
`Step2Building`) plus ein Chip „weiß nicht“ daneben.

### 8.2 Auswertung – Pflicht, nicht Kür

Damit das Feld nicht in der Liste der toten Felder landet, wird es ab Tag 1
ausgewertet:

- **Tipp:** Gas- oder Ölkessel über 20 Jahre → „Deine Heizung ist rund 24 Jahre
  alt. Beim Austausch liegt der größte Einzelhebel deines Hauses; Förderung
  prüfen.“ Aufwand hoch, Kosten hoch – der Tipp landet damit korrekt in der
  Gruppe „Braucht etwas Vorbereitung“.
- **Hinweis neben der Effizienz-Einordnung:** Der Erzeuger gehört bewusst
  **nicht** ins Hüllen-Band (die Hülle bestimmt den Bedarf, der Erzeuger die
  Verluste bei der Deckung) – aber daneben, als eigene Zeile. So wie es
  `renovation-redesign.md` vorsieht.
- **Speist das Modernisierungs-Log** (Abschnitt 7.6).

---

## 9. Zähler entsperren

**Heute:** `activeEnergyTypes(data)` leitet aus `heatGenerators` und `hasPV` ab,
welche Zähler es gibt. Wer im Schnellstart keine PV angegeben hat, kann seine
Erzeugung **nie** erfassen – `MeterDetailPage` leitet bei nicht-aktiven Trägern
hart auf die Übersicht um.

**Künftig:** Die Profilangabe schlägt vor, sie sperrt nicht.

```ts
// energyConfig.ts
/** Alle Träger – stehen immer zur Auswahl. */
export const ALL_ENERGY_TYPES: EnergyType[] = ORDER

/** Was das Profil nahelegt – Vorbelegung und Erinnerungen. */
export function suggestedEnergyTypes(data: OnboardingData): EnergyType[]
```

| Stelle | Heute | Künftig |
|---|---|---|
| `MonitoringPage` | Board zeigt `activeEnergyTypes` | Board zeigt Träger **mit Ablesungen ∪ vorgeschlagene**; ein „+ Zähler“-Knopf öffnet die vollständige Liste |
| `MeterDetailPage` | `Navigate` weg, wenn nicht aktiv | Sperre entfällt; unbekannter Träger führt weiterhin zurück |
| `dueTypes` | erinnert an alle aktiven | erinnert an Träger **mit mindestens einer Ablesung** oder vorgeschlagene – sonst würde jeder Haushalt an Pellets erinnert |
| `EnergySummaryCard` | rechnet über Profil-Träger | rechnet über Träger mit Ablesungen |
| `monitoringReportData` | dito | dito |

**Die Fragebogen-Frage wird zur Erinnerung.** Aus „PV: ja“ folgt künftig ein
Anstoß auf der Monitoring-Seite – „Du hast eine PV-Anlage angegeben. Erzeugung
erfassen?“ –, nicht mehr ein Schalter. Das ist genau die Rolle, die eine
Profilangabe haben soll: den Nutzer erinnern, nicht ihn einschränken.

---

## 10. Tipps nach Zielen sortieren

**Heute:** `compareTips` sortiert Sofortmaßnahmen zuerst, dann nach Ersparnis,
Kosten, Aufwand. `goals` wird erhoben und nirgends gelesen.

**Künftig:** eine Ziel-Stufe zwischen Sofortmaßnahmen und Ersparnis.

```ts
const GOAL_CATEGORY_BONUS: Record<UserGoal, Partial<Record<TipCategory, number>>> = {
  save_costs:      {},                               // = die vorhandene €-Sortierung
  reduce_co2:      { heating: 2, electricity: 1 },   // Wärme trägt den größten CO₂-Hebel
  improve_comfort: { heating: 2 },                   // Raumklima und Zugluft zuerst
  curiosity:       {},
  htw_study:       {},
}

function compareTips(a, b, goals) {
  1. Sofortmaßnahme (unverändert)
  2. Ziel-Bonus der Kategorie      ← neu
  3. Ersparnis
  4. Kosten
  5. Aufwand
}
```

**Warum das Ziel *nach* den Sofortmaßnahmen einsortiert:** Der bestehende Grund
(„Wer eine Liste aufschlägt, soll zuerst etwas finden, das er ohne Einkauf und
ohne Termin abhaken kann“) gilt unabhängig vom Ziel. Das Ziel entscheidet
*innerhalb* der Gruppen.

**Warum das besonders bei `improve_comfort` zählt:** Ein zugiger Raum hat oft gar
kein `savingEur` und rutscht in reiner €-Sortierung ans Ende – ausgerechnet bei
dem Nutzer, der die App wegen Komfort geöffnet hat.

**Ohne Ziel oder bei `save_costs` bleibt die Reihenfolge exakt wie heute.** Das
hält die bestehenden Tests und die eingeübte Anzeige stabil.

**Sichtbar machen:** Auf der Tipps-Seite eine Zeile „Sortiert nach deinem Ziel:
CO₂ senken · ändern“. Ohne sie wirkt die Reihenfolge willkürlich – und die
Ziel-Frage bliebe für den Nutzer weiterhin folgenlos, selbst wenn sie es
technisch nicht mehr ist.

---

## 11. Plausibilitätsprüfung Wohnfläche ↔ Bewohner

Ein Tippfehler – 700 statt 70 m² – schlägt ungebremst auf jede €- und
kWh-Zahl der App durch. Die Prüfung ist ein **Hinweis, keine Sperre**: Es gibt
WGs mit 9 m² pro Person und Erbhäuser mit 200 m² für eine Person.

```ts
// src/features/onboarding/plausibility.ts – reine Funktion, testbar
export interface PlausibilityHint {
  id: 'area_per_person_low' | 'area_per_person_high'
     | 'area_per_room_low'  | 'area_per_room_high'
  params: Record<string, number>
}

export function checkPlausibility(d: OnboardingData): PlausibilityHint[]
```

| Kennzahl | Üblich | Hinweis unter | Hinweis über |
|---|---|---|---|
| m² je Person | 25–80 | 12 | 150 |
| m² je Zimmer | 15–40 | 6 | 80 |

**Darstellung:** eine ruhige Zeile unter den Feldern, kein Modal, kein rotes
Feld. „700 m² für 2 Personen – Tippfehler?“ mit einem „Passt so“, das den
Hinweis für diese Wertekombination dauerhaft verstummen lässt.

**Zweitverwendung:** dieselbe Funktion auf der Übersichtsseite und im
Profil-Hub – ein falscher Wert soll auch dann auffallen, wenn er über die
Bearbeitung hereinkommt.

---

## 12. Fortschrittsanzeige

### 12.1 Bezugsgröße

Der Prozentwert bemisst sich **immer am vollständigen Fragebogen**. Der
Schnellstart endet bei etwa 38 % – das ist beabsichtigt und wird benannt
(Abschnitt 3, Schritt 4), nicht kaschiert.

### 12.2 Eine Liste, zwei Aggregationen

Aus der Registry (Abschnitt 2) folgt direkt:

- `profileCompleteness` = beantwortete / nicht-optionale Felder **über alle Abschnitte**
- `sectionStatus(i)` = dasselbe je Abschnitt

Der heutige Widerspruch – Prozentbalken prüft 16 Felder, die Kacheln darunter
19 – kann strukturell nicht mehr entstehen.

**Optionale Felder zählen nicht in den Nenner** (Postleitzahl, Profilbild,
Preise, Raumflächen). Sonst wäre 100 % nur mit Angaben erreichbar, die die App
selbst als optional beschriftet.

### 12.3 Drei Zustände je Schritt – „besucht, aber unvollständig“

**Heute** kennt `StepIndicator` nur zwei Zustände: `i <= currentStep` füllt das
Segment, sonst bleibt es grau. Ein Schritt, den der Nutzer durchgeklickt hat,
ohne alles auszufüllen, sieht damit genauso aus wie ein vollständig
beantworteter. Genau diese Unterscheidung soll zurück.

Mit der Registry ist sie fast geschenkt – die offenen Felder je Abschnitt sind
ohnehin bekannt. Es fehlt nur, was der Nutzer bereits *gesehen* hat:

```ts
// onboardingStore
/** Abschnitte, die der Nutzer schon geöffnet hatte (Registry-ids). */
visitedSections: string[]
markVisited: (id: string) => void
```

| Zustand | Bedingung | Segment im `StepIndicator` | Kachel im Profil-Hub |
|---|---|---|---|
| **offen** | nicht besucht, Felder offen | grau | grauer Balken, „N Angaben“ |
| **angefangen** | besucht, aber Felder offen | **halb gefüllt, gestreift** | Balken auf `pct`, Hinweiszeile „noch N offen“ |
| **vollständig** | keine nicht-optionalen Felder offen | voll, `progress-glow` | Häkchen |

- „Angefangen“ ist die visuell **auffälligste** Stufe, nicht die leiseste: Ein
  begonnener Schritt ist eine offene Schleife, die geschlossen werden will. Ein
  nie besuchter Schritt ist nur noch nicht dran.
- Der Zustand gilt in **beiden** Wegen. Nach dem Schnellstart sind die vier nicht
  besuchten Abschnitte „offen“, nicht „angefangen“ – der Unterschied ist die
  ganze Aussage.
- `markVisited` wird beim Rendern eines Abschnitts gesetzt, nicht beim Verlassen:
  Sonst zählt ein Zurück-Wischen nicht als Besuch.
- **Kein Zwang.** Ein angefangener Schritt blockiert nichts; er ist sichtbar,
  mehr nicht.

### 12.4 Der Profil-Hub ist der vollständige Nachtrag-Ort

Nach dem Fragebogen – gleich welchem – muss unter **Zuhause → Profil** *jede*
Angabe erreichbar und änderbar sein, auch die, die der Schnellstart nie gezeigt
hat. Der Hub ist damit die dritte Tür zu jedem Feld (Regel 5 in Abschnitt 0).

Aus der Registry folgt das automatisch: Der Hub rendert **alle** Abschnitte, nicht
eine eigene Liste. Heute pflegt `ProfileHub` ein eigenes `SECTIONS`-Array – die
vierte Kopie der Reihenfolge und der Grund, warum ein dort vergessener Abschnitt
unbemerkt fehlen kann.

Zusätzlich:

- Die Kacheln tragen die drei Zustände aus 12.3.
- Ein Schnellstart-Nutzer sieht sofort, welche Abschnitte er nie gesehen hat –
  und wozu sie gut sind („Räume anlegen → 3 weitere Checks“).
- Aus einem Check heraus geänderte Angaben (Wärmeübergabe, Geräte) erscheinen
  hier normal weiter und sind normal änderbar. Nichts, was ein Check erfasst,
  bleibt im Check gefangen.

### 12.5 Fortschritt als freigeschalteter Nutzen

Statt „Noch 11 Angaben“ nennt die Kachel auf „Zuhause“, was die nächste Angabe
bringt:

> „Räume anlegen → 2 weitere Checks“
> „Preise ergänzen → €-Beträge statt Mengenangaben“
> „Sanierungen eintragen → Effizienz-Einordnung deines Gebäudes“

Das ist derselbe Zahlenwert, aber eine Aussage über Gewinn statt über Restarbeit.

---

## 13. Datenmodell – Änderungsübersicht

| Feld | Status | Anmerkung |
|---|---|---|
| `heatGeneratorYears` | **neu** | `Partial<Record<HeatGeneratorType, number>>`, optional |
| `renovations` | **neu** | `RenovationEvent[]`, chronologisch |
| `RoomEntry.overrides` | **neu, optional** | Instanz-Abweichungen (Abschnitt 5.5) |
| `appliances`, `appliancesAnswered` | **neu** | Kühl-/Gefriergeräte mit Standort (Abschnitt 5.6) |
| `visitedSections` | **neu** (Store, nicht `OnboardingData`) | trägt den Zustand „angefangen“ (Abschnitt 12.3) |
| `lastRenovationYear` | **abgeleitet** | bleibt im Typ, wird aus `renovations` befüllt |
| `renovationItems` | **abgeleitet** | dito (Union über alle Events) |
| `roomsCount` | **bleibt, wird ausgewertet** | speist Plausibilität und „x von y Zimmern angelegt“ |
| `floors`, `hasExtraFireplace`, `smartHomeDevices`, `insulationState`, `ventilationType`, `postalCode`, `locationMode`, Modelltypen | **bleiben unverändert** | ausdrücklich für spätere Auswertung erhalten |
| `buildingType` | **bleibt, künftig ausgewertet** | Wohnung vs. Haus filtert die Sanierungs-Hebel: Dach- und Kellerdämmung sind für Mieter in der Wohnung nicht umsetzbar |
| `occupancyStatus` | **bleibt, künftig ausgewertet** | zusammen mit `buildingType` die Grundlage dafür, welche Maßnahmen überhaupt vorgeschlagen werden |
| `skippedRooms` → `skipped` | **erweitert** | nimmt zusätzlich Mess-Schlüssel auf (Abschnitt 6.2) |

**Nichts wird gelöscht.** Alle heute erhobenen Felder bleiben im Modell und im
vollständigen Fragebogen erreichbar.

---

## 14. Auswirkungen auf den Code

### Neu

| Datei | Inhalt |
|---|---|
| `onboarding/sections.ts` | Schritt- und Feld-Registry (Abschnitt 2) |
| `onboarding/plausibility.ts` | reine Prüffunktion (Abschnitt 11) |
| `onboarding/RoomTypePicker.tsx` | Raumtyp-Auswahl, geteilt zwischen Fragebogen und Check |
| `onboarding/steps/StepRenovationLog.tsx` | Sanierungs-Historie (Abschnitt 7) |
| `onboarding/renovationProjection.ts` | Events → Bauteil-Zustand + Altfeld-Ableitung |

### Wird schlanker

| Datei | Was entfällt |
|---|---|
| `OnboardingPage.tsx` | `QuickStepContent`, `DetailedStepContent`, `QUICK_TOTAL`, `DETAILED_TOTAL`, beide Key-Arrays in `getStepTitle`, `getSectionTitle` |
| `onboarding/sectionStatus.ts` | geht in die Registry auf |
| `home/estimateEnergy.ts` | `profileChecks` geht in die Registry auf |
| `onboarding/ProfileHub.tsx` | eigene `SECTIONS`-Liste entfällt |
| `steps/Step5HeatTransfer.tsx` | löst sich auf: Wärmeübergabe → Raum-Schritt, Lüftung/Dämmung → Gebäude-Schritt |

### Wird berührt

| Datei | Änderung |
|---|---|
| `measurements/catalog.ts` | Keller-/Hauswirtschaftsraum-Zuordnung für `freezer` und `fridge` |
| `measurements/MeasurementRunner.tsx` | `RoomPicker` mit Raumanlage, Raum-Chip im Kopf, „Speichern & nächster Raum“ (5.7) |
| `measurements/furniture_spacing/FurnitureSpacingRun.tsx` | fragt Wärmeübergabe, wenn unbekannt, und schreibt sie zurück |
| `measurements/lighting/LightingRun.tsx` | Raumanlage statt leerem Schirm (Abschnitt 1) |
| `measurements/fridge/…`, `freezer/…` | Geräte-Nachfrage im Einstieg, Rückschreiben nach `appliances` (5.6) |
| `onboarding/StepIndicator.tsx` | dritter Zustand „angefangen“ (12.3) |
| `store/measurementsStore.ts` | `skippedRooms` → `skipped` samt Migration |
| `measurements/progress.ts` | filtert zusätzlich übersprungene Checks |
| `monitoring/energyConfig.ts` | `ALL_ENERGY_TYPES` + `suggestedEnergyTypes` |
| `monitoring/MonitoringPage.tsx`, `MeterDetailPage.tsx`, `due.ts` | Sperren zu Vorschlägen (Abschnitt 9) |
| `tips/buildTips.ts` | `compareTips` mit Ziel-Stufe, Heizungsalter-Tipp |
| `home/estimateEnergy.ts` | `estimateEnvelope` liest die Projektion statt `renovationItems` |
| `store/onboardingStore.ts` | neue Felder in `defaultData`, Migration im `merge`-Block |

### Bleibt unberührt

Alle Mess-Module und ihre Rechenkerne, `measurements/progress.ts` in seiner
heutigen Logik, `impact.ts`, `savingsDisplay.ts`, der Monitoring-Rechenkern
(`readings.ts`, `seasonality.ts`, `specificValues.ts`), die Berichte und der
Wissens-Bereich.

---

## 15. Umsetzung in Etappen

Jede Etappe ist für sich lauffähig und einzeln deploybar.

| # | Etappe | Enthält | Warum in dieser Reihenfolge |
|---|---|---|---|
| 1 | **Räume robust machen** | `RoomTypePicker`, `RoomPicker` und `LightingRun` mit Raumanlage, Raum-Chip im Check, „Speichern & nächster Raum“, Rückschreiben der Wärmeübergabe | Größter Nutzen, unabhängig vom Fragebogen-Umbau. Danach *darf* der Schnellstart die Räume überhaupt erst weglassen. |
| 2 | **Zähler entsperren** | `ALL_ENERGY_TYPES`, Sperren zu Vorschlägen, PV-Erinnerung | Klein, isoliert, sofort spürbar. Keine Abhängigkeit. |
| 3 | **Registry und Schrittzustände** | `sections.ts`, Verschmelzung von `sectionStatus` und `profileChecks`, `visitedSections`, drei Zustände, Profil-Hub aus der Registry | Das Fundament für Etappe 4. Ändert die Fragen noch nicht – nur, woher die App sie kennt. |
| 4 | **Neue Schrittfolge und kurzer Schnellstart** | Umsortierung nach Abschnitt 4, Schnellstart auf 3 Schritte, Plausibilitätsprüfung, Grundpreis, Freischalt-Bilanz | Der spürbare Umbau. Setzt Etappe 1 (Räume im Check) und 3 (Registry) voraus. |
| 5 | **Modernisierung und Erzeuger-Alter** | `RenovationEvent`, `StepRenovationLog`, Projektion, `heatGeneratorYears`, Heizungsalter-Tipp | Eigenständig, mit eigener Migration. Braucht nur die Registry aus Etappe 3. |
| 6 | **Gerätebestand, Keller, Ziele** | `appliances` im Fragebogen und im Check, Keller-Zuordnung, `skipped` verallgemeinert, Ziel-Sortierung der Tipps | Feinschliff. Setzt Etappe 4 voraus (Ziele werden verlässlich erhoben). |

**Arbeitsstand und Abnahmekriterien je Etappe: `questionnaire-etappen.md`.**
Dieses Dokument hier beschreibt das *Was und Warum*, der Tracker das *Wie weit*.

### Tests, die mitwachsen sollten

- `plausibility.test.ts` – Grenzfälle der Kennzahlen, inklusive WG und Erbhaus.
- `renovationProjection.test.ts` – Events → Bauteil-Zustand, Ableitung der
  Altfelder, Migration eines Altprofils.
- `sections.test.ts` – Registry ist widerspruchsfrei: jedes Feld in genau einem
  Abschnitt, Summe der Abschnitts-Felder = Feldliste des Fortschritts.
- Erweiterung von `measurementProgress.test.ts` – übersprungene Checks fallen aus
  Zähler und Nenner, so wie es übersprungene Räume seit dem 24.08. tun.
- `buildTips.test.ts` – ohne Ziel identische Reihenfolge wie heute; mit
  `improve_comfort` steht ein Komfort-Tipp ohne `savingEur` vor einem
  €-starken Strom-Tipp.

---

## 16. Offene Entscheidungen

| Frage | Vorschlag | Muss entschieden werden, bevor … |
|---|---|---|
| Sortierrichtung der Sanierungs-Historie | aufsteigend, liest sich als Zeitstrahl | Etappe 5 |
| Erzeuger-Alter: Slider oder Spannen-Chips? | Slider mit „weiß nicht“, konsistent mit dem Baujahr | Etappe 5 |
| Zählt der Preis-Schritt in den Fortschritt? | nein – die App beschriftet ihn selbst als optional | Etappe 4 |
| Instanz-Overrides bei Räumen sofort oder später? | später; bis dahin schreibt der Check auf Typ-Ebene zurück und sagt das | Etappe 1 |
| Kellertypischer Feuchte-Check | eigener Konzeptpunkt, nicht Teil dieses Dokuments | – |

Keine dieser Fragen blockiert den Start: Für jede steht ein Vorschlag da, der
umgesetzt wird, solange nichts anderes gesagt wird.
