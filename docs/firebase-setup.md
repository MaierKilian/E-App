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

> **Wichtig:** Der Admin-Schlüssel (Service-Account-`.json`) wird für diesen Weg
> **nicht** gebraucht und gehört **niemals** ins Repo oder in Chats. Die Web-App
> nutzt ausschließlich die öffentliche Web-Config (siehe `.env.example`).

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

Im Code (erledigt):

- [x] `src/store/authStore.ts` – globaler Anmeldestatus (live über Tabs)
- [x] `src/features/auth/auth.ts` – Login/Registrieren/Google/Logout/Reset
- [x] `src/features/auth/LoginPage.tsx` – Anmelde-/Registrierseite unter `/login`
- [x] `src/components/LoginGate.tsx` – sperrt Funktionen für Gäste (motiviert
      zum Registrieren); Nutzung: `<LoginGate><Funktion /></LoginGate>`
- [x] Profilmenü zeigt Konto + Abmelden (bzw. „Anmelden" für Gäste)

**Offen / Produktentscheidung:** Welche Funktionen sollen nur mit Login nutzbar
sein? Sobald das feststeht, wird `<LoginGate>` an den jeweiligen Stellen gesetzt.

---

## Phase D – Backend / Cloud-Speicher (Firestore)

In der Console:

1. Linkes Menü → **Build → Firestore Database** → **„Datenbank erstellen"**
2. Region **`eur3` / `europe-west`** wählen (Datenschutz / DSGVO) → wichtig,
   Region lässt sich später **nicht** ändern.
3. Im **Produktionsmodus** starten (Regeln setzt Claude danach passend).

Im Code (übernimmt Claude):

- Sicherheitsregeln: jeder Nutzer sieht nur seine eigenen Daten
- App-Daten (Messungen, Zählerstände, Einstellungen) zusätzlich in Firestore
  speichern/laden → gerätübergreifend

> **Checkliste Phase D**
> - [ ] Firestore erstellt (Region europe-west)
> - [ ] Sicherheitsregeln (Claude)
> - [ ] Daten-Synchronisation (Claude)

---

## Phase E – Live schalten

Voraussetzung: Firebase CLI installiert und eingeloggt.

```bash
npm install -g firebase-tools   # einmalig
firebase login                  # einmalig, öffnet Browser
npm run deploy:firebase         # baut + deployt zu Firebase Hosting
```

Danach ist die aktuelle Version live unter `https://e-app-info.web.app`.

> **Checkliste Phase E**
> - [ ] Firebase CLI installiert & eingeloggt
> - [ ] Erster Deploy erfolgreich

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
