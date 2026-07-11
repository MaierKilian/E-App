# Deployment & Infrastruktur

Zentrale Übersicht, **wie und wohin die E-App deployt wird** – gedacht als
schneller Einstieg (auch für eine neue Session / neue KI). Stand: Juli 2026.

---

## Wo läuft die App?

| Ziel                | URL                             | Zweck                          |
| ------------------- | ------------------------------- | ------------------------------ |
| **Firebase Hosting**| https://e-app-info.web.app      | **primär genutzt** (mit Login) |
| **GitHub Pages**    | `…/E-App/`                      | zusätzlich, historisch         |

Beide werden bei **jedem Push auf `main` automatisch** aktualisiert – **kein
manuelles Deployen mehr nötig**.

---

## Automatische Deploys (GitHub Actions)

Zwei Workflows in `.github/workflows/`:

1. **`firebase-deploy.yml`** → deployt **Hosting + Functions** nach Firebase
   (Projekt `e-app-info`).
2. **`deploy.yml`** → deployt die Web-App nach **GitHub Pages** (Base `/E-App/`).

Beide laufen bei Push auf `main` und sind zusätzlich manuell auslösbar
(Repo → **Actions** → Workflow wählen → **„Run workflow"**).

### Anmeldung des Firebase-Workflows

`firebase-deploy.yml` meldet sich per **Service-Account** an:

- Service-Account: **`github-deploy@e-app-info.iam.gserviceaccount.com`**
- Rollen: **Editor**, **Firebase Admin**, **Service Account User**,
  **Secret Manager Admin**
- Der JSON-Schlüssel liegt als **GitHub-Secret `FIREBASE_SERVICE_ACCOUNT`**
  (Repo → Settings → Secrets and variables → Actions).

> **Zwei verschiedene „Schlüssel" nicht verwechseln:**
> - Der **CI-Service-Account-Key** (oben) wird **nur für das Deployen** benutzt
>   und liegt als GitHub-Secret – **nie im Repo**.
> - Die **Web-Config** in `src/lib/firebase.ts` ist **nicht geheim** (öffentliche
>   Firebase-Client-Config) und darf im Code stehen.
> - Ein **Firebase-Admin-SDK-Key** wird von der App **nicht** gebraucht.

Wenn ein Firebase-Deploy fehlschlägt, nennt das Actions-Log meist eine fehlende
IAM-Rolle → diese dem Service-Account ergänzen.

---

## Manuelles Deployen (Fallback)

Nur nötig, falls die Automatik mal nicht greift. Voraussetzung: Firebase CLI
installiert (`npm install -g firebase-tools`) und `firebase login`.

```bash
npm run deploy:firebase          # baut (Base /) + deployt NUR Hosting
firebase deploy --only functions # deployt NUR die Cloud Function
firebase deploy                  # alles (Hosting, Functions, Firestore-Rules)
```

- `npm run build:firebase` setzt `VITE_BUILD_BASE=/` (Firebase liegt unter `/`,
  GitHub Pages unter `/E-App/`).

---

## Backend-Bausteine (Firebase-Projekt `e-app-info`)

- **Hosting** – liefert die gebaute Web-App aus (`dist/`).
- **Authentication** – E-Mail/Passwort + Google. Ohne Login sind Messungen,
  Monitoring und Berichte gesperrt (`src/components/LoginGate.tsx`).
- **Firestore** – Cloud-Speicher pro Nutzer (`users/{uid}`), Regeln in
  `firestore.rules`. Sync: `src/features/sync/cloudSync.ts`.
- **Cloud Functions** – die Zähler-Scan-Funktion (siehe unten).

**Abrechnung:** Firebase **Blaze** (Pay-as-you-go) ist aktiv, und das Google-
Cloud-Konto ist als **Vollkonto aktiviert**. Letzteres ist zwingend, weil die
**Gemini-API keine Gratis-Trial-Credits akzeptiert** (sonst Fehler
`RESOURCE_EXHAUSTED` / „prepayment credits depleted"). Reale Kosten bei
Haushaltsnutzung: praktisch **0 €**. Budget-Alarm (1 €) empfohlen.

---

## Zähler-Scan via Google Gemini

- **Function:** `scanMeter` in `functions/index.js`, Region **`europe-west1`**,
  aufrufbar (callable), verlangt angemeldeten Nutzer.
- **Modell:** **`gemini-flash-latest`** (Alias auf das aktuelle Flash-Modell).
  Feste Versionen wie `gemini-2.5-flash` werden für neue Projekte gesperrt
  (`404 … no longer available to new users`). Überschreibbar per Env
  `GEMINI_MODEL`.
- **API-Key:** liegt ausschließlich als Firebase-Secret **`GEMINI_API_KEY`**
  (`firebase functions:secrets:set GEMINI_API_KEY`) – **nie im Client/Repo**.
- **Frontend:** `src/features/monitoring/scanRemote.ts` ruft die Function;
  `MeterScanner.tsx` nutzt bei Fehler still die On-Device-OCR (`ocr.ts`) als
  Fallback.
- **Ausgabe-Format:** führende Nullen entfernt + erste Nachkommastelle, z. B.
  `07356,453` → **`7356,4`**.
- **Token-Verbrauch pro Scan:** wird geloggt. Google Cloud → **Logs Explorer**,
  nach `Gemini-Tokens` filtern (Felder prompt/output/total).

Ausführliche Einrichtung: **`docs/gemini-scan-setup.md`**.

---

## Typischer Ablauf einer Änderung

1. Auf einem Feature-Branch entwickeln, committen.
2. Branch nach `main` mergen und pushen (siehe `CLAUDE.md` → Branches).
3. Fertig – GitHub Actions deployt automatisch nach Firebase **und** GitHub
   Pages. Fortschritt im **Actions**-Tab; nach ~2–3 Min live.
