# E-App – Claude Anweisungen

## Session-Start (bei jeder neuen Session ausführen)

1. `git fetch origin main` ausführen
2. Vergleich zwischen `origin/main` und dem aktuellen Branch anzeigen:
   - Commits die in `main` sind, aber nicht im aktuellen Branch (neues aus main)
   - Commits die im aktuellen Branch sind, aber nicht in `main` (eigene Arbeit)
3. Kurze Zusammenfassung der Änderungen ausgeben (was wurde geändert, welche Dateien betroffen)
4. Falls `main` neue Commits hat: `git merge origin/main` anbieten oder automatisch ausführen

## Branches

- `main` – Hauptbranch, stabiler Code, wird bei Push automatisch nach Firebase
  Hosting **und** GitHub Pages deployt (siehe „Deployment & Infrastruktur")
- Nach jeder abgeschlossenen Änderung: Feature-Branch in `main` mergen und pushen
  1. `git status` prüfen – Working Tree muss sauber sein (keine uncommitteten Änderungen)
  2. `git checkout main`
  3. `git merge <feature-branch> --no-edit`
  4. `git push origin main`
  5. `git checkout <feature-branch>` (zurück zum Arbeits-Branch)
  6. `git push -u origin <feature-branch>` – Feature-Branch ebenfalls pushen

## Projekt-Kontext

- Deutsche Energie-Analyse-App (React 19 + TypeScript + Tailwind CSS v4)
- Client-seitig mit localStorage; zusätzlich Firebase-Backend (Auth, Firestore,
  Cloud Function für den Zähler-Scan) – Projekt `e-app-info`
- Deployt automatisch nach Firebase Hosting (https://e-app-info.web.app) und
  GitHub Pages (`/E-App/` base path)
- Sprachen: Deutsch (primär) + Englisch

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
