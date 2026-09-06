# Landing Page und Demo-Profil der E-App – Referenz für die schriftliche Ausarbeitung

**Zweck dieses Dokuments.** Es beschreibt zwei eng zusammenhängende Bereiche
der E-App: die öffentliche Landing Page (Route `/`) und das Demo-Profil
(„Beispiel-Wohnung"), das sie zeigt. Es ist als **Faktenquelle** für ein
Kapitel der Hausarbeit gedacht, nicht als fertiger Fließtext – die
Formulierungen dürfen frei umgeschrieben werden, Zahlen, Dateinamen und
Wirkungsketten nicht.

**Stand:** 06.09.2026, Commit `ef22463`. Belegt aus
`src/features/landing/`, `src/features/demo/`, `docs/landing-concept.md`
(Feinkonzept mit Versionsgeschichte) sowie `src/app/App.tsx` (Routing).

**Projektkontext in einem Satz:** Die E-App ist eine deutschsprachige
Energie-Analyse-Anwendung (React 19, TypeScript, Tailwind CSS v4); Landing
Page und Demo-Profil sind der öffentliche Einstiegspunkt für Erst-Besucher,
bevor irgendeine Anmeldung oder Dateneingabe verlangt wird.

---

## 1. Der Zusammenhang beider Bereiche in einem Satz

Die Landing Page **verspricht**, das Demo-Profil **löst das Versprechen ein**:
Die Seite behauptet nicht nur, was die App kann, sondern lässt einen
Erst-Besucher mit einem Klick eine vollständig befüllte, realistische
Beispiel-Wohnung erleben – ohne Konto, ohne ein einziges eigenes Feld
auszufüllen. Diese Kombination ist eine dokumentierte Entwurfsentscheidung,
keine zufällige Nähe zweier Features (siehe Abschnitt 3).

---

## 2. Ausgangslage: warum es die Landing Page überhaupt braucht

Vor ihrer Einführung (Konzept vom 17.07.2026, `docs/landing-concept.md`) gab
es **keine** Landing Page. Route `/` leitete sofort auf `/onboarding` um –
ein Erst-Besucher landete nach drei Info-Folien direkt bei der
Dateneingabe, bevor er verstanden hatte, was die App überhaupt leistet. Die
Diagnose im Konzeptdokument benennt vier konkrete Schwächen des alten
Zustands:

1. **Kein „Show, don't tell".** Die alten Intro-Folien behaupteten Nutzen
   mit Beispielzahlen, zeigten aber nie die echte App mit echten Verläufen.
2. **Der stärkste Trumpf lag ungenutzt herum.** Ein vollständiges Demo-Profil
   existierte technisch bereits, war aber nur über den versteckten
   Link-Parameter `?demo` erreichbar.
3. **Die Funktionsbreite blieb unsichtbar** – neun Messungen, Zähler-Monitoring
   mit Foto-Scan, PDF-Berichte, Wissensbereich, mehrere Wohnungen.
4. **Sofortige Datenabfrage schreckte ab** – die Wahl zwischen „3–5 Min" und
   „8–10 Min" Fragebogen, bevor klar war, wofür.

---

## 3. Leitidee: „Zeigen statt behaupten"

Das Konzept trifft eine explizite Entscheidung zwischen drei Optionen für den
„Mit-Daten"-Moment, dem eigentlichen Überzeugungs-Augenblick:

| Option | Wirkung laut Konzept |
|---|---|
| Nur Bilder/Screenshots | „wirkt wie jede Marketing-Seite, Skepsis bleibt" |
| Nur ein Demo-Button | „viele klicken nicht, ohne vorher zu *sehen*, dass es sich lohnt" |
| **Beides kombiniert** (gewählt) | „Kacheln erzeugen den Sog, der Button liefert den Beweis" |

Entscheidend dabei: Die Vorschau-Kacheln auf der Landing Page sind **nicht**
gestaltete Fake-Grafiken, sondern werden inhaltlich aus demselben
Demo-Datensatz gespeist, den auch der Live-Button lädt – „dieselbe Kurve,
dasselbe Rating, das der Nutzer später selbst bekommt" (Konzept, Abschnitt A).

---

## 4. Aufbau der Landing Page

Fünf Abschnitte auf einer Scroll-Seite (`LandingPage.tsx`), mobile-first:

| # | Abschnitt | Zweck |
|---|---|---|
| ① | Hero | Value Proposition, zwei CTAs, Vertrauens-Signale |
| ② | „So läuft eine Messung ab" (`GuidedSection`) | zeigt den *Weg* einer echten Messung |
| ③ | „So sieht's mit Daten aus" (`PreviewSection`) | zeigt das *Ergebnis* aus echten Demo-Daten |
| ④ | „Was du machen kannst" | vier Capability-Kacheln |
| ⑤ | Abschluss-CTA | zweite Gelegenheit zu starten, Login-Hinweis |

Die Reihenfolge ②→③ ist bewusst: Sie beantwortet zuerst „kann ich das
überhaupt?" (Weg), dann erst „lohnt sich das?" (Ergebnis) – im Code-Kommentar
wörtlich festgehalten.

### 4.1 Hero

Enthält Überschrift, Unterzeile, zwei CTAs (**„Jetzt starten"** →
Fragebogen, **„Beispiel-Wohnung ansehen"** → Demo) sowie vier
Vertrauens-Signale direkt darunter: „Läuft lokal", „Kostenlos", „Für jeden
Haushalt", „Jedes Gerät". Diese Platzierung ist eine dokumentierte Korrektur
aus einer Politur-Runde (Konzept, Abschnitt I): Die Signale standen zunächst
als eigener Streifen vor dem Abschluss-CTA, wurden aber dorthin verschoben,
„wo die Frage ‚kostet das was / wo bleiben meine Daten?' tatsächlich
aufkommt".

Der **Hero-Mock** (`HeroMock()`-Komponente) ist bewusst **kein Rendering der
echten App-Komponenten** – er hat keine Store-Abhängigkeit, sondern ist ein
eigenständig gebautes visuelles Abbild der Energie-Status-Karte
(Beispielwerte, animierte Verbrauchskurve, respektiert
`prefers-reduced-motion`). Diese Trennung von der Demo-Vorschau in Abschnitt
③ (die *echte* Daten zeigt) ist eine bewusste Aufwand-Genauigkeits-Abwägung
(„leichtes Mock im Hero, echte Demo-Daten in den Kacheln", Konzept, Abschnitt G).

### 4.2 „So läuft eine Messung ab" (`GuidedSection`)

Nachträglich ergänzter Abschnitt (Politur-Runde vom 16.08.2026), der einem
konkreten Testnutzer-Feedback folgt: „Der **geführte** Charakter der
Messungen kam nicht rüber." Die Seite zeigte vorher nur das *Ergebnis* einer
Messung, nie den *Weg* dahin. Der Abschnitt zeigt exemplarisch **einen**
Check (Duschkopf-Test) in drei Schritten – Anleitung (echtes Erklärvideo +
1-2-3-Schritte), Messen (Stoppuhr-Mock), Ergebnis (Rating + €/Jahr) – und
übernimmt bewusst dieselbe Sprache wie der echte Mess-Ablauf in der App
(„Info · Messen · Ergebnis"), „damit die Landing verspricht, was die App
hält".

Technische Details mit Begründung:

- **Ein Beispiel statt eines Katalogs.** Alle neun Checks aufzulisten hätte
  die Seite verlängert, ohne „kann ich das?" besser zu beantworten als ein
  durchgespielter Einzelfall.
- **Video lädt erst bei Sichtkontakt** (IntersectionObserver), damit die
  ~460 KB nicht das Datenvolumen von Besuchern belasten, die nie so weit
  scrollen.
- **Kein Leerzustand.** Fehlt das Video (Codec, langsame Verbindung), rückt
  die textliche 1-2-3-Anleitung in die Mitte, statt eine leere Fläche zu
  zeigen.

### 4.3 „So sieht's mit Daten aus" (`PreviewSection`)

Drei Kacheln, aus dem echten Demo-Datensatz gerendert (nicht händisch
gepflegte Zahlen): Sparziel, Verbrauchsverlauf, ein Messergebnis mit
Euro-Betrag. Eine Politur-Korrektur ist dokumentiert: Die erste Kachel zeigte
zunächst denselben Betrag wie der Hero-Mock (≈ 1.980 €) und wurde durch „Dein
Sparziel" (≈ 380 €/Jahr) ersetzt, um Wiederholung zu vermeiden – „neues
Versprechen statt Wiederholung".

### 4.4 „Was du machen kannst"

Vier Capability-Kacheln (Icon + Titel + Beschreibung): **Selbst messen** (9
Checks, 2–5 Minuten je nach `MEASUREMENT_CATALOG.estimatedMinutes`),
**Verbrauch verfolgen** (Zählerstände eintragen oder per Foto scannen),
**Sparpotenzial in Euro**, **Bericht als PDF**. Auf dem Handy als flache
Zeilen dargestellt (Icon links, Text rechts), ab Tablet-Breite als Karten im
Raster – eine bewusste Layout-Entscheidung gegen unnötige Bildschirmlänge.

### 4.5 Abschluss-CTA

Wiederholt beide CTAs (Fragebogen starten / Demo ansehen) und ergänzt einen
Login-Hinweis für bereits registrierte Nutzer.

---

## 5. Conversion-Mechanik

- **Zwei-Klick-Prinzip.** Von der Landing Page zum „Aha"-Moment (befüllte
  Demo) reicht ein Klick, ohne Formular dazwischen.
- **Analytics-Ereignisse** (`track()` in `analytics.ts`, nur nach
  Cookie-Einwilligung aktiv – siehe `docs/legal.md`): `landing_view` (ein
  Aufruf je echtem Erst-Besuch, nicht bei der internen Vorschau),
  `landing_cta_start` und `landing_cta_demo` (mit Angabe, **wo** geklickt
  wurde: `hero` / `preview` / `closing`), `demo_to_onboarding` (Wechsel aus
  der Demo ins eigene Onboarding). Diese Aufschlüsselung ist die
  Grundlage für ein späteres A/B-Testen der Hero-Formulierung.
- **Wiederkehrer-Weiche** (`useIsReturningVisitor()` in `App.tsx`): Wer die
  Landing Page schon gesehen hat, ein fertiges Profil besitzt oder gerade im
  Demo-Modus ist, sieht sie nicht erneut – jede URL, nicht nur `/`, wird
  dafür geprüft (`FirstVisitGate`). Begründung im Code: Ohne diese
  App-weite Prüfung hätte etwa ein gespeichertes Lesezeichen auf
  `/onboarding` oder die 404-Weiterleitung von GitHub Pages an der Landing
  Page vorbeigeführt – „wer den Cache leerte, landete so wieder auf einer
  veralteten Startseite".
- **Vorschau-Route `/willkommen`.** Die Landing Page lässt sich aus den
  Einstellungen heraus erneut ansehen (`SettingsPage.tsx` → „Landing Page
  ansehen"); ein `preview`-Flag unterdrückt dabei das `landing_view`-Ereignis,
  damit die Kennzahl nur echte Erstbesuche zählt.

---

## 6. Sprache und Design schon vor der Kontoentscheidung

Die Topbar der Landing Page enthält bereits die Sprach- und
Design-Umschaltung (`LandingPickers`) – ein Nachtrag aus der
Verbesserungsliste (`CLAUDE.md`, „Sprache und Design schon auf der Landing
Page einstellbar, nicht erst nach der Anmeldung"). Vorher waren beide
Einstellungen erst nach dem Anlegen eines Kontos erreichbar.

---

## 7. Rechtliches: Pflichtlinks auf der Landing Page

Die Landing Page trägt den `LegalFooter` mit den Pflichtlinks zu Impressum
und Datenschutzerklärung. Das Konzeptdokument benennt das ursprünglich noch
als offenen Punkt („öffentlich erreichbar, aber ohne Footer … separat zu
klären", Abschnitt I) – die Ergänzung ist mit Begründung § 5 DDG im
aktuellen Code-Kommentar festgehalten: „auf der öffentlichen Landing Page
besonders wichtig, weil hier der Erst-Besuch beginnt".

---

## 8. Das Demo-Profil: Zweck und Mechanik

Das Demo-Profil (`src/features/demo/demoProfile.ts`) erzeugt eine
**vollständige, realistische Beispiel-Wohnung** – Fragebogen-Antworten,
abgeschlossene Messungen, rund 18 Monate Zählerstände für Strom, Gas und
Wasser, eigene Tarife. Zentrale Eigenschaften:

- **Rein clientseitig.** Kein Konto, kein Firestore-Zugriff – die Daten
  entstehen im Browser und leben nur in den lokalen Stores.
- **Relativ zum aktuellen Datum gebaut** (`monthDate()`), damit die
  Verläufe beim Betrachten immer aktuell wirken, statt an einem festen
  Kalenderdatum zu kleben.
- **Aktivierung über `enterDemo()`:** setzt zuerst den Demo-Modus (bevor
  irgendetwas geschrieben wird), leert alle lokalen Stores
  (`resetAllStores()`) und spielt den Schnappschuss ein (`hydrate()`). Die
  Reihenfolge ist im Code als bewusst kommentiert: Der Demo-Modus muss
  **zuerst** gesetzt sein, damit die Cloud-Synchronisation eines
  angemeldeten Nutzers den folgenden Import nicht fälschlich als echte
  Änderung in die Cloud zurückschreibt.

### 8.1 Zwei Zugangswege

| Weg | Auslöser | Besonderheit |
|---|---|---|
| CTA auf der Landing Page | `openDemo()` in `LandingPage.tsx` | direkt und nahtlos, keine Zwischenabfrage – „der Button ist bereits die bewusste Entscheidung" |
| Link-Parameter `?demo` | `DemoLoader.tsx` | fragt vor dem Laden explizit nach, weil er auch angemeldete Nutzer mit einem echten Profil treffen kann (und nur dann, wenn die Demo nicht ohnehin schon läuft) |

Der zweite Weg ist wichtig für geteilte Links (z. B. in einer
Projektpräsentation): Er funktioniert unabhängig davon, wo die Person gerade
in der App ist, und schützt ein bestehendes Profil durch die Rückfrage.

**Seit dem 06.09.2026 trägt er zusätzlich Deep-Links.** `?demo` lässt sich an
jede Route hängen, und der Besucher bleibt nach dem Laden auf genau dieser
Adresse – `…/measurements/lighting?demo` öffnet den LED-Check, befüllt mit den
Daten der Beispiel-Wohnung. Vorher endete jeder solche Aufruf im
Zuhause-Dashboard, weil zwei Weichen den angefragten Pfad verwarfen (Befund 44
in `docs/gefundene-probleme.md`). Die schriftliche Ausarbeitung verweist über
diesen Mechanismus aus der PDF heraus auf einzelne Bereiche der App; die
Adressen stehen in `docs/hausarbeit-verlinkung.md`.

### 8.2 Sicherheits- und Datenmechanik

- **Cloud-Synchronisation pausiert**, solange der Demo-Modus aktiv ist – ein
  angemeldeter Nutzer, der aus Neugier `?demo` öffnet, riskiert damit weder
  Überschreiben noch versehentliches Hochladen seines echten Profils.
- **Immer ein sichtbarer Rückweg** (`DemoBanner`): ein schmaler Hinweisstreifen
  mit zwei Aktionen. Für Gäste zusätzlich **„Selbst loslegen"**, das direkt
  ins eigene Onboarding führt – „der begeisterte Besucher springt nahtlos
  weiter", ohne die App verlassen zu müssen.
- **Zwei unterschiedliche Exit-Pfade**, je nach Nutzerstatus: Ein Gast landet
  beim Verlassen wieder auf der Landing Page (Stores werden geleert). Ein
  angemeldeter Nutzer löst stattdessen einen Seiten-Neuladen aus, damit die
  Cloud-Synchronisation sein echtes Profil zurückholt – kein Store-Reset,
  der das echte Profil träfe.

---

## 9. Inhalt der Beispiel-Wohnung „Familie Berger"

Die Demo-Wohnung ist keine Zufallsdatenmenge, sondern auf Plausibilität
angelegt:

- **Haushalt:** 3 Personen, Baujahr 1962, 85 m², Gasheizung, sechs Räume
  (Wohn-, Schlaf-, Kinderzimmer, Küche, Bad, Flur), Fragebogen im
  vollständigen Modus mit den Zielen „Kosten sparen" und „CO₂ senken".
- **Zählerstände:** 18 Monate, mit saisonalen Mustern statt konstanter
  Steigung – Gasverbrauch stark winterlastig (232 m³ im Januar vs. 22 m³ im
  Juli), Strom mit leichtem Winteraufschlag, Wasser nahezu konstant. Das
  macht die Verlaufsdiagramme in der Demo-Vorschau realistisch statt linear.
- **Zehn abgeschlossene Messungen** über nahezu die gesamte Bewertungsskala
  verteilt (nicht nur „gut", um Aussagekraft zu demonstrieren):

  | Check | Bewertung | Beispielwert |
  |---|---|---|
  | Duschkopf | mittel | 11,4 L/min |
  | Warmwasser-Wartezeit | mittel | 24 s |
  | Grundlast | erhöht | 132 W |
  | Standby | (aus echter Geräteliste berechnet) | 5 Geräte, 31 W gesamt |
  | Kühlschrank | gut | 0,82 kWh/Tag |
  | Gefrierfach | erhöht | 12 % Mehrverbrauch durch Vereisung |
  | Raumtemperatur × 3 Räume | gut/gut/mittel | 21,5 °C / 18,5 °C / 22,5 °C |
  | Möbelabstand | mittel | 4 cm |
  | Beleuchtung | hoch | 3 von 6 Räumen ohne LED |

- **Eigener Tarif** statt App-Standardpreisen (36 ct/kWh Strom, eigene
  Gas-/Wasserpreise), damit die gezeigten Euro-Beträge in sich konsistent
  sind.

### 9.1 Ein Beleg für Sorgfalt statt Bequemlichkeit: das Standby-Ergebnis

Das Standby-Ergebnis der Demo-Wohnung wird **nicht** als fertige Zahl
hingeschrieben, sondern durch dieselbe Funktion erzeugt, die auch ein echtes
Nutzerergebnis berechnet (`calcStandby()`, aus einer Liste von fünf
benannten Beispielgeräten). Der Code-Kommentar nennt den Grund: Ein früherer,
von Hand eingetragener Demo-Wert stand noch im Datenformat von vor August
2026 und wurde von der aktuellen Ergebnis-Ansicht falsch gelesen – ein
Wattwert erschien als „31 €/Jahr", ohne Geräteaufschlüsselung
(dokumentiert als Befund #42 in `docs/gefundene-probleme.md`, behoben am
06.09.2026). Die Lehre daraus, die jetzt als Konvention gilt: **Ein
Demo-Ergebnis muss aus der echten Berechnungsfunktion entstehen**, sonst
kann es unbemerkt hinter das aktuelle Datenformat zurückfallen, wenn sich
dieses ändert.

---

## 10. Entwicklungsgeschichte in Zahlen

Zur Einordnung, wie stark die Landing Page nach dem ersten Entwurf noch
überarbeitet wurde (beide Politur-Runden sind im Konzeptdokument mit Datum
und Begründung festgehalten):

| Runde | Datum | Kernänderung | Effekt |
|---|---|---|---|
| Erste Politur | 16.08.2026 | Vertrauens-Signale umgehängt, redundante Kachel ersetzt, vertikaler Rhythmus gestrafft | Seitenhöhe bei 390 px Breite: 3514 px → 2740 px (−22 %) |
| Ergänzung „So läuft eine Messung ab" | 16.08.2026 | neuer Abschnitt ② nach Testnutzer-Feedback | Seitenhöhe wieder auf 3416 px – bewusst in Kauf genommen, weil er „die Lücke zwischen Versprechen und Ergebnis schließt, die vorher offen war" |

Bemerkenswert für die Ausarbeitung: Die zweite Änderung **verlängert** die
Seite wieder, obwohl die erste Runde ausdrücklich auf Kürzung zielte – ein
Beleg dafür, dass hier nutzerbeobachtetes Verständnisproblem stärker wog als
das zuvor gesetzte Kürzungsziel.

---

## 11. Grenzen und offene Punkte

Diese Punkte sollten in einer Ausarbeitung nicht unerwähnt bleiben:

1. **Kein durchgeführter A/B-Test.** Das Konzept nennt zwei alternative
   Hero-Überschriften explizit zum Testen, dokumentiert aber keine
   tatsächliche Auswertung – die gewählte Variante beruht auf Einschätzung,
   nicht auf gemessener Konversion.
2. **Das Demo-Profil trägt Felder, die der aktuelle Fragebogen nicht mehr
   erhebt.** `onboardingData` im Demo-Profil setzt u. a. `buildingType`,
   `floors`, `windowAge`, `postalCode`, `smartHomeDevices` und
   `hasExtraFireplace` – Felder, die laut `docs/onboarding-referenz.md`
   (Abschnitt 9) aus dem Fragebogen entfernt wurden, weil sie keine
   funktionale Lesestelle mehr haben. Das ist kein Fehler (das Datenmodell
   behält diese Felder ausdrücklich für Bestandsprofile), zeigt aber, dass
   das Demo-Profil an einer älteren, umfangreicheren Fragebogen-Version
   gebaut wurde und seither nicht auf den aktuellen Stand gekürzt ist.
3. **Die Analytics-Auswertung selbst liegt außerhalb des Codes.** Die
   Ereignisse werden zwar erfasst, ihre tatsächliche Interpretation
   (Konversionsraten, Absprungpunkte) ist nicht Teil des Repositories und
   daher hier nicht belegbar.
4. **Der Hero-Mock ist ein gestaltetes Beispiel, keine Live-Vorschau** – im
   Unterschied zu Abschnitt ③ verwendet er keine echten Demo-Daten, was im
   Konzept als bewusster Kompromiss (Aufwand vs. Authentizität) benannt,
   aber nicht empirisch validiert ist.

---

## 12. Wo was im Quellcode steht

| Datei | Inhalt |
|---|---|
| `src/features/landing/LandingPage.tsx` | Seitenaufbau, CTAs, Hero-Mock |
| `src/features/landing/GuidedSection.tsx` | Abschnitt „So läuft eine Messung ab" |
| `src/features/landing/PreviewSection.tsx` | Abschnitt „So sieht's mit Daten aus" |
| `src/features/landing/LandingPickers.tsx` | Sprach-/Design-Umschaltung in der Topbar |
| `src/features/demo/demoProfile.ts` | Erzeugung des Demo-Datensatzes |
| `src/features/demo/enterDemo.ts` | Aktivierung des Demo-Modus |
| `src/features/demo/DemoLoader.tsx` | Einstieg über `?demo`, mit Rückfrage |
| `src/features/demo/DemoBanner.tsx` | Hinweisstreifen mit Rückweg/„Selbst loslegen" |
| `src/app/App.tsx` | Routing, `useIsReturningVisitor()`, `FirstVisitGate` |
| `docs/landing-concept.md` | Feinkonzept mit Diagnose, Copy, Versionsgeschichte |
| `docs/gefundene-probleme.md`, Punkt 42 | Fallbeispiel: Formatfehler im Demo-Standby-Ergebnis |
| `docs/legal.md` | Rechtsgrundlage der Pflichtlinks auf der Landing Page |

---

## 13. Hinweise für die Weiterverarbeitung

- **Zahlen unverändert übernehmen** (Seitenhöhen, Wattwerte, Zeiträume) –
  sie sind aus Konzeptdokument und Code belegt.
- **Guter Aufhänger für die Gliederung:** die Zwei-Teilung „Versprechen
  (Landing) / Beweis (Demo)" aus Abschnitt 1 trägt ein ganzes Unterkapitel.
- **Gute Kandidaten für Abbildungen:** der Fünf-Abschnitte-Aufbau der
  Landing Page als Wireframe (Abschnitt 4); der Vergleich der beiden
  Politur-Runden mit Seitenhöhen (Abschnitt 10) als Vorher/Nachher.
- **Guter Kandidat für eine Diskussion/Reflexion:** der Zielkonflikt aus
  Abschnitt 10 (kürzen vs. verständlicher machen) als Beispiel dafür, dass
  ein einzelnes Optimierungsziel (Seitenlänge) einem beobachteten
  Nutzerproblem weichen musste.
- **Vorsicht bei Superlativen:** „vollständig getestet" oder „datenbasiert
  optimiert" sollten an Abschnitt 11, Punkt 1 (kein durchgeführter A/B-Test)
  gemessen werden.
