# E-App – Claude Anweisungen

## Session-Start (bei jeder neuen Session ausführen)

1. `git fetch origin main` ausführen
2. Vergleich zwischen `origin/main` und dem aktuellen Branch anzeigen:
   - Commits die in `main` sind, aber nicht im aktuellen Branch (neues aus main)
   - Commits die im aktuellen Branch sind, aber nicht in `main` (eigene Arbeit)
3. Kurze Zusammenfassung der Änderungen ausgeben (was wurde geändert, welche Dateien betroffen)
4. Falls `main` neue Commits hat: `git merge origin/main` anbieten oder automatisch ausführen
5. `docs/gefundene-probleme.md` überfliegen und den Stand mit einer Zeile
   nennen: wie viele Punkte offen sind und welche Fragen an Kilian warten
   (siehe „Offene Fragen" am Dateiende).
6. Fragen, ob neue Beobachtungen aus der Nutzung gesammelt werden sollen
   (dann nur sammeln/kategorisieren, nicht am Code ändern – siehe
   „Abgeschlossene Vorhaben → Verbesserungen aus der Sammelliste"), oder ob
   an einem bestehenden Punkt aus der Liste weitergearbeitet werden soll.

## Abgeschlossene Vorhaben

### Verbesserungen aus der Sammelliste + Live-Test-Runde (2026-09-04)

Die gemeldeten Punkte aus `weitere_Verbesserungen_der_Eapp.txt` liefen in 15
Etappen; direkt im Anschluss kam eine zweite Runde aus Kilians Live-Test der
deployten App dazu.

- **Etappen:** `docs/verbesserungen-etappen.md` – alle 15 fertig,
  `/verbesserung status` berichtet den Stand.
- **Live-Test-Befunde:** `docs/gefundene-probleme.md` – laufende Sammlung.
  Arbeitsweise: erst sammeln, kategorisieren (Bug/Problem/Verbesserung) und
  in die Datei eintragen, **ohne** Code zu ändern; erst wenn Kilian ausdrücklich
  „umsetzen" sagt, wird gebaut. Am 04.09. wurden auf diesen Wunsch hin acht von
  zehn gemeldeten Punkten direkt umgesetzt.
- Zwei Etappen betrafen Rechtstexte (Impressum, Datenschutzerklärung,
  Einwilligung vor Analytics). Sie sind nach bestem Wissen aufgebaut und
  benennen die tatsächlichen Verarbeitungen – **eine juristische Prüfung
  ersetzen sie nicht.**

**Was sich dadurch in der App konkret geändert hat:**

*Rechtliches & Datenschutz*
- Impressum und Datenschutzerklärung neu (`/impressum`, `/datenschutz`) –
  gab es vorher gar nicht.
- Cookie-Einwilligung vor Google Analytics – Analytics lädt jetzt erst nach
  Zustimmung, vorher startete es automatisch beim App-Start.
- Firestore-Datenspeicherung startet nicht mehr automatisch beim App-Start,
  sondern erst bei echtem Bedarf (Anmeldung/Sync) – vorher legte die App
  schon vor jeder Cookie-Entscheidung einen Gerätespeicher an.
- Cookie-Banner: „Cookie-Einstellungen" ist jetzt ein eigener, gleich
  prominenter Button statt eines kleinen Links.
- Neuer, dauerhaft sichtbarer Button zum Wiedereinstieg in die
  Cookie-Einstellungen (unten rechts, wie der Cookie-Hinweis selbst).

*Fragebogen*
- Neuer Abschluss-Bildschirm „Wofür wir das nutzen" – zeigt für jede Angabe,
  wo sie in der App landet.
- Studienziel „HTW" aus der Zielauswahl entfernt (Lerninhalte bleiben über
  den Wissensbereich erreichbar).
- Schritt „Ausstattung": Die Abfrage der vorhandenen Messgeräte ist der
  Übersicht „Was du zum Messen brauchst" gewichen – je Gerät, wofür die App es
  verlangt, welche Bauarten taugen und welche Checks ganz ohne Anschaffung
  laufen. Die Abfrage hatte eine einzige Wirkung (ein vorangehakter Schalter im
  Möbelabstand-Check) und stellte 24 Bauarten zur Wahl, die keine Zeile Code
  gelesen hat.
- Frage nach zusätzlichem Kamin/Ofen entfernt – sie hatte keine einzige
  funktionale Lesestelle.
- Frage nach vorhandenen Smart-Home-Geräten entfernt (05.09.) – ebenfalls ohne
  funktionale Lesestelle; ihre gesamte Wirkung war eine Zeile im PDF-Steckbrief,
  die für Bestandsprofile bestehen bleibt.
- Kühl- und Gefriergeräte stehen seit 05.09. auf einer eigenen Seite direkt vor
  „Ausstattung", statt unter der Messgeräte-Übersicht am Seitenende. Damit hat
  „Ausstattung" keine Frage mehr und ist – wie „Preise & Kosten" – eine reine
  Auskunft.
- Frage nach Mieter oder Eigentümer entfernt (05.09.) – sie hätte genau einen
  Tipp gefiltert (Alter des Kessels), und der ist für Mieter das Argument
  gegenüber der Vermietung. Der Schritt heißt seither nur noch „Standort".
- Die PV-Angabe trägt jetzt auch Empfehlungen: „Ja" rät, große Verbraucher in
  die Mittagsstunden zu legen (Eigenverbrauch statt Einspeisung), „geplant" rät,
  vor der Auslegung die eigene Grundlast zu messen. Den Erzeugungszähler im
  Monitoring schaltete sie schon vorher frei.
- Die Warmwasser-Angabe wirkt sichtbar: Der Duschkopf-Check nennt die Herkunft
  seiner Vorbelegung, „Nicht bekannt" rät auf den Wärmeerzeuger statt pauschal
  auf Strom, und „Separates System" trägt eine eigene Empfehlung.

*Monitoring*
- Das Verlaufsdiagramm hinterlegt bei Gas, Öl, Pellets und Wärmepumpe die
  **Heizperiode** (Okt–Apr), damit sichtbar wird, wann der Verbrauch entstanden
  ist. Ein Sommer-Check, der daraus einen Befund ableitete, war am 05.09. kurz
  da und ist auf Kilians Wunsch wieder entfallen – das Band ordnet ein, es
  bewertet nicht.

*Messungen*
- Kellerklima wird nach Keller-Maßstäben bewertet (Taupunkt-Berechnung statt
  Wohnraum-Prozentwert).
- Warmwasser-Wartezeit nutzt den tatsächlich gemessenen Duschkopf-Durchfluss
  statt eines Pauschalwerts, mit aufklappbarer „So gerechnet"-Übersicht;
  zusätzlich behoben: ältere Ergebnisse ohne diesen Messwert zeigten
  fälschlich „0 Liter" statt „nicht gemessen".
- Duschkopf-Ergebnistexte neu formuliert – Wassermenge vor Euro-Betrag, keine
  Kaufempfehlung mehr, Hinweis dass „Eco"/„sparsam" keine geschützten Begriffe
  sind.
- Möbelabstand-Zielwert von 10 auf 30 cm angehoben (belegt); zusätzlich
  behoben, dass Abstände bis 5 cm fälschlich als „Gut" statt kritisch
  bewertet wurden.
- Mehrere Geräte gleicher Art (z. B. zwei Kühlschränke) lassen sich einzeln
  erfassen, benennen und getrennt messen – vorher überschrieb ein zweites
  Gerät automatisch das Ergebnis des ersten.
- Kühlschrank/Gefriergerät nutzt die gemessene Raumtemperatur aus dem
  Raumklima-Check desselben Raums, wenn vorhanden.
- Kein automatisches Weiterspringen mehr nach „Speichern & Fertig" bei
  Grundlast, Standby, LED, Duschkopf, Kühl- und Gefrierschrank.
- Kleines Verlaufsdiagramm im Monitoring zeigt echte zeitliche Abstände
  zwischen Ablesungen.
- Halten der +/- Buttons bei Zahleneingaben zählt automatisch und
  beschleunigt weiter.

*Bericht (PDF)*
- Neues Kapitel „Haushalts-Steckbrief" zu Beginn: Gebäude, Haushalt,
  Anlagentechnik, Sanierungshistorie.
- Neues Kapitel „Handlungsplan": offene Tipps nach Aufwand gruppiert, nach
  eigenen Zielen sortiert.
- Jede Bewertung zeigt den Vergleichs-Richtwert daneben, plus
  Quellenverzeichnis am Ende.
- Zusätzlicher direkter Download-Button (bisher am PC teils nur „teilen").

*Bedienung allgemein*
- Sprache und Design schon auf der Landing Page einstellbar, nicht erst nach
  der Anmeldung.
- Seite springt bei jedem Seitenwechsel an den Anfang (vorher blieb die
  Scroll-Position z. B. zwischen Impressum/Datenschutz stehen).

Konventionen, die dabei entstanden sind und weiter gelten:

- **Jedes `OnboardingData`-Feld braucht einen Abnehmer.**
  `src/features/onboarding/fieldUsage.ts` deckt jedes Feld ab, ein Test hält
  die Liste der Felder ohne Abnehmer exakt fest – ein neues Feld ohne Eintrag
  lässt Typecheck und Test rot werden.
- **Jeder Richtwert nennt seine Herkunft.** `ThresholdOrigin` in
  `measurementThresholds.ts` ist `'reference'` (belegte Quelle), `'own'`
  (Richtwert der E-App, begründet) oder `'pending'` (noch offen) – nie
  unmarkiert.
- **Jede Messung nennt ihre Messgeräte.** `MeasurementMeta.instruments`
  (`measurements/catalog.ts`) ist Pflicht – ein leeres Array ist die gültige
  Aussage „braucht keins". Die Geräte-Übersicht im Fragebogen wird daraus
  hergeleitet (`measurements/instrumentNeeds.ts` dreht die Zuordnung um), nie
  danebengeschrieben: Nimmt ein Check seinen Mess-Schritt weg, verschwindet er
  dort von selbst.

Offen geblieben: Drei Richtwerte ohne belegte Quelle (Warmwasser-Wartezeit-,
Grundlast- und Standby-Schwellen, verdeckte Heizkörperfläche bei
Fußbodenheizung, Details in Etappe 6 des Trackers). Die Raumzuordnung bei der
Warmwasser-Wartezeit (mehrere Bäder/Entnahmestellen) wartet auf Kilians
Entscheidung zur Auswahl-Struktur – siehe „Offene Fragen" in
`docs/gefundene-probleme.md`.

### Wissen-Ausbau (2026-08-31)

Die drei Ansichten des Wissensbereichs waren dieselbe Konstruktion: ein
Suchfeld über zugeklappten Accordions. Der Zuschnitt blieb; Oberfläche und
Inhalt wurden aufgewertet.

- **Konzept:** `docs/wissen-concept.md` · **Etappen:** `docs/wissen-etappen.md` –
  alle vier fertig
- `/wissen status` berichtet den Stand; was offen blieb, steht am Ende des
  Trackers.
- Inhalt: FAQ 12 → 35 Fragen, Glossar 31 → 58 Begriffe, Mess-Hintergründe
  5 → 9.
- Zwei Regeln, die weiter gelten: **additiv** – die Content-Typen bekommen
  optionale Felder, kein Bestandseintrag muss angefasst werden. Und **Zahlen
  stehen an einer Stelle**: Die Richtwerte-Tabellen in
  `src/features/education/measurementThresholds.ts` enthalten keine einzige
  Grenze als Zahl, sondern importieren sie aus dem Mess-Modul, das mit ihr
  rechnet. Wer hier einen Richtwert ergänzt, exportiert ihn dort.
- Offen geblieben: Die Quellen zeigen weiter auf Wikipedia. Die Umstellung auf
  Primärquellen braucht Netzzugang zum Prüfen der URLs – Begründung im Tracker.

### Tank-Umbau (2026-08-30)

Öl, Pellets und Flüssiggas werden nicht gezählt, sondern bevorratet: Der Stand
fällt und springt beim Befüllen zurück. Sie liefen bis dahin im Zähler-Modell,
das für sie falsch herum rechnet.

- **Konzept:** `docs/tank-concept.md` · **Etappen:** `docs/tank-etappen.md` –
  alle vier fertig
- `/tank status` berichtet den Stand; was offen blieb, steht am Ende des
  Trackers.
- Leitgedanke, der weiter gilt: Ein Tank ist ein Zähler, rückwärts gelesen,
  plus Lieferungen. Der Füllstand wird in `counterSeries` in einen virtuellen
  Zählerstand übersetzt und läuft durch die vorhandene Auswertung – **keine
  zweite Rechenkette.** Wer hier etwas anbaut, baut es dort an.

### Fragebogen-Umbau (2026-08-24)

- **Konzept:** `docs/questionnaire-concept.md` · **Etappen:**
  `docs/questionnaire-etappen.md` – alle sechs Etappen fertig
- `/etappe status` berichtet den Stand; was danach offen blieb, steht am Ende
  des Trackers.

## Arbeitsweise bei Etappen-Vorhaben

Eine Etappe pro Session. Nach jeder Etappe: Tracker aktualisieren (Status,
Datum, Commit) und den Arbeits-Branch pushen – den Merge nach `main` macht
Kilian (siehe „Branches").

## Branches

- `main` – Hauptbranch, stabiler Code, wird bei Push automatisch nach Firebase
  Hosting **und** GitHub Pages deployt (siehe „Deployment & Infrastruktur")

### Der Merge nach `main` gehört dem Menschen

**Claude mergt nicht nach `main` und pusht nicht nach `main`** – auch dann
nicht, wenn alle Prüfungen grün sind. Nach jeder abgeschlossenen Änderung:

1. `git status` prüfen – Working Tree muss sauber sein
2. Commit auf dem Arbeits-Branch, Nachricht auf Deutsch mit Begründung im Rumpf
3. `git push -u origin <feature-branch>` – **nur** den Feature-Branch
4. Berichten, was fertig ist und was die Abnahme ergab

Den Merge nach `main` macht Kilian selbst, wenn es ihm passt.

Grund: Ein Push auf `main` löst den Auto-Deploy nach Firebase Hosting und
GitHub Pages aus – die Änderung ist damit sofort live, ohne dass jemand sie
gesehen hat. Bis 25.08.2026 wurde direkt nach `main` gemergt (immer als
Fast-Forward, also faktisch direkt auf `main` entwickelt). Seither liegt der
Zeitpunkt des Deployens beim Menschen, nicht beim Agenten.

Ausnahme: Nur wenn Kilian in der laufenden Sitzung ausdrücklich sagt, dass
gemergt werden soll.

## Projekt-Kontext

- Deutsche Energie-Analyse-App (React 19 + TypeScript + Tailwind CSS v4)
- Client-seitig mit localStorage; zusätzlich Firebase-Backend (Auth, Firestore,
  Cloud Function für den Zähler-Scan) – Projekt `e-app-info`
- Deployt automatisch nach Firebase Hosting (https://e-app-info.web.app) und
  GitHub Pages (`/E-App/` base path)
- Sprachen: Deutsch (primär) + Englisch

## Konventionen

### Feld-Migrationen gehören in `migrateOnboardingData`

Neue oder umbenannte Felder in `OnboardingData` werden **in
`migrateOnboardingData` (`src/store/onboardingStore.ts`)** migriert, nicht im
`merge`-Block des `persist`-Middleware-Aufrufs.

Grund: Zwei Wege laden ein Profil in den Store – der `persist`-Merge beim Start
**und** der Cloud-Sync, der den Profilzustand per `setState` direkt schreibt.
Der zweite geht am `merge` vorbei. Stünde die Migration nur dort, käme ein
Altprofil aus der Cloud unmigriert an. Beide Wege rufen `migrateOnboardingData`
auf – dort greift die Migration also in jedem Fall.

### Gespeicherte Messergebnisse bleiben lesbar

`MeasurementResult.details` nimmt nur Zahlen auf (`Record<string, number>`),
freie Bezeichnungen stehen unter demselben Schlüssel in `labels`. Ändert sich
das Kodier-Format einer Messung, muss die Ergebnis-Ansicht **beide** Formate
lesen: Ergebnisse sind bereits gespeichert und werden nicht migriert. Beispiel:
Standby-Geräte, `dev{i}` + `labels` heute, `dev{i}_{type}` in Altergebnissen
(siehe `StandbyResult.decodeDevices`).

## Deployment & Infrastruktur

Vollständige Übersicht: **`docs/deployment.md`**. Das Wichtigste in Kürze:

- **Auto-Deploy bei Push auf `main`** (kein manuelles Deployen nötig):
  - `.github/workflows/firebase-deploy.yml` → **Hosting + Functions** nach
    Firebase (`e-app-info`)
  - `.github/workflows/deploy.yml` → GitHub Pages
- **Firebase-Anmeldung im CI:** Service-Account
  `github-deploy@e-app-info.iam.gserviceaccount.com` (Rollen: Editor, Firebase
  Admin, Service Account User, Secret Manager Admin); JSON-Key als GitHub-Secret
  **`FIREBASE_SERVICE_ACCOUNT`**. Manuell auslösbar: Actions → „Deploy to
  Firebase" → „Run workflow".
- **Manueller Fallback:** `npm run deploy:firebase` (Hosting) bzw.
  `firebase deploy --only functions`.
- **Zähler-Scan:** Cloud Function `scanMeter` (`functions/index.js`, Region
  `europe-west1`), Modell **`gemini-flash-latest`**, Gemini-Key als
  Firebase-Secret **`GEMINI_API_KEY`** (nie im Client/Repo). Details:
  `docs/gemini-scan-setup.md`.
- **Billing:** Firebase Blaze + Google-Cloud-**Vollkonto** aktiv (Gemini-API
  akzeptiert keine Trial-Credits). Reale Kosten ~0.
- Web-Config in `src/lib/firebase.ts` ist **nicht geheim** und darf im Code
  stehen; der CI-Service-Account-Key dagegen **nur** als GitHub-Secret.

## Rechtliches (Impressum, Datenschutz, Einwilligung)

Vollständige Übersicht: **`docs/legal.md`**. Kurz:

- Betreiberangaben ausschließlich in `src/features/legal/operator.ts` pflegen –
  fehlende Pflichtfelder werden auf `/impressum` sichtbar markiert.
- Rechtstexte (`/impressum`, `/datenschutz`) sind **nur deutsch**; Banner,
  Fußzeile und Einstellungen bleiben zweisprachig.
- **Google Analytics wird erst nach ausdrücklicher Einwilligung geladen**
  (§ 25 Abs. 1 TDDDG). `lib/firebase.ts` darf Analytics **nicht** beim Start
  initialisieren – nur `features/analytics/analytics.ts` ruft `loadAnalytics()`.
- Kommt ein weiterer einwilligungsbedürftiger Dienst dazu: Kategorie in
  `features/legal/consent.ts` ergänzen, Datenschutzerklärung erweitern **und
  `CONSENT_VERSION` erhöhen** (sonst gilt die alte Einwilligung weiter).
