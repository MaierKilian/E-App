# E-App – Monetarisierung, Freemium-Schnitt und Preismodelle

> **Stand:** 2026-09-06 · Grundlage: Codestand `claude/sync-iytgmy` (= `origin/main`),
> Version 0.6.0
>
> **Zweck dieser Datei:** Informationsgrundlage für eine nachgelagerte
> Textproduktion (Hausarbeit). Sie ist bewusst als *Materialsammlung* geschrieben,
> nicht als fertiger Fließtext: Fakten, Belegstellen, Modellrechnungen,
> Argumentationslinien und ausdrücklich gekennzeichnete Annahmen liegen getrennt
> voneinander, damit ein nachgelagertes System auswählen kann, was es braucht,
> und nicht Behauptung von Beleg trennen muss.

---

## 0. Lesehinweis für die weiterverarbeitende KI

Diese Datei unterscheidet durchgehend drei Sicherheitsgrade. Wer daraus Text
erzeugt, sollte diese Unterscheidung **nicht** einebnen:

| Markierung | Bedeutung | Verwendbarkeit im Fließtext |
|---|---|---|
| **[BELEGT]** | Aus dem Quellcode dieses Repositorys nachgewiesen, Fundstelle genannt | Als Tatsachenbehauptung über die App zitierbar |
| **[ANNAHME]** | Modellannahme des Verfassers, plausibel, aber nicht empirisch erhoben | Nur als Annahme kenntlich machen („unter der Annahme, dass …") |
| **[PRÜFEN]** | Marktzahl/Rechtslage aus Vorwissen, ohne Online-Verifikation erhoben | **Vor Abgabe mit Primärquelle belegen oder streichen** |

Alle Preisangaben in dieser Datei sind Bruttopreise in Euro (Endpreise
i. S. d. PAngV), sofern nicht anders vermerkt. Alle Modellrechnungen sind
Szenarien, keine Prognosen.

---

## 1. Methodik

Grundlage der Funktionsanalyse ist eine vollständige Durchsicht des
Repositorys `MaierKilian/E-App` im Stand vom 06.09.2026. Ausgewertet wurden:

- die Routen-Definition (`src/app/App.tsx`, `src/app/navigation.ts`),
- die Feature-Verzeichnisse unter `src/features/` (18 Module),
- die zentralen Registries (`measurements/catalog.ts`,
  `onboarding/goals.ts`, `education/educationContent.ts`),
- die bereits vorhandene Tarif-Infrastruktur (`features/billing/entitlements.ts`),
- die Infrastruktur- und Kostenstellen (`functions/index.js`, `firebase.json`,
  `firestore.rules`, `docs/deployment.md`),
- die Produktkommunikation (`src/i18n/locales/de.json`, Abschnitt `landing`).

Nicht erhoben werden konnten: reale Nutzungszahlen, Conversion-Daten,
Zahlungsbereitschafts-Umfragen. Wo solche Größen benötigt werden, stehen
sie als **[ANNAHME]** mit offengelegter Herleitung.

---

## 2. Die App im Überblick

### 2.1 Kennzahlen des Systems [BELEGT]

| Größe | Wert | Fundstelle |
|---|---|---|
| Quellcode | ca. 45.700 Zeilen in 293 TypeScript-/TSX-Dateien | `src/` |
| Übersetzungsschlüssel | 1.951 (Deutsch), zweisprachig DE/EN | `src/i18n/locales/` |
| Unit-Tests | 72 Testdateien | `tests/unit/` |
| Feature-Module | 18 | `src/features/` |
| Messungen (Checks) | 9 | `measurements/catalog.ts` |
| Energieträger im Monitoring | 8 | `monitoring/energyConfig.ts` |
| Regelbasierte Tipps | 13 | `tips/buildTips.ts` |
| FAQ-Einträge | 30 | `education/educationContent.ts` |
| Glossarbegriffe | 58 | ebd. |
| Mess-Hintergründe (mit Richtwert-Tabellen) | 9 | ebd. |
| Laborversuche mit Quiz | 3 | ebd. (`LAB_EXPERIMENTS`) |
| Karteikarten | 75 Karten in 10 Sets, 4 Fächern | `education/flashcards/flashcardsContent.ts` |
| PDF-Kapitel im Bericht | 5 (Steckbrief, Messungen, Monitoring, Handlungsplan, Quellen) | `reports/generate*.ts` |

Das ist, gemessen an einem typischen studentischen Projekt, ein
**ungewöhnlich großes und ungewöhnlich sorgfältig gepflegtes System**.
Für die Argumentation der Hausarbeit ist das relevant: Die Frage ist nicht,
ob genug Substanz für ein kostenpflichtiges Angebot da ist, sondern **wo
man schneidet, ohne das Produktversprechen zu beschädigen**.

### 2.2 Architektur und ihre ökonomische Konsequenz [BELEGT]

Die E-App ist eine **clientseitige React-Anwendung** (React 19, TypeScript,
Tailwind v4, Vite), die ihre Daten primär im `localStorage` hält und optional
mit Firebase synchronisiert (`src/features/sync/cloudSync.ts`). Ausgeliefert
wird sie als statisches Bundle über Firebase Hosting und GitHub Pages
(`docs/deployment.md`).

Daraus folgt der wichtigste ökonomische Befund dieser Analyse:

> **Die Grenzkosten je zusätzlichem Nutzer sind nahezu null – mit genau
> einer Ausnahme.**

Rechnen, Bewerten, PDF-Erzeugung (`jspdf`), Diagramme, der
Karteikarten-Algorithmus und selbst die On-Device-Texterkennung
(`tesseract.js`) laufen **im Browser des Nutzers**. Sie kosten den Betreiber
nichts, egal wie oft sie ausgeführt werden.

Die Ausnahme ist der **Zähler-Scan per Foto**: Er ruft die Cloud Function
`scanMeter` auf, die serverseitig Google Gemini anfragt
(`functions/index.js`, Modell `gemini-flash-latest`, Region `europe-west1`).
Jeder Scan erzeugt einen realen, mengenabhängigen Fremdkostenposten.

Diese Asymmetrie ist der Schlüssel zum ganzen Preismodell und wird in
Abschnitt 6 und 11 tragend.

### 2.3 Aktueller Stand der Monetarisierung [BELEGT]

**Es gibt heute kein Billing.** Vorbereitet ist aber eine vollständige
Tarif-Abstraktion in `src/features/billing/entitlements.ts`:

```ts
export type Plan = 'free' | 'premium' | 'business'

export interface Entitlements {
  maxProfiles: number            // free 3 · premium 10 · business 100
  maxMembersPerProfile: number   // free 5 · premium 10 · business 50
  canShare: boolean              // in allen Tarifen true
}
```

Der Datei-Kommentar formuliert die Absicht bereits ausdrücklich: Freemium
(B2C) und spätere Vermieter-/Berater-Tarife (B2B) sollen sich *nicht* über
verstreute `if`-Abfragen unterscheiden, sondern ausschließlich über diese
Tabelle. Die Plan-Quelle ist als Firebase Custom Claim
(`request.auth.token.plan`) vorgesehen; heute liefert `getCurrentPlan()`
für jeden Nutzer `'free'`.

**Bewertung:** Die Architekturentscheidung ist richtig und spart in der
Umsetzung erheblich Aufwand. Zwei Einschränkungen sind für die Hausarbeit
relevant:

1. Die heutigen Entitlements beschreiben nur **Mengenlimits**
   (Profile, Mitglieder), keine **Funktions-Freischaltungen**. Für ein
   Freemium-Modell nach Abschnitt 10 muss das Interface erweitert werden.
2. Die Prüfung läuft **rein clientseitig**. Sie ist damit über die
   Browser-Entwicklerwerkzeuge trivial umgehbar. Siehe Abschnitt 14.1 –
   das ist kein Schönheitsfehler, sondern die eigentliche technische
   Hauptaufgabe der Einführung.

### 2.4 Der bestehende Registrierungs-Riegel [BELEGT]

Ein Teil der App ist heute schon nicht frei zugänglich. `LoginGate`
(`src/components/LoginGate.tsx`) sperrt vier der fünf Hauptbereiche für
nicht angemeldete Nutzer:

| Bereich | Route | Zugang ohne Konto |
|---|---|---|
| Fragebogen | `/onboarding` | frei |
| Messungen | `/measurements` | **Konto nötig** |
| Monitoring | `/monitoring` | **Konto nötig** |
| Bericht | `/reports` | **Konto nötig** |
| Wissen | `/education`, `/lernen` | frei |
| Rechtstexte | `/impressum`, `/datenschutz` | frei (§ 5 DDG) |

Ausnahme: der **Demo-Modus** (Beispiel-Wohnung, `features/demo/`) hebt die
Sperre auf und lässt eine vollständig befüllte Musterwohnung ohne Anmeldung
erkunden.

**Das ist strategisch bedeutsam:** Der psychologisch schwierigste Schritt –
vom anonymen Besuch zur Registrierung – ist bereits eingebaut und
offenbar akzeptiert. Der Schritt von der *Registrierungshürde* zur
*Bezahlhürde* ist konzeptionell und technisch deutlich kleiner als der
Schritt davor. In der Hausarbeit lässt sich das als „bereits etablierte
Wertschwelle" argumentieren.

### 2.5 Das gegebene Kostenlos-Versprechen [BELEGT]

Die Landing Page führt vier Vertrauensmerkmale („trust badges"). Eines
davon lautet wörtlich:

```json
"trust": {
  "local": "Lokal & privat",
  "free": "Kostenlos",
  "everyone": "Für jeden Haushalt",
  "anyDevice": "Auf jedem Gerät nutzbar"
}
```

*(`src/i18n/locales/de.json`, Schlüssel `landing.trust.free`)*

Ergänzend verspricht der Vorschau-Abschnitt: „Voll befüllte
Beispiel-Wohnung – **ohne Anmeldung**, jederzeit verlassbar."

**Konsequenz:** Jede Monetarisierung berührt ein aktiv kommuniziertes
Versprechen. Das ist kein Ausschlussgrund, aber es zwingt zu einer
sauberen Kommunikationsentscheidung (Abschnitt 16.2). Ein „Kostenlos"-Badge
neben einem Bezahlangebot wäre irreführende Werbung und wettbewerbsrechtlich
angreifbar. Die Umformulierung – etwa zu **„Kostenlos starten"** oder
**„Grundfunktionen kostenlos"** – ist verpflichtender Teil der Einführung,
nicht Kosmetik.

---

## 3. Funktionsinventar mit Monetarisierungs-Eignung

Die folgende Tabelle ist das Kernmaterial für den analytischen Teil der
Hausarbeit. Sie bewertet jede Funktion nach vier Kriterien:

- **Nutzenart** – *episodisch* (einmalig erbracht, danach erledigt) vs.
  *wiederkehrend* (Wert entsteht durch fortgesetzte Nutzung). Diese
  Unterscheidung entscheidet später über Einmalzahlung vs. Abo.
- **Grenzkosten** – was jede zusätzliche Nutzung den Betreiber kostet.
- **Substituierbarkeit** – wie leicht der Nutzer dieselbe Leistung
  anderswo kostenlos bekommt.
- **Paywall-Eignung** – Gesamturteil.

### 3.1 Fragebogen / Onboarding [BELEGT]

`src/features/onboarding/` · 7 Schritte im vollständigen Modus, zusätzlich
ein Schnellstart-Modus (`Step0Mode`).

Erfasst: Wohnsituation, Ziele (5 Ziele, steuern das Ende des Fragebogens –
`goals.ts`), Räume mit Typ/Fläche/Wärmeübergabe, Heizung & Warmwasser,
Kühl-/Gefriergeräte, Messgeräte-Übersicht, Preise & Kosten. Dazu:
Sanierungs-Ereignislog mit Ableitung des Bauteil-Zustands
(`renovationProjection.ts`), Plausibilitätsprüfungen (`plausibility.ts`)
und eine Abschluss-Seite „Wofür wir das nutzen" (`FieldUsageSummary.tsx`).

| Kriterium | Bewertung |
|---|---|
| Nutzenart | episodisch (einmal je Wohnung) |
| Grenzkosten | 0 |
| Substituierbarkeit | hoch (jeder Energierechner fragt Ähnliches) |
| **Paywall-Eignung** | **keine** – der Fragebogen ist die Investition des Nutzers, nicht die Leistung des Anbieters. Wer hier bezahlt, bezahlt für eigene Arbeit. |

### 3.2 Messungen – der Kern des Produkts [BELEGT]

`src/features/measurements/` · 9 angeleitete Checks:

| ID | Check | Gewerk | Schwierigkeit | Messgerät nötig | Beziffert € |
|---|---|---|---|---|---|
| `showerhead` | Duschkopf-Durchfluss | Warmwasser | 1 | keines | ja |
| `hot_water_wait` | Warmwasser-Wartezeit | Warmwasser | 1 | keines | ja |
| `room_temperature` | Raumklima (je Raum) | Heizung | 1 | Thermo-/Hygrometer | nein |
| `furniture_spacing` | Möbelabstand (je Raum) | Heizung | 1 | Zollstock (optional) | nein |
| `lighting` | Beleuchtung / LED | Strom | 1 | keines | nein |
| `base_load` | Grundlast | Strom | 2 | Strommessgerät | nein (Diagnose) |
| `standby` | Standby-Verbrauch | Strom | 2 | Strommessgerät | ja |
| `fridge` | Kühlschrank (je Gerät) | Strom | 2 | Temperatursensor | nein |
| `freezer` | Gefriergerät (je Gerät) | Strom | 1 | keines | ja |

Jeder Check besteht aus Anleitung (Video/Bilder, `IntroHeroVideo`,
`IntroHeroImage`), geführtem Messablauf mit Stoppuhr, Bewertung gegen
belegte Richtwerte (`RatingBadge`, `education/measurementThresholds.ts`),
Ergebnis-Karte mit €- und CO₂-Wirkung (`ResultHero`, `impact.ts`,
`CO2_PER_KWH = 0.38`), einer aufklappbaren Rechenoffenlegung
(`CalculationNote`) und Folge-Aufgaben (`followUps.ts`).

| Kriterium | Bewertung |
|---|---|
| Nutzenart | **episodisch** – man misst sein Zuhause einmal, handelt, fertig |
| Grenzkosten | 0 |
| Substituierbarkeit | **niedrig** – die angeleitete Kombination aus Video, Stoppuhr, Richtwert und €-Umrechnung existiert so kaum |
| **Paywall-Eignung** | **niedrig bis mittel** – siehe unten |

**Wichtige Differenzierung:** Die Messungen sind gleichzeitig das
*Alleinstellungsmerkmal* und der *Aha-Moment-Erzeuger*. Wer sie sperrt,
sperrt genau die Erfahrung, die Zahlungsbereitschaft überhaupt erst
erzeugt. Die Landing Page macht das explizit: „Beispiel Duschkopf-Test:
5 Minuten, ohne Werkzeug … ≈ 120 €/Jahr" (`landing.guided`).

→ **Empfehlung: Messungen bleiben frei.** Sie sind der Motor der
Conversion, nicht ihr Gegenstand. Details in Abschnitt 7.2.

### 3.3 Monitoring – Zählerstände und Verbrauchsverfolgung [BELEGT]

`src/features/monitoring/` · 8 Energieträger: Strom, Wasser, Gas, Öl,
Pellets, Wärmepumpe, PV, Solarthermie (`energyConfig.ts`).

Funktionsumfang:
- Zählerstandserfassung mit spezialisiertem Rollen-Eingabefeld
  (`OdometerInput.tsx`)
- **Vorrats-Modell** für Öl, Pellets, Flüssiggas: Füllstand wird in einen
  virtuellen Zählerstand übersetzt und läuft durch dieselbe Auswertung
  (`counterSeries.ts`, `fillLevel.ts`; Leitgedanke dokumentiert in
  `docs/tank-concept.md`)
- **Reichweiten-Prognose**: Wann ist der Tank leer? Wahlweise linear oder
  über ein Monatsprofil saisonal gewichtet (`range.ts`, `seasonality.ts`)
- Tarif- und Preisverwaltung (`TariffModal.tsx`, `priceConfig.ts`)
- Verlaufsdiagramme mit echten zeitlichen Abständen, Heizperioden-Band
  (Okt–Apr) hinterlegt (`MeterTrend.tsx`, `Sparkline.tsx`,
  `AbsoluteLineChart.tsx`, `heatingPeriod.ts`)
- Ablese-Erinnerungen, wöchentlich/monatlich (`ReadingReminder.tsx`, `due.ts`)
- **Zähler-Scan per Foto** – zweistufig: zuerst Gemini über die Cloud
  Function, bei Fehlschlag On-Device-OCR mit `tesseract.js`
  (`scanRemote.ts`, `ocr.ts`, `MeterScanner.tsx`)

| Kriterium | Bewertung |
|---|---|
| Nutzenart | **wiederkehrend** – der Wert entsteht erst über Monate |
| Grenzkosten | 0 … **außer Foto-Scan** (Gemini-API je Aufruf) |
| Substituierbarkeit | mittel (Tabellenkalkulation tut es auch, aber unbequem) |
| **Paywall-Eignung** | **hoch** – das einzige Modul mit echter Abo-Logik |

Das Monitoring ist das **einzige Modul, dessen Wertlogik von sich aus
wiederkehrend ist**. Wer Zählerstände verfolgt, tut das dauerhaft oder gar
nicht. Zugleich sitzt hier die einzige echte Fremdkostenposition. Beides
zusammen macht das Monitoring zum natürlichen Träger eines Abonnements –
und den Rest der App zum natürlichen Träger einer Einmalzahlung.

### 3.4 Bericht / PDF-Export [BELEGT]

`src/features/reports/` · fünf Kapitel, einzeln zuschaltbar:

1. **Haushalts-Steckbrief** – Gebäude, Haushalt, Anlagentechnik,
   Sanierungshistorie (`generateProfilePdf.ts`)
2. **Messungen** – Ergebnisse mit Bewertung und Vergleichs-Richtwert
   (`generateMeasurementsPdf.ts`)
3. **Monitoring** – Verbrauchsverlauf im gewählten Zeitraum
   (`generateMonitoringPdf.ts`)
4. **Handlungsplan** – offene Tipps nach Aufwand gruppiert, nach den im
   Fragebogen gewählten Zielen sortiert (`generateActionPlanPdf.ts`,
   `actionPlanData.ts`)
5. **Quellenverzeichnis** – Herkunft jedes verwendeten Richtwerts
   (`generateSourcesPdf.ts`, `thresholdReference.ts`)

| Kriterium | Bewertung |
|---|---|
| Nutzenart | **episodisch**, aber wiederholbar (jährlich sinnvoll) |
| Grenzkosten | 0 (Erzeugung im Browser via `jspdf`) |
| Substituierbarkeit | niedrig |
| **Paywall-Eignung** | **sehr hoch** – der klassische „Ergebnis-Paywall" |

Der Bericht ist der beste Paywall-Kandidat der gesamten App, aus vier
Gründen:

1. **Er kommt nach dem Aha-Moment.** Der Nutzer hat gemessen, kennt seine
   €-Beträge, und will sie jetzt gebündelt.
2. **Er ist ein greifbares Artefakt.** Eine PDF-Datei fühlt sich wie ein
   gekaufter Gegenstand an, anders als eine freigeschaltete Ansicht.
3. **Er trägt den Handlungsplan**, also die eigentliche Beratungsleistung –
   das, wofür eine Energieberatung Geld nimmt.
4. **Er ist teilbar** (Vermieter, Handwerker, Familie) und damit auch
   sozial wertvoll.

**Rechtliche Einschränkung – wichtig:** Ein Teil dieses PDFs ist nichts
anderes als die vom Nutzer selbst eingegebenen Daten in aufbereiteter Form.
Art. 15 und Art. 20 DSGVO gewähren Auskunft und Datenübertragbarkeit
**unentgeltlich**. Siehe Abschnitt 15.4: Ein maschinenlesbarer Rohdaten-Export
(JSON/CSV) muss kostenfrei bleiben; der *gestaltete, interpretierte,
mit Richtwerten und Handlungsempfehlungen angereicherte* Bericht ist davon
zu unterscheiden und darf kostenpflichtig sein. Diese Grenze sauber zu
ziehen, ist eine der wenigen echten juristischen Hausaufgaben des Projekts.

### 3.5 Tipps / Empfehlungen [BELEGT]

`src/features/tips/` · 13 regelbasierte Tipps, aus Messergebnissen und
Profil abgeleitet (`buildTips.ts`), u. a. Standby, Beleuchtung, Grundlast,
Duschkopf, Warmwasser-Wartezeit, Raumtemperatur, Feuchte, Zugluft,
Möbelabstand, Kesselalter, PV-Eigenverbrauch.

| Kriterium | Bewertung |
|---|---|
| Nutzenart | episodisch |
| Grenzkosten | 0 |
| Substituierbarkeit | **hoch** (Energiespartipps sind Allgemeingut) |
| **Paywall-Eignung** | **niedrig einzeln, hoch gebündelt** |

Einzelne Tipps zu verkaufen wäre kleinlich und leicht substituierbar. Der
**priorisierte, auf die eigenen Ziele sortierte Handlungsplan** ist dagegen
genau die Ordnungsleistung, die man nicht ergoogeln kann. → Tipps im
Einzelnen frei, Handlungsplan im Bericht kostenpflichtig.

### 3.6 Wissensbereich [BELEGT]

`src/features/education/` · sechs Ansichten (`Section`-Typ in
`EducationPage.tsx`): FAQ (30), Glossar (58), Mess-Hintergründe (9, jeweils
mit Richtwert-Tabelle und Quellenangabe), Messgeräte-Übersicht,
**Hochschule** (3 Laborversuche mit Quiz und PDF-Zertifikat) und
**Karteikarten**.

| Kriterium | Bewertung |
|---|---|
| Nutzenart | gemischt |
| Grenzkosten | 0 |
| Substituierbarkeit | hoch (Wikipedia, Verbraucherzentrale) |
| **Paywall-Eignung** | **keine** für FAQ/Glossar/Hintergründe |

**Begründung, die in die Hausarbeit gehört:** Der Wissensbereich hat drei
Funktionen, die alle gegen eine Paywall sprechen. Er ist (a) der
**SEO- und Vertrauensanker** – frei zugängliche Fachinhalte ziehen Besucher
an und belegen Kompetenz; (b) die **Legitimationsgrundlage** des
Bildungsanspruchs, mit dem sich eine Förderung oder eine Hochschulkooperation
begründen ließe; und (c) ohnehin **leicht substituierbar** – eine Paywall
davor erzielte kaum Umsatz, kostete aber Glaubwürdigkeit.

### 3.7 Karteikarten-Trainer – das unterschätzte Zweitprodukt [BELEGT]

`src/features/education/flashcards/` · 75 Karten in 10 Sets, 4 Fächern
(Thermodynamik, Heizungstechnik, Strömungsmaschinen, Elektrische Anlagen),
Semester 1–6.

Technisch ist das **kein Beiwerk, sondern eine vollwertige
Lernsoftware**. Das Verzeichnis `flashcards/engine/` enthält 15 Module,
darunter drei verschiedene Wiederholungs-Algorithmen:

- `fsrs.ts` – Free Spaced Repetition Scheduler (der moderne Standard)
- `sm2.ts` – SuperMemo 2 (der klassische Anki-Algorithmus)
- `leitner.ts` – Leitner-Kartei (das Karteikasten-Verfahren)

dazu `scheduler.ts`, `queue.ts`, `session.ts`, `stats.ts`, `rollups.ts`,
`log.ts`, `params.ts`. Die App hat eigene Routen dafür (`/lernen`,
`/lernen/statistik`, `/lernen/tempo`) mit Statistik- und Tempo-Ansicht.

| Kriterium | Bewertung |
|---|---|
| Nutzenart | **stark wiederkehrend** (semesterbegleitend, täglich) |
| Grenzkosten | 0 |
| Substituierbarkeit | Algorithmus ja (Anki), **Fachinhalt nein** |
| **Paywall-Eignung** | **hoch – aber für eine andere Zielgruppe** |

**Das ist der wichtigste strategische Befund neben der Grenzkosten-Frage:**
Die E-App enthält faktisch **zwei Produkte für zwei Märkte** in einer
Codebasis. Der Haushalts-Teil und der Studien-Teil haben unterschiedliche
Nutzer, unterschiedliche Nutzungsfrequenz und – entscheidend –
unterschiedliche Preiskonventionen. Studierende sind an Lern-Abos gewöhnt
(Abschnitt 9); Haushalte sind es nicht. Ein einziger Tarif über beide
hinweg verschenkt zwangsläufig Erlös auf der einen und schreckt ab auf der
anderen Seite. Abschnitt 11.4 modelliert die Trennung.

### 3.8 Konto, Cloud-Sync, Mehrbenutzer [BELEGT]

`src/features/auth/`, `src/features/sync/`, `src/features/profiles/`

- Firebase-Authentifizierung
- Firestore-Synchronisation des gesamten Profilzustands (`cloudSync.ts`)
- **Mehrere Wohnprofile** je Konto mit Umschalter (`ProfileSwitcher.tsx`)
- **Teilen** über Einladungslinks mit widerrufbarer Einladungs-ID, Rollen
  `owner`/`editor`, Mitgliederliste (`profiles.ts`, `ShareProfileDialog.tsx`,
  `JoinProfilePage.tsx`)
- Datenmodell und Zugriffsregeln in `firestore.rules` (151 Zeilen)

| Kriterium | Bewertung |
|---|---|
| Nutzenart | **wiederkehrend** |
| Grenzkosten | sehr gering, aber > 0 (Firestore-Lese-/Schreibvorgänge) |
| Substituierbarkeit | niedrig |
| **Paywall-Eignung** | **hoch für Mengen, niedrig für das Prinzip** |

Genau hier setzen die vorhandenen Entitlements bereits an. Wichtig ist die
Nuance im Code-Kommentar: `canShare` ist **in allen Tarifen `true`**, mit
der Begründung „Wachstumshebel – im Free-Tarif an". Das ist eine kluge
Entscheidung, die beibehalten werden sollte: Teilen ist der einzige
eingebaute virale Verbreitungsmechanismus der App. Ihn zu monetarisieren
hieße, den Vertriebskanal zu verkaufen.

### 3.9 Übersicht: Alle Funktionen nach Paywall-Eignung

| Funktion | Nutzenart | Grenzkosten | Paywall-Eignung |
|---|---|---|---|
| Fragebogen | episodisch | 0 | ✗ keine |
| 9 Messungen | episodisch | 0 | ✗ niedrig (Conversion-Motor) |
| Einzel-Tipps | episodisch | 0 | ✗ niedrig |
| FAQ / Glossar / Hintergründe | – | 0 | ✗ keine |
| Rechtstexte, Consent | – | 0 | ✗ **gesetzlich ausgeschlossen** |
| Rohdaten-Export (JSON/CSV) | – | 0 | ✗ **DSGVO Art. 20** |
| Demo-Wohnung | – | 0 | ✗ keine (Marketing) |
| Zählerstände manuell erfassen | wiederkehrend | 0 | ~ mittel (Basisumfang frei) |
| Wohnprofil teilen | wiederkehrend | ~0 | ✗ niedrig (Wachstumshebel) |
| **PDF-Bericht mit Handlungsplan** | episodisch | 0 | ✓✓ **sehr hoch** |
| **Mehrere Wohnprofile** | wiederkehrend | ~0 | ✓ hoch |
| **Cloud-Sync über Geräte** | wiederkehrend | gering | ✓ hoch |
| **Langzeit-Auswertung / Reichweiten-Prognose** | wiederkehrend | 0 | ✓ hoch |
| **Ablese-Erinnerungen** | wiederkehrend | 0 | ✓ mittel |
| **Zähler-Scan per Foto (Gemini)** | wiederkehrend | **> 0, mengenabhängig** | ✓✓ **sehr hoch** |
| **Karteikarten-Trainer** | wiederkehrend | 0 | ✓✓ hoch (andere Zielgruppe) |
| **Laborversuche + Zertifikate** | episodisch | 0 | ✓ hoch (andere Zielgruppe) |

---

## 4. Zielgruppensegmente

Die Roadmap benennt die Zielgruppe als „Privathaushalte, Studierende,
energieinteressierte Nutzer" (`docs/ux-roadmap.md`). Das sind ökonomisch
drei Segmente mit drei Preislogiken.

### Segment A – Privathaushalte

**Profil:** Mieter und Eigentümer, die Energiekosten senken wollen. Die
fünf Ziele des Fragebogens bilden das ab: Kosten senken, CO₂ reduzieren,
Komfort verbessern, Zählerstände verfolgen, Neugier (`goals.ts`).

**Nutzungsmuster:** *Episodisch mit Nachlauf.* Eine intensive Phase von
zwei bis vier Wochen (messen, verstehen, umsetzen), danach entweder
Abbruch oder ein dünner, dauerhafter Monitoring-Faden.

**Zahlungsbereitschaft [ANNAHME]:** Niedrig in absoluten Beträgen,
aber nicht null. Der entscheidende Hebel ist der belegte Gegenwert: Wenn
die App 300 € Sparpotenzial im Jahr ausweist, ist ein Preis von 10–15 €
mit einem Faktor 20–30 Rendite begründbar – ein Argument, das sich
unmittelbar in der Oberfläche zeigen lässt.

**Preiskonvention:** Deutsche Privathaushalte sind gegenüber Abonnements
für Werkzeuge ausgesprochen zurückhaltend („Abo-Müdigkeit"). Einmalzahlung
und Kauf-Metapher passen besser.

### Segment B – Studierende (Gebäude-/Versorgungstechnik)

**Profil:** Der Karteikarten-Trainer bildet vier Fächer über sechs Semester
ab; die Laborversuche (hydraulischer Abgleich u. a.) stammen erkennbar aus
einem konkreten Studiengang.

**Nutzungsmuster:** *Stark wiederkehrend, semesterzyklisch.* Tägliche
Nutzung in der Lernphase, Spitzen vor Prüfungen, Pausen in der
vorlesungsfreien Zeit.

**Zahlungsbereitschaft [ANNAHME]:** Absolut niedriges Budget, aber
**hohe Abo-Akzeptanz** und ein sehr konkreter Nutzen (bestandene Prüfung).
Studierende zahlen routinemäßig für Lernwerkzeuge, Musik und Streaming –
das Abo-Format ist hier nicht die Hürde, der Preis ist es.

**Preiskonvention:** Monatlich oder **je Semester**. Ein Semestertarif ist
in dieser Gruppe eine ungewöhnlich gute Passform: Er trifft den echten
Nutzungszyklus, wirkt günstiger als zwölf Monatsbeträge und erzeugt eine
natürliche, nicht schmerzhafte Kündigung durch Auslaufen.

### Segment C – Vermieter, Hausverwaltungen, Energieberater (B2B, latent)

**Profil:** In den Entitlements bereits als `business` angelegt
(100 Profile, 50 Mitglieder, Kommentar: „Vermieter/Berater verwalten viele
Einheiten – hier später ggf. Seat-basiert").

**Nutzungsmuster:** Viele Einheiten, wiederkehrend, mit Berichtspflicht.

**Zahlungsbereitschaft [ANNAHME]:** **Um ein bis zwei Größenordnungen
höher** als bei B2C. Ein Berater, der einen Kundenbericht in 20 statt
120 Minuten erstellt, rechnet in Stundensätzen, nicht in Kaffeepreisen.

**Wichtig für die Hausarbeit:** Segment C ist heute **nicht bedient** –
es fehlen Mandantentrennung, Sammelauswertung, Weißmarken-Bericht und
Rechnungsstellung. Es gehört deshalb in den Ausblick, nicht in die
Einführungsstufe. Als *strategische Option* ist es aber der bei weitem
größte Erlöshebel und sollte als solcher benannt werden.

---

## 5. Theoretischer Rahmen (Begriffsapparat für die Hausarbeit)

Kurzdefinitionen der Konzepte, auf die sich die Argumentation stützt. Sie
sind hier zusammengestellt, damit die nachgelagerte Textproduktion mit
konsistenter Terminologie arbeitet. **Die Zuordnung zu Urhebern ist aus
dem Gedächtnis erhoben und vor Abgabe zu belegen [PRÜFEN].**

**Freemium.** Kombination aus einem dauerhaft kostenlosen Basisangebot und
einem kostenpflichtigen Erweiterungsangebot. Der Begriff wird gewöhnlich
Fred Wilson bzw. Jarid Lukin (2006) zugeschrieben. Ökonomische Voraussetzung
ist eine sehr niedrige Grenzkostenstruktur – bei der E-App gegeben
(Abschnitt 2.2).

**Value Metric (Wertmetrik).** Die Größe, an der der Preis skaliert
(Nutzer, Wohnungen, Berichte, Scans, Zeit). Zentrale Anforderung: Sie muss
mit dem *wahrgenommenen* Nutzen mitwachsen. Ein Kernproblem der E-App ist,
dass für den Haushalts-Teil **keine natürlich wachsende Wertmetrik
existiert** – der Nutzen ist episodisch. Genau daraus folgt die Empfehlung
in Abschnitt 12.

**Value-based Pricing.** Preisbildung nach dem gestifteten Nutzen statt
nach Kosten oder Wettbewerb. Anwendbar, weil die App den Nutzen selbst
beziffert (€-Sparpotenzial je Messung, `impact.ts`). Übliche Faustregel:
Abschöpfung von 10–20 % des nachgewiesenen Kundennutzens [PRÜFEN].

**Preisdifferenzierung.** Hier in zwei Formen relevant: *Leistungsbezogen*
(Free/Plus/Pro) und *personenbezogen* (Studierendentarif). Die
Segmenttrennung aus Abschnitt 4 ist die Voraussetzung dafür.

**Anchoring / Ankereffekt.** Der Referenzpreis, gegen den der Nutzer
bewertet. Für die E-App ist der wirksamste Anker **nicht** eine andere App,
sondern die **Vor-Ort-Energieberatung** (dreistellig) und die
**Jahresersparnis** (dreistellig). Beide lassen den Produktpreis klein
wirken. In der Oberfläche ist dieser Anker bereits vorhanden, er wird nur
noch nicht monetär genutzt.

**Willingness to Pay (WTP).** Der Höchstbetrag, den ein Kunde zu zahlen
bereit ist. Ohne Erhebung nur schätzbar; die Van-Westendorp-Preissensitivitäts-
messung wäre das naheliegende Instrument für eine empirische Erweiterung
der Hausarbeit (Abschnitt 19.3).

**Churn.** Abwanderungsrate im Abonnement. Für episodische Produkte
strukturell hoch – der zentrale Einwand gegen ein reines Abo bei
Segment A.

**Feature Gating vs. Usage Gating vs. Time Gating.** Drei Schnitttechniken:
nach Funktion, nach Menge, nach Zeit (Testphase). Die Empfehlung in
Abschnitt 12 kombiniert Feature Gating (Bericht) mit Usage Gating (Scans,
Profile).

---

## 6. Kostenstruktur des Betriebs

### 6.1 Fixkosten [BELEGT, Beträge ANNAHME]

| Position | Grundlage | Betrag/Monat |
|---|---|---|
| Firebase Hosting | statisches Bundle, Spark/Blaze | ~0 € |
| GitHub Pages | zweiter Deploy-Pfad | 0 € |
| Firebase Auth | großzügiges Freikontingent | ~0 € |
| Cloud Function (Bereitstellung) | `europe-west1`, ereignisgesteuert | ~0 € im Leerlauf |
| Domain | falls eigene Domain | ~1 € |
| **Summe** | | **≈ 0–2 €** |

`CLAUDE.md` hält für den aktuellen Stand fest: „Reale Kosten ~0."
Die Blaze-Abrechnung ist bereits aktiv, weil die Gemini-API kein
Trial-Guthaben akzeptiert.

### 6.2 Variable Kosten [BELEGT dem Grunde nach, ANNAHME der Höhe nach]

**Firestore.** Jeder Sync erzeugt Lese- und Schreibvorgänge. Das
Datenmodell speichert den Profilzustand als ein Dokument
(`profiles/{profileId}.state`), was die Anzahl der Vorgänge klein hält.
Bei den freien Tageskontingenten (Größenordnung 50.000 Lesevorgänge/Tag)
[PRÜFEN] ist im vierstelligen Nutzerbereich kaum mit Kosten zu rechnen.

**Gemini-Zählerscan – die eine echte variable Position.** Ein Scan
überträgt ein JPEG und erhält wenige Token zurück. Bei Flash-Modellen liegt
das im Bereich weniger Zehntel-Cent je Aufruf [PRÜFEN – vor Abgabe mit
der aktuellen Google-Preisliste belegen].

**Modellrechnung [ANNAHME]:** 0,3 ct je Scan, ein aktiver Monitoring-Nutzer
scannt 2 Zähler × 12 Ablesungen = 24 Scans/Jahr → **≈ 7 ct Fremdkosten je
Nutzer und Jahr.**

**Bewertung.** Selbst großzügig gerechnet bleibt der Zählerscan
vernachlässigbar teuer. Er eignet sich damit **nicht als
Kostendeckungsargument**, wohl aber als *Begründungsfigur*: Er ist die
einzige Funktion, bei der man dem Nutzer ehrlich sagen kann „das kostet
uns bei jeder Nutzung Geld". Das ist kommunikativ wertvoll, weil es einer
Preisforderung eine nachvollziehbare Ursache gibt statt bloßer
Abschöpfungsabsicht.

### 6.3 Die eigentlichen Kosten sind nicht technisch [ANNAHME]

Für die Hausarbeit ist dieser Punkt wichtiger als die Cloud-Rechnung:
Sobald Geld fließt, entstehen Kosten, die im Free-Betrieb nicht existieren:

- **Support.** Zahlende Nutzer erwarten Antworten. Das Feedback-Modul
  (`features/feedback/`, inkl. Screenshot-Erfassung) existiert bereits,
  aber die Antwortpflicht entsteht erst mit dem Vertrag.
- **Aktualisierungspflicht (§ 327f BGB).** Für digitale Produkte gegen
  Entgelt besteht eine gesetzliche Pflicht zu Aktualisierungen über den
  Erwartungszeitraum. Bei „Lifetime"-Angeboten ist dieser Zeitraum
  unbestimmt – siehe Abschnitt 15.5.
- **Buchhaltung, Umsatzsteuer, Gewerbeanmeldung.** Abschnitt 15.6.
- **Erstattungen und Kündigungsabwicklung.**

**Diese Kosten skalieren mit der Zahl der Verträge, nicht mit der Zahl der
Nutzer.** Das ist ein starkes Argument für wenige, hochpreisige Verträge
statt vieler Kleinstabos – und ein weiteres Argument gegen ein Abo bei
Segment A.

---

## 7. Wo entsteht Zahlungsbereitschaft?

### 7.1 Der bezifferte Gegenwert [BELEGT]

Die E-App hat einen seltenen Vorzug: **Sie beziffert ihren eigenen Nutzen
in Euro.** `impact.ts` summiert das anzeigbare jährliche Sparpotenzial über
alle Messungen; die Landing Page nennt „≈ 120 €/Jahr" allein für den
Duschkopf-Test.

Bemerkenswert ist dabei die **Strenge der eigenen Regeln**. Der Kommentar
in `impact.ts` beschreibt einen „Riegel gegen Geister-Beträge": Ein Betrag
wird nur ausgewiesen, wenn er aus einer tatsächlichen Messung stammt
(`isMeasuredSaving`) und über einer Anzeigeschwelle liegt
(`displaySavingEur`). Vier der neun Checks weisen bewusst *keinen*
Euro-Betrag aus, weil ihr Befund qualitativ ist.

**Für die Argumentation der Hausarbeit ist das doppelt verwertbar:**

1. **Ökonomisch:** Ein belegter, konservativ gerechneter Gegenwert ist die
   beste denkbare Grundlage für value-based pricing. Man kann dem Nutzer
   im Kaufmoment seine eigene Zahl zeigen.
2. **Ethisch:** Genau diese Strenge muss die Einführung des Bezahlmodells
   überleben. Der größte Reputationsschaden entstünde, wenn die
   Sparpotenzial-Anzeige nach Einführung der Paywall optimistischer würde.
   Ein *Verkaufsargument*, das zugleich eine *Messgröße* ist, steht unter
   permanentem Verzerrungsdruck. Das ist ein lohnender kritischer Abschnitt.

### 7.2 Die Platzierung der Paywall

Zahlungsbereitschaft ist kein Zustand, sondern ein **Moment**. Bei der
E-App liegt er exakt bestimmbar:

```
Fragebogen  →  Messung 1  →  Messung 2  →  Messung 3  →  [Gesamt-Sparpotenzial]  →  ✂  →  Handlungsplan / Bericht
   ✓ frei       ✓ frei       ✓ frei       ✓ frei          ✓ frei sichtbar!            Paywall
```

Der Nutzer soll **die Summe sehen, bevor er zahlt**. „Du hast in deinem
Zuhause 340 €/Jahr an Einsparpotenzial gefunden. Der vollständige
Handlungsplan – was zuerst, was es bringt, was es kostet – ist für 12,99 €
freigeschaltet."

Das ist psychologisch der stärkste denkbare Aufbau, weil:
- der Preis **gegen einen selbst erarbeiteten Betrag** verglichen wird
  (3,8 % der Ersparnis des ersten Jahres),
- der Nutzer bereits **Arbeit investiert** hat (Endowment-Effekt),
- die Leistung **schon erbracht und sichtbar** ist – es geht nur noch um
  die Aushändigung.

Die gegenteilige Platzierung – Paywall *vor* den Messungen – wäre der
schwerste Fehler: Sie verlangt Vertrauen ohne Beleg und zerstört zugleich
den Wissens- und Vertrauensvorsprung der App.

### 7.3 Der Grundwiderspruch von Segment A

Er sollte in der Hausarbeit ausdrücklich benannt werden:

> **Der Haushalts-Teil der E-App erzeugt hohen, aber einmaligen Nutzen.
> Abonnements setzen wiederkehrenden Nutzen voraus. Beides passt nicht
> zusammen.**

Wer sein Zuhause vermessen, die Duschköpfe getauscht, die Standby-Fresser
abgeschaltet und den Kühlschrank richtig eingestellt hat, hat den
Hauptnutzen realisiert. Ein Abo würde ihn dafür weiterbezahlen lassen, dass
er einmal etwas verstanden hat. Praktische Folge: hohe Kündigungsquote
nach zwei bis drei Monaten, Erstattungsanfragen, schlechte Bewertungen –
und der berechtigte Vorwurf, das Abo diene der Erlösglättung, nicht dem
Kunden.

Die Ausnahme ist das **Monitoring**: Zählerstände verfolgt man dauerhaft.
Deshalb – und nur deshalb – ist im Haushalts-Teil ein Abo überhaupt
vertretbar, und zwar ausschließlich für dieses Modul.

---

## 8. Was auf keinen Fall hinter die Paywall darf

Eine Negativliste ist für die Hausarbeit ebenso aussagekräftig wie die
Positivliste, weil sie zeigt, dass die Grenzen bewusst gezogen wurden.

| Nicht monetarisierbar | Begründung |
|---|---|
| Impressum, Datenschutzerklärung | § 5 DDG „unmittelbare Erreichbarkeit"; im Code bereits als öffentlicher Pfad abgesichert (`isPublicPath` in `App.tsx`) |
| Cookie-/Consent-Einstellungen | § 25 TDDDG; Widerruf muss so einfach sein wie die Erteilung |
| Rohdaten-Export der eigenen Daten | Art. 15, 20 DSGVO – **unentgeltlich** |
| Löschen des Kontos und der Daten | Art. 17 DSGVO |
| Bereits erhobene Messergebnisse | Rückwirkende Sperrung eigener Daten wäre vertrags- und datenschutzrechtlich unhaltbar |
| Sicherheitsrelevante Warnhinweise | Produkthaftung/Verkehrssicherung; ein Hinweis „Kellerklima erreicht Taupunkt – Schimmelgefahr" darf nicht vom Tarif abhängen |
| Grundlegende Energiespar-Tipps | Substituierbar, Reputationsschaden > Erlös |

**Der vorletzte Punkt verdient in der Hausarbeit einen eigenen Absatz.**
Die App bewertet Kellerklima über eine Taupunkt-Berechnung und warnt vor
Feuchteproblemen (`measurements/room_temperature/`, `dewPoint.test.ts`).
Ein Gesundheits- oder Bauschadensrisiko hinter einer Bezahlschranke zu
verbergen, wäre unabhängig von der juristischen Bewertung ein schwerer
ethischer Fehler und ein erhebliches Haftungsrisiko.

---

## 9. Marktvergleich und Preisanker

> **Sämtliche Angaben dieses Abschnitts sind [PRÜFEN].** Sie stammen aus
> Vorwissen ohne Online-Verifikation und dienen der Größenordnung. Für die
> Hausarbeit sind sie mit aktuellen Primärquellen (Anbieterwebseiten,
> Stand mit Datum) zu belegen oder zu streichen.

### 9.1 Energie-Umfeld

| Angebot | Modell | Preisgrößenordnung |
|---|---|---|
| co2online / Heizspiegel-Rechner | kostenlos, öffentlich gefördert | 0 € |
| Energie-Apps von Stadtwerken | kostenlos, Kundenbindung | 0 € |
| Verbraucherzentrale Basis-Check | gefördert | 0–30 € |
| Verbraucherzentrale Gebäude-Check | gefördert | ~30–160 € |
| BAFA-geförderte Vor-Ort-Beratung | Einmalhonorar, Eigenanteil | ~390–1.700 € |
| Smart-Home-Energieabos (z. B. Thermostat-Dienste) | Abo | ~3–5 €/Monat |
| Verbrauchs-Tracking-Apps | Freemium | 0 € / ~2–4 €/Monat |

**Ableitung.** Das Umfeld ist an den Rändern besetzt: unten von kostenlosen,
öffentlich finanzierten Angeboten, oben von der dreistelligen persönlichen
Beratung. **Dazwischen liegt eine breite, unbesetzte Lücke.** Die E-App
liefert deutlich mehr als ein Onlinerechner (angeleitete Eigenmessung,
Verlauf, Bericht) und deutlich weniger als eine Vor-Ort-Beratung (kein
Fachmann, keine Förderfähigkeit). Ein **niedriger zweistelliger
Einmalbetrag** ist genau die Position, die das Umfeld offen lässt.

Zugleich ist die Konkurrenz durch geförderte Gratisangebote der Grund,
warum eine Paywall *vor* dem Nutzenbeweis chancenlos wäre: Der Nutzer hat
kostenlose Alternativen für die einfachen Fragen. Bezahlt wird nur, was
die Gratisangebote **nicht** können – und das ist die angeleitete
Eigenmessung mit persönlichem Handlungsplan.

### 9.2 Lern-Umfeld (relevant für Segment B)

| Angebot | Modell | Preisgrößenordnung |
|---|---|---|
| Anki (Desktop, Android) | kostenlos, quelloffen | 0 € |
| **Anki (iOS)** | **Einmalzahlung** | **~25 €** |
| Quizlet Plus | Abo | ~4–8 €/Monat |
| StudySmarter Premium | Abo | ~5–8 €/Monat |
| Repetico PRO | Abo | ~3–5 €/Monat |

**Der Anki-iOS-Fall ist das wertvollste Vergleichsbeispiel der ganzen
Analyse.** Eine Lernsoftware, deren Algorithmus quelloffen und deren
Desktop-Version kostenlos ist, verlangt auf iOS seit Jahren erfolgreich
einen Einmalbetrag im Bereich von 25 €. Er belegt:

1. Einmalzahlungen sind bei Lernwerkzeugen tragfähig.
2. Der Algorithmus ist nicht das Zahlungsmotiv – **Bequemlichkeit und
   Inhalt sind es.**

Übertragen auf die E-App: Der FSRS-Algorithmus in
`flashcards/engine/fsrs.ts` ist frei verfügbar und kein Verkaufsargument.
Verkaufbar sind die **75 fachspezifischen Karten**, die auf den konkreten
Studiengang zugeschnittenen Sets und die Verzahnung mit den Laborversuchen.
Das ist eine wichtige Präzisierung, die eine gute Hausarbeit vornimmt.

---

## 10. Der Freemium-Schnitt: Feature-Matrix

Vorschlag für den konkreten Zuschnitt. Die Spalten entsprechen den bereits
im Code angelegten Plänen (`free`, `premium`, `business`), ergänzt um ein
getrenntes Studien-Modul.

### 10.1 Haushalts-Produkt

| Funktion | Free | Plus | Pro |
|---|:---:|:---:|:---:|
| Fragebogen (beide Modi) | ✓ | ✓ | ✓ |
| Alle 9 Messungen, unbegrenzt | ✓ | ✓ | ✓ |
| Ergebnisse mit €/CO₂-Bewertung | ✓ | ✓ | ✓ |
| Gesamt-Sparpotenzial (Summe sichtbar) | ✓ | ✓ | ✓ |
| Einzelne Tipps | ✓ | ✓ | ✓ |
| Wissensbereich (FAQ, Glossar, Hintergründe) | ✓ | ✓ | ✓ |
| Demo-Wohnung | ✓ | ✓ | ✓ |
| Rohdaten-Export (JSON/CSV) | ✓ | ✓ | ✓ |
| Zählerstände manuell erfassen | 2 Zähler | unbegrenzt | unbegrenzt |
| Verlauf | letzte 6 Monate | vollständig | vollständig |
| Wohnprofile | 1 | 3 | 10 |
| Wohnprofil teilen | ✓ | ✓ | ✓ |
| **PDF-Bericht mit Handlungsplan** | Vorschau (1. Seite, Wasserzeichen) | **✓** | ✓ |
| **Quellenverzeichnis im Bericht** | – | ✓ | ✓ |
| **Cloud-Sync über mehrere Geräte** | – | ✓ | ✓ |
| **Reichweiten-Prognose (Tank)** | – | ✓ | ✓ |
| **Ablese-Erinnerungen** | – | ✓ | ✓ |
| **Zähler-Scan per Foto** | 3 / Monat | 30 / Monat | unbegrenzt |
| Jahresvergleich, Langzeit-Auswertung | – | – | ✓ |
| Priorisierter Support | – | – | ✓ |

**Begründung der drei kritischen Schnitte:**

1. **Alle Messungen bleiben frei.** Sie sind der Conversion-Motor
   (Abschnitt 7.2). Eine Begrenzung auf „3 Messungen gratis" würde 3–5 €
   mehr Umsatz je Konvertierendem bringen, aber die Zahl der Nutzer, die
   den Aha-Moment überhaupt erreichen, drastisch senken. Bei einem Produkt
   mit Grenzkosten null ist das ein schlechter Tausch.

2. **Der Bericht ist Vorschau, nicht Sperre.** Die erste Seite mit
   Wasserzeichen zu zeigen ist wirksamer als ein Schloss-Symbol: Der Nutzer
   sieht, dass die Arbeit fertig ist und nur die Aushändigung fehlt.

3. **Der Foto-Scan ist mengenbegrenzt, nicht gesperrt.** Drei Scans im
   Monat reichen für einen Haushalt mit ein bis zwei Zählern und
   monatlicher Ablesung. Der Free-Nutzer erlebt die Funktion also
   vollständig; das Limit greift erst bei intensiverer Nutzung. Zugleich
   deckelt es die einzige echte Fremdkostenposition. Fällt die
   Gemini-Anfrage aus, greift ohnehin die kostenlose On-Device-Erkennung
   (`ocr.ts`) – der Nutzer steht nie ohne Funktion da.

### 10.2 Studien-Modul (getrennt buchbar)

| Funktion | Free | Studium |
|---|:---:|:---:|
| Laborversuch-Übersicht und Vorbereitungstexte | ✓ | ✓ |
| Quiz je Versuch | 1 Versuch | alle |
| **PDF-Zertifikat „Vorbereitungstest"** | – | ✓ |
| Karteikarten | 1 Set/Fach (~8 Karten) | alle 75 |
| Spaced-Repetition-Trainer (FSRS) | ✓ | ✓ |
| Statistik- und Tempo-Ansicht | – | ✓ |
| Lernstand-Sync über Geräte | – | ✓ |

**Begründung:** Der *Algorithmus* bleibt frei – er ist quelloffenes
Allgemeingut, und ihn zu sperren wäre weder durchsetzbar noch
glaubwürdig. Bezahlt wird der **fachspezifische Inhalt** und die
**Fortschrittsauswertung**. Das entspricht exakt der Lehre aus dem
Anki-Vergleich (Abschnitt 9.2).

### 10.3 Was in `entitlements.ts` dafür ergänzt werden muss

Das heutige Interface kennt nur Mengen. Für die Matrix oben wäre etwa
zu ergänzen:

```ts
export interface Entitlements {
  // vorhanden
  maxProfiles: number
  maxMembersPerProfile: number
  canShare: boolean

  // ergänzt für Freemium
  fullReport: boolean          // Bericht ohne Wasserzeichen
  cloudSync: boolean           // Synchronisation über Geräte
  maxMeters: number            // Zähler im Monitoring
  historyMonths: number        // Verlaufstiefe; Infinity = unbegrenzt
  monthlyScans: number         // Gemini-Scans je Monat
  reminders: boolean           // Ablese-Erinnerungen
  tankForecast: boolean        // Reichweiten-Prognose
  studyFullDecks: boolean      // alle Karteikarten-Sets
  studyCertificates: boolean   // PDF-Zertifikate
}
```

Die Architektur der Datei trägt diese Erweiterung ohne Bruch – genau dafür
wurde sie angelegt. Das ist ein für die Hausarbeit gut verwertbarer Befund:
**Die Monetarisierung war architektonisch vorgedacht, bevor sie
wirtschaftlich entschieden war.**

---

## 11. Preismodell-Szenarien

Sechs Modelle, jeweils mit Mechanik, Beurteilung und Modellrechnung.
Grundlage aller Rechnungen: **[ANNAHME]** 5.000 registrierte Nutzer,
Conversion-Raten wie angegeben. Die Annahmen sind in Abschnitt 13
zusammengefasst und variiert.

### S1 – Reines Abonnement

**Mechanik.** Free-Tarif wie Matrix, Plus für **2,99 €/Monat** oder
**24,90 €/Jahr** (Jahresrabatt ≈ 30 %).

**Pro:**
- Höchster Erlös je Kunde bei niedrigem Churn
- Planbare, wiederkehrende Einnahmen
- Finanziert die Aktualisierungspflicht dauerhaft

**Contra:**
- **Wertmetrik-Bruch** (Abschnitt 7.3): Der Haushaltsnutzen ist episodisch
- Hohe Abwanderung nach 2–3 Monaten zu erwarten
- Erfordert Kündigungsbutton (§ 312k BGB), Erinnerungspflichten,
  Erstattungsprozess – hoher Verwaltungsaufwand für einen Einzelbetreiber
- Kollidiert am deutlichsten mit dem bisherigen „Kostenlos"-Versprechen

**Modellrechnung [ANNAHME]:** 5.000 Nutzer, 3 % Conversion = 150 Abos.
Bei 40 % Jahres-Churn und Mischung aus Monats- und Jahreszahlern:
Brutto ≈ 150 × 24,90 € = **3.735 €/Jahr**, effektiv nach Churn und
Zahlungsgebühren **≈ 2.300–2.800 €/Jahr**.

**Eignung: gering für Segment A, hoch für Segment B.**

### S2 – Reine Einmalzahlung („Lifetime")

**Mechanik.** Free-Tarif wie Matrix, dauerhafte Freischaltung für
**14,99 €** einmalig.

**Pro:**
- **Passt zur episodischen Wertlogik** – der Nutzer kauft ein Ergebnis
- Höchste Kundenfreundlichkeit, keine Abo-Skepsis
- Minimaler Verwaltungsaufwand: kein Churn-Management, keine
  Kündigungsprozesse, kein § 312k-Button
- Beste Passform für einen Einzelbetreiber neben dem Studium

**Contra:**
- **Kein wiederkehrender Erlös** – jeder Euro muss neu akquiriert werden
- **Aktualisierungspflicht ohne Enddatum:** „Lifetime" begründet einen
  unbestimmt langen Erwartungszeitraum nach § 327f BGB (Abschnitt 15.5)
- Deckt die laufenden Scan-Kosten nicht strukturell
- Erlös wächst nur mit Neuregistrierungen, nicht mit Bindung

**Modellrechnung [ANNAHME]:** 5.000 Nutzer, 4 % Conversion (höher als
S1, weil die Hürde niedriger ist) = 200 Käufe × 14,99 € = **2.998 €**
einmalig, zuzüglich laufender Neuregistrierungen.

**Eignung: hoch für Segment A.**

### S3 – Mikrotransaktion je Bericht

**Mechanik.** Alles frei außer dem Bericht; **4,99 € je erzeugtem PDF**,
oder ein Bündel („3 Berichte 9,99 €").

**Pro:**
- Niedrigste Einstiegshürde überhaupt
- Perfekte Passform zum Aha-Moment (Abschnitt 7.2)
- Ehrliche Wertmetrik: bezahlt wird genau das Artefakt

**Contra:**
- Sehr niedriger Betrag je Transaktion, während **Zahlungsgebühren fix
  anteilig hoch** sind (bei ~0,30 € Fixgebühr sind das 6 % vom Umsatz)
- Erzeugt Fehlanreize: Nutzer zögert vor dem Erzeugen und aktualisiert
  seine Daten nicht mehr
- Rechtlich am heikelsten wegen der Nähe zum kostenlosen
  Datenauskunftsanspruch (Abschnitt 15.4)
- Viele Kleinstverträge = viel Verwaltung

**Modellrechnung [ANNAHME]:** 5.000 Nutzer, 8 % kaufen mindestens einen
Bericht, Ø 1,3 Berichte = 520 Transaktionen × 4,99 € = **2.595 €**,
abzüglich überproportionaler Gebühren ≈ **2.380 €**.

**Eignung: mittel – als Ergänzung, nicht als Hauptmodell.**

### S4 – Hybrid: Einmalzahlung als Hauptprodukt, Abo als Option ⭐

**Mechanik.**
- **Free** – wie Matrix 10.1
- **Plus, 14,99 € einmalig** – Bericht, Cloud-Sync, 3 Wohnprofile,
  vollständiger Verlauf, 30 Scans/Monat. *Ohne Ablaufdatum, aber mit
  klar benanntem Aktualisierungszeitraum (24 Monate).*
- **Pro, 2,49 €/Monat oder 19,90 €/Jahr** – zusätzlich unbegrenzte Scans,
  Jahresvergleich, Langzeit-Auswertung, 10 Wohnprofile, Support
- **Studium, 4,99 €/Monat oder 19,90 €/Semester** – getrennt buchbar

**Pro:**
- **Jedes Segment bekommt die Preisform, die zu seiner Wertlogik passt**
- Der Einmalkauf trägt die Masse; das Abo trägt die intensiven Nutzer und
  die einzige variable Kostenposition
- Der Studientarif erschließt Segment B, ohne Haushalte mit einem
  Abo zu belästigen
- Das Abo ist als *Aufwertung*, nicht als *Zwang* positioniert

**Contra:**
- **Komplexer** – drei Produkte statt einem, mehr Erklärungsbedarf auf der
  Preisseite
- Höherer Implementierungsaufwand (zwei Vertragsarten parallel)
- Risiko der Entscheidungslähmung bei zu vielen Optionen

**Modellrechnung [ANNAHME]:** 5.000 Nutzer, davon 4.000 Segment A und
1.000 Segment B.
- Plus: 4.000 × 3,5 % = 140 × 14,99 € = 2.099 € einmalig
- Pro: 4.000 × 0,8 % = 32 × 19,90 € = 637 €/Jahr
- Studium: 1.000 × 6 % = 60 × 19,90 € × 1,6 Semester = 1.910 €/Jahr
- **Summe Jahr 1 ≈ 4.646 €**

**Eignung: höchste. → Empfehlung, siehe Abschnitt 12.**

### S5 – Freiwillige Unterstützung / Pay-what-you-want

**Mechanik.** Alles frei, dauerhafter Spendenaufruf, optional mit
symbolischem Dankeschön.

**Pro:**
- Kein Bruch des „Kostenlos"-Versprechens
- Kein Vertragsrecht, kein Widerrufsrecht, keine Aktualisierungspflicht
- Passt zum gemeinnützigen Beiklang eines Energiespar-Werkzeugs
- Sofort umsetzbar

**Contra:**
- **Erlös typischerweise um eine Größenordnung niedriger** – Spendenquoten
  von 0,1–1 % sind üblich [PRÜFEN]
- Nicht planbar, nicht skalierbar
- Trägt keine Kostenstruktur

**Modellrechnung [ANNAHME]:** 5.000 Nutzer, 0,5 % spenden Ø 5 € =
**125 €/Jahr**.

**Eignung: gering als Erlösmodell – aber ernstzunehmend als
Zwischenschritt** (Abschnitt 12.3) und als Vergleichsmaßstab in der
Hausarbeit, der zeigt, was der Verzicht auf Monetarisierung kostet.

### S6 – B2B-Lizenz (Vermieter, Berater)

**Mechanik.** `business`-Tarif, seat- oder einheitenbasiert. Etwa
**9,90 €/Monat je Nutzer** bei bis zu 50 Wohneinheiten, oder
**2,50 € je Einheit und Jahr**. Zusätzlich: Weißmarken-Bericht mit
eigenem Logo.

**Pro:**
- **Mit Abstand höchster Erlös je Kunde**
- Segment mit echter, wiederkehrender Wertlogik
- Zahlungsbereitschaft an Stundensätzen orientiert, nicht an
  Konsumentenpreisen
- 20 Kunden ersetzen erlösmäßig mehrere tausend B2C-Nutzer

**Contra:**
- **Produkt fehlt heute vollständig**: keine Mandantentrennung, keine
  Sammelauswertung, kein Weißmarken-Bericht, keine Rechnungsstellung
- Vertrieb ist persönlich und langwierig, nicht selbstbedienbar
- Erfordert AGB, Auftragsverarbeitungsvertrag (Art. 28 DSGVO),
  Verfügbarkeitszusagen

**Modellrechnung [ANNAHME]:** 20 Kunden × 9,90 €/Monat =
**2.376 €/Jahr** – bei 20 Kunden statt 5.000 Nutzern.

**Eignung: strategisch am attraktivsten, operativ am weitesten entfernt.
→ Ausblick, nicht Einführungsstufe.**

### 11.7 Szenarienvergleich

| | S1 Abo | S2 Einmal | S3 je Bericht | **S4 Hybrid** | S5 Spende | S6 B2B |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Erlös Jahr 1 (Modell) | ~2.600 € | ~3.000 € | ~2.400 € | **~4.650 €** | ~125 € | ~2.400 € |
| Wiederkehrender Anteil | hoch | keiner | keiner | **mittel** | keiner | hoch |
| Passung zur Wertlogik | ✗ | ✓✓ | ✓✓ | **✓✓** | – | ✓✓ |
| Kundenfreundlichkeit | ✗ | ✓✓ | ✓ | **✓** | ✓✓ | – |
| Verwaltungsaufwand | hoch | **niedrig** | hoch | mittel | **sehr niedrig** | hoch |
| Rechtlicher Aufwand | hoch | mittel | hoch | mittel-hoch | **sehr niedrig** | sehr hoch |
| Umsetzbar mit heutigem Code | mittel | **hoch** | hoch | mittel | **sehr hoch** | ✗ |
| Bruch des Kostenlos-Versprechens | stark | mittel | mittel | mittel | **keiner** | keiner |

---

## 12. Empfehlung

### 12.1 Modell

**Empfohlen wird S4 (Hybrid) mit einer Einmalzahlung als Hauptprodukt.**

Die Begründung in einem Satz:

> Der Nutzen der E-App ist für Haushalte episodisch und für Studierende
> wiederkehrend – deshalb muss der Haushalt einmal zahlen und der
> Studierende monatlich, und nicht umgekehrt.

Ausführlich stützt sich die Empfehlung auf fünf Befunde dieser Analyse:

1. **Grenzkosten ≈ 0** (2.2) → Eine großzügige Gratisstufe kostet nichts
   und maximiert die Zahl der Nutzer, die den Aha-Moment erreichen.
2. **Der Nutzen ist beziffert** (7.1) → Value-based pricing ist möglich;
   der Preis kann gegen den selbst ermittelten Sparbetrag gestellt werden.
3. **Der Haushaltsnutzen ist episodisch** (7.3) → Ein Abo bräche die
   Wertmetrik und erzeugte Churn, Erstattungen und Verdruss.
4. **Es gibt ein zweites Produkt für ein zweites Segment** (3.7, 4) →
   Der Studien-Teil verträgt und verlangt eine eigene, abo-förmige
   Preisform.
5. **Der Betreiber ist eine Einzelperson** (6.3) → Wenige, klar
   umrissene Verträge sind einer Vielzahl von Kleinstabos vorzuziehen.

### 12.2 Konkrete Preise

| Produkt | Preis | Wertmetrik |
|---|---|---|
| **Free** | 0 € | – |
| **Plus** | **14,99 € einmalig** | eine Wohnung, dauerhaft |
| **Pro** | **2,49 €/Monat** oder **19,90 €/Jahr** | intensives Monitoring |
| **Studium** | **4,99 €/Monat** oder **19,90 €/Semester** | Lernphase |
| *Business (Ausblick)* | *9,90 €/Monat je Nutzer* | *Wohneinheiten* |

**Zur Höhe von 14,99 € [ANNAHME]:**
- Bei einem typischen ausgewiesenen Sparpotenzial von 200–400 €/Jahr
  entspricht das **4–7 % des Nutzens im ersten Jahr** – deutlich unter der
  Faustregel von 10–20 % und damit leicht als fair verteidigbar.
- Es liegt unter der psychologischen Schwelle von 20 €, oberhalb derer
  bei Verbraucher-Software spürbar mehr Überlegung einsetzt [PRÜFEN].
- Es liegt deutlich unter der günstigsten Beratungsalternative
  (Verbraucherzentrale-Gebäude-Check) und ist damit als Ergänzung, nicht
  als Konkurrenz positionierbar.
- Es ist hoch genug, dass die anteiligen Zahlungsgebühren (≈ 5 %)
  vertretbar bleiben – anders als bei S3.

**Zur Höhe von 19,90 €/Semester [ANNAHME]:** Etwa der Preis von zwei
Monaten eines Lernabos, für einen Zeitraum von rund sechs Monaten. Der
Semesterbezug trifft den echten Nutzungszyklus, wirkt günstiger als der
Monatsbetrag und erzeugt eine sanfte, nicht konfliktbehaftete Beendigung.

### 12.3 Einführungsstufen

Ein Vorgehen in Stufen senkt Risiko und Aufwand und liefert der Hausarbeit
zugleich eine saubere Handlungsempfehlung:

**Stufe 0 – Vorbereiten (ohne Preis).**
- `entitlements.ts` um die Funktions-Flags aus 10.3 erweitern
- Durchsetzung serverseitig verankern (Custom Claims + Firestore Rules,
  Abschnitt 14.1)
- Conversion-Trichter messbar machen (Abschnitt 17)
- Landing-Page-Badge „Kostenlos" auf „Kostenlos starten" ändern
- *Ergebnis: Die App ist bezahlbereit, ohne dass jemand zahlt.*

**Stufe 1 – Freiwillig (S5 als Test).**
- Nach dem Erzeugen des Berichts ein dezentes „Unterstützen"-Angebot
- Misst Zahlungsbereitschaft, ohne Verträge, Widerrufsrecht und
  Aktualisierungspflicht auszulösen
- *Ergebnis: eine erste empirische Zahl statt einer Annahme – und damit
  eine belastbare Grundlage für die Preisentscheidung.*

**Stufe 2 – Plus einführen (S2/S4-Kern).**
- Einmalzahlung 14,99 €, Paywall exakt an der Stelle aus 7.2
- Nur ein Produkt, nur eine Vertragsart – minimaler Rechtsaufwand
- *Ergebnis: erster echter Umsatz, überschaubares Risiko.*

**Stufe 3 – Pro und Studium ergänzen.**
- Erst wenn Stufe 2 trägt und der Support-Aufwand bekannt ist
- Abo-Pflichten (§ 312k-Button, Erinnerungen) einmalig sauber bauen

**Stufe 4 – Business (Ausblick).**
- Erfordert eigenes Produkt, eigenen Vertrieb, eigene Verträge

### 12.4 Was diese Empfehlung bewusst nicht tut

Für die kritische Reflexion in der Hausarbeit:

- **Sie sperrt keine Messung.** Das kostet Erlös je Konvertierendem und
  ist eine bewusste Entscheidung zugunsten von Reichweite und
  Glaubwürdigkeit.
- **Sie monetarisiert das Teilen nicht**, obwohl es technisch das am
  leichtesten begrenzbare Merkmal wäre – weil es der einzige virale
  Verbreitungsweg ist.
- **Sie verzichtet auf Werbung und Datenverkauf.** Beides stünde in
  direktem Widerspruch zum Vertrauensmerkmal „Lokal & privat" und zur
  konsequenten Consent-Architektur (Analytics lädt erst nach Einwilligung,
  Firestore startet erst bei echtem Bedarf – `docs/legal.md`). Diese
  Selbstbeschränkung ist ein Aktivposten und sollte es bleiben.
- **Sie setzt keine zeitliche Testphase ein.** Bei episodischem Nutzen
  würde eine 14-Tage-Testphase genau den Zeitraum abdecken, in dem der
  gesamte Nutzen anfällt – der Nutzer hätte danach keinen Grund mehr zu
  zahlen. Die Gratisstufe *ist* die Testphase, dauerhaft.

---

## 13. Modellrechnungen

> Sämtliche Zahlen dieses Abschnitts sind **[ANNAHME]**. Sie zeigen
> Größenordnungen und Sensitivitäten, keine Prognosen.

### 13.1 Annahmen

| Parameter | pessimistisch | realistisch | optimistisch |
|---|---|---|---|
| Registrierte Nutzer nach 12 Monaten | 1.000 | 5.000 | 20.000 |
| Anteil Segment A (Haushalt) | 85 % | 80 % | 75 % |
| Anteil Segment B (Studium) | 15 % | 20 % | 25 % |
| Conversion Free → Plus | 1,5 % | 3,5 % | 6,0 % |
| Conversion Free → Pro (Abo) | 0,3 % | 0,8 % | 1,5 % |
| Conversion Studium | 3,0 % | 6,0 % | 10,0 % |
| Semester je Studien-Kunde/Jahr | 1,2 | 1,6 | 1,8 |
| Zahlungsgebühren | 5 % | 5 % | 5 % |

Die Conversion-Spannen orientieren sich an der üblichen Bandbreite von
1–5 % für Freemium-Verbraucherprodukte, mit einem Aufschlag für die
ungewöhnlich hohe Nutzenklarheit dieses Produkts [PRÜFEN].

### 13.2 Erlös nach Szenario S4 (Hybrid)

**Realistisch – 5.000 Nutzer:**

| Posten | Rechnung | Brutto |
|---|---|---|
| Plus | 4.000 × 3,5 % × 14,99 € | 2.099 € |
| Pro | 4.000 × 0,8 % × 19,90 € | 637 € |
| Studium | 1.000 × 6,0 % × 19,90 € × 1,6 | 1.910 € |
| **Summe** | | **4.646 €** |
| abzüglich Gebühren (5 %) | | −232 € |
| abzüglich Fixkosten | | −24 € |
| **Deckungsbeitrag Jahr 1** | | **≈ 4.390 €** |

**Alle drei Szenarien:**

| | pessimistisch (1.000) | realistisch (5.000) | optimistisch (20.000) |
|---|---|---|---|
| Plus | 191 € | 2.099 € | 13.491 € |
| Pro | 51 € | 637 € | 1.493 € |
| Studium | 107 € | 1.910 € | 17.910 € |
| **Brutto** | **349 €** | **4.646 €** | **32.894 €** |
| **Nach Gebühren/Kosten** | **≈ 307 €** | **≈ 4.390 €** | **≈ 31.225 €** |

### 13.3 Einordnung

Drei Beobachtungen, die in die Hausarbeit gehören:

1. **Im pessimistischen Fall deckt das Modell kaum den Aufwand.** 307 €
   im Jahr rechtfertigen weder die juristische Vorbereitung noch die
   Buchhaltungspflichten. **Es gibt eine Mindestgröße, unterhalb derer
   Monetarisierung ökonomisch unvernünftig ist** – im Modell etwa ab
   2.000–2.500 registrierten Nutzern. Diese Schwelle explizit zu benennen,
   ist ein starker analytischer Punkt.

2. **Der Studien-Teil trägt im optimistischen Fall mehr als der
   Haushalts-Teil** (17.910 € gegenüber 13.491 €), obwohl er nur ein
   Viertel der Nutzer stellt. Ursache ist der wiederkehrende Erlös. Das
   ist ein starkes Argument dafür, den Karteikarten-Trainer nicht als
   Beiwerk, sondern als eigenständiges Produkt zu behandeln.

3. **Alle Zahlen bleiben im niedrigen vier- bis fünfstelligen Bereich.**
   Die E-App ist unter diesen Annahmen kein Unternehmen, sondern ein
   Nebenerwerb, der seine Kosten deckt und Arbeit vergütet. Das offen
   auszusprechen ist redlicher als eine Wachstumserzählung – und wirft
   die Anschlussfrage auf, ob Segment C (B2B) oder eine Förderung nicht
   der interessantere Weg wäre.

### 13.4 Sensitivität: Was bewegt den Erlös am stärksten?

| Veränderung | Wirkung auf den Erlös |
|---|---|
| Nutzerzahl ×2 | Erlös ×2 (linear) |
| Conversion +1 Prozentpunkt (3,5 → 4,5 %) | **+29 %** |
| Preis 14,99 → 19,99 € (+33 %) | +33 % *nur bei gleicher Conversion* – unwahrscheinlich |
| Studien-Modul weglassen | **−41 %** |
| Messungen hinter Paywall | Conversion je Konvertierendem ↑, erreichte Nutzer ↓↓ → netto vermutlich negativ |

**Wichtigste Ableitung:** Der wirksamste Hebel ist **nicht der Preis,
sondern die Conversion** – und diese hängt fast vollständig davon ab, ob
der Nutzer den Aha-Moment erreicht. Jeder Euro Aufwand ist damit besser
in die Strecke *bis* zur Paywall investiert als in die Paywall selbst.
Das ist die praktisch wertvollste Erkenntnis der ganzen Analyse.

---

## 14. Technische Umsetzung

### 14.1 Durchsetzung – die eigentliche Hauptaufgabe

**Der heutige Zustand ist für ein Bezahlmodell nicht ausreichend.**
`getCurrentPlan()` liest den Plan aus dem Auth-Store im Browser. Ein Nutzer
kann diesen Zustand über die Entwicklerwerkzeuge verändern und sich damit
jeden Tarif selbst zuweisen.

Notwendig ist eine **dreifache Absicherung**:

1. **Firebase Custom Claims** als Quelle der Wahrheit. Eine Cloud Function
   setzt nach bestätigter Zahlung `token.plan`. Der Client liest ihn nur
   noch. Der Kommentar in `entitlements.ts` sieht genau das bereits vor
   (`request.auth.token.plan`).
2. **Firestore Security Rules** setzen die Mengengrenzen serverseitig
   durch. Die Regeln existieren (151 Zeilen, mit Emulator-Tests via
   `npm run test:rules`) und müssten um Plan-Prüfungen erweitert werden.
   Beispielhaft: Das Anlegen eines vierten Wohnprofils wird abgelehnt,
   wenn `request.auth.token.plan == 'free'`.
3. **Serverseitige Prüfung in der Cloud Function.** `scanMeter` verlangt
   heute nur einen angemeldeten Nutzer. Für das Scan-Kontingent muss die
   Funktion selbst zählen und ablehnen – das ist zugleich der einzige
   Ort, an dem echte Kosten entstehen, und damit der einzige, an dem eine
   Umgehung den Betreiber wirklich Geld kostet.

**Für den Client gilt:** Die clientseitige Prüfung bleibt sinnvoll – aber
als *Oberflächenlogik* (was zeige ich an), nicht als *Sicherheitsgrenze*.
Diese Unterscheidung sauber zu treffen, ist ein gutes Beispiel für
„Verteidigung in der Tiefe" und eignet sich für die Hausarbeit.

**Wichtige Einschränkung:** Der PDF-Bericht wird **im Browser erzeugt**
(`jspdf`). Alle Daten liegen bereits auf dem Client. Eine technisch
lückenlose Sperre wäre nur durch serverseitige Erzeugung möglich – was
Rechenkosten und einen Datenschutz-Nachteil erzeugte (die Daten müssten
den Client verlassen). **Empfehlung: bewusst darauf verzichten.** Wer den
Bericht umgeht, hätte ihn ohnehin nicht gekauft; der Aufwand lohnt nicht,
und die Datensparsamkeit ist wertvoller als die Dichtigkeit der Schranke.
Diese Abwägung – Durchsetzbarkeit gegen Datenschutz – ist ein
lohnender Abschnitt.

### 14.2 Zahlungsabwicklung

| Anbieter | Modell | Gebühr [PRÜFEN] | Umsatzsteuer |
|---|---|---|---|
| **Stripe** | Payment Service Provider | ~1,5 % + 0,25 € (EU-Karten) | **Betreiber haftet** |
| **Paddle** | Merchant of Record | ~5 % + 0,50 € | **Paddle übernimmt** |
| **Lemon Squeezy** | Merchant of Record | ~5 % + 0,50 € | **übernimmt** |
| PayPal | PSP | ~2,5 % + 0,35 € | Betreiber haftet |

**Empfehlung für einen Einzelbetreiber: Merchant of Record.** Der
Preisunterschied von rund 3,5 Prozentpunkten ist bei einem Jahresumsatz
im vierstelligen Bereich absolut gering (bei 4.650 € ≈ 160 €), während
der Wegfall der EU-weiten Umsatzsteuerpflichten (OSS-Verfahren,
Steuersätze je Mitgliedstaat, Rechnungsstellung) erheblichen Aufwand und
Haftungsrisiko erspart. Die Rechnung „160 € gegen mehrere Tage
Steuerverwaltung im Jahr" fällt eindeutig aus.

**Zu ergänzen wäre:** eine Cloud Function als Webhook-Empfänger, die
nach bestätigter Zahlung den Custom Claim setzt. Das ist der einzige
substanzielle Neubau – die Function-Infrastruktur (`functions/`, Region
`europe-west1`, Secrets) steht bereits.

### 14.3 Aufwandsschätzung [ANNAHME]

| Aufgabe | Aufwand |
|---|---|
| `entitlements.ts` erweitern, Aufrufstellen anbinden | 1–2 Tage |
| Custom Claims + Webhook-Function | 2–3 Tage |
| Firestore Rules erweitern und testen | 1–2 Tage |
| Scan-Kontingent serverseitig zählen | 1 Tag |
| Paywall-Oberfläche, Preisseite, Bericht-Vorschau | 3–4 Tage |
| Zahlungsanbieter anbinden und testen | 2–3 Tage |
| Rechtstexte: AGB, Widerruf, Datenschutz ergänzen | 2–3 Tage (+ anwaltliche Prüfung) |
| Analytics-Trichter | 1 Tag |
| **Summe** | **13–19 Tage** |

Nicht enthalten: laufender Support, Buchhaltung, Gewerbeanmeldung.

---

## 15. Rechtliche Rahmenbedingungen

> **Dieser gesamte Abschnitt ist [PRÜFEN].** Er benennt die relevanten
> Themenfelder nach bestem Wissen, ersetzt aber keine Rechtsberatung. Die
> Projektdokumentation formuliert für die bestehenden Rechtstexte bereits
> denselben Vorbehalt (`CLAUDE.md`: „eine juristische Prüfung ersetzen sie
> nicht") – dieser Vorbehalt gilt hier erst recht, weil mit dem
> Vertragsschluss ein qualitativ neues Rechtsverhältnis entsteht.

### 15.1 Was neu hinzukommt

Heute ist die E-App ein unentgeltliches Angebot. Mit dem ersten
Bezahlvorgang entsteht ein **Verbrauchervertrag über digitale Produkte**
(§§ 327 ff. BGB) im **Fernabsatz** (§§ 312c ff. BGB). Damit gelten
Informationspflichten, Widerrufsrecht, Mängelrechte und
Aktualisierungspflichten, die es bisher nicht gab.

### 15.2 Informations- und Preisangabenpflichten

- **PAngV:** Endpreise inklusive Umsatzsteuer, klar und unmissverständlich
  zugeordnet. Bei Abos zusätzlich der Grundpreis je Zeiteinheit.
- **Art. 246a EGBGB:** Vorvertragliche Informationen – wesentliche
  Eigenschaften, Gesamtpreis, Laufzeit, Kündigungsbedingungen.
- **Button-Lösung (§ 312j Abs. 3 BGB):** Der Bestellknopf muss
  ausdrücklich mit „zahlungspflichtig bestellen" oder gleichwertig
  beschriftet sein. Ein Knopf „Freischalten" genügt **nicht**.
- **Interoperabilität und Funktionsweise:** Bei digitalen Produkten ist
  über technische Schutzmaßnahmen und Kompatibilität zu informieren.

### 15.3 Widerrufsrecht – der kritischste Punkt bei Einmalzahlung

Verbraucher haben im Fernabsatz **14 Tage Widerrufsrecht**. Bei digitalen
Inhalten erlischt es vorzeitig nur unter drei kumulativen Bedingungen
(§ 356 Abs. 5 BGB):

1. der Verbraucher hat **ausdrücklich zugestimmt**, dass vor Ablauf der
   Frist mit der Ausführung begonnen wird,
2. er hat seine **Kenntnis vom Erlöschen** des Widerrufsrechts bestätigt,
3. der Unternehmer hat ihm dies **bestätigt** (Textform).

**Praktische Folge für die E-App:** Ohne diese Konstruktion könnte ein
Nutzer den Bericht erzeugen, herunterladen und anschließend widerrufen –
bei einem rein digitalen Artefakt ohne Rückgabemöglichkeit. Die drei
Bedingungen sind daher zwingend in den Kaufvorgang einzubauen. Das ist
kein Randthema, sondern eine Kernanforderung an die Umsetzung.

### 15.4 Datenschutz – die Abgrenzung zum kostenlosen Auskunftsanspruch

**Der juristisch feinste Punkt der ganzen Analyse.**

Art. 15 DSGVO (Auskunft) und Art. 20 DSGVO (Datenübertragbarkeit) gewähren
der betroffenen Person **unentgeltlich** eine Kopie ihrer Daten in einem
strukturierten, gängigen, maschinenlesbaren Format.

Der PDF-Bericht der E-App enthält beides gemischt:
- **personenbezogene Rohdaten** (eingegebene Wohnungsdaten, eigene
  Messwerte, eigene Zählerstände) → Anspruch besteht, unentgeltlich
- **Verarbeitungsleistung** (Bewertung gegen Richtwerte, Einordnung,
  priorisierter Handlungsplan, Quellenverzeichnis, Gestaltung) → **keine**
  personenbezogenen Daten im Sinne der Norm, sondern eine eigene Leistung

**Empfehlung:** Einen **kostenlosen Rohdaten-Export** (JSON oder CSV)
in allen Tarifen anbieten. Er erfüllt Art. 20 sauber, ist trivial zu
implementieren – die Daten liegen ohnehin strukturiert im Store – und
**entzieht der naheliegendsten rechtlichen Angriffslinie gegen die
Bericht-Paywall die Grundlage**. Der bezahlte Bericht ist dann
unmissverständlich das, was er ist: eine Aufbereitungs- und
Beratungsleistung, nicht die Herausgabe eigener Daten.

Weiter zu beachten:
- **Zahlungsdaten** sind eine neue Verarbeitungskategorie → Ergänzung der
  Datenschutzerklärung, Rechtsgrundlage Art. 6 Abs. 1 lit. b DSGVO
  (Vertragserfüllung).
- Der Zahlungsanbieter ist je nach Ausgestaltung **eigener
  Verantwortlicher** (Merchant of Record) oder **Auftragsverarbeiter** –
  das ist zu prüfen und in der Erklärung korrekt darzustellen.
- `CONSENT_VERSION` in `features/legal/consent.ts` ist **nicht**
  zwingend zu erhöhen: Zahlungsabwicklung beruht auf Vertragserfüllung,
  nicht auf Einwilligung. Die Projektregel („kommt ein weiterer
  einwilligungsbedürftiger Dienst dazu … `CONSENT_VERSION` erhöhen")
  greift nur, wenn der Zahlungsdienstleister eigene Cookies oder Tracking
  setzt – bei eingebetteten Bezahlfenstern ist das im Einzelfall zu prüfen.

### 15.5 Aktualisierungspflicht (§ 327f BGB)

Bei entgeltlichen digitalen Produkten schuldet der Unternehmer
Aktualisierungen für den Zeitraum, den der Verbraucher **erwarten darf**.
Maßstab sind Art, Zweck und Werbeaussagen.

**Das ist das Hauptargument gegen den Begriff „Lifetime".** Er begründet
eine unbestimmt lange Erwartung. Bei einem Studierendenprojekt, das
möglicherweise nach dem Abschluss nicht weitergeführt wird, ist das ein
konkretes Haftungsrisiko.

**Empfehlung:** Den Einmalkauf **nicht** als „Lifetime" oder „für immer"
bewerben, sondern mit einem **ausdrücklich benannten Aktualisierungszeitraum**
(Vorschlag: 24 Monate), danach Weiternutzung ohne Anspruch auf
Aktualisierung. Das ist ehrlich, rechtlich sauber und schafft nebenbei
einen legitimen Anlass für einen späteren Folgekauf.

### 15.6 Abo-spezifische Pflichten

Nur relevant, wenn Pro oder Studium eingeführt werden:

- **Kündigungsbutton (§ 312k BGB):** Bei online geschlossenen
  Dauerschuldverhältnissen ist ein leicht auffindbarer
  Kündigungsknopf **verpflichtend**. Er muss ohne Anmeldung erreichbar
  sein.
- **Laufzeit und Verlängerung:** Automatische Verlängerung nur unter den
  Vorgaben des § 309 Nr. 9 BGB (nach der Erstlaufzeit unbefristet mit
  Kündigungsfrist von höchstens einem Monat).
- **Preisänderungen** bedürfen einer wirksamen Klausel und der Zustimmung.

### 15.7 Gewerbe- und Steuerrecht

- **Gewerbeanmeldung** nach § 14 GewO ist mit der ersten
  Gewinnerzielungsabsicht fällig.
- **Kleinunternehmerregelung (§ 19 UStG):** Bei Umsätzen unterhalb der
  Grenze kann auf den Ausweis der Umsatzsteuer verzichtet werden. Die
  Schwellen wurden zuletzt angehoben (Größenordnung 25.000 € Vorjahr /
  100.000 € laufendes Jahr) [PRÜFEN – exakte Werte und Stichtag]. Bei den
  Modellrechnungen aus Abschnitt 13 wäre die Regelung in allen Szenarien
  außer dem optimistischen anwendbar.
- **Wichtige Einschränkung:** Die Kleinunternehmerregelung entbindet
  **nicht** von der Umsatzsteuer bei grenzüberschreitenden digitalen
  Leistungen an EU-Verbraucher – ein weiteres Argument für einen
  Merchant of Record.
- **Impressum:** `src/features/legal/operator.ts` muss um die
  gewerblichen Pflichtangaben ergänzt werden. Die App markiert fehlende
  Pflichtfelder auf `/impressum` bereits sichtbar – ein hilfreicher
  eingebauter Prüfmechanismus.

### 15.8 Barrierefreiheitsstärkungsgesetz (BFSG)

Seit Juni 2025 gilt das BFSG für bestimmte Dienstleistungen im
elektronischen Geschäftsverkehr gegenüber Verbrauchern. Ein
**entgeltliches** Web-Angebot kann davon erfasst sein – ein
unentgeltliches typischerweise nicht [PRÜFEN]. Kleinstunternehmen
(< 10 Beschäftigte und ≤ 2 Mio. € Jahresumsatz) sind bei
Dienstleistungen ausgenommen [PRÜFEN].

**Für die Hausarbeit interessant:** Die Monetarisierung könnte eine
Anforderung auslösen, die im kostenlosen Betrieb nicht bestand. Die
`docs/ux-roadmap.md` benennt bereits Kontrastprobleme („Antworttext in
`text-muted` … Kontrast grenzwertig, WCAG"). Das ist ein konkreter,
belegter Anknüpfungspunkt für einen Abschnitt über nicht offensichtliche
Folgekosten der Monetarisierung.

---

## 16. Ethische und kommunikative Abwägung

### 16.1 Das Gemeinwohl-Argument

Energieeinsparung ist ein gesellschaftliches Ziel. Eine App, die
Haushalten hilft, Energie zu sparen, hat einen Beiklang von
Gemeinnützigkeit. Eine Bezahlschranke kann als Widerspruch dazu gelesen
werden – nach dem Muster: „Klimaschutz sollte nicht am Geld scheitern."

**Drei tragfähige Entgegnungen:**

1. **Die Gratisstufe bleibt vollwertig.** Alle neun Messungen, alle
   Ergebnisse, alle €-Beträge, das gesamte Wissen und die Einzeltipps
   sind kostenlos. Wer sparen will, kann es – ohne einen Cent. Bezahlt
   wird die *Bequemlichkeit der Bündelung*, nicht der Zugang zur
   Erkenntnis.
2. **Unfinanzierte Software stirbt.** Ein Werkzeug, das niemanden trägt,
   wird nicht gepflegt. Die Aktualisierungspflicht (15.5) macht das sogar
   zur Rechtsfrage. Eine Finanzierung ist Voraussetzung für Fortbestand.
3. **Die Alternative wäre schlechter.** Die naheliegenden Wege der
   Gratis-Finanzierung – Werbung, Datenverkauf, Leadgenerierung an
   Handwerker oder Energieversorger – stünden in direktem Widerspruch zum
   Versprechen „Lokal & privat" und zur konsequent umgesetzten
   Consent-Architektur. **Eine ehrliche Paywall ist die
   datenschutzfreundlichste Form der Finanzierung.** Dieses Argument ist
   in dieser Form belegbar und gehört prominent in die Hausarbeit.

### 16.2 Die Kommunikationsaufgabe

Der Übergang muss aktiv gestaltet werden:

| Was | Wie |
|---|---|
| Landing-Badge „Kostenlos" | → „Kostenlos starten" oder „Grundfunktionen kostenlos" |
| Bestandsnutzer | Erworbene Ergebnisse bleiben zugänglich; keine rückwirkende Sperre. Ein einmaliger Vorzugspreis oder eine dauerhafte Freischaltung für frühe Nutzer ist die faire und günstige Lösung – ihre Zahl ist klein, ihr Wohlwollen groß. |
| Begründung | Offen benennen: Betriebskosten, Weiterentwicklung, keine Werbung, keine Datenweitergabe |
| Preisseite | Klar, ohne Dark Patterns: keine vorausgewählten Abos, kein künstlicher Zeitdruck, keine versteckten Verlängerungen |

### 16.3 Dark Patterns – was zu unterlassen ist

Für den kritischen Teil der Hausarbeit eine Liste dessen, was **bewusst
nicht** getan wird:

- Voreingestelltes Abo statt Einmalkauf
- Künstliche Verknappung („Angebot endet in 10:00")
- Erschwerte Kündigung (durch § 312k ohnehin unzulässig)
- Nachträgliche Verschlechterung der Gratisstufe („Enshittification")
- **Optimistischere Sparpotenzial-Berechnung nach Einführung der Paywall** –
  der subtilste und gefährlichste Fehler, weil das Verkaufsargument
  zugleich die Messgröße ist (siehe 7.1)

Der letzte Punkt verdient eine ausdrückliche Selbstverpflichtung. Die
bestehenden Code-Regeln – der „Riegel gegen Geister-Beträge" in
`impact.ts`, die Pflicht zur Herkunftsangabe jedes Richtwerts
(`ThresholdOrigin`), das Quellenverzeichnis im Bericht – sind bereits
institutionalisiertes Misstrauen gegen die eigene Optimismus-Neigung.
Sie müssen die Monetarisierung überleben. **Ein guter Vorschlag für die
Hausarbeit:** die Sparpotenzial-Berechnung als „bewusst konservativ"
dokumentieren und diese Zusage in die AGB aufnehmen – dann ist ihre
Aufweichung nicht nur unredlich, sondern vertragswidrig.

---

## 17. Kennzahlen und Messplan

### 17.1 Der Trichter

Heute misst die App über `features/analytics/analytics.ts` im Wesentlichen
Seitenaufrufe (`page_view` in `RouteTracker`). Für eine
Monetarisierungsentscheidung ist das zu grob. Zu ergänzen wären:

| Stufe | Ereignis | Was es beantwortet |
|---|---|---|
| 1 | `landing_view` | Reichweite |
| 2 | `onboarding_start` | Interesse |
| 3 | `onboarding_complete` | Aktivierung |
| 4 | `measurement_complete` (mit ID) | **Aha-Moment erreicht?** |
| 5 | `savings_total_viewed` (mit Betrag) | Nutzen sichtbar geworden? |
| 6 | `paywall_view` (mit Ort) | Paywall erreicht |
| 7 | `checkout_start` | Kaufabsicht |
| 8 | `purchase_complete` (mit Tarif) | Conversion |

**Die entscheidende Kennzahl ist Stufe 4→5→6.** Abschnitt 13.4 zeigt: Der
Erlös hängt weit stärker an der Conversion als am Preis, und die
Conversion hängt fast vollständig daran, ob der Nutzer seinen Sparbetrag
gesehen hat.

**Datenschutzhinweis:** Alle diese Ereignisse dürfen erst nach erteilter
Analytics-Einwilligung erhoben werden. Die bestehende Architektur setzt
das bereits durch (`loadAnalytics()` läuft nur nach Zustimmung,
`docs/legal.md`) – das darf durch den Wunsch nach Conversion-Daten nicht
aufgeweicht werden. Ein guter Nebenbefund: **Die Consent-Architektur
begrenzt die eigene Datenbasis für die Preisentscheidung.** Diesen
Zielkonflikt offen zu benennen, wertet die Hausarbeit auf.

### 17.2 Zu beobachtende Kennzahlen

| Kennzahl | Zielgröße [ANNAHME] |
|---|---|
| Aktivierungsrate (Fragebogen abgeschlossen) | > 40 % |
| Aha-Rate (≥ 1 Messung abgeschlossen) | > 25 % |
| Paywall-Sichtrate | > 15 % |
| Conversion ab Paywall-Sicht | > 15 % |
| Gesamt-Conversion Free → zahlend | 3–5 % |
| Erstattungsquote | < 3 % |
| Abo-Churn (Studium, je Semester) | < 35 % |

---

## 18. Risiken

| Risiko | Eintritt | Wirkung | Gegenmaßnahme |
|---|---|---|---|
| Nutzerzahl bleibt unter der Wirtschaftlichkeitsschwelle (13.3) | **hoch** | Aufwand übersteigt Erlös dauerhaft | Stufenplan 12.3; erst ab ~2.500 Nutzern monetarisieren |
| Reputationsschaden durch Bruch des „Kostenlos"-Versprechens | mittel | Abwanderung, schlechte Bewertungen | Kommunikation 16.2; Bestandsnutzer freistellen |
| Rechtsverstoß (Widerruf, Button-Lösung, § 312k) | mittel | Abmahnung, Kosten | Anwaltliche Prüfung vor Start; Abo erst in Stufe 3 |
| Umgehung der clientseitigen Sperre | hoch | geringer Erlösausfall | Serverseitige Durchsetzung 14.1; beim Bericht bewusst akzeptieren |
| Support-Aufwand übersteigt Erlös | mittel | Zeitverlust | Einmalzahlung statt Abo; Selbstbedienung; klare Grenzen |
| Aktualisierungspflicht nach Projektende | mittel | Haftung | Kein „Lifetime"; benannter 24-Monats-Zeitraum (15.5) |
| Gemini-Kosten laufen aus dem Ruder | niedrig | Fremdkosten | Serverseitiges Kontingent; OCR-Rückfall vorhanden |
| Kostenlose geförderte Wettbewerber | hoch | Preisdruck nach unten | Abgrenzung über Eigenmessung und Handlungsplan (9.1) |
| Verzerrung der Sparpotenzial-Berechnung durch Verkaufsinteresse | **mittel** | Vertrauensverlust, Kern der Glaubwürdigkeit | Selbstverpflichtung, Quellenpflicht, AGB-Zusage (16.3) |

---

## 19. Offene Entscheidungen und Forschungslücken

### 19.1 Zu entscheiden

1. **Grundsatz:** Monetarisierung überhaupt – oder bewusster Verzicht mit
   Spendenmodell (S5)?
2. **Zeitpunkt:** Sofort, oder erst ab einer Mindestnutzerzahl?
3. **Segment B:** Wird der Karteikarten-Trainer als eigenes Produkt
   geführt? Das ist die Entscheidung mit dem größten Erlöshebel (13.4).
4. **Bestandsnutzer:** Dauerhaft freigestellt, oder Vorzugspreis?
5. **Preisniveau:** 14,99 € ist eine Annahme. Vor der Festlegung sollte
   Stufe 1 des Stufenplans (freiwillige Unterstützung) eine empirische
   Zahl liefern.
6. **Hochschulbezug:** Besteht die Möglichkeit einer offiziellen
   Kooperation? Eine Campus-Lizenz wäre eine Erlösform, die Segment B
   erschließt, ohne Studierende individuell zu belasten – und wäre
   inhaltlich die eleganteste Lösung.

### 19.2 Wissenslücken dieser Analyse

- **Keine Nutzerdaten.** Alle Conversion-Annahmen sind literaturgestützte
  Schätzungen ohne Bezug zur tatsächlichen Nutzerschaft.
- **Keine Zahlungsbereitschafts-Erhebung.** Der Preis von 14,99 € ist
  hergeleitet, nicht gemessen.
- **Marktzahlen unverifiziert.** Abschnitt 9 ist vollständig [PRÜFEN].
- **Rechtslage nicht anwaltlich geprüft.** Abschnitt 15 benennt
  Themenfelder, keine belastbaren Rechtsauskünfte.
- **Keine Wettbewerbsanalyse im engeren Sinn.** Ob eine direkt
  vergleichbare App existiert, wurde nicht recherchiert.

### 19.3 Vorschläge zur empirischen Erweiterung der Hausarbeit

Falls die Arbeit einen empirischen Teil vorsieht, bieten sich an:

- **Van-Westendorp-Preissensitivitätsmessung** in der Zielgruppe (vier
  Fragen: zu billig / günstig / teuer / zu teuer). Ergibt einen
  akzeptablen Preiskorridor und ist mit 30–50 Befragten durchführbar.
- **Conjoint-Analyse** der Feature-Matrix aus Abschnitt 10: Welche
  Funktionen tragen tatsächlich die Zahlungsbereitschaft?
- **A/B-Test der Paywall-Platzierung** (nach Messung 1 vs. nach Messung 3
  vs. beim Bericht) – die These aus 7.2 ist testbar.
- **Auswertung von Stufe 1** des Stufenplans: Wie hoch ist die
  Spendenquote, und welchen Betrag wählen Nutzer freiwillig? Das ist die
  günstigste denkbare WTP-Messung.

---

## 20. Zusammenfassung in zehn Sätzen

1. Die E-App ist ein technisch ungewöhnlich ausgereiftes System
   (≈ 45.700 Zeilen, 293 Dateien, 72 Testdateien, 9 Messungen,
   8 Energieträger, 5 PDF-Kapitel, 75 Karteikarten mit
   Spaced-Repetition-Engine).
2. Ihre Grenzkosten je Nutzer sind nahezu null – mit der einzigen
   Ausnahme des Gemini-gestützten Zählerscans.
3. Eine Tarif-Infrastruktur ist in `entitlements.ts` bereits angelegt,
   aber rein clientseitig und nur mengen-, nicht funktionsbezogen.
4. Vier von fünf Hauptbereichen sind bereits hinter einer
   Registrierungshürde – die Wertschwelle ist etabliert.
5. Der Haushaltsnutzen ist **episodisch**, der Studiennutzen
   **wiederkehrend** – das ist die zentrale Unterscheidung für jede
   Preisentscheidung.
6. Daraus folgt: **Einmalzahlung für Haushalte, Abo für Studierende** –
   nicht umgekehrt.
7. Empfohlen wird ein Hybridmodell: Free großzügig, **Plus 14,99 €
   einmalig** (Bericht, Sync, mehrere Wohnungen), **Pro 19,90 €/Jahr**
   (intensives Monitoring), **Studium 19,90 €/Semester**.
8. Die Paywall gehört **hinter** den Aha-Moment: Der Nutzer sieht sein
   Gesamt-Sparpotenzial kostenlos und bezahlt für den Handlungsplan.
9. Der wirksamste Erlöshebel ist nicht der Preis, sondern die Zahl der
   Nutzer, die den Aha-Moment erreichen – jeder Aufwand gehört in die
   Strecke *vor* die Paywall.
10. Unterhalb von etwa 2.500 registrierten Nutzern ist Monetarisierung
    ökonomisch nicht sinnvoll; bis dahin ist ein freiwilliges
    Unterstützungsmodell der rationale Zwischenschritt – und zugleich die
    günstigste Messung der tatsächlichen Zahlungsbereitschaft.

---

## 21. Belegstellen im Quellcode

Für Zitate und Fußnoten in der Hausarbeit.

| Aussage | Datei |
|---|---|
| Tarif-Abstraktion, drei Pläne, Custom-Claims-Absicht | `src/features/billing/entitlements.ts` |
| Registrierungshürde vor vier Hauptbereichen | `src/components/LoginGate.tsx`, `src/app/App.tsx` |
| Öffentliche Pfade, § 5 DDG | `src/app/App.tsx`, Funktion `isPublicPath` |
| Katalog der 9 Messungen, Messgeräte-Pflichtangabe | `src/features/measurements/catalog.ts` |
| Riegel gegen unbelegte Euro-Beträge, CO₂-Faktor | `src/features/measurements/impact.ts` |
| Anzeigeschwelle und Messungs-Herkunft von Beträgen | `src/features/measurements/savingsDisplay.ts` |
| Herkunftspflicht jedes Richtwerts (`ThresholdOrigin`) | `src/features/education/measurementThresholds.ts` |
| 8 Energieträger, Kostenrelevanz je Träger | `src/features/monitoring/energyConfig.ts` |
| Vorrats-Modell, virtueller Zählerstand | `src/features/monitoring/counterSeries.ts`, `fillLevel.ts` |
| Reichweiten-Prognose, saisonale Gewichtung | `src/features/monitoring/range.ts`, `seasonality.ts` |
| Zähler-Scan über Gemini, Rückfall auf On-Device-OCR | `src/features/monitoring/scanRemote.ts`, `ocr.ts` |
| Serverseitiger Gemini-Aufruf, Secret-Handhabung | `functions/index.js` |
| Fünf PDF-Kapitel des Berichts | `src/features/reports/generate*.ts` |
| Handlungsplan nach Aufwand und Zielen | `src/features/reports/actionPlanData.ts` |
| Quellenverzeichnis im Bericht | `src/features/reports/generateSourcesPdf.ts`, `thresholdReference.ts` |
| 13 regelbasierte Tipps | `src/features/tips/buildTips.ts` |
| FAQ 30 / Glossar 58 / Hintergründe 9 / 3 Laborversuche | `src/features/education/educationContent.ts` |
| Spaced-Repetition-Engine (FSRS, SM2, Leitner) | `src/features/education/flashcards/engine/` |
| 75 Karteikarten, 10 Sets, 4 Fächer, Semester 1–6 | `src/features/education/flashcards/flashcardsContent.ts` |
| PDF-Zertifikat für Laborversuche | `src/features/education/generateCertificate.ts` |
| Wohnprofile, Rollen, widerrufbare Einladungslinks | `src/features/profiles/profiles.ts` |
| Serverseitige Zugriffsregeln (151 Zeilen, Emulator-Tests) | `firestore.rules`, `package.json` (`test:rules`) |
| Einwilligung vor Analytics, Kategorien, `CONSENT_VERSION` | `src/features/legal/consent.ts`, `docs/legal.md` |
| Betreiberangaben, sichtbare Markierung fehlender Pflichtfelder | `src/features/legal/operator.ts` |
| „Kostenlos"-Vertrauensmerkmal, Produktversprechen | `src/i18n/locales/de.json`, Schlüssel `landing.trust.free` |
| Zielgruppendefinition, WCAG-Kontrasthinweis | `docs/ux-roadmap.md` |
| Betriebskosten „real ~0", Blaze wegen Gemini | `CLAUDE.md`, `docs/deployment.md` |
| Feld-Abnehmer-Pflicht im Fragebogen | `src/features/onboarding/fieldUsage.ts` |
| Fünf Ziele und ihre Wirkung auf die Navigation | `src/features/onboarding/goals.ts` |
