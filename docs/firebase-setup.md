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
- [x] `src/lib/firebase.ts` – zentrale Firebase-Initialisierung
- [x] `.env.example` als Vorlage für die Web-Config
- [x] `.gitignore` schützt `.env` und Admin-Schlüssel

---

## Phase B – Web-App in Firebase registrieren (DU, ~5 Min)

1. Firebase Console öffnen → Projekt **E-App** (`e-app-info`)
2. Oben links auf das **Zahnrad** ⚙️ → **Projekteinstellungen**
3. Tab **Allgemein** → ganz unten **„Deine Apps"**
4. Falls noch keine **Web-App** (`</>`-Symbol) existiert: auf **`</>`** klicken,
   einen Namen vergeben (z. B. „E-App Web"), **registrieren**.
   (Häkchen „Firebase Hosting einrichten" ist optional – kann an bleiben.)
5. Es erscheint ein `firebaseConfig`-Objekt. Diese Werte brauchen wir.

Dann lokal im Projekt:

6. `.env.example` nach `.env` kopieren:
   ```bash
   cp .env.example .env        # Windows: copy .env.example .env
   ```
7. In `.env` die Werte aus dem `firebaseConfig`-Objekt eintragen
   (`apiKey`, `messagingSenderId`, `appId` – Rest ist schon vorausgefüllt).

> **Checkliste Phase B**
> - [ ] Web-App in Console registriert
> - [ ] `.env` lokal angelegt und ausgefüllt

---

## Phase C – Login aktivieren (DU in Console + Claude im Code)

In der Console:

1. Linkes Menü → **Build → Authentication** → **„Get started"**
2. Tab **Sign-in method** → Anbieter aktivieren:
   - **E-Mail/Passwort** → aktivieren → speichern
   - (optional) **Google** → aktivieren → Support-E-Mail wählen → speichern

Im Code (übernimmt Claude, sobald Phase B steht):

- Login-/Registrieren-Seite
- „Eingeloggt"-Status global verfügbar machen
- Logout-Knopf im Profilmenü

> **Checkliste Phase C**
> - [ ] E-Mail/Passwort aktiviert
> - [ ] (optional) Google aktiviert
> - [ ] Login-UI im Code (Claude)

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
