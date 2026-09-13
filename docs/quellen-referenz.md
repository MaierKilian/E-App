# Quellen für die schriftliche Ausarbeitung – Analyse und Übergabe

**Zweck dieses Dokuments.** Die Hausarbeit zur E-App ist inhaltlich weitgehend
fertig, trägt aber noch wenige Quellen. Dieses Dokument ist die **Vorarbeit für
das Einpflegen von Quellen**: Es geht das Repository Bereich für Bereich durch,
benennt jede Stelle, an der die Arbeit eine Aussage trifft, die einen Beleg
*verlangt* oder *verdient*, und nennt dazu eine oder mehrere konkrete
Quellenkandidaten samt Fundstelle im Code.

Es ist **keine Literaturliste zum Abtippen**, sondern eine Landkarte:
Behauptung → Fundstelle im Code → Quellentyp → Kandidat → Prüfstand. Die
nächste Bearbeitung kann daraus gezielt auswählen.

**Leitlinie, die dieses Dokument ernst nimmt:** Nicht viele Quellen, sondern
tragfähige. Eine erfundene oder nur ungefähr passende Fundstelle ist schlimmer
als eine offen benannte Lücke – das ist im Projekt schon als Konvention
festgeschrieben (`ThresholdOrigin` in `measurementThresholds.ts`, siehe
Abschnitt 1.1) und gilt für die Arbeit genauso.

**Stand:** 13.09.2026, Branch `claude/magical-cannon-l3phes` (deckungsgleich mit
`origin/main`, Commit `29a3a2d`). Alle Code-Angaben sind aus dem Quellcode
belegt; die maßgebliche Datei steht jeweils dabei.

> ⚠️ **Der wichtigste Vorbehalt, gleich vorweg.** In dieser Arbeitsumgebung
> funktioniert **Websuche**, aber **kein Abruf einzelner Seiten**: `WebFetch`
> und `curl` auf `umweltbundesamt.de`, `eur-lex.europa.eu` und andere laufen in
> ein `EGRESS_BLOCKED` bzw. 403 des Egress-Proxys. Jede Quelle in Abschnitt 3,
> die nicht ausdrücklich als „geprüft" markiert ist, ist damit ein **Kandidat
> aus einer Suchzusammenfassung** – gefunden, aber nicht gegengelesen. Das
> Projekt hat diese Lehre schon einmal teuer bezahlt (Etappe 6, siehe
> Abschnitt 1.2): **Eine Suchzusammenfassung ist kein Beleg.** Abschnitt 6 ist
> die daraus folgende Prüfliste.

---

## 0. Kurzfassung: die zehn Einbaustellen mit dem größten Ertrag

Wenn nur zehn Quellen dazukommen, dann diese – sie tragen jeweils einen
*ganzen Abschnitt* der Arbeit, nicht bloß eine Randzahl.

