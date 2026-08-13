# Firebase-Setup – E-App öffentlich machen

Ziel: Die E-App als öffentliche Web-App mit **Login** und **Cloud-Backend** über
Firebase. (Custom Domain ist vorerst zurückgestellt – die App läuft unter
`https://e-app-info.web.app`.)

Diese Datei ist gleichzeitig **Anleitung** und **Fortschritts-Checkliste**.

---

## Überblick der Bausteine

| Baustein            | Firebase-Produkt          | Status   | Kosten            |
| ------------------- | ------------------------- | -------- | ----------------- |
| Website ausliefern  | Hosting                   | ✅ läuft  | kostenlos         |
| Login / Accounts    | Authentication            | ⏳ to do  | kostenlos         |
| Backend / Daten     | Firestore (Datenbank)     | ⏳ to do  | kostenlos (Spark) |
| Eigene Domain       | Hosting → Custom Domain   | ⏸ später | kostenlos         |

> **Wichtig:** Die **Web-App selbst** braucht keinen Admin-Schlüssel – sie nutzt
> ausschließlich die öffentliche Web-Config (siehe `.env.example`). Ein
> Service-Account-`.json` gehört **niemals ins Repo oder in Chats**.
>
> Für den **automatischen CI-Deploy** (GitHub Actions) wird hingegen ein
> Service-Account verwendet – dessen Key liegt als **GitHub-Secret**
> `FIREBASE_SERVICE_ACCOUNT` (nicht im Repo). Siehe `docs/deployment.md`.

---

## Phase A – Grundlage im Code (ERLEDIGT ✅)

Wurde bereits umgesetzt:

- [x] `firebase`-SDK installiert
- [x] Build-Pfad konfigurierbar gemacht (`vite.config.ts`)
  - `npm run build` → Pfad `/E-App/` (GitHub Pages, unverändert)
  - `npm run build:firebase` → Pfad `/` (Firebase Hosting)
- [x] `src/lib/firebase.ts` – zentrale Firebase-Initialisierung mit Web-Config
- [x] Web-App in der Firebase Console registriert
- [x] `.gitignore` schützt Admin-Schlüssel (Service Account)

---

## Phase B – Web-App in Firebase registrieren (ERLEDIGT ✅)

- [x] Web-App in der Console registriert
- [x] `firebaseConfig` fest in `src/lib/firebase.ts` eingetragen

> Die Web-Config ist nicht geheim und liegt deshalb direkt im Code. So
> funktioniert die App ohne zusätzliche `.env` überall (lokal, GitHub Pages,
> Firebase).

---

## Phase C – Login (ERLEDIGT ✅)

In der Console (erledigt):

- [x] **E-Mail/Passwort** aktiviert
- [x] **Google** aktiviert

### Google-Login Zuverlässigkeit (Safari/iOS)

**Problem:** Google-Login schlägt auf Safari/iOS teils fehl (Anmeldung wirkt
erfolgreich, Nutzer bleibt aber ausgeloggt). Ursache: Die `authDomain` weicht von
der App-Domain ab (`firebaseapp.com` vs. `web.app`) → der OAuth-Abschluss läuft
in einem Cross-Origin-Kontext, dessen Storage Safari/iOS (ITP) blockiert;
`getRedirectResult()` liefert dann `null`.

**Die Lösung** ist der First-Party-Auth-Handler: `authDomain` = App-Domain
(`e-app-info.web.app`), dann läuft alles gleich-origin. Das geht **nur zusammen
mit einem Console-Schritt** – ohne ihn ist der Login komplett tot:

> ⚠️ **Fehler 400: `redirect_uri_mismatch`**
> Google prüft die `redirect_uri` gegen eine Allowlist im OAuth-Client. Der von
> Firebase automatisch angelegte Client kennt nur die `firebaseapp.com`-Variante.
> Schaltet man `authDomain` auf `web.app` um, ohne die URI nachzutragen, bricht
> Google jeden Login-Versuch mit „Zugriff blockiert: Die Anfrage dieser App ist
> ungültig" ab.

#### Schritt 1 – OAuth-Client erweitern (einmalig, Google Cloud Console)

