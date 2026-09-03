# E-App – Claude Anweisungen

## Session-Start (bei jeder neuen Session ausführen)

1. `git fetch origin main` ausführen
2. Vergleich zwischen `origin/main` und dem aktuellen Branch anzeigen:
   - Commits die in `main` sind, aber nicht im aktuellen Branch (neues aus main)
   - Commits die im aktuellen Branch sind, aber nicht in `main` (eigene Arbeit)
3. Kurze Zusammenfassung der Änderungen ausgeben (was wurde geändert, welche Dateien betroffen)
4. Falls `main` neue Commits hat: `git merge origin/main` anbieten oder automatisch ausführen
5. `docs/verbesserungen-etappen.md` überfliegen und den Arbeitsstand mit einer
   Zeile nennen: welche Etappe ist als Nächstes dran, welche Größe und welcher
   Usage-Anteil.
6. **Nach Usage-Stand und Zeit bis zum Reset fragen** – und daraus eine
   Etappen-Kombination für heute vorschlagen (Faustregeln in der Tabelle
   „Was in mein Fenster passt" im Tracker). Ein Vorschlag, keine Entscheidung.
   Dann auf Kilians Auswahl warten und mit `/verbesserung <Nummer>` starten.

## Laufendes Vorhaben: Verbesserungen aus der Sammelliste

Die gemeldeten Punkte aus `weitere_Verbesserungen_der_Eapp.txt` sind bis auf
elf abgearbeitet. Diese elf plus ein neu aufgenommener (21.1 – jede Angabe des
Fragebogens braucht einen Abnehmer) sind in 15 Etappen gefasst.

- **Arbeitsstand (Wie weit):** `docs/verbesserungen-etappen.md` – 15 Etappen,
  jede einzeln lauffähig und deploybar, bewusst unterschiedlich groß (S/M/L)
  mit geschätztem Usage-Anteil, damit sich nach verbleibendem Fenster
  entscheiden lässt, was noch reinpasst
- **Teil-Konzept:** `docs/geraete-concept.md` – das Warum hinter den Etappen
  12a bis 12d (ein Ergebnis je Kühl-/Gefriergerät)
- **Bearbeiten mit:** `/verbesserung` (nächste offene), `/verbesserung 3`
  (gezielt), `/verbesserung status` (nur berichten)
- **Zwei Etappen brauchen einen Menschen:** Etappe 6 (Primärquellen) verlangt,
  dass Kilian am PC die Links durchklickt – in dieser Umgebung lassen sie sich
  finden, aber nicht öffnen. Etappe 11 (Duschkopf-Empfehlung) beginnt mit
  einem Textvorschlag zur Abstimmung, nicht mit Code.
- Zwei Etappen betreffen Rechtstexte (Impressum, Datenschutzerklärung,
  Einwilligung vor Analytics). Sie sind nach bestem Wissen aufgebaut und
  benennen die tatsächlichen Verarbeitungen – **eine juristische Prüfung
  ersetzen sie nicht.**

## Abgeschlossene Vorhaben

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