| # | Wo in der Arbeit | Was belegt wird | Quelle (Kandidat) | Status |
|---|---|---|---|---|
| 1 | Einleitung / Motivation | Rund 70 % der Haushaltsenergie gehen in Raumwärme – begründet, warum die App beim Heizen ansetzt | Destatis, Umweltökonomische Gesamtrechnungen „Energieverbrauch privater Haushalte für Wohnen" | Kandidat |
| 2 | Einleitung / Wirkungsannahme | Rückmeldung über den eigenen Verbrauch senkt ihn um 5–15 % – die zentrale Wirkungsannahme der ganzen App | Darby 2006 (DEFRA/Oxford); Fischer 2008, *Energy Efficiency* 1, 79–104 | Kandidat, Literatur |
| 3 | Kapitel Raumklima-Check | 6 % Heizenergie je °C – die Zahl, aus der **jede** Heiz-Ersparnis der App folgt | Verbraucherzentrale RLP, „Raumtemperaturen und Heizzeiten" | **geprüft** (Kilian, 03.09.2026) |
| 4 | Kapitel Raumklima-Check | Luftfeuchte 40–60 %, Stoßlüften statt Kippen, Schimmel an kalten Oberflächen | UBA, „Wie lüfte ich richtig?"; UBA-Schimmelleitfaden (2024) | **geprüft** / Leitfaden Kandidat |
| 5 | Kapitel Monitoring | Jahresgang der Heizenergie ≈ Faktor 8 – trägt die Jahres-Hochrechnung und die Tank-Reichweite | BDEW, Standardlastprofile Gas („SigLinDe"), Leitfaden Abwicklung SLP Gas | Kandidat |
| 6 | Kapitel Monitoring | Umrechnung m³ → kWh (Brennwert × Zustandszahl) | DVGW-Arbeitsblatt G 685 (Abrechnung), G 260 (Gasbeschaffenheit) | Kandidat |
| 7 | Kapitel Monitoring / Kennwerte | kWh/m²·a als der Kennwert, in dem Gebäude verglichen werden | GEG §§ 79 ff. (Energieausweis); co2online „Heizspiegel für Deutschland" | Kandidat |
| 8 | Kapitel Lernbereich | Verteiltes Üben und Abruf-Übung wirken – die Begründung des Karteikarten-Trainers | Cepeda et al. 2006, *Psychological Bulletin* 132, 354–380; Roediger & Karpicke 2006, *Psychological Science* 17, 249–255 | Kandidat, Literatur |
| 9 | Kapitel Recht | Einwilligung vor Analytics, Impressumspflicht, Auskunftspflichten | § 25 TDDDG; Art. 6 Abs. 1 lit. a, Art. 7, Art. 13 DSGVO; § 5 DDG; § 18 Abs. 2 MStV | Gesetzestext, zitierfest |
| 10 | Kapitel Standby-Check | 0,5-W-Grenze gilt für **Neugeräte**, nicht als Messschwelle – die Begründung, warum die App hier *keinen* Beleg behauptet | VO (EU) 2023/826 (hebt 1275/2008 auf) | Kandidat |

Die Zeilen 3 und 4 sind die einzigen, die Kilian selbst im Browser gesehen hat.
Alles andere gehört durch Abschnitt 6.

---

## 1. Regeln, die diese Arbeit bei Quellen einhalten sollte

### 1.1 Drei Sorten Aussagen – und nur eine davon ist belegpflichtig

Das Projekt hat dafür schon eine Typ-Definition, und sie taugt als Gliederung
für die Arbeit. `ThresholdOrigin` (`src/features/education/measurementThresholds.ts`)
kennt genau drei Zustände:

```ts
export type ThresholdOrigin =
  | { kind: 'reference'; source: Source }   // belegt, mit Stand-Datum
  | { kind: 'own'; reason: string }          // Richtwert der E-App, hergeleitet
  | { kind: 'pending'; reason: string }      // noch zu klären
```

Der Kommentar darüber formuliert die Haltung, die die Arbeit übernehmen sollte:

> „Eine Bewertung ohne Vergleichsmaßstab ist wertlos – aber eine erfundene
> Quelle ist schlimmer als gar keine. … Der Unterschied zwischen `own` und
> `pending` ist der zwischen ‚wir haben entschieden' und ‚wir sind noch nicht
> fertig'. Ihn einzuebnen wäre bequem und falsch."

Übertragen auf die Hausarbeit:

| Sorte | Beispiel aus der App | Was in der Arbeit hingehört |
|---|---|---|
| **Fremdaussage** – gilt unabhängig von dieser Arbeit | „7 °C im Kühlschrank", „40–60 % Luftfeuchte", „6 % je °C" | **Quelle.** Ohne sie ist die Zahl Behauptung. |
| **Eigene Herleitung** – folgt aus Physik oder Mathematik | Duschkopf-Ersparnis `(Durchfluss − 8) / Durchfluss`; Taupunkt aus der Magnus-Formel; mengengewichteter Preis | **Rechenweg statt Quelle.** Für das *Verfahren* (Magnus-Koeffizienten) trotzdem eine Quelle, für die Anwendung nicht. |
| **Eigene Setzung** – Produktentscheidung | LED-Raumgewichte (Küche 3, Nebenraum 1); Kellerwand 12 °C; Grundlast-Schwellen | **Begründung statt Quelle**, und als Setzung gekennzeichnet. Abschnitt 5 listet sie vollständig. |

**Konsequenz für die Arbeit:** Eine Arbeit, die für jede Zahl eine Quelle
behauptet, ist nicht besser belegt, sondern unehrlicher. Der belastbare Weg ist,
die dritte Spalte ausdrücklich zu benutzen – „Richtwert der E-App, begründet
mit …". Das ist prüfbar und damit wissenschaftlich sauberer als eine
Fundstelle, die die Zahl nicht hergibt.

### 1.2 Die Lehre aus Etappe 6: eine Suchzusammenfassung ist kein Beleg

`docs/verbesserungen-etappen.md`, Etappe 6 („Richtwerte mit Primärquellen")
hält einen konkreten Vorfall fest, der in die Methodik-Darstellung der Arbeit
gehört – er ist ein gutes, selbstkritisches Beispiel für Quellenkritik:

> „Eine zunächst vielversprechende Verbraucherzentrale-Seite mit einer
> vollständigen Raumtabelle enthielt diese Tabelle **nicht** – sie stammte aus
> einer Suchzusammenfassung, nicht von der Seite. Lehre daraus: In dieser
> Umgebung lässt sich suchen, aber nicht abrufen; **eine Suchzusammenfassung
> ist kein Beleg.**"

Daraus wurde eine Arbeitsregel: Kandidaten werden erst nach Kilians Sichtung
eingetragen, und die Etappe galt erst als fertig, als er die Linkliste am PC
durchgeklickt hatte. **Dieses Dokument folgt derselben Regel** – deshalb
Abschnitt 6.

### 1.3 Jede alternde Zahl braucht ein Stand-Datum

Der `Source`-Typ (`educationContent.ts:15`) hat dafür ein eigenes Feld, und der
Kommentar begründet es:

> „`stand` nennt den Stand der Angabe (`MM/YYYY`). Nötig überall dort, wo eine
> Zahl altert – Preise, Förderquoten, Abgaben. Ohne Stand liest sich ein Betrag
> wie eine zeitlose Wahrheit, und genau das ist er nicht."

Für die Arbeit heißt das: Jede Preis-, Förder-, Emissions- und Marktzahl bekommt
ein Abrufdatum. Abschnitt 4 zeigt, warum – drei Werte in der App sind inzwischen
veraltet.

### 1.4 Wo im Projekt schon maschinenlesbare Quellen liegen

Drei Stellen, aus denen sich das Literaturverzeichnis der Arbeit zum Teil
**direkt ableiten** lässt, statt es neu zu recherchieren:

| Datei | Was dort steht | Ertrag für die Arbeit |
|---|---|---|
| `src/features/education/measurementThresholds.ts` | Neun Richtwert-Tabellen, jede mit `origin` (`reference` / `own` / `pending`) | Die fünf belegten Quellen der Mess-Richtwerte, mit URL und Stand |
| `src/features/reports/thresholdReference.ts` + `generateSourcesPdf.ts` | Baut aus denselben Daten ein **Quellenverzeichnis im PDF-Bericht** der App, gleiche Quellen zusammengefasst | Ein Screenshot davon belegt im Kapitel „Bericht", dass die App ihre Maßstäbe offenlegt |
| `src/features/education/educationContent.ts` | 58 Glossar-Begriffe, 66 `wiki()`-Quellenangaben über 61 verschiedene Artikel | Die Begriffsliste, für die Primärquellen zu suchen wären (Abschnitt 3.10) |

Bemerkenswert und für die Arbeit erwähnenswert: Die Richtwert-Tabellen
enthalten **keine einzige Zahl als Literal** – jede Grenze wird aus dem
Mess-Modul importiert, das mit ihr rechnet. Ein Test hält fest, dass Bericht,
Tabelle und Mess-Modul dieselbe Zahl zeigen. Das ist ein Qualitätsmerkmal, das
sich belegen lässt, ohne eine externe Quelle zu brauchen (Abschnitt 3.13).

---

## 2. Bestandsaufnahme: was schon belegt ist

### 2.1 Die fünf Quellen, die im Code stehen

Aus `measurementThresholds.ts`, alle von Kilian am 03.09.2026 im Browser
geprüft (`docs/verbesserungen-etappen.md`, Etappe 6):

| Richtwert | Code-Fundstelle | Quelle |
|---|---|---|
| Duschkopf ≤ 9 / 9–12 / > 12 l/min | `showerhead/showerhead.ts:49-50` | Verbraucherzentrale, „Warmwasser im Alltag sparen – so geht's" |
| Raumtemperatur je Raumtyp | `room_temperature/roomClimate.ts:46-61` | UBA, „Richtiges Heizen" · Verbraucherzentrale Energieberatung (Bad) |
| Möbelabstand ab 30 cm | `furniture_spacing/furnitureSpacing.ts:208` | Verbraucherzentrale, „Heizung: 10 einfache Tipps" |
| Kühlschrank 5–7 °C | `fridge/fridge.ts:25-26` | UBA, „Kühlschrank: mit kleinen Tipps unnötigen Stromverbrauch vermeiden" |
| Gefriergerät −18 °C | `freezer/freezer.ts:128` | dieselbe UBA-Seite |

Dazu zwei Quellen, die **nicht** in der Tabelle stehen, aber ebenso geprüft sind:

- **6 % Heizenergie je °C** (`roomClimate.ts:225`, `PERCENT_PER_DEGREE`) –
  Verbraucherzentrale Rheinland-Pfalz, „Raumtemperaturen und Heizzeiten". Der
  Code-Kommentar nennt sie ausdrücklich „die Zahl, die jede Heiz-Ersparnis
  dieser App trägt", und hält fest, dass dort bis September 2026 ein
  **ungeprüfter** Verweis („Hochschule Biberach 2011") stand. Für ein
  Methodik-Kapitel ist das ein brauchbares Beispiel gelebter Quellenkritik.
- **Luftfeuchte 40–60 %, Schimmel an kalten Oberflächen** – UBA, „Wie lüfte ich
  richtig? – Tipps und Tricks zur Schimmelvermeidung".

### 2.2 Die Wikipedia-Frage – und warum sie keine Katastrophe ist

Der Wissensbereich verweist für 58 Glossar-Begriffe auf die deutschsprachige
Wikipedia (`educationContent.ts:329-333`, Helfer `wiki()`). Der Kommentar
darüber ist bereits eine Selbstauskunft:

> „Quellen verweisen auf die deutschsprachige Wikipedia (stabile, anklickbare
> Artikel-Links) als allgemein zugängliche Referenz. Bei fachlicher Prüfung
> können sie durch Primärquellen (z. B. VDI, Umweltbundesamt) ersetzt werden."

Für die Arbeit gibt es hier **zwei** saubere Wege, und beide sind besser, als
die Sache zu verschweigen:

1. **Als Entwurfsentscheidung darstellen.** Der Wissensbereich ist ein
   Nachschlagewerk *für Laien im Produkt*, nicht der Quellenapparat einer
   wissenschaftlichen Arbeit. Ein anklickbarer, stabiler, allgemein
   zugänglicher Link erfüllt dort einen anderen Zweck als eine
   DIN-Normnummer, die hinter einer Bezahlschranke liegt. Das ist
   argumentierbar – wenn es ausgesprochen wird.
2. **Im Text der Arbeit selbst Primärquellen setzen**, auch wenn die App
   weiter auf Wikipedia zeigt. Die Arbeit und das Produkt müssen nicht
   dieselbe Quellenebene haben. Abschnitt 3.10 nennt für die tragenden
   Begriffe die Primärquellen.

Was die Arbeit **nicht** tun sollte: Wikipedia als Quelle im
Literaturverzeichnis der Hausarbeit führen, wo eine Norm oder eine
Behördenseite dieselbe Aussage trägt.

### 2.3 Was die FAQ betrifft: hier ist keine Quelle nötig

42 FAQ-Einträge, **null** Quellenangaben – und das ist richtig. Seit dem
Wissen-Ausbau (31.08.2026) beantwortet die FAQ ausschließlich Fragen **zur
App** („Wo liegen meine Daten?", „Wie beende ich das Teilen?"); Fachfragen sind
an die Messung gewandert, die sie misst (`MeasurementSections.questions`). Eine
Aussage über das eigene Produkt belegt man aus dem Produkt, nicht aus der
Literatur. Die Arbeit sollte das so benennen, damit die Lücke nicht wie eine
Schwäche aussieht.

---

## 3. Die Quellenlandkarte

Aufbau je Eintrag: **Aussage** → *Fundstelle im Code* → Quellentyp → Kandidat.
„**geprüft**" heißt: von Kilian im Browser gesehen. Alles andere ist Kandidat.

### 3.1 Einleitung, Problemstellung, Motivation

Hier fehlen der Arbeit die Quellen am schmerzhaftesten, weil die Einleitung
fast nur aus belegpflichtigen Aussagen besteht.

| Aussage, die die Arbeit vermutlich trifft | Quellentyp | Kandidat |
|---|---|---|
| Der größte Teil der Haushaltsenergie geht in Raumwärme (≈ 70 %) | amtliche Statistik | Destatis, Umweltökonomische Gesamtrechnungen, „Energieverbrauch privater Haushalte für Wohnen" (Tabellen nach Anwendungsbereichen Raumwärme / Warmwasser / Kochen / Beleuchtung); UBA, „Energieverbrauch privater Haushalte" |
| Typischer Stromverbrauch eines Haushalts je Personenzahl | Vergleichsdatensatz | co2online / Stromspiegel, „Stromspiegel für Deutschland" – Vergleichswerte aus real erhobenen Haushaltsdaten (Ausgabe 2025: rund 57.000 Datensätze) |
| Typische Heizkosten und typischer Heizenergieverbrauch je m² | Vergleichsdatensatz | co2online, „Heizspiegel für Deutschland" – Abrechnungsjahr 2024, rund 90.000 Datensätze zentral beheizter Wohngebäude |
| Haushaltsstrompreis-Niveau | Branchenstatistik | BDEW-Strompreisanalyse (erscheint mehrmals jährlich, Musterhaushalt 3.500 kWh/a) |
| Trinkwassergebrauch je Person und Tag | Branchenstatistik | BDEW, „Trinkwassergebrauch und -abgabe"; UBA, „Wassernutzung privater Haushalte" |
| Emissionsfaktor des deutschen Strommix | amtliche Statistik | UBA, „Entwicklung der spezifischen Treibhausgas-Emissionen des deutschen Strommix" (Jahresreihe; dazu CLIMATE CHANGE 13/2025) |

**Warum gerade diese sechs:** Sie sind genau die Bezugsgrößen, mit denen die
App rechnet. `specificValues.ts` bezieht jeden Wärmeträger auf kWh/m²·a und
Wasser auf Liter je Person und Tag, und der Kommentar dort begründet es: „‚1400
m³ Gas' sagt niemandem etwas, ‚138 kWh/m²·a' ordnet sich sofort in die
Baujahrs-Richtwerte ein." Die Arbeit kann die Bezugsgrößenwahl also nicht
begründen, ohne diese Statistiken zu zitieren.

**Nebenbefund, der in die Arbeit gehört:** `estimateEnergy.ts` schätzt den
Jahresstromverbrauch als `900 + 1100 × Personen + 6 × m²` kWh. Das ist eine
**Heuristik ohne Quelle**, und die Datei sagt das auch selbst („liefern bewusst
nur GROBE SCHÄTZWERTE"). Der Stromspiegel wäre hier die naheliegende
Gegenprobe: Ob die Formel für einen 2-Personen-Haushalt in der richtigen
Größenordnung landet, ist mit seinen Vergleichswerten **prüfbar** – und eine
solche Plausibilitätsprüfung ist in einer Hausarbeit mehr wert als eine Quelle
für die Formel selbst (die es nicht gibt, weil die Formel eine Setzung ist).

### 3.2 Stand der Technik: wirkt Rückmeldung überhaupt?

Das ist die **Existenzberechtigung der App** und damit der Abschnitt, in dem
echte Fachliteratur den größten Unterschied macht. Die App liefert
Rückmeldung über Verbrauch (Monitoring), über Zustand (Messungen) und über
Handlungsmöglichkeiten (Tipps) – alle drei Wirkwege sind erforscht.

| Aussage | Quellentyp | Kandidat |
|---|---|---|
| Direkte Rückmeldung über den Energieverbrauch senkt ihn, Größenordnung 5–15 %; indirekte (über die Rechnung) weniger | Review | **Darby, S. (2006):** *The Effectiveness of Feedback on Energy Consumption. A Review for DEFRA of the Literature on Metering, Billing and Direct Displays.* Environmental Change Institute, University of Oxford. – Auswertung von 38 Initiativen; die Unterscheidung direkt/indirekt stammt von hier |
| *Wie* Rückmeldung wirkt, und welche Eigenschaften sie wirksam machen (Häufigkeit, Dauer, geräteweise Aufschlüsselung, Darstellung, Vergleiche) | peer-reviewed Review | **Fischer, C. (2008):** *Feedback on household electricity consumption: a tool for saving energy?* Energy Efficiency 1, S. 79–104. – Nennt als Merkmale wirksamer Rückmeldung u. a. **geräteweise Aufschlüsselung** und **interaktive, computergestützte Werkzeuge** |
| Die Wirkung von Rückmeldung über Energiesparen insgesamt (Metaanalyse) | Metaanalyse | Karlin, Zinger & Ford (2015): *The effects of feedback on energy conservation: A meta-analysis.* Psychological Bulletin (APA) |
| Gesetzlicher Rahmen, der Verbrauchstransparenz erzwingt – und damit den Bedarf an Werkzeugen wie der App erklärt | Gesetz | Messstellenbetriebsgesetz (MsbG); Bundesnetzagentur, „Roll-out intelligenter Messsysteme" |

**Warum das der stärkste Hebel der ganzen Liste ist:** Fischer (2008) nennt
geräteweise Aufschlüsselung und interaktive Werkzeuge als Wirksamkeitsmerkmale
– und genau das **tut** die App: Der Grundlast-Check diagnostiziert den Sockel,
der Standby-Check schlüsselt ihn Gerät für Gerät auf. Diese Arbeitsteilung ist
im Code ausdrücklich begründet (`baseLoad.ts`: „Grundlast ist Diagnose, die €
beziffern die Folge-Checks (kein Doppelzählen)"). Eine Arbeit, die Fischer
zitiert und dann diese Architektur zeigt, hat damit keinen Beleg *angehängt*,
sondern eine Entwurfsentscheidung **hergeleitet**. Das ist der Unterschied
zwischen Fußnote und Argument.

Zwei Einschränkungen, die mitgenannt werden sollten, weil sie die Arbeit
glaubwürdiger machen statt schwächer:

- Die 5–15 % aus Darby (2006) sind eine Spannweite aus Feldstudien mit echten
  Anzeigegeräten, nicht aus einer Web-App mit manuell eingetragenen
  Zählerständen. Die Übertragbarkeit ist eine Annahme, keine Ableitung.
- Die Wirkungsforschung ist nicht einhellig; es gibt auch Arbeiten zur
  Abschwächung über die Zeit und zur Frage, ob Rückmeldung allein reicht
  (Suchbegriff: „the problem(s) with feedback", Hargreaves u. a.). Eine Arbeit,
  die das erwähnt, wirkt nicht schwächer, sondern gelesen.

### 3.3 Technische Grundlagen und Architektur

Hier gilt eine andere Quellenlogik: Für Bibliotheken und Sprachen ist die
**offizielle Dokumentation** die Primärquelle, und die Versionsnummer aus
`package.json` ist der präzisere Beleg als jeder Sekundärtext.

| Technik | Version (`package.json`) | Quelle |
|---|---|---|
| React | `^19.2.6` | react.dev – offizielle Dokumentation |
| TypeScript | `~6.0.2` | typescriptlang.org – Handbook |
| Tailwind CSS | `^4.3.0` (mit `@tailwindcss/vite`) | tailwindcss.com |
| Vite | `^8.0.12` | vite.dev |
| Zustand (Zustandsverwaltung, `persist`-Middleware) | `^5.0.14` | Dokumentation des Projekts |
| React Router | `^7.17.0` | reactrouter.com |
| i18next / react-i18next | `^26.3.1` / `^17.0.8` | i18next.com |
| jsPDF (Berichtserzeugung im Browser) | `^4.2.1` | Projektdokumentation |
| Tesseract.js (OCR im Browser, WASM) | `^6.0.1` | Projektdokumentation; dazu die Tesseract-OCR-Engine |
| Vitest (73 Unit-Test-Dateien) | `^4.1.9` | vitest.dev |
| Firebase (Auth, Firestore, Functions, Hosting) | `^12.15.0` | Google-Dokumentation |
| Google Gemini (`gemini-flash-latest`) für den Zähler-Scan | `functions/index.js` | Google-AI-Dokumentation |

**Wo es über Versionsnummern hinaus interessant wird** – hier lohnt eine
Quelle, weil eine *Entscheidung* begründet werden muss:

| Entscheidung | Fundstelle | Quellentyp |
|---|---|---|
| Daten liegen clientseitig (`localStorage`), Cloud nur optional | `src/store/*`, `features/sync/cloudSync.ts` | Web-Storage-Spezifikation (WHATWG/MDN); datenschutzrechtlich Datenminimierung, Art. 5 Abs. 1 lit. c DSGVO |
| OCR **auf dem Gerät** (Tesseract), Gemini-Scan nur serverseitig mit Anmeldung | `monitoring/ocr.ts` („Das Kamerabild verlässt das Gerät nicht"), `functions/index.js` („Der Gemini-API-Key darf NICHT in die öffentliche Web-App") | Sicherheitsprinzip: Geheimnisse nie im Client. OWASP; Firebase-Dokumentation zu Secrets |
| Firestore-Sicherheitsregeln als Zugriffskontrolle, nicht Client-Logik | `firestore.rules` (151 Zeilen, vier Bereiche, eigener Regeltest über den Emulator: `npm run test:rules`) | Firebase-Security-Rules-Dokumentation |
| Zugänglichkeit: 229 `aria-`Attribute, `prefers-reduced-motion` an sechs Stellen respektiert, `prefers-color-scheme` für beide Themes | `src/index.css:521,753`; `SplashScreen.tsx:55`; `IntroHeroVideo.tsx:67` u. a. | **WCAG 2.2** (W3C-Empfehlung); WAI-ARIA Authoring Practices; CSS Media Queries Level 5 für `prefers-reduced-motion` |
| Zwei Hosting-Ziele mit SPA-Rewrite auf `index.html` | `firebase.json`, `.github/workflows/*` | Firebase-Hosting- / GitHub-Pages-Dokumentation |

**Der Abschnitt „Zugänglichkeit" ist unterschätzt.** 229 `aria-`Attribute und
ein durchgehend respektiertes `prefers-reduced-motion` sind eine belegbare
Qualitätsleistung, die in der Arbeit bisher vermutlich gar nicht vorkommt –
und WCAG 2.2 ist eine zitierfeste W3C-Empfehlung, keine Meinung. Wer hier
einen Absatz schreibt, gewinnt eine Quelle **und** ein Kapitel.

### 3.4 Methodik: KI-gestützte Entwicklung

`docs/ki-einsatz-referenz.md` liefert die Faktenlage aus dem Repository
vollständig. Was dort fehlt, ist die **Einordnung in den Forschungsstand** –
und genau die macht aus einem Erfahrungsbericht ein Methodik-Kapitel.

| Aussage | Quellentyp | Kandidat |
|---|---|---|
| Agentische Coding-Assistenten sind etwas anderes als Autovervollständigung im Editor | Primärdokumentation | Anthropic, Dokumentation zu Claude Code |
| Messbare Wirkung von KI-Assistenten auf Entwicklungsarbeit – **und die Widersprüche darin** | Feldstudien / RCTs | Peng u. a. (2023), *The Impact of AI on Developer Productivity: Evidence from GitHub Copilot* (arXiv 2302.06590); Cui u. a., drei RCTs bei Microsoft/Accenture u. a.; Becker u. a. (2025), RCT, in dem erfahrene Open-Source-Entwickler mit KI-Werkzeugen **länger** brauchten, obwohl sie eine Beschleunigung erwarteten |
| Regelwerk als Projektartefakt statt informeller Absprache | Eigenbeleg | `CLAUDE.md`, versioniert im Repository |

**Warum der Widerspruch die Quelle wertvoll macht:** Die Befundlage ist
uneinheitlich – Unternehmensstudien zeigen Beschleunigung, ein RCT von 2025
zeigt bei erfahrenen Entwicklern das Gegenteil, und zwar gegen die
Selbsteinschätzung der Teilnehmenden. Eine Arbeit, die **beides** zitiert und
dann die eigene Erfahrung dazu stellt, macht aus einem Werkstattbericht einen
Beitrag. Eine Arbeit, die nur die freundliche Zahl zitiert, macht Werbung.

Dazu passt ein Beleg, den das Repository selbst liefert: `CLAUDE.md` enthält
eine Regel, die ausdrücklich **gegen** den Assistenten gerichtet ist – „Claude
mergt nicht nach `main` und pusht nicht nach `main`", begründet damit, dass ein
Push auf `main` einen Auto-Deploy auslöst und die Änderung sofort live ist,
„ohne dass jemand sie gesehen hat". Das ist ein dokumentiertes
Kontrollverhältnis mit Datum (seit 25.08.2026) und Vorgeschichte (davor wurde
direkt auf `main` entwickelt). Für ein Kapitel über Verantwortung bei
KI-Einsatz ist das ein besserer Beleg als jede Literaturstelle.

### 3.5 Landing Page, Demo-Profil, Fragebogen

Faktenlage: `docs/landing-demo-referenz.md` und `docs/onboarding-referenz.md`.
Was fehlt, sind die Gestaltungsgrundsätze, nach denen entschieden wurde.

| Entwurfsentscheidung | Fundstelle | Quellentyp / Kandidat |
|---|---|---|
| Erst zeigen, dann fragen: Landing Page vor der Dateneingabe; vorher leitete `/` direkt auf `/onboarding` | `docs/landing-concept.md`; `App.tsx` (`LandingRoute`, `FirstVisitGate`) | Nielsen Norman Group, „10 Usability Heuristics for User Interface Design" (1994/laufend) – insbesondere „Recognition rather than recall" und „Aesthetic and minimalist design" |
| Demo-Profil: vollständige Beispiel-Wohnung ohne Konto, ein Klick | `features/demo/demoProfile.ts`, `DemoLoader.tsx` | NN/g zu Onboarding und „empty state"; dazu die Heuristik „Help and documentation" |
| Schnellstart vs. vollständiger Fragebogen; schrittweise Erhebung | `onboarding/sections.ts`, `goals.ts` | **Progressive Disclosure** (NN/g) – ausdrücklich als Mittel gegen Überforderung bei vielen Optionen |
| Jede Frage braucht einen Abnehmer; fünf Fragen wurden gestrichen, weil sie keinen hatten | `onboarding/fieldUsage.ts` + Test, der die Liste der Felder ohne Abnehmer exakt festhält | **Datenminimierung**, Art. 5 Abs. 1 lit. c DSGVO – hier trifft sich Gestaltungs- und Rechtsargument |
| Plausibilitätsprüfung der Eingaben (m² je Person 12–150, m² je Zimmer 6–80) | `onboarding/plausibility.ts:30-33` | **Setzung ohne Quelle.** Eine Gegenprobe gegen Destatis-Wohnflächenstatistik wäre möglich, ist aber nicht nötig: Die Grenzen sollen Tippfehler abfangen, nicht Wohnungen bewerten. So sollte es auch in der Arbeit stehen. |

**Der stärkste Punkt dieses Abschnitts ist der vierte.** Dass fünf
Fragebogen-Fragen (Gebäudeteil, Etagenzahl, Kamin/Ofen, Smart-Home,
Postleitzahl) **entfernt** wurden, weil ihre gesamte Wirkung eine Zeile im
PDF-Steckbrief war, und dass ein Test das Fehlen eines Abnehmers rot werden
lässt – das ist Datenminimierung als ausführbarer Code, nicht als
Absichtserklärung. Art. 5 Abs. 1 lit. c DSGVO ist dafür die zitierfeste
Grundlage, und der Zusammenhang zwischen Rechtsnorm und Testdatei ist der Art
Befund, den eine Hausarbeit sucht.

### 3.6 Die neun Checks – Richtwert für Richtwert

Das ist der quellenintensivste Teil der Arbeit, weil jeder Check eine Zahl
behauptet. Reihenfolge wie im Katalog (`measurements/catalog.ts`).

#### 3.6.1 Duschkopf-Test (`showerhead`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Schwellen Durchfluss | ≤ 9 / 9–12 / > 12 l/min | `showerhead.ts:49-50` | **belegt** (Verbraucherzentrale, Warmwasser sparen) |
| Sparduschkopf-Bezug | 8 l/min | `showerhead.ts:64` | Setzung der E-App |
| Hochrechnung aufs Jahr | 1 Dusche/Person/Tag, 5 min | `showerhead.ts:60-61` | Setzung der E-App |

**Der methodisch interessanteste Check der ganzen App** – und ein
Quellen-*Einsparer*, nicht -Verbraucher. Seit 05.09.2026 steht die Ersparnis als
**Prozentsatz**, und der folgt allein aus der Messung:

```
Ersparnis / Kosten = (Durchfluss − 8) / Durchfluss
```

Der Kommentar im Modul begründet es: Kosten und Wassermenge sind beide *linear*
im Durchfluss, also kürzen sich Personenzahl, Duschhäufigkeit, Duschdauer,
Temperaturhub und Arbeitspreis in Zähler und Nenner weg. Vorher lief der
Euro-Betrag über fünf Annahmen, darunter den Warmwasser-Erzeuger, den der Check
eigens abfragen musste, obwohl er am Ergebnis nichts änderte.

**Für die Arbeit:** Hier braucht es keine Quelle, sondern den Rechenweg – und
das ist das stärkere Argument. Eine Kennzahl, die nur von der Messung abhängt,
ist belastbarer als eine, die fünf Quellen braucht. Wer das herausarbeitet,
zeigt methodisches Verständnis. Als Gegenquelle für die *Größenordnung* der
Durchflüsse eignet sich DIN 1988-300 (Berechnungsdurchfluss Duschmischbatterie
0,30 l/s ≈ 18 l/min als Auslegungswert – deutlich über dem, was ein sparsamer
Kopf liefert; der Unterschied zwischen Auslegung und Verbrauch ist erklärbar
und lehrreich). Archiv der entfallenen Fassung: `archiv/duschkopf-warmwasserquelle/`.

#### 3.6.2 Warmwasser-Wartezeit (`hot_water_wait`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Schwellen Wartezeit | 15 / 30 / 60 s | `hotWaterWait.ts:111-113` | ⚠️ **`pending` – ohne Beleg** |
| Richtwerte Durchfluss je Entnahmestelle | Dusche 9, Wanne 12, Küche 6, Waschbecken 5 l/min | `hotWaterWait.ts:52-57` | Setzung; Dusche wird vom gemessenen Wert überschrieben |
| Zapfungen je Person und Tag | 0,75 / 0,15 / 2 / 2,5 | ebenda | Setzung, auf 2 Personen kalibriert |

Die Tabelle in `measurementThresholds.ts` sagt es selbst: „Ohne Beleg. Die
Stufen sind gewachsen, nicht hergeleitet – vor dem nächsten Release entweder
belegen oder überdenken."

**Kandidaten, die zu prüfen wären** (keiner geprüft): DIN 1988-200
(Trinkwasserinstallation – Ausführung) regelt Ausstoßzeiten und Leitungsinhalte
und ist der fachlich richtige Ort; ebenso DVGW W 551 zur
Trinkwassererwärmung. Ob dort eine **Sekundenzahl** als Komfortgrenze steht, ist
offen – Normen regeln hygienische Temperaturen und Rohrinhalte, nicht
Wartekomfort.

**Ehrliche Empfehlung für die Arbeit:** Diesen Check als das darstellen, was er
ist – die **gemessene Wassermenge je Zapfung** ist belastbar (Wartezeit gemessen
× Durchfluss, bei der Dusche sogar gemessener Durchfluss), die
**Komfort-Einstufung in vier Stufen** ist eine Setzung. Der Code macht diesen
Unterschied schon: Der Euro-Betrag wird unterhalb einer Schwelle gar nicht
ausgewiesen (`savingsDisplay`), und die Modulbeschreibung benennt ausdrücklich,
was gemessen ist und was nicht.

#### 3.6.3 Raumklima-Check (`room_temperature`)

Der am besten belegte Check – und der mit der größten Hebelwirkung, weil
`PERCENT_PER_DEGREE` hier liegt.

| Größe | Wert | Code | Status |
|---|---|---|---|
| Komfortbänder je Raumtyp | Wohnen 20–22, Schlafen 16–18, Küche 18–20, Bad 22–24 °C | `roomClimate.ts:47-61` | **belegt** (UBA Richtiges Heizen; VZ Energieberatung für Bad) |
| Komfortband Keller | 14–18 °C | ebenda | Setzung der E-App |
| Feuchte Wohnräume | 40–60 % | `roomClimate.ts:85` | **belegt** (UBA, Wie lüfte ich richtig?) |
| Feuchte Keller / Waschküche | 50–65 % | `roomClimate.ts:96-99` | Setzung der E-App |
| Heizenergie je °C | 6 % | `roomClimate.ts:225` | **belegt** (VZ Rheinland-Pfalz) |
| Taupunkt-Berechnung | Magnus, a = 17,62 / b = 243,12 | `dewPoint.ts:18-19` | **Verfahren mit Quelle im Code**: „Sonntag (1990); dieselbe Werte, die auch der DWD nutzt" |
| Angenommene Kellerwandtemperatur | 12 °C | `dewPoint.ts:49` | Setzung, begründet (Erdreich 8–12 °C, oberer Rand gewählt = vorsichtiger) |
| Warmwasseranteil an der Heizenergie | 15 % | `heatingCost.ts:8` | ohne Beleg, nicht als `pending` markiert |

**Zusätzliche Quellenkandidaten, die diesen Abschnitt aufwerten:**

- **Magnus-Formel:** Sonntag, D. (1990): *Important new values of the physical
  constants of 1986, vapour pressure formulations based on the ITS-90, and
  psychrometer formulae.* Zeitschrift für Meteorologie 70, S. 340–344. Dazu das
  Glossar des Deutschen Wetterdienstes zum Taupunkt. Das ist eine **echte
  Primärquelle für ein Rechenverfahren** – die sauberste Quelle, die das ganze
  Projekt zu bieten hat, und sie steht schon im Code.
- **DIN EN 16798-1** (Eingangsparameter für das Innenraumklima; ersetzt
  DIN EN 15251) definiert Innenraumklima-Kategorien und Temperaturbereiche
  (Spanne 19–26 °C). **Vorsicht:** Die Norm gilt vorrangig für
  Nichtwohngebäude; für Wohngebäude ist DIN 1946-6 einschlägig. Als
  *Einordnung* des Komfortbegriffs taugt sie, als Beleg für ein
  Schlafzimmerband nicht. Das sollte die Arbeit so sagen.
- **ASR A3.5** (Technische Regeln für Arbeitsstätten, Raumtemperatur) – für
  Arbeitsräume zitierfest, für Wohnräume nicht einschlägig. Nur erwähnen, wenn
  der Raumtyp „Büro/Arbeitszimmer" eigens behandelt wird.
- **Schimmel:** UBA-Leitfaden „Zur Vorbeugung, Erfassung und Sanierung von
  Schimmelbefall in Gebäuden" (Fassung 2024) – die ausführliche Fassung hinter
  der bereits geprüften Kurzseite. Für das Taupunkt-Argument („Schimmel entsteht
  nicht bei einer Prozentzahl, sondern wenn feuchte Luft auf eine kältere
  Oberfläche trifft") ist das die passende Quelle.
- **Warmwasseranteil 15 %:** Hier gibt es Vergleichswerte – der Heizspiegel
  weist die Anteile für Raumwärme und Warmwasser getrennt aus, ebenso die
  Destatis-Anwendungsbereiche. Einer von beiden sollte die 15 % stützen oder
  korrigieren. **Das ist eine konkrete, lohnende Rechercheaufgabe**, denn die
  Zahl geht in jede Heizkosten-Hochrechnung der App ein und ist derzeit weder
  belegt noch als Setzung markiert.

#### 3.6.4 Möbel-Abstands-Check (`furniture_spacing`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Zielabstand | ab 30 cm | `furnitureSpacing.ts:208` | **belegt** (VZ, 10 Tipps) – vorher 10 cm ohne Beleg |
| Blockiert ab | ≤ 5 cm | `furnitureSpacing.ts:216` | Setzung; im Code als „physikalische Aussage über den freien Querschnitt" begründet |
| Verdeckte Bodenfläche (Fußbodenheizung) | 15 % / 30 % | `furnitureSpacing.ts:260-262` | ⚠️ **ohne Beleg** |

Für die verdeckte Fläche nennt Etappe 6 als Suchrichtung **VDI 6030**
(Auslegung von Raumheizkörpern) sowie Herstellerangaben. Ob dort ein
Flächenanteil steht, ist offen.

**Sauberer Weg für die Arbeit:** Das Argument für die Fußbodenheizung ist nicht
empirisch, sondern auslegungslogisch und steht schon im Code: „Die Anlage ist
auf die ganze Fläche ausgelegt, jede ausgefallene Teilfläche muss der Rest mit
höherer Vorlauftemperatur ausgleichen." Das ist ableitbar; die **konkreten
Prozentgrenzen** sind die Setzung. Trennung benennen, nicht verwischen.

**Offene Produktfrage, die in die Arbeit gehört** (nicht als Mangel, sondern als
dokumentierte Abwägung): Die Blockier-Schwelle auf die belegten 30 cm zu heben
würde die mittlere Stufe „eng" (5–30 cm) verschlucken – aus drei
Bewertungsstufen würden zwei. Das ist eine Produktentscheidung, keine
Quellenfrage (Etappe 6, Rückfrage vom 03.09.2026).

#### 3.6.5 LED-Check (`lighting`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Raumgewichte | Küche/Wohnzimmer 3, Nebenräume 1 | `lighting/lighting.ts:31-32` | `own` – Setzung, im Code begründet |
| Bewertungsstufen | Gewicht 0 / ≤ 2 / ≤ 5 / > 5 | `measurementThresholds.ts` | `own` |

Der einzige Check **ohne Messgröße**: Er bewertet einen Bestand („welche Räume
haben noch alte Beleuchtung"), nicht einen Messwert. Die Tabelle sagt das
ausdrücklich und begründet auch die Grobheit: „eine feinere Skala täuschte eine
Genauigkeit vor, die die Frage ‚ist da noch alte Beleuchtung?' nicht hergibt."

**Quellenkandidaten, falls die Arbeit die LED-Empfehlung selbst belegen will:**
EU-Energielabel-Verordnung (EU) 2019/2015 für Lichtquellen; die Ökodesign-
Verordnung (EU) 2019/2020 für Lichtquellen (sie hat Halogenlampen faktisch vom
Markt genommen). Beide sind Rechtstexte und damit zitierfest. **Nicht** belegen
sollte die Arbeit die „rund 3 €" für eine Ersatz-LED aus dem Tipptext – das ist
ein Marktpreis ohne Stand und altert.

#### 3.6.6 und 3.6.7 Kühlschrank (`fridge`) und Gefriergerät (`freezer`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Kühlschrank optimal | 5–7 °C | `fridge.ts:25-26` | **belegt** (UBA Kühlschrank) |
| Kühlschrank Randwerte | < 3 °C zu kalt, > 8 °C zu warm | `fridge.ts:27-28` | Setzung – belegt ist nur der Zielwert |
| Mehrverbrauch je °C kälter | 6 % | `fridge.ts:30` | dieselbe Herkunft wie `PERCENT_PER_DEGREE` |
| Gefriergerät optimal | −18 °C | `freezer.ts:128` | **belegt** (UBA) |
| Gefrier-Toleranz | −16 / −20 °C | `freezer.ts:129-130` | Setzung |

**Weitere Kandidaten:** Bundeszentrum für Ernährung (BZfE), „Lebensmittel
richtig lagern" – von Kilian 2026 als erreichbar bestätigt und inhaltlich
passend, in Etappe 6 aber der UBA-Seite nachgeordnet. Für den
Lebensmittelsicherheits-Teil (warum > 8 °C nicht nur teuer, sondern riskant
ist) ist das BZfE die **sachlich richtigere** Quelle als das UBA, weil es um
Hygiene statt Energie geht. Wenn die Arbeit beide Aspekte trennt, sollte sie
auch beide Quellen nennen.

Der −18-°C-Wert hat übrigens eine gute Geschichte für die Arbeit: Er ist der
international vereinbarte Lagerwert für Tiefkühlkost (Suchrichtung:
Tiefkühlverkehrs-Übereinkommen / Codex Alimentarius), nicht eine Geräteeinstellung
– eine Zahl, die älter ist als jedes Gerät, das sie einhält.

#### 3.6.8 Grundlast-Check (`base_load`)

Der technisch aufwendigste Check; `docs/grundlast-referenz.md` beschreibt ihn
vollständig. Für Quellen ist er zweigeteilt.

**Belegfrei und trotzdem belastbar – die Messmethodik:**

| Größe | Wert | Code | Warum keine Quelle nötig ist |
|---|---|---|---|
| Impulsrechnung | `W = Impulse × 1000 × 3600 / (Imp/kWh × s)` | `baseLoad.ts:96-103` | Einheitenumrechnung, nachrechenbar |
| Plausibilitätsgrenze | 43.000 W | `baseLoad.ts:117` | **Hergeleitet im Code**: „Hausanschluss 3 × 63 A, bei 230 V rund 43 kW" |
| Zähler-Auflösungen | 1 / 0,1 / 0,01 / 0,001 kWh | `baseLoad.ts:133` | Gerätetatsache |
| Mindestdauer | 3 h („mehrere Kühlschrank-Zyklen") | `baseLoad.ts:143` | Setzung, begründet mit dem Taktverhalten des Kompressors |
| Unsicherheitsrechnung aus der Anzeige-Auflösung | ±-Anteil, Stufen `good`/`fair`/`poor` | `baseLoad.ts:146-150` | **Hier lohnt eine Quelle:** *GUM* (Guide to the Expression of Uncertainty in Measurement, JCGM 100:2008) bzw. DIN 1319 (Grundlagen der Messtechnik) |

**Der Teil, der ohne Beleg ist – die Bewertung:**

| Größe | Wert | Status |
|---|---|---|
| Absolute Schwellen | 70 / 150 / 250 W | ⚠️ `pending` |
| Anteilsschwellen am Jahresverbrauch | 25 % / 35 % / 50 % | nicht einmal in der Tabelle sichtbar |

Die Tabelle sagt: „Was als hohe Grundlast gilt, hängt am Haushalt – eine
veröffentlichte Schwelle dazu ist bislang nicht gefunden." Der Code selbst ist
dabei noch selbstkritischer: Die absoluten Schwellen seien „bewusst grob – und
zwangsläufig unfair: Eine Familie im Haus mit Gefriertruhe liegt immer über
70 W, egal wie sparsam sie lebt."

**Das ist für die Arbeit ein Gewinn, nicht ein Mangel.** Die App hat auf die
fehlende Quelle nämlich *konstruktiv* reagiert: Sie bewertet bevorzugt am
**Anteil am Jahresverbrauch**, weil der von der Haushaltsgröße unabhängig ist,
und fällt nur ohne Monitoring-Daten auf die absoluten Watt zurück. Ein
Unterkapitel „Was tun, wenn es keinen Richtwert gibt?" mit genau diesem
Beispiel ist mehr wert als eine hergezwungene Quelle. Als Vergleichsmaßstab für
den *Anteil* taugt wieder der Stromspiegel: Er liefert den Gesamtverbrauch, in
dem der Sockel steckt.

#### 3.6.9 Standby-Check (`standby`)

| Größe | Wert | Code | Status |
|---|---|---|---|
| Schwellen je Gerät | ≤ 5 / 5–20 / > 20 W | `standby.ts:41-42` | ⚠️ `pending` |

Die Begründung in `measurementThresholds.ts` ist **selbst schon eine
Quellenkritik** und gehört fast wörtlich in die Arbeit:

> „Ohne Beleg. Die Ökodesign-Verordnung (EU) 2023/826 begrenzt den
> Bereitschaftsbetrieb neuer Geräte auf 0,5 W – das ist eine **Bauvorschrift,
> kein Maßstab für ein Bestandsgerät am Messgerät.** Sie taugt deshalb nicht als
> Quelle für diese Schwellen."

**Die Quelle ist also richtig zu zitieren, aber für eine andere Aussage:**
VO (EU) 2023/826 (vom 17.04.2023, anwendbar ab 09.05.2025, hebt
VO (EG) 1275/2008 und 107/2009 auf) belegt, *dass* es eine Grenze gibt und *wie
niedrig* sie für Neugeräte liegt – und damit, wie weit ein gemessenes
Bestandsgerät davon entfernt sein kann. Genau das ist die Aussage des Checks.
Eine Arbeit, die diesen Unterschied sauber durchzieht, demonstriert
Quellenkompetenz an einem Beispiel, das praktisch jeder Leser falsch machen
würde.

Ergänzend und weniger belastbar: Die in Etappe 6 geprüfte UBA-Seite zu
Leerlaufverlusten wurde **verworfen** („keine verwertbaren Zahlen"). Das sollte
nicht stillschweigend wieder hereinkommen.

### 3.7 Monitoring: Zählerstände, Tanks, Kennwerte

Der rechenintensivste Bereich – und der mit den meisten externen Annahmen.

| Annahme | Wert | Code | Quellenkandidat |
|---|---|---|---|
| Energieinhalt Gas | ~10 kWh/m³ | `specificValues.ts:52` | **DVGW G 685** (Abrechnungsverfahren: Menge × Zustandszahl × Brennwert), **DVGW G 260** (Gasbeschaffenheit; Brennwert-Spanne je Netz). Der Code nennt die Spanne 9,5–11,5 selbst und verweist auf die Jahresrechnung |
| Energieinhalt Heizöl | ~10 kWh/l | `specificValues.ts:53` | **DIN 51603-1** (Heizöl EL); Dichte ≈ 0,84 kg/l × Heizwert ≈ 11,9 kWh/kg ≈ 10 kWh/l. Brennwert liegt ≈ 6 % höher |
| Energieinhalt Pellets | 4,8 kWh/kg | `specificValues.ts:54` | **DIN EN ISO 17225-2** / ENplus A1: Mindest-Heizwert ≈ 4,6 kWh/kg; bei Normfeuchte (8 %) in der Praxis ≈ 4,9 kWh/kg. Siehe Abschnitt 4.3 |
| Jahresgang Heizenergie | Monatsanteile, Dez ≈ 17 %, Jul ≈ 2 % | `seasonality.ts:21-34` | **BDEW-Standardlastprofile Gas („SigLinDe")**, Leitfaden „Abwicklung von Standardlastprofilen Gas" (Fassung 28.10.2025). Der Code nennt die Herkunft bereits als „Näherung an die Charakteristik der BDEW-Standardlastprofile … gemittelt über die Klimazonen" |
| Heizperiode Okt–Apr | `HEATING_START_MONTH=9`, `…END=3` | `heatingPeriod.ts:27-29` | **Der Code zitiert hier schon richtig**: „eine Konvention, keine Messung. Meteorologisch beginnt ein Heiztag, wenn das Tagesmittel unter die Heizgrenze von 15 °C fällt (Gradtagzahl G20/15, **VDI 3807**)". Dazu: DWD, Open-Data-Datensatz „Gradtage nach VDI 3807" (tägliche und monatliche Reihen für Deutschland) |
| Baujahrs-Staffel Heizwärmebedarf | 220 / 150 / 100 / 70 / 50 kWh/m²·a | `specificValues.ts:69-76` | Der Code nennt die Epochen: **WSchV 1977/1984/1995, EnEV, GEG**. Als Vergleichsmaßstab für Ist-Werte: co2online-Heizspiegel; für die Klassenlogik: GEG §§ 79 ff. (Energieausweis, Bandtacho A+ bis H) |
| Hüllen-Abschläge je Sanierung | Fassade −20 %, Dach −12 %, Fenster −12 %, Kellerdecke −6 % | `estimateEnergy.ts:59-64` | ⚠️ **Setzung ohne Quelle.** Der Code begrenzt die Aussage aber selbst: „BEWUSST OHNE ABSOLUTE ZAHL/KLASSE nach außen" – es wird nur eine *relative* Wirkung und eine *Rangfolge* ausgegeben |
| CO₂ je kWh Strom | 0,38 kg | `impact.ts:9`, `estimateEnergy.ts:45` | UBA, Jahresreihe Strommix-Emissionsfaktor. **Veraltet, siehe Abschnitt 4.1** |
| Standardpreise | Strom 35 ct/kWh, Gas 1,20 €/m³, Öl 1,10 €/l, Pellets 0,35 €/kg, Wasser 2,40 €/m³ | `priceConfig.ts:25-36` | BDEW-Strompreisanalyse; Heizspiegel; für Wasser kommunale Tarife. **Siehe Abschnitt 4.2** |

**Zwei Stellen, an denen der Code methodisch vorbildlich ist und die Arbeit das
zeigen sollte:**

1. **Mengengewichteter statt arithmetischer Preis** (`priceConfig.ts`): „Wer
   3.000 l zu 0,95 € und später 500 l zu 1,30 € bezieht, hat im Schnitt
   1,00 €/l gezahlt, nicht 1,13 €." Das braucht keine Quelle, nur den
   Rechenweg – und es ist ein Fehler, den viele Werkzeuge machen.
2. **Der Tank als rückwärts gelesener Zähler** (`docs/tank-concept.md`): Öl,
   Pellets und Flüssiggas werden in `counterSeries` in einen virtuellen
   Zählerstand übersetzt und laufen durch dieselbe Auswertung – „keine zweite
   Rechenkette". Das ist eine Architekturentscheidung mit nachprüfbarer
   Begründung, keine Literaturfrage.

**Die offene Standortfrage** (siehe „Offene Fragen" in
`docs/gefundene-probleme.md`, Befunde #24/#25): Das Saisonprofil ist derzeit
über alle deutschen Klimazonen gemittelt. Eine Regionalisierung bräuchte
geprüfte DWD-Monatsmittel je Region – und der DWD-Open-Data-Bestand zu
Gradtagen nach VDI 3807 wäre dafür genau die Quelle. Die Arbeit kann das als
**begründet zurückgestellte Erweiterung** darstellen, mit benannter Datenquelle.
Das ist stärker als eine Lücke ohne Plan.

### 3.8 Energiespartipps

13 Tipp-Arten (`tips/buildTips.ts`), Texte in `src/i18n/locales/de.json` unter
`tips.items`. Jeder Tipp, der eine Zahl nennt, ist belegpflichtig – und einige
tun das.

| Tipp | Zahl im Text | Quellenlage |
|---|---|---|
| `room_temperature` | „Ein Grad weniger spart rund 6 % Heizenergie" | **belegt** (VZ RLP) |
| `fridge` | „7 °C reichen, jedes Grad wärmer spart rund 6 % Strom" | **belegt** (UBA) |
| `humidity_high` | „zwei- bis dreimal am Tag für 5 Minuten mit weit offenem Fenster, statt dauerhaft zu kippen" | **belegt** (UBA, Wie lüfte ich richtig? – Stoßlüftung statt Kippen, Querlüftung als Optimum) |
| `room_cold` | „Dauerhaft kühle Räume werden feucht und schimmelanfällig" | **belegt** (UBA Schimmel) – der Leitfaden 2024 ist die ausführliche Quelle |
| `humidity_low` | „sehr trocken, das reizt die Atemwege" | ⚠️ ohne Quelle. Kandidat: Nationaler Anhang zu DIN EN 16798-1 (Empfehlung für höhere Mindestraumluftfeuchte) – fachlich einschlägig, zur gesundheitlichen Aussage aber WHO-Leitlinien zur Innenraumluft passender |
| `showerhead` | „Sparduschkopf (~8 L/min)" | Setzung (Bezugswert der Rechnung) |
| `lighting` | „eine Ersatz-LED kostet rund 3 €" | ⚠️ Marktpreis ohne Stand. In der Arbeit **nicht** belegen, sondern als Größenordnung kennzeichnen |
| `old_boiler` | „rund {{years}} Jahre alt … in der Regel staatliche Förderung" | Nutzungsdauer 20–25 Jahre: Kandidat **VDI 2067** (Wirtschaftlichkeit gebäudetechnischer Anlagen – kalkulatorische Nutzungsdauern). Förderung: **BEG**, Richtlinie in der ab 21.07.2026 geltenden Fassung; KfW (Heizungsförderung) und BAFA (übrige Einzelmaßnahmen). **Achtung: Förderquoten ändern sich – ohne Stand-Datum nicht zitierbar** |
| `pv_self_consumption` | „eingespeister bringt dir nur die Vergütung, und die ist deutlich niedriger" | **EEG** (Einspeisevergütung) gegen Haushaltsstrompreis (BDEW). Die Aussage ist solide, die *Differenz* ist zeitabhängig |
| `draft` | Dichtungsband aus dem Baumarkt | qualitativ, kein Beleg nötig |
| `consumption_up` | „{{percent}} % mehr Verbrauch als im Vorjahreszeitraum – **das ist gemessen, nicht geschätzt**" | Eigenmessung. Bemerkenswert: Der Tipptext sagt selbst, woher er seine Sicherheit nimmt |

**Ein Detail, das ins Methodik-Kapitel gehört:** `tips/tipsForReport.ts:70`
schließt qualitative Tipps aus dem Bericht aus, weil sie „keine Quelle haben".
Die App unterscheidet also schon im laufenden Betrieb zwischen belegten und
unbelegten Empfehlungen – und nimmt die unbelegten aus dem Dokument heraus, das
der Nutzer weitergibt. Das ist eine Entwurfsentscheidung, die eine Hausarbeit
gern zitieren darf.

### 3.9 Der Bericht (PDF)

Hier braucht die Arbeit kaum Fremdquellen, weil der Bericht seine eigenen
mitführt – und das ist der Punkt.

| Eigenschaft | Fundstelle |
|---|---|
| Jede Bewertung nennt den Vergleichs-Richtwert daneben | `generateMeasurementsPdf.ts:176-190`, gespeist aus `MEASUREMENT_THRESHOLDS` |
| Quellenverzeichnis am Ende, gleiche Quellen zusammengefasst | `generateSourcesPdf.ts`, `thresholdReference.ts:52-97` |
| Drei Herkunftsarten werden im PDF **unterschieden** – belegte Quelle, „Richtwert der E-App", „noch offen" | `generateSourcesPdf.ts:37` (`report.pdf.sources.ownValue` / `…pending`) |
| Abschließender Vorbehalt im Dokument | `generateSourcesPdf.ts:46` (`report.pdf.sources.disclaimer`) |

**Für die Arbeit:** Ein Screenshot dieses Quellenverzeichnisses ist der beste
verfügbare Beleg dafür, dass das Projekt seine Maßstäbe offenlegt statt sie zu
verstecken – inklusive der Stellen, an denen es keinen Beleg hat. Dass eine
Software ihre eigenen `pending`-Werte im Nutzerdokument als solche ausweist, ist
ungewöhnlich und erwähnenswert.

### 3.10 Wissensbereich: wo Primärquellen die Wikipedia ersetzen könnten

58 Glossarbegriffe, 66 `wiki()`-Verweise über 61 Artikel. Für **alle**
Primärquellen zu suchen wäre unverhältnismäßig. Diese zwölf tragen die
Fachaussagen der App und lohnen die Mühe:

| Begriff | Primärquelle (Kandidat) |
|---|---|
| Arbeitspreis, Grundpreis, Netzentgelt, Strompreis | BDEW-Strompreisanalyse (Preisbestandteile); Bundesnetzagentur (Netzentgelte) |
| Brennwert / Heizwert | DVGW G 260 (Gas); DIN 51603-1 (Heizöl); DIN EN ISO 17225-2 (Pellets) |
| Gradtagzahl, Heizgradtage | VDI 3807 Blatt 1; DWD Open Data |
| Heizlast | DIN EN 12831 (Heizlastberechnung) |
| Hydraulischer Abgleich | VDI 2073; VOB-/Fachregeln der Branche; BEG-Förderbedingungen (Abgleich als Bedingung) |
| Jahresarbeitszahl, Leistungszahl (COP) | DIN EN 14511 / 14825 (Wärmepumpen-Prüfbedingungen); VDI 4650 (JAZ-Berechnung) |
| Energieausweis, Effizienzhaus, Endenergie, Primärenergie | GEG (§§ 79 ff.; Primärenergiefaktoren in Anlage 4); KfW-Effizienzhaus-Definitionen |
| Intelligenter Zähler, Lastgang, Doppeltarifzähler | MsbG; Bundesnetzagentur, Roll-out intelligenter Messsysteme |
| Einspeisevergütung, Nennleistung PV, Eigenverbrauch | EEG; Bundesnetzagentur Marktstammdatenregister |
| Steckersolargerät (Balkonkraftwerk) | VDE-Produktnorm bzw. VDE-Anwendungsregel zu Steckersolargeräten; Solarpaket-I-Gesetzgebung |
| Taupunkt, Luftfeuchtigkeit, Wärmebrücke | DWD-Glossar (Taupunkt); DIN 4108-2 (Mindestwärmeschutz, Wärmebrücken) |
| Wärmedurchgangskoeffizient (U-Wert) | DIN EN ISO 6946; GEG Anlage-Werte |
| CO₂-Preis (BEHG) | Brennstoffemissionshandelsgesetz (BEHG) – Gesetzestext, zitierfest |

**Warnung zur Verhältnismäßigkeit:** DIN- und VDI-Normen liegen hinter
Bezahlschranken. Eine Hausarbeit darf eine Norm über Nummer, Titel und Ausgabe
zitieren, ohne sie gekauft zu haben – aber sie darf dann **keine Zahl daraus
behaupten**, die sie nicht gelesen hat. Das ist genau die Falle aus
Abschnitt 1.2, nur mit anderem Vorzeichen. Wo die Arbeit eine Zahl braucht,
sind UBA, BDEW, Bundesnetzagentur, DWD und Gesetzestexte die besseren Quellen:
frei zugänglich, dauerhaft adressierbar, amtlich.

### 3.11 Lernbereich / Karteikarten-Trainer

Der Bereich mit dem **größten unausgeschöpften Quellenpotenzial** – hier liegt
echte, gut zitierbare Fachliteratur, und die App setzt drei benannte Verfahren
um (`src/features/education/flashcards/engine/`). Faktenlage:
`docs/flashcards-trainer.md`.

| Gegenstand | Code | Quelle (Kandidat) |
|---|---|---|
| Verteiltes Üben wirkt besser als gebündeltes; das optimale Intervall wächst mit dem Behaltenszeitraum | die gesamte Intervall-Logik in `core.ts` | **Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006):** *Distributed practice in verbal recall tasks: A review and quantitative synthesis.* Psychological Bulletin 132(3), S. 354–380. – Metaanalyse über 839 Befunde aus 317 Experimenten |
| Abrufen schlägt Wiederlesen für das Langzeitbehalten (Testing Effect) – die Begründung, warum überhaupt Karten statt Skript | das Bewertungsprinzip des Trainers | **Roediger, H. L., & Karpicke, J. D. (2006):** *Test-enhanced learning: Taking memory tests improves long-term retention.* Psychological Science 17(3), S. 249–255 |
| Vergessenskurve als Modellgrundlage | `fsrs.ts` (`retrievability`, `DECAY = −0,5`) | Ebbinghaus (1885), *Über das Gedächtnis* – historisch; für die moderne Form die beiden obigen |
| SM-2 als Verfahren (Leichtigkeitsfaktor, Startwert 2,5, Untergrenze 1,3, Intervalle 1/6 Tage) | `sm2.ts:14-33` | SuperMemo-Dokumentation des SM-2-Algorithmus (Woźniak); Anki-Handbuch als Umsetzungsbeleg |
| FSRS als Standardverfahren (Stabilität/Schwierigkeit/Abrufbarkeit, Ziel-Behaltensquote als Regler) | `fsrs.ts` – ausdrücklich „FSRS-4.5-Kern" | **Ye, J. u. a.:** *A Stochastic Shortest Path Algorithm for Optimizing Spaced Repetition Scheduling* (ACM KDD) und *Optimizing Spaced Repetition Schedule by Capturing the Dynamics of Memory* (IEEE TKDE); dazu das Wiki von `open-spaced-repetition/fsrs4anki`. Anki übernahm FSRS mit Version 23.10 als Standard |
| Leitner-Boxen als „einfacher Modus" (5 Boxen, 1·3·7·21·60 Tage) | `leitner.ts` | Leitner, S. (1972): *So lernt man lernen* – die Urquelle des Verfahrens |
| Drei Knöpfe angezeigt, vier Stufen gespeichert | `docs/flashcards-trainer.md`, Abschnitt 2 | Entwurfsentscheidung, Eigenbeleg |

**Warum dieser Abschnitt so ertragreich ist:** Die App implementiert drei
Verfahren **wahlweise** und hält den Lernfortschritt als unveränderliches
Ereignis-Log, sodass sich das Verfahren wechseln lässt, ohne den Fortschritt zu
verlieren. Das ist eine Architekturentscheidung, die nur Sinn hat, wenn man die
Verfahren vergleichen will – und damit steht die Arbeit mit einem Bein in der
Lernforschung, ob sie will oder nicht. Drei Quellen (Cepeda, Roediger/Karpicke,
FSRS) tragen hier ein ganzes Kapitel.

Eine Selbstbeschränkung, die mitzunennen ist: `fsrs.ts` setzt das
Nachtrainieren der Gewichte auf den eigenen Bewertungen **bewusst nicht** um –
„Das Ereignis-Log enthält alles Nötige, um das später nachzurüsten, ohne die
Engine zu ändern." Eine benannte, begründete Grenze ist ein Befund, keine
Lücke.

### 3.12 Recht, Datenschutz, Einwilligung

Der am solidesten belegbare Teil der Arbeit, weil Gesetzestexte dauerhaft
zitierfähig sind. Faktenlage: `docs/rechtliches-referenz.md` und `docs/legal.md`.
Die Zuordnung steht dort bereits als Tabelle:

| Baustein | Rechtsgrundlage | Fundstelle im Code |
|---|---|---|
| Impressum | **§ 5 DDG** (seit 2024 Nachfolger des § 5 TMG), **§ 18 Abs. 2 MStV** | `features/legal/operator.ts`, `ImprintPage.tsx` |
| Datenschutzerklärung | **Art. 13 DSGVO** | `features/legal/PrivacyPage.tsx` (331 Zeilen) |
| Einwilligung („Cookie-Banner") | **§ 25 Abs. 1 TDDDG**, Ausnahme **§ 25 Abs. 2 Nr. 2 TDDDG**; **Art. 6 Abs. 1 lit. a DSGVO**; Widerruf **Art. 7 Abs. 3 DSGVO**; Nachweis **Art. 7 Abs. 1 DSGVO** | `features/legal/consent.ts` – die Paragraphen stehen **wörtlich im Dateikopf** |
| Datenminimierung | **Art. 5 Abs. 1 lit. c DSGVO** | `onboarding/fieldUsage.ts` + Test |

**Die Abgrenzung, die die Arbeit unbedingt machen sollte** (sie steht in
`docs/rechtliches-referenz.md` schon fertig ausformuliert): § 25 TDDDG regelt
den **Zugriff auf das Endgerät** und gilt unabhängig davon, ob personenbezogene
Daten anfallen; die DSGVO regelt die **anschließende Verarbeitung**. Für Google
Analytics braucht die App deshalb **beides**. Der verbreitete Satz
„Cookie-Banner wegen DSGVO" ist falsch, und das sauber zu trennen ist ein
billiger, großer Punktgewinn.

**Technische Belege, die die rechtliche Umsetzung stützen** – alle im Code
nachweisbar und damit unangreifbar:

- Analytics wird **erst nach Einwilligung** geladen; `lib/firebase.ts` darf
  Analytics nicht beim Start initialisieren, nur
  `features/analytics/analytics.ts` ruft `loadAnalytics()`. Als Regel in
  `CLAUDE.md` festgeschrieben.
- Firestore wird **lazy** initialisiert (Befund #26 in
  `docs/gefundene-probleme.md`) – vorher legte die App schon vor jeder
  Cookie-Entscheidung einen Gerätespeicher an.
- `CONSENT_VERSION` (`consent.ts:31`) erzwingt eine neue Abfrage, sobald sich
  Zwecke ändern – das ist Art. 7 DSGVO in Code gegossen.
- Ablehnen ist gleichwertig zu Annehmen (ein Klick, `rejectAll`), und
  „Cookie-Einstellungen" ist ein eigener, gleich prominenter Button statt eines
  kleinen Links (Befund #11/#12). Das ist der Punkt, an dem
  Aufsichtsbehörden-Leitlinien zur Gestaltung von Einwilligungen (EDSA-Leitlinien
  zu Einwilligung; DSK-Orientierungshilfe Telemedien) **inhaltlich** greifen –
  als Kandidaten lohnend, wenn die Arbeit die Gestaltung des Banners begründet.

**Und der Vorbehalt, der nicht fehlen darf** – `docs/rechtliches-referenz.md`
formuliert ihn so scharf, dass er übernommen werden kann: Die Rechtstexte sind
„nach bestem Wissen aufgebaut", **eine juristische Prüfung ersetzen sie nicht**
und hat nicht stattgefunden. Formulierungen wie „rechtskonform" oder
„DSGVO-konform" sind zu vermeiden; korrekt ist „nach den einschlägigen
Vorschriften aufgebaut, juristisch ungeprüft".

### 3.13 Qualitätssicherung – der Abschnitt, der ohne Fremdquellen auskommt

Für ein Kapitel „Qualitätssicherung" liefert das Repository lauter Eigenbelege,
und die sind hier stärker als Literatur:

| Aussage | Beleg |
|---|---|
| 73 Unit-Test-Dateien (`tests/unit/`), dazu ein Regeltest gegen den Firestore-Emulator | `package.json` (`test`, `test:rules`), `tests/` |
| Keine Zahl steht zweimal: Ein Test vergleicht Bericht gegen Richtwert-Tabelle und Tabelle gegen Mess-Modul | Etappe 6, „Fertig, wenn"; `measurementThresholds.ts` (Import statt Literal) |
| Jedes `OnboardingData`-Feld braucht einen Abnehmer; ein Test hält die Liste der Felder ohne Abnehmer exakt fest | `onboarding/fieldUsage.ts`, `tests/unit/fieldUsage.test.ts` |
| Jede Messung nennt ihre Messgeräte; die Geräte-Übersicht wird daraus **abgeleitet**, nicht danebengeschrieben | `measurements/catalog.ts` (`instruments` ist Pflicht), `instrumentNeeds.ts` |
| Kennungen von Räumen und Geräten sind unveränderlich, damit kein Ergebnis seinen Raum verliert | `CLAUDE.md`; `newRoomId()`; `tests/unit/roomMigration.test.ts` |
| Gespeicherte Messergebnisse bleiben lesbar: Altformate werden weiter gelesen, nicht migriert | `CLAUDE.md`; `StandbyResult.decodeDevices` |
| 46 dokumentierte Live-Test-Befunde mit Kategorie, Status und Begründung | `docs/gefundene-probleme.md` |
| 21 automatisierte Browser-Prüfungen der PDF-Verlinkung, alle bestanden | `docs/hausarbeit-verlinkung.md`, Abschnitt 5 |

Wenn hier überhaupt eine Fremdquelle hingehört, dann eine zu Testpyramide und
reinen Funktionen (Fowler/Beck) oder zu ISO/IEC 25010 (Qualitätsmerkmale von
Software) – als Ordnungsrahmen, nicht als Beleg für eine Zahl.

---

## 4. Drei Stellen, an denen die Quellenrecherche einen Fehler in der App gefunden hat

Diese Befunde sind für die Arbeit doppelt wertvoll: Sie zeigen, dass die
Quellensuche nicht bloß dekorativ war, und sie liefern drei ehrliche Sätze über
die Grenzen des Stands.

> **Alle drei beruhen auf Suchzusammenfassungen** (Abschnitt 1.2) und sind vor
> einer Änderung am Code zu prüfen. **Dieses Dokument ändert nichts am Code** –
> das war ausdrücklich nicht der Auftrag.

### 4.1 Der CO₂-Faktor ist veraltet

Die App rechnet mit **0,38 kg CO₂/kWh** (`impact.ts:9`,
`estimateEnergy.ts:45`), im Kommentar bezeichnet als „Größenordnung 2023/24".

Laut UBA-Jahresreihe liegt der Emissionsfaktor des deutschen Strommix bei
**344 g/kWh für 2025**, 353 g für 2024 und 379 g für 2023. Die 0,38 trifft
damit 2023, liegt für 2025 aber rund **10 % zu hoch**.

Für die Arbeit: Entweder den aktuellen Wert mit Stand-Datum nennen, oder – und
das wäre der bessere Befund – darstellen, dass ein solcher Faktor **jährlich
veraltet** und deshalb ein Stand-Datum im Code braucht, so wie der
`Source`-Typ es für Inhalte schon verlangt (Abschnitt 1.3).
Quelle: UBA, „Entwicklung der spezifischen Treibhausgas-Emissionen des deutschen
Strommix"; Hintergrundbericht CLIMATE CHANGE 13/2025.

### 4.2 Der Standard-Strompreis ist veraltet

`priceConfig.ts:25` setzt **35 ct/kWh** als Vorgabe. Die BDEW-Strompreisanalyse
weist für 2026 einen Durchschnitt von **37,0 ct/kWh** aus (Musterhaushalt
3.500 kWh/a), nach 39,3 ct im Vorjahr.

Das ist kein Fehler im engeren Sinn – ein Vorgabewert soll ja überschrieben
werden, und die App lässt den Nutzer im Schritt „Preise & Kosten" seinen
eigenen Arbeitspreis eintragen. Aber die Arbeit sollte nicht behaupten, 35 ct
sei der Marktpreis. Der sauberste Satz ist: „Vorbelegung, vom Nutzer
überschreibbar; Stand 09/2026 liegt der Durchschnitt laut BDEW bei 37,0 ct/kWh."

### 4.3 Der Pellet-Heizwert liegt zwischen zwei vertretbaren Werten

`specificValues.ts:54` rechnet mit **4,8 kWh/kg**, im Kommentar begründet mit
„DIN-Norm-Pellets, ~17,3 MJ/kg".

Die Recherche ergibt zwei gängige Bezugswerte: **4,6 kWh/kg** als
Mindest-Heizwert der Klasse ENplus A1 nach DIN EN ISO 17225-2, und **≈ 4,9
kWh/kg** als Praxiswert bei Normfeuchte (8 %). Die 4,8 liegen dazwischen und
sind damit **vertretbar, aber nicht hergeleitet** – was der Kommentar so nicht
sagt.

Für die Arbeit reicht eine präzisere Formulierung: Mindestwert nach Norm, üblicher
Praxiswert, gewählter Rechenwert – drei Zahlen, eine Begründung. Das ist mehr
wert als eine Norm-Nummer ohne Spanne.

---

## 5. Die Lücken, die Lücken bleiben sollten

Diese Werte sind **bewusst** unbelegt. Die Arbeit sollte sie als Setzungen mit
Begründung darstellen, nicht mit einer ungefähr passenden Fundstelle zudecken.
Etappe 6 hat das am 03.09.2026 ausdrücklich so entschieden.

**Als „Erfahrungswert der E-App" gekennzeichnet** (begründet, nicht belegt):

| Wert | Fundstelle | Begründung im Code |
|---|---|---|
| Keller 14–18 °C, Feuchte Keller/Waschküche 50–65 % | `roomClimate.ts` | Keller sind kühl und tragen Feuchte ein; ein Wohnraum-Band meldete jeden normalen Keller als „zu feucht" |
| Angenommene Kellerwand 12 °C | `dewPoint.ts:49` | Erdreich in 1–2 m Tiefe ganzjährig 8–12 °C; oberer Rand gewählt, weil vorsichtiger – „seltener warnt und damit keine Warnung erzeugt, die niemand ernst nimmt" |
| Kühlschrank-Randwerte (< 3 / > 8 °C), Gefrier-Toleranz (−16 / −20 °C) | `fridge.ts`, `freezer.ts` | belegt ist je nur der Zielwert |
| Duschkopf-Kalibrierung (1 Dusche/Person/Tag, 5 min, Sparkopf 8 l/min) | `showerhead.ts:60-64` | trägt nur die Hochrechnung der Wassermenge, nicht die Prozent-Ersparnis |
| `CALIBRATION_PERSONS = 2`, `DEFROST_RECHECK_DAYS = 182` | `hotWaterWait.ts:60`, `followUps.ts:28` | Kalibrierungsbasis bzw. Erinnerungsintervall |
| LED-Raumgewichte (Küche/Wohnzimmer 3, Nebenräume 1) | `lighting.ts:31-32` | „wo Licht lange brennt, lohnt der Tausch zuerst"; bewusst grob |
| Hüllen-Abschläge je Sanierung (−20/−12/−12/−6 %) | `estimateEnergy.ts:59-64` | nur relative Wirkung und Rangfolge werden ausgegeben, keine absolute Klasse |
| Plausibilitätsgrenzen des Fragebogens | `plausibility.ts:30-33` | fangen Tippfehler ab, bewerten keine Wohnung |

**Ausdrücklich offen (`pending`) – nicht als Erfahrungswert durchwinken:**

| Wert | Fundstelle | Warum offen |
|---|---|---|
| Warmwasser-Wartezeit 15 / 30 / 60 s | `hotWaterWait.ts:111-113` | alle drei Stufen ohne Beleg, „gewachsen, nicht hergeleitet" |
| Grundlast 70 / 150 / 250 W | `baseLoad.ts:41-43` | keine veröffentlichte Schwelle gefunden |
| Standby 5 / 20 W je Gerät | `standby.ts:41-42` | die EU-Grenze von 0,5 W gilt je Neugerät, nicht als Messschwelle |
| Verdeckte Heizkörperfläche 15 % / 30 % | `furnitureSpacing.ts:260-262` | der Abstands-Fall ist belegt, der Flächen-Fall nicht |
| Warmwasseranteil an der Heizenergie 15 % | `heatingCost.ts:8` | weder belegt noch als Setzung markiert – **der aussichtsreichste offene Punkt**, weil Heizspiegel und Destatis die Anteile getrennt ausweisen |

**Dazu eine inhaltliche Lücke, die keine Zahl ist:** Die Warmwasser-Angabe im
Fragebogen (`hotWaterType`) hat seit 05.09.2026 **keinen funktionalen Abnehmer
mehr** und steht nur noch im PDF-Steckbrief. Ob die Frage bleibt, ist eine
offene Frage an Kilian (`docs/gefundene-probleme.md`, „Offene Fragen"). Sollte
die Arbeit einen Tipp für „separates Warmwassersystem" vorschlagen, wäre der
**neu zu belegen**, nicht bloß anzuschließen.

---

## 6. Prüfliste für Kilian am PC

Dieselbe Mechanik wie in Etappe 6: Die Liste gilt als abgearbeitet, wenn jeder
Eintrag entweder bestätigt oder ersetzt ist. **Geprüft heißt: die Seite
geöffnet und die Zahl dort gesehen** – nicht: der Link lud.

**Gruppe A – tragen je einen ganzen Abschnitt, deshalb zuerst:**

1. Destatis, Umweltökonomische Gesamtrechnungen, „Energieverbrauch privater
   Haushalte für Wohnen" → steht dort der Anteil für **Raumwärme** getrennt
   ausgewiesen? Welches Berichtsjahr?
2. UBA, „Entwicklung der spezifischen Treibhausgas-Emissionen des deutschen
   Strommix" → Wert für das **aktuellste** Jahr, und ist die Jahresreihe auf
   einer dauerhaften Adresse?
3. co2online, „Heizspiegel für Deutschland" → Vergleichswerte kWh/m²·a je
   Energieträger; **und**: weist er Raumwärme und Warmwasser getrennt aus?
   (Das entscheidet über `WARM_WATER_SHARE = 0,15`.)
4. co2online / Stromspiegel → Vergleichswerte je Personenzahl; reicht es, um
   die Heuristik in `estimateEnergy.ts` gegenzuprüfen?
5. BDEW-Strompreisanalyse → aktueller Haushaltsstrompreis und die
   Preisbestandteile (für das Glossar: Arbeitspreis, Netzentgelt, Umlagen).
6. BDEW, Leitfaden „Abwicklung von Standardlastprofilen Gas" → sind die
   **Monatsanteile** oder die Profilfunktion darin so enthalten, dass sich die
   Werte in `seasonality.ts` daran messen lassen?

**Gruppe B – Normen und Rechtstexte, nur Existenz und Titel prüfen:**

7. VO (EU) 2023/826 auf EUR-Lex → Datum, Geltungsbeginn, und dass sie
   1275/2008 aufhebt. (Für den Standby-Check ist genau das die Aussage.)
8. VDI 3807 Blatt 1 → Titel und Ausgabejahr; dazu der DWD-Open-Data-Datensatz
   „Gradtage nach VDI 3807" (tägliche/monatliche Reihen).
9. DVGW G 685 und G 260 → Titel; reicht eine frei zugängliche
   Stadtwerke-Kundeninformation als belegfähige Sekundärquelle für das
   Abrechnungsverfahren?
10. DIN 51603-1 (Heizöl EL) und DIN EN ISO 17225-2 (Pellets) → Titel und
    Ausgabe. **Keine Zahl daraus zitieren, die nicht gelesen ist** (Abschnitt 3.10).
11. GEG → Paragraphen zum Energieausweis; DSGVO/TDDDG/DDG/MStV sind über
    `gesetze-im-internet.de` bzw. EUR-Lex ohnehin zitierfest.

**Gruppe C – Fachliteratur, Zugang prüfen:**

12. Darby (2006), DEFRA/Oxford → ist das PDF frei abrufbar? Falls nicht: über
    die Sekundärzitate arbeiten und das offenlegen.
13. Fischer (2008), Energy Efficiency 1, 79–104 → HTW-Zugang über Springer?
14. Cepeda u. a. (2006), Psychological Bulletin 132, 354–380 und
    Roediger & Karpicke (2006), Psychological Science 17, 249–255 → HTW-Zugang?
15. Ye u. a. (FSRS) → die KDD-/TKDE-Veröffentlichung mit vollständigen
    bibliografischen Angaben; das `fsrs4anki`-Wiki als technische Ergänzung.
16. Die widersprüchliche Befundlage zu KI-Assistenten → mindestens eine Studie
    mit Beschleunigung **und** eine mit Verlangsamung, beide mit vollständigen
    Angaben (Abschnitt 3.4).

**Was nach der Prüfung mit dem Ergebnis zu tun ist:** Bestätigte Quellen können
in die Arbeit; bestätigte Quellen zu *Richtwerten* gehören zusätzlich in
`measurementThresholds.ts` (als `ref(label, url)`), damit App und Arbeit
dieselbe Quelle nennen. Tote oder inhaltlich nicht tragende Kandidaten werden
ersetzt oder der Wert wird auf „Richtwert der E-App" umgestellt – nicht
stillschweigend weitergeführt.

---

## 7. Arbeitsauftrag für die nächste Sitzung

Empfohlene Reihenfolge, nach Ertrag je Aufwand:

1. **Gruppe A der Prüfliste mit Kilian abarbeiten** (Abschnitt 6). Sechs
   Quellen, die sechs Abschnitte tragen. Ohne diesen Schritt bleibt der Rest
   Spekulation.
2. **Die drei Abschnitte schreiben, die heute ganz ohne Quellen auskommen
   müssten und es nicht müssten:** Stand der Technik zur Wirksamkeit von
   Rückmeldung (3.2), Lernbereich (3.11), Zugänglichkeit/WCAG (3.3). Alle drei
   sind Literatur-, keine Recherche-Arbeit.
3. **Recht (3.12) ausformulieren.** Die Paragraphen stehen schon im Code, die
   Abgrenzung § 25 TDDDG ↔ DSGVO steht in `docs/rechtliches-referenz.md`
   fertig da. Das ist der billigste Punktgewinn im ganzen Dokument – und der
   Vorbehalt („juristisch ungeprüft") darf nicht fehlen.
4. **Abschnitt 4 in der Arbeit verwerten.** Drei veraltete Werte, selbst
   gefunden, mit Quelle und Konsequenz – das ist ein Methodik-Befund, kein
   Eingeständnis.
5. **Abschnitt 5 als eigenen Unterabschnitt der Arbeit schreiben:** „Welche
   Richtwerte nicht belegt sind – und warum sie trotzdem dastehen." Eine Arbeit,
   die ihre fünf `pending`-Werte selbst aufzählt, ist nicht schwächer belegt als
   eine, die sie versteckt; sie ist nur schwerer angreifbar.
6. **Erst danach** über die Wikipedia-Umstellung im Wissensbereich nachdenken
   (3.10). Sie ist die aufwendigste und für die Note die unwichtigste Aufgabe –
   und sie betrifft das Produkt, nicht die Arbeit.

**Was diese Sitzung nicht getan hat und die nächste prüfen sollte:** Am Code
wurde nichts geändert (ausdrücklicher Auftrag). Die drei Befunde aus
Abschnitt 4 sind damit **offen** – sie sind Kandidaten für einen eigenen
Arbeitsschritt, nicht für einen Nebensatz.

---

## Verwendete Fundstellen im Repository

Dieses Dokument beruht auf:

- `src/features/education/measurementThresholds.ts` (Richtwerte, `ThresholdOrigin`)
- `src/features/education/educationContent.ts` (`Source`, Glossar, FAQ, `wiki()`)
- `src/features/measurements/*/` (neun Mess-Module, alle Schwellen)
- `src/features/monitoring/specificValues.ts`, `seasonality.ts`, `heatingPeriod.ts`, `priceConfig.ts`
- `src/features/home/estimateEnergy.ts`, `src/features/measurements/impact.ts`
- `src/features/tips/buildTips.ts`, `tipsForReport.ts`, `src/i18n/locales/de.json`
- `src/features/reports/thresholdReference.ts`, `generateSourcesPdf.ts`, `generateMeasurementsPdf.ts`
- `src/features/education/flashcards/engine/` (`core.ts`, `fsrs.ts`, `sm2.ts`, `leitner.ts`)
- `src/features/legal/consent.ts`, `firestore.rules`, `functions/index.js`, `src/features/monitoring/ocr.ts`
- `src/features/onboarding/fieldUsage.ts`, `plausibility.ts`, `goals.ts`
- `package.json`, `tests/unit/` (73 Dateien)
- `CLAUDE.md` und die Dokumente in `docs/`, insbesondere
  `verbesserungen-etappen.md` (Etappe 6), `gefundene-probleme.md`,
  `rechtliches-referenz.md`, `ki-einsatz-referenz.md`, `onboarding-referenz.md`,
  `grundlast-referenz.md`, `landing-demo-referenz.md`, `hausarbeit-verlinkung.md`,
  `flashcards-trainer.md`, `wissen-concept.md`, `tank-concept.md`