1. Firebase Console → **Authentication → Sign-in method → Google** aufklappen →
   ganz unten **„Web SDK configuration"** → Link **„Web client ID"** öffnen.
   (Direkt: Google Cloud Console → **APIs & Services → Credentials** → OAuth-2.0-
   Client-ID **„Web client (auto created by Google Service)"**, Projekt `e-app-info`.)
2. Unter **Authorised redirect URIs** ergänzen:
   ```
   https://e-app-info.web.app/__/auth/handler
   ```
   *(Der bestehende Eintrag `https://e-app-info.firebaseapp.com/__/auth/handler`
   bleibt stehen – localhost und GitHub Pages nutzen ihn weiter.)*
3. Unter **Authorised JavaScript origins** ergänzen:
   ```
   https://e-app-info.web.app
   ```
4. **Speichern.** Änderungen brauchen erfahrungsgemäß ein paar Minuten.

#### Schritt 2 – Im Code scharfschalten

In `src/lib/firebase.ts`:

```ts
const USE_FIRST_PARTY_AUTH_DOMAIN = true   // vorher: false
```

Push auf `main` → Auto-Deploy. Danach nutzt die App auf `e-app-info.web.app` den
gleich-origin Auth-Handler, und `features/auth/auth.ts` schaltet auf iOS/PWA
automatisch auf `signInWithRedirect` um (siehe `authDomainIsFirstParty`).

> **Solange der Schalter `false` ist**, läuft alles über
> `e-app-info.firebaseapp.com` und **überall per Popup** – funktioniert
> zuverlässig, ist auf iOS-Safari aber gelegentlich zäh. Das ist der sichere
> Zustand ohne Console-Schritt.

**Ebenfalls erledigt:** `firebase.json` setzt `X-Frame-Options` auf `SAMEORIGIN`
statt `DENY` (das strikte `DENY` hätte auch das gleich-origin Auth-iframe
blockiert).

**Autorisierte Domains** (Authentication → Settings) müssen enthalten:
`e-app-info.web.app`, `e-app-info.firebaseapp.com`, `localhost` – und
`maierkilian.github.io`, falls das GitHub-Pages-Deployment für Login genutzt
wird. Auf `maierkilian.github.io` bleibt der Login immer cross-origin (der
Auth-Handler liegt nur auf den Firebase-Domains) – `e-app-info.web.app` ist der
zuverlässige Weg.

Im Code (erledigt):

- [x] `src/store/authStore.ts` – globaler Anmeldestatus (live über Tabs)
- [x] `src/features/auth/auth.ts` – Login/Registrieren/Google/Logout/Reset
- [x] `src/features/auth/LoginPage.tsx` – Anmelde-/Registrierseite unter `/login`
- [x] `src/components/LoginGate.tsx` – sperrt Funktionen für Gäste (motiviert
      zum Registrieren); Nutzung: `<LoginGate><Funktion /></LoginGate>`
- [x] Profilmenü zeigt Konto + Abmelden (bzw. „Anmelden" für Gäste)

**Gast-Einschränkung (umgesetzt):** Nur mit Login nutzbar sind **Messungen**,
**Monitoring** und **Berichte**. Frei bleiben **Zuhause/Onboarding** und
**Wissen**. Umgesetzt über `<LoginGate>` in `src/app/App.tsx`.

---

## Phase D – Backend / Cloud-Speicher (Firestore)

Im Code (ERLEDIGT ✅):

- [x] `src/features/sync/cloudSync.ts` – spiegelt die Nutzer-Stores nach Firestore
      (`users/{uid}`), lädt beim Login, lädt lokale Daten beim Erststart hoch,
      schreibt Änderungen verzögert. Theme/Sprache bleiben lokal.
- [x] In `main.tsx` via `initCloudSync()` gestartet
- [x] `firestore.rules` – jeder Nutzer nur auf sein eigenes Dokument
- [x] `firebase.json` um den Firestore-Abschnitt ergänzt

**DU in der Console (einmalig, ~2 Min):**

1. Linkes Menü → **Build → Firestore Database** → **„Datenbank erstellen"**
2. Region **`eur3` (europe-west)** wählen (Datenschutz / DSGVO).
   ⚠️ Region lässt sich später **nicht** mehr ändern.
3. Im **Produktionsmodus** starten.
4. Tab **Regeln (Rules)** → den Inhalt von `firestore.rules` (siehe Repo)
   einfügen → **Veröffentlichen**.
   *(Alternativ später automatisch per `firebase deploy --only firestore:rules`.)*

> **Checkliste Phase D**
> - [ ] Firestore-Datenbank erstellt (Region europe-west)
> - [ ] Sicherheitsregeln veröffentlicht
> - [x] Code-Synchronisation (erledigt)

---

## Phase E – Live schalten (ERLEDIGT ✅ – jetzt automatisch)

Deploys laufen inzwischen **automatisch** bei jedem Push auf `main`
(GitHub Actions → Firebase Hosting + Functions). Details: `docs/deployment.md`.

Manueller Fallback (Firebase CLI installiert & `firebase login`):

```bash
npm run deploy:firebase          # baut + deployt Hosting
firebase deploy --only functions # deployt die Cloud Function
```

Live unter `https://e-app-info.web.app`.

---

## Phase F – Custom Domain (zurückgestellt)

Wenn ihr `e-app-beta.de` doch nutzen wollt:
Console → Hosting → „Needs setup" bei der Domain → die angezeigten DNS-Einträge
beim Domain-Anbieter eintragen → Firebase erstellt das HTTPS-Zertifikat
automatisch.

---

## Nützliche Befehle

```bash
npm run dev              # lokal entwickeln (http://localhost:5173)
npm run build:firebase   # Produktions-Build für Firebase (Pfad /)
npm run deploy:firebase  # Build + Deploy zu Firebase Hosting
```
