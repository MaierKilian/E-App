# E-App – Frontend/Backend-Architektur und die Entscheidung für Firebase

> **Stand:** 2026-09-06 · Grundlage: Codestand `claude/sync-iytgmy` (= `origin/main`),
> Version 0.6.0
>
> **Zweck dieser Datei:** Informationsgrundlage für eine nachgelagerte
> Textproduktion (Hausarbeit), Kapitel Architektur. Wie die vorangegangene
> Monetarisierungs-Analyse (`docs/monetarisierung.md`) ist auch diese Datei
> als *Materialsammlung* aufgebaut: Fakten mit Fundstelle, Architektur-
> Entscheidungen mit ihrer im Code sichtbaren Begründung, und – wo der
> Quellcode keine Begründung liefert – nachvollziehbar hergeleitete
> Bewertung, klar von der belegten Tatsache getrennt.

---

## 0. Lesehinweis für die weiterverarbeitende KI

Dieselbe Kennzeichnung wie in `docs/monetarisierung.md`, hier konsequent
fortgeführt:

| Markierung | Bedeutung | Verwendbarkeit im Fließtext |
|---|---|---|
| **[BELEGT]** | Aus dem Quellcode oder der Projektdokumentation dieses Repositorys nachgewiesen, Fundstelle genannt | Als Tatsachenbehauptung über die App zitierbar |
| **[BEGRÜNDET IM CODE]** | Eine Architektur-Entscheidung, deren *Warum* im Quellcode selbst dokumentiert ist (Kommentar) | Als Zitat der Projektbegründung verwendbar, nicht als externe Fachmeinung |
| **[ANNAHME]** | Einordnung/Bewertung des Verfassers dieser Analyse, plausibel hergeleitet, aber nicht im Code so ausgesprochen | Nur als eigene Analyse kenntlich machen |
| **[PRÜFEN]** | Allgemeinwissen über Firebase/Google Cloud ohne Online-Verifikation zum aktuellen Stand erhoben (Preise, Limits, Rechtslage) | **Vor Abgabe mit Primärquelle (Firebase-Dokumentation, aktuelles Preisblatt) belegen oder streichen** |

Besonderheit dieses Kapitels gegenüber der Monetarisierungs-Analyse: Die
E-App enthält **keine eigene Projektdatei**, die die Wahl von Firebase
explizit begründet — es gibt kein „Architecture Decision Record". Die
Begründung muss daher aus drei indirekten Quellen rekonstruiert werden:
(1) ausführlichen Code-Kommentaren an den Firebase-Integrationsstellen,
(2) den `docs/*.md`-Betriebsdateien, die den *Ist-Zustand* und seine
Kosten dokumentieren, und (3) der Konsequenz, die sich aus dem
Projektrahmen (Studierendenprojekt, Einzelperson, keine Backend-
Infrastruktur) ergibt. Das ist selbst ein Befund: **Die Entscheidung für
Firebase wurde nirgends als Abwägung dokumentiert, sondern ist an ihren
Auswirkungen im Code ablesbar.** Für die Hausarbeit ist genau das ein guter
Aufhänger für eine kritische Reflexion (Abschnitt 8).

---

## 1. Methodik

Ausgewertet wurden für dieses Kapitel:

- die zentrale Firebase-Initialisierung (`src/lib/firebase.ts`)
- die Authentifizierung (`src/features/auth/`)
- die Cloud-Synchronisation (`src/features/sync/cloudSync.ts`, `stores.ts`)
- das Datenmodell der Wohnprofile (`src/features/profiles/profiles.ts`)
- die Zugriffsregeln (`firestore.rules`)
- die einzige serverseitige Rechenlogik (`functions/index.js`)
- die Build- und Deployment-Konfiguration (`vite.config.ts`, `firebase.json`,
  `.firebaserc`, `.github/workflows/`)
- die Betriebsdokumentation (`docs/deployment.md`, `docs/firebase-setup.md`,
  `docs/gemini-scan-setup.md`, `docs/legal.md`)
- die clientseitige Zustandsverwaltung (`src/store/*.ts`, insbesondere die
  `persist`-Middleware von Zustand)

---

## 2. Der Architekturtyp in einem Satz

> **Die E-App ist eine clientseitige Single-Page-Application mit lokalem
> Datenhaltungs-Standard und einem optionalen, vollständig gemanagten
> Cloud-Backend (Firebase) für Konto, Synchronisation und die eine
> Funktion, die serverseitige Rechenleistung tatsächlich braucht.**

Das ist architektonisch keine klassische Drei-Schichten-Anwendung mit
eigenem Anwendungsserver. Es gibt **keine eigene REST- oder GraphQL-API**,
**keinen eigenen Datenbankserver** und **keine eigene Serverinfrastruktur**,
die betrieben, skaliert oder gepatcht werden müsste. Stattdessen wird nahezu
die gesamte Anwendungslogik im Browser ausgeführt, und dort, wo ein
Backend unvermeidbar ist, wird es als **Backend-as-a-Service (BaaS)**
bezogen statt selbst gebaut.

Diese Einordnung ist der rote Faden des ganzen Kapitels: Jede der
folgenden Entscheidungen — lokale Datenhaltung zuerst, Cloud-Sync nur bei
Bedarf, eine einzige Cloud Function statt eines eigenen Servers, zwei
parallele Hosting-Ziele — folgt aus derselben Grundhaltung: **so viel wie
möglich im Client, so wenig wie möglich selbst betreiben.**

---

## 3. Das Frontend

### 3.1 Technologie-Stack [BELEGT]

| Baustein | Technologie | Version | Fundstelle |
|---|---|---|---|
| UI-Bibliothek | React | 19.2.6 | `package.json` |
| Sprache | TypeScript | ~6.0.2 | `package.json`, `tsconfig.*.json` |
| Build-Tool | Vite | 8.0.12 | `vite.config.ts` |
| Styling | Tailwind CSS | v4.3.0 | `package.json`, `@tailwindcss/vite` |
| Routing | React Router | 7.17.0 | `src/app/App.tsx` |
| Zustandsverwaltung | Zustand | 5.0.14 | `src/store/*.ts` |
| Internationalisierung | i18next / react-i18next | 26.3.1 / 17.0.8 | `src/i18n/` |
| PDF-Erzeugung | jsPDF | 4.2.1 | `src/features/reports/`, `education/generateCertificate.ts` |
| Bild-Export | html-to-image | 1.11.13 | Zertifikats-/Berichtsvorschau |
| On-Device-Texterkennung | Tesseract.js | 6.0.1 | `src/features/monitoring/ocr.ts` |
| Backend-Anbindung | Firebase JS SDK | 12.15.0 | `src/lib/firebase.ts` |

Dieser Stack hat eine gemeinsame Eigenschaft, die für das Verständnis der
Backend-Entscheidung zentral ist: **Jede dieser Bibliotheken läuft
vollständig im Browser.** Es gibt keinen serverseitigen Rendering-Schritt
(kein Next.js, kein SSR), keinen eigenen Node-Anwendungsserver. Das Build-
Ergebnis von `vite build` ist ein **statisches Bundle** aus HTML, JS, CSS
und Assets (`firebase.json`: `"hosting": { "public": "dist" }`) — eine
Datei-Sammlung, die von jedem Webserver ausgeliefert werden kann, ohne
dass dort Anwendungslogik läuft.

### 3.2 Lokale Datenhaltung als Grundprinzip [BELEGT]

Der App-Zustand liegt in 14 Zustand-Stores (`src/store/`), von denen die
meisten mit der `persist`-Middleware in `localStorage` gespeichert werden
— z. B. `onboardingStore.ts` (Zeile 247 ff., `persist(...)`) und
`settingsStore.ts` (`name: 'eapp-settings'`). Das bedeutet: **Die App
funktioniert vollständig, ohne dass irgendein Server involviert ist.**
Ein Nutzer kann den Fragebogen ausfüllen, alle neun Messungen durchführen,
Zählerstände erfassen und einen PDF-Bericht erzeugen, ohne sich jemals
anzumelden — alles bleibt im Browser des Geräts.

Das README beschreibt das ausdrücklich als Entwurfsprinzip: „Zustand für
den App-Zustand, **Speicherung lokal im Gerät**" (`README.md`).

**Warum das architektonisch bedeutsam ist [ANNAHME]:** Diese
Grundentscheidung — lokal zuerst, Cloud optional — kehrt die übliche
Reihenfolge einer Web-Anwendung um. Statt „jede Aktion geht zum Server"
gilt hier „jede Aktion bleibt lokal, bis ein Konto etwas anderes verlangt".
Das hat drei Konsequenzen, die im weiteren Verlauf des Kapitels wieder
auftauchen: (1) minimale Serverlast im Normalbetrieb, (2) hohe gefühlte
Geschwindigkeit (keine Netzwerklatenz bei jeder Eingabe), (3) ein
funktionierendes Offline-Erlebnis fast geschenkt.

### 3.3 Verzicht auf Cloud-Dienste ohne Not [BEGRÜNDET IM CODE]

Zwei Stellen im Code zeigen, dass die Verzögerung der Cloud-Initialisierung
kein Zufall, sondern eine bewusste, sogar rechtlich begründete
Entscheidung ist:

**Firestore startet lazy**, nicht beim Laden des Moduls:

> „`initializeFirestore()` legt beim ersten Aufruf sofort eine IndexedDB-
> Datenbank auf dem Gerät an. Läge dieser Aufruf … auf Modulebene, geschähe
> das bei jedem Seitenaufruf, bevor React rendert und bevor der
> Cookie-Hinweis überhaupt eine Entscheidung eingesammelt hat … Das ist mit
> § 25 Abs. 2 Nr. 2 TDDDG … vor jeder Interaktion nicht zu begründen."
> — `src/lib/firebase.ts`

**Analytics startet nur nach Einwilligung**, ebenfalls über eine
Lazy-Loading-Funktion (`loadAnalytics()`), die ausschließlich von
`features/analytics/analytics.ts` nach erteilter Einwilligung aufgerufen
wird.

**Für die Hausarbeit interessant:** Hier trifft eine technische
Architekturentscheidung (lazy statt eager) unmittelbar auf eine
rechtliche Anforderung (TDDDG-Einwilligung). Das ist ein konkretes,
belegtes Beispiel für „Privacy by Design" (Art. 25 DSGVO) — nicht als
abstraktes Prinzip zitiert, sondern als tatsächliche Code-Konsequenz
nachweisbar.

---

## 4. Das Backend: Firebase als Backend-as-a-Service

### 4.1 Was Firebase in dieser App konkret leistet [BELEGT]

Firebase ist keine einzelne Technologie, sondern eine Plattform aus
mehreren, unabhängig nutzbaren Produkten. Die E-App verwendet vier davon:

| Firebase-Produkt | Rolle in der E-App | Fundstelle |
|---|---|---|
| **Hosting** | Liefert das statische Bundle aus (`dist/`) unter `e-app-info.web.app` | `firebase.json`, `docs/deployment.md` |
| **Authentication** | E-Mail/Passwort und Google-Login | `src/features/auth/auth.ts` |
| **Firestore** (Cloud Firestore, NoSQL-Dokumentendatenbank) | Speichert Wohnprofile, Einladungen, Feedback | `src/features/profiles/profiles.ts`, `firestore.rules` |
| **Cloud Functions** (2nd Gen) | Eine serverseitige Funktion: Zähler-Scan via Gemini | `functions/index.js` |
| **Analytics** (Google Analytics 4) | Nutzungsstatistik, nur nach Einwilligung | `src/lib/firebase.ts`, `features/analytics/` |

Bemerkenswert: **Vier der fünf Bausteine sind reine Konfiguration, keine
eigene Programmierung.** Hosting, Authentication und Analytics werden über
die Firebase Console eingerichtet und im Client nur noch initialisiert
(`initializeApp`, `getAuth`, `getAnalytics`). Firestore braucht zusätzlich
Zugriffsregeln (`firestore.rules`, 151 Zeilen) — aber auch das ist eine
**deklarative Regelsprache**, kein imperativer Server-Code. Der einzige
Baustein mit tatsächlich selbst geschriebener Backend-Logik ist die eine
Cloud Function (Abschnitt 6).

### 4.2 Warum die Web-Config offen im Repository liegen darf [BEGRÜNDET IM CODE]

Ein häufiges Missverständnis bei Firebase-Projekten ist, die
`firebaseConfig` (API-Key, Projekt-ID etc.) für ein Geheimnis zu halten.
Der Code klärt das ausdrücklich auf:

> „Diese Werte sind KEINE Geheimnisse. Bei jeder Firebase-Web-App liegen
> sie offen im Browser – das ist so vorgesehen. Die eigentliche Sicherheit
> entsteht über die Firestore-/Storage-Sicherheitsregeln und die Liste der
> autorisierten Domains in der Authentication-Konfiguration."
> — `src/lib/firebase.ts`

**Das ist ein zentrales Architekturprinzip von BaaS-Systemen und gehört
in die Hausarbeit:** Anders als bei einem klassischen Backend mit eigener
API, bei dem ein Server-Geheimnis (API-Schlüssel, Datenbank-Passwort) die
Sicherheitsgrenze bildet, verschiebt Firebase die Sicherheitsgrenze
**von der Netzwerkebene auf die Autorisierungsebene**: Jeder Client kann
sich direkt mit der Datenbank „unterhalten" (kein Zwischenserver), aber
was er dort lesen oder schreiben darf, entscheiden die serverseitig
ausgewerteten Sicherheitsregeln (Abschnitt 5.3). Diese Verschiebung ist
architektonisch die wichtigste Eigenschaft von Firebase gegenüber einem
selbstgebauten Backend.

### 4.3 Persistenter Offline-Cache [BELEGT]

Firestore wird nicht mit den Standardeinstellungen initialisiert, sondern
mit einem expliziten IndexedDB-Cache:

```ts
dbInstance = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
```
*(`src/lib/firebase.ts`)*

Das erlaubt mehrere gleichzeitig geöffnete Tabs mit konsistentem
Zwischenspeicher und einen automatischen Rückfall auf reinen
Arbeitsspeicher-Cache, wenn IndexedDB nicht verfügbar ist (privates
Fenster, alter Browser). **Für die Architekturbeschreibung wichtig:** Das
bedeutet, die App hat **zwei parallele Offline-Schichten** — die
Zustand-`persist`-Stores in `localStorage` (Abschnitt 3.2, immer aktiv)
und den Firestore-eigenen IndexedDB-Cache (nur für angemeldete Nutzer
mit Cloud-Sync). Das ist funktional leicht redundant, aber bewusst
geschichtet: Die erste Schicht funktioniert für jeden Besucher, die
zweite kommt erst hinzu, sobald ein Konto existiert.

---

## 5. Das Datenmodell und der Synchronisationsmechanismus

### 5.1 Local-First mit optionalem Cloud-Sync [BELEGT]

Das Kernkonzept steht als Kommentar direkt im Code:

> „Jede Wohnung ist ein Dokument `profiles/{profileId}` mit einem
> Schnappschuss aller relevanten Stores. Ein Nutzer kann mehrere Profile
> haben … und später mit anderen teilen … Ablauf bei Anmeldung: 1. Profile
> des Nutzers laden … 2. Zuletzt geöffnetes … Profil aktivieren.
> 3. Auf Store-Änderungen hören und verzögert in die Cloud schreiben;
> zugleich per Live-Listener Änderungen aus der Cloud übernehmen (mehrere
> Geräte / später mehrere Bewohner)."
> — `src/features/sync/cloudSync.ts`

Das Datenmodell ist damit **dokumentenorientiert und denormalisiert im
Extrem**: *Ein* Firestore-Dokument (`profiles/{profileId}`) enthält den
kompletten Zustand einer Wohnung — Fragebogen-Antworten, Messergebnisse,
Zählerstände, Tarif, Fortschritt, Entwürfe — als ein einziges verschachteltes
JSON-Objekt (`state`-Feld, zusammengesetzt aus sieben Zustand-Stores, siehe
`STORES` in `src/features/sync/stores.ts`).

**Warum diese Modellierung [ANNAHME]:** Ein relationales Schema mit
einzelnen Tabellen für Räume, Geräte, Messergebnisse, Zählerstände usw.
wäre die naheliegende Alternative in einer SQL-Datenbank gewesen. Die
gewählte „ein Dokument pro Wohnung"-Modellierung passt dagegen genau zur
Firestore-Preislogik: **Firestore berechnet Lese- und Schreibvorgänge pro
Dokument, nicht pro Datenmenge.** Ein Dokument mit dem gesamten
Wohnungszustand kostet einen Lesevorgang; zehn Tabellen mit Fremdschlüssel-
Beziehungen kosten (ohne aufwendige Batch-Logik) potenziell zehn. Diese
Kompatibilität zwischen Datenmodell und Abrechnungsmodell einer NoSQL-
Dokumentendatenbank ist ein oft übersehener, aber realer Architektur-
Vorteil von Firestore gegenüber einer klassischen SQL-Lösung für genau
diesen Anwendungsfall.

### 5.2 Der Synchronisationsablauf im Detail [BELEGT]

```
Lokale Eingabe (Store-Änderung)
        │
        ▼
scheduleWrite() – sammelt Änderungen 1,5 Sekunden lang
        │  (WRITE_DELAY_MS = 1500, cloudSync.ts)
        ▼
pushNow() – ein Firestore-Schreibvorgang für das ganze Profil
        │
        ▼
Firestore-Dokument profiles/{profileId}
        │
        ▼
onSnapshot() – Live-Listener auf jedem angemeldeten Gerät
        │  (hasPendingWrites-Filter verhindert Echo der eigenen Schreibvorgänge)
        ▼
applyRemote() – spielt den Stand in die lokalen Stores zurück
```

Zwei technische Details verdienen Erwähnung:

1. **Debouncing statt sofortigem Schreiben.** `scheduleWrite()` sammelt
   schnelle, aufeinanderfolgende Änderungen (z. B. jede Ziffer bei einer
   Zahleneingabe) 1.500 ms lang, bevor tatsächlich geschrieben wird
   (`WRITE_DELAY_MS`, `cloudSync.ts`). Das reduziert die Zahl der
   Firestore-Schreibvorgänge — und damit direkt die Kosten — um
   Größenordnungen gegenüber einer naiven „jede Änderung sofort
   speichern"-Implementierung.
2. **Schutz vor Echo-Schreibvorgängen.** Der Live-Listener prüft
   `snap.metadata.hasPendingWrites` und ignoriert die eigene, noch nicht
   vom Server bestätigte Schreibaktion — sonst würde ein Gerät seine
   eigene Änderung als „Änderung aus der Cloud" zurückerhalten und einen
   unnötigen weiteren Schreibzyklus auslösen.

### 5.3 Autorisierung ohne eigenen Server: Firestore Security Rules [BELEGT]

`firestore.rules` (151 Zeilen) implementiert ein vollständiges,
rollenbasiertes Berechtigungsmodell **ausschließlich in deklarativen
Regeln**, ohne dass dafür eine einzige Zeile eines eigenen Backend-Servers
nötig wäre:

- Ein Wohnprofil kennt die Rollen `owner` und `editor`.
- Lesen darf jedes Mitglied (`isMember()` — Prüfung, ob die eigene
  `auth.uid` in `memberUids` steht).
- Der Besitzer darf alles ändern, außer sich selbst als Besitzer
  auszutauschen (Schutz vor Übernahme) — dafür gibt es eine gesonderte,
  streng eingegrenzte Regel für die Eigentumsübertragung.
- Ein Editor darf die App-Daten ändern, aber **nicht** die
  Mitgliederliste — verhindert, dass ein Mitbewohner andere aussperrt.
- Der Beitritt über einen Einladungslink ist eine eigene Regel, die genau
  prüft, dass nur die Mitgliedschaftsfelder verändert werden **und** dass
  das referenzierte Einladungsdokument existiert und aktiv ist
  (`get(...).data.active == true` — ein serverseitiger Dokumenten-Zugriff
  *innerhalb* der Regelauswertung).
- Feedback-Dokumente dürfen von jedem angemeldeten Nutzer geschrieben,
  aber von **niemandem aus der App heraus gelesen** werden
  (`allow read, update, delete: if false`).

**Für die Hausarbeit die wichtigste Erkenntnis dieses Abschnitts:** Diese
Zugriffslogik — Rollen, Besitzwechsel, Einladungslinks mit Ablaufsteuerung,
Selbstschutz vor Aussperrung — wäre in einer klassischen Architektur
Aufgabe einer **Middleware- oder Service-Schicht im Anwendungsserver**
gewesen (typischerweise mehrere hundert Zeilen Node/Express- oder
Django-Code plus Tests). Hier steht sie vollständig als **deklarative
Policy** neben der Datenbank selbst, wird von Google evaluiert, bevor der
Client überhaupt eine Antwort bekommt, und ist über
`npm run test:rules` (Firebase-Emulator) sogar automatisiert testbar
(`package.json`). Das ist der stärkste Beleg im gesamten Repository dafür,
was „Backend-as-a-Service" strukturell bedeutet: **Backend-Logik verlagert
sich von imperativem Code in deklarative Konfiguration.**

### 5.4 Feld-Migration als Konsequenz zweier Dateneinstiege [BELEGT, mit Architekturkonsequenz]

Ein Detail, das in `CLAUDE.md` als feste Konvention verankert ist, zeigt
eine typische Schwierigkeit von Systemen mit **zwei unabhängigen
Ladepfaden**: Ein Wohnungszustand kann entweder (a) direkt beim
App-Start aus `localStorage` über den `persist`-Merge der Zustand-
Middleware geladen werden, oder (b) über `applyRemote()` /
`hydrate()` direkt per `setState` aus der Cloud einströmen (Abschnitt
5.2). Weg (b) **umgeht** den `persist`-Merge vollständig.

Die Konsequenz, im Code dokumentiert: Feld-Migrationen für ein geändertes
`OnboardingData`-Schema dürfen **ausschließlich** in der Funktion
`migrateOnboardingData()` stehen, nicht im `merge`-Handler des
`persist`-Aufrufs — sonst käme ein aus der Cloud synchronisiertes
Altprofil unmigriert an (`src/store/onboardingStore.ts`, `CLAUDE.md`).
`hydrate()` in `sync/stores.ts` ruft diese Funktion deshalb explizit
selbst noch einmal auf.

**Warum das für die Architekturbeschreibung relevant ist [ANNAHME]:**
Es ist ein konkretes Beispiel für einen Kompromiss, der aus der
Kombination „lokale Persistenz" + „Cloud-Sync" *zwangsläufig* entsteht,
sobald beide Pfade unabhängig Zustand setzen dürfen. Ein System mit nur
einem Ladepfad (entweder rein lokal oder rein serverzentriert) hätte
dieses Problem nicht — der Hybridcharakter der Architektur erkauft sich
seine Vorteile (Offline-Fähigkeit plus Mehrgeräte-Sync) mit genau dieser
Art von Zusatzkomplexität an den Nahtstellen.

---

## 6. Die eine echte Backend-Berechnung: Zähler-Scan via Cloud Function

### 6.1 Warum überhaupt eine Cloud Function nötig ist [BEGRÜNDET IM CODE]

Die App bietet an, einen Energiezähler per Foto statt manuell einzutragen.
Dafür wird ein KI-Modell (Google Gemini) angefragt, das die Zifferrolle
im Bild liest. Der entscheidende Architekturpunkt: **Dieser Aufruf darf
nicht direkt aus dem Browser an Gemini gehen.**

> „Cloud Function: Zählerstand aus einem Foto lesen – via Google Gemini.
> Warum serverseitig? Der Gemini-API-Key darf NICHT in die öffentliche
> Web-App. Diese aufrufbare (callable) Funktion hält den Key geheim
> (Firebase-Secret), verlangt einen angemeldeten Nutzer und ruft Gemini
> nur serverseitig auf."
> — `functions/index.js`

Das ist der **einzige Punkt im gesamten System, an dem ein echtes
Geheimnis existiert** (der Gemini-API-Schlüssel) — im Unterschied zur
öffentlichen, absichtlich offenen Firebase-Web-Config (Abschnitt 4.2).
Genau an diesem einen Punkt reicht eine BaaS-Konfiguration nicht mehr aus,
und es wird tatsächlich **eigener Server-Code** nötig: eine sogenannte
*Callable Cloud Function*, ein von Firebase verwaltetes,
ereignisgesteuertes Node.js-Programm (`onCall`), das nur bei Bedarf
ausgeführt wird (Serverless / Function-as-a-Service).

### 6.2 Absicherung der Funktion [BELEGT]

Die Funktion (`functions/index.js`) verlangt eine gültige Anmeldung
(`request.auth`), begrenzt die Bildgröße (~8 MB Base64, „Missbrauch/
Kosten bremsen"), setzt ein hartes Instanzenlimit (`maxInstances: 5`,
„gegen Kostenüberraschungen") und protokolliert den Token-Verbrauch jedes
einzelnen Aufrufs (`console.log('Gemini-Tokens', …)`). Der API-Schlüssel
liegt als **Firebase-Secret** (`defineSecret('GEMINI_API_KEY')`), nicht
als Umgebungsvariable im Klartext — ein Unterschied, der bedeutet, dass
der Wert verschlüsselt in Google Cloud Secret Manager liegt und selbst
Projektmitgliedern mit Lesezugriff auf den Quellcode nicht automatisch
zugänglich ist.

**Für die Hausarbeit:** Diese vier Maßnahmen (Auth-Pflicht,
Größenbegrenzung, Instanzenlimit, Secret Manager) sind ein kompaktes
Lehrbeispiel dafür, wie eine einzelne Serverless-Funktion **ohne eigene
Infrastruktur** dennoch alle klassischen Backend-Sicherheitsprinzipien
(Authentifizierung, Input-Validierung, Ressourcenbegrenzung, Secret-
Management) abbilden kann.

### 6.3 Der clientseitige Rückfall — Grenzen der Cloud werden eingeplant [BELEGT]

Der Aufruf der Cloud Function ist **nicht die einzige Möglichkeit**, einen
Zählerstand automatisch zu erkennen. Schlägt er fehl — kein Netz, kein
Guthaben, Funktion nicht deployt — fällt `MeterScanner.tsx` auf eine
**vollständig clientseitige** Texterkennung mit Tesseract.js zurück
(`src/features/monitoring/ocr.ts`):

> „On-Device-OCR für Zählerstände (Tesseract.js, WASM). Läuft komplett im
> Browser – das Kamerabild verlässt das Gerät nicht."
> — `src/features/monitoring/ocr.ts`

**Architektonisch bemerkenswert [ANNAHME]:** Die App verlässt sich damit
nirgends *ausschließlich* auf das Cloud-Backend für eine Kernfunktion.
Jede Cloud-abhängige Fähigkeit hat entweder einen clientseitigen
Fallback (Zählerscan) oder funktioniert von vornherein nur lokal
(Messungen, Bericht, Fragebogen). Das ist konsequent zu Ende gedacht: Ein
Ausfall des Backends — oder ein aufgebrauchtes Gemini-Kontingent —
verschlechtert die Nutzererfahrung graduell (schlechtere OCR-Genauigkeit),
zerstört sie aber nie vollständig.

---

## 7. Deployment: zwei Ziele, eine Quelle

### 7.1 Duale Auslieferung [BELEGT]

Dieselbe gebaute Anwendung wird an **zwei unabhängige Hosting-Ziele**
ausgeliefert:

| Ziel | URL | Pfad-Basis | Zweck |
|---|---|---|---|
| Firebase Hosting | `e-app-info.web.app` | `/` | primär, inkl. Login/Cloud-Funktionen |
| GitHub Pages | `…/E-App/` | `/E-App/` | zusätzlich, historisch |

Beide werden bei jedem Push auf `main` automatisch über getrennte GitHub-
Actions-Workflows aktualisiert (`.github/workflows/firebase-deploy.yml`,
`.github/workflows/deploy.yml`). Der Unterschied im Pfad-Präfix wird über
eine Build-Variable gelöst (`VITE_BUILD_BASE`, `vite.config.ts`) — dieselbe
Quelle, zwei verschiedene Builds.

**Warum zwei Ziele [ANNAHME, gestützt auf docs/deployment.md]:** Die
Dokumentation nennt GitHub Pages ausdrücklich „zusätzlich, historisch" —
ein Hinweis darauf, dass das Projekt vermutlich dort begonnen hat (GitHub
Pages ist der naheliegende kostenlose Hosting-Weg für ein
Studierendenprojekt mit eigenem Repository) und Firebase Hosting später
hinzukam, als Login und Cloud-Funktionen nötig wurden — GitHub Pages kann
per Definition **nur statische Dateien** ausliefern und hat keinerlei
Cloud-Function- oder Datenbank-Anbindung. Die Beibehaltung beider Ziele
bietet Redundanz nahezu ohne Zusatzkosten (Abschnitt 8.2).

### 7.2 CI/CD ohne eigenen Server [BELEGT]

Der Deploy-Workflow meldet sich über einen Google-Cloud-Service-Account
an (`github-deploy@e-app-info.iam.gserviceaccount.com`, Rollen: Editor,
Firebase Admin, Service Account User, Secret Manager Admin), dessen
JSON-Schlüssel als verschlüsseltes GitHub-Secret hinterlegt ist
(`docs/deployment.md`). Der komplette Auslieferungsweg — Bauen, Testen,
Deployen — läuft auf **von GitHub bereitgestellten, temporären Runnern**;
es gibt keinen dauerhaft laufenden eigenen Server, nicht einmal für den
CI/CD-Prozess selbst.

---

## 8. Warum Firebase? — Rekonstruierte Entscheidungslogik

Wie in Abschnitt 0 vermerkt: Es gibt keine im Repository dokumentierte
Abwägung „Firebase vs. Alternative X". Die folgende Argumentation ist
daher **[ANNAHME]**, aber durchgehend an konkreten, belegten
Eigenschaften des Projekts verankert.

### 8.1 Der Ausgangspunkt: keine eigene Backend-Infrastruktur gewünscht

Die App ist erkennbar aus einem **studentischen Einzelprojekt**
entstanden (README: „Lerninhalte für die HTW Berlin"; `CLAUDE.md`
beschreibt einen einzelnen Ansprechpartner „Kilian"). Für ein solches
Projekt sprechen mehrere strukturelle Merkmale gegen ein selbstgebautes
Backend (eigener Node/Express- oder Django-Server plus eigene
PostgreSQL-/MySQL-Datenbank):

1. **Keine dedizierte Backend-Entwicklung geplant.** Der gesamte
   Technologie-Stack (Abschnitt 3.1) ist Frontend-Technologie. Es gibt im
   Repository keinen eigenen API-Server-Code außer der einen Cloud
   Function.
2. **Kein Betriebsbudget für Serverinfrastruktur.** `CLAUDE.md` und
   `docs/deployment.md` betonen wiederholt, dass die realen Kosten „~0"
   sind. Ein selbst gehosteter Server (VPS, Datenbank-Hosting) hätte
   selbst im billigsten Fall laufende Fixkosten erzeugt, unabhängig von
   der Nutzerzahl — genau das Gegenteil der in Abschnitt 6.2 der
   Monetarisierungs-Analyse beschriebenen Grenzkosten-nahe-Null-Struktur.
3. **Keine Kapazität für Betriebsaufgaben.** Server-Patches,
   Datenbank-Backups, Skalierung bei Lastspitzen, TLS-Zertifikate,
   Monitoring — all das entfällt bei einem BaaS-Anbieter vollständig oder
   liegt in dessen Verantwortung.

### 8.2 Was Firebase konkret gegenüber einem eigenen Backend einspart

| Aufgabe bei einem eigenen Backend | Bei Firebase |
|---|---|
| Server aufsetzen, patchen, betreiben | entfällt vollständig (verwaltet) |
| Datenbank betreiben, sichern, skalieren | entfällt (Firestore verwaltet) |
| Authentifizierung selbst implementieren (Passwort-Hashing, Session-Handling, OAuth-Flows) | fertig nutzbar (`firebase/auth`) |
| API-Endpunkte für jede Operation schreiben | entfällt größtenteils — Client spricht Firestore direkt an |
| Autorisierungslogik in Server-Middleware | deklarativ in `firestore.rules` (Abschnitt 5.3) |
| Realtime-Synchronisation (Websockets, Polling) selbst bauen | `onSnapshot()` liefert das serienmäßig |
| TLS, CDN, statisches Hosting | Firebase Hosting liefert es mit |
| Skalierung bei Lastspitzen | automatisch durch den Anbieter |
| Rechnungsstellung/Abrechnung der Nutzung | nutzungsbasiert, ohne eigene Kapazitätsplanung |

**[ANNAHME, mit Beleg für die letzte Zeile]:** `docs/deployment.md`
bestätigt genau diesen letzten Punkt: Firebase Blaze ist „Pay-as-you-go" —
die Kosten folgen der tatsächlichen Nutzung, nicht einer im Voraus
gebuchten Server-Kapazität. Für ein Projekt mit unbekannter, potenziell
sehr niedriger Nutzerzahl (Abschnitt 13.3 der Monetarisierungs-Analyse
nennt 1.000–20.000 Nutzer als Spanne) ist das eine strukturell passende
Kostenlogik: **Bezahlt wird für tatsächliche Nutzung, nicht für bereitgehaltene
Kapazität.**

### 8.3 Passung zum konkreten Datenmodell

Abschnitt 5.1 hat gezeigt: Das Datenmodell der App — ein Dokument pro
Wohnung, mit verschachtelten, unterschiedlich strukturierten Bereichen
(Fragebogen-Antworten, Messergebnisse, Zählerstände) — passt besser zu
einer **schemalosen Dokumentendatenbank** als zu einem starren
relationalen Schema. Firestore ist genau das: Ein Dokument kann beliebig
verschachtelte JSON-Struktur enthalten, ohne dass vorher eine
Tabellendefinition (Migration) existieren muss. Für ein Projekt, dessen
Datenschema sich erkennbar häufig weiterentwickelt hat (siehe
`CLAUDE.md`, Abschnitt „Fragebogen-Umbau", zahlreiche Feld-Änderungen über
mehrere Etappen), ist die Schemafreiheit von Firestore ein greifbarer
praktischer Vorteil gegenüber einer SQL-Datenbank, bei der jede
Feldänderung eine Migration erzeugt.

### 8.4 Passung zur Anforderung „Mehrgeräte- und Mehrpersonen-Sync"

Die Kernanforderung von Abschnitt 5 — mehrere Geräte eines Nutzers und
mehrere Bewohner einer Wohnung sollen denselben Stand sehen — ist mit
Firestores `onSnapshot()`-Mechanismus (Echtzeit-Listener) nahezu
serienmäßig gelöst (Abschnitt 5.2). Eine gleichwertige Lösung mit einem
eigenen Backend hätte entweder Polling (ineffizient) oder eine eigene
Websocket-Infrastruktur (deutlicher Mehraufwand) erfordert.

### 8.5 Ökosystem-Nähe zu Gemini

Ein oft übersehener, aber im Code sichtbarer Vorteil: Die Cloud Function
für den Zähler-Scan läuft im selben Google-Cloud-Projekt (`e-app-info`)
wie Firebase selbst und ruft die Gemini-API auf, die ebenfalls zu Google
gehört. `docs/deployment.md` erwähnt, dass dafür „das Google-Cloud-Konto
als Vollkonto aktiviert" werden musste, weil „die Gemini-API keine
Gratis-Trial-Credits akzeptiert" — ein Hinweis darauf, dass Firebase und
Google Cloud dieselbe zugrunde liegende Plattform sind (Firebase ist eine
Produktschicht *auf* Google Cloud). **[ANNAHME]:** Diese organisatorische
Nähe — eine Abrechnung, eine Identitätsverwaltung, ein Secret Manager für
sowohl Firebase- als auch reine Google-Cloud-Ressourcen — dürfte die
Integration der KI-gestützten Zähler-Erkennung real vereinfacht haben,
verglichen mit einer Kombination aus einem Fremd-Backend und einer
separaten Google-Cloud-Anbindung nur für Gemini.

### 8.6 Zusammenfassung der Entscheidungslogik

> **Firebase wurde nicht wegen einer einzelnen herausragenden Eigenschaft
> gewählt, sondern weil es für ein einzeln entwickeltes Projekt ohne
> Backend-Kapazität den größten Anteil klassischer Backend-Aufgaben
> (Authentifizierung, Datenhaltung, Autorisierung, Realtime-Sync, Hosting)
> in fertig nutzbare, nutzungsbasiert abgerechnete Bausteine verwandelt —
> und genau dort, wo eigener Server-Code unvermeidbar war (ein
> API-Schlüssel, der geheim bleiben muss), eine minimale, ebenfalls
> verwaltete Serverless-Funktion bereitstellt, statt einen ganzen Server
> zu erfordern.**

---

## 9. Grenzen, Kompromisse und kritische Reflexion

Eine gute Hausarbeit stellt jede Architekturentscheidung auch in Frage.
Diese Analyse liefert dafür fünf konkrete, im Code verankerte
Ansatzpunkte:

### 9.1 Vendor Lock-in [ANNAHME]

Die gesamte Backend-Logik — Autorisierung als Firestore-Regeln, die
Datenmodellierung passend zu Firestores Abrechnungslogik (5.1), die
Cloud-Function-Laufzeit — ist eng an Firebase-spezifische Konzepte
gebunden. Eine Migration zu einem anderen Anbieter (z. B. Supabase, AWS
Amplify oder ein selbstgebautes Backend) würde nicht nur den
Datenbank-Zugriffscode betreffen, sondern auch das komplette
Sicherheitsmodell (Abschnitt 5.3) neu entwerfen müssen. Dieser Lock-in
ist der typische Preis für die in Abschnitt 8 beschriebenen
Einsparungen — eine Abwägung, die in keiner Projektdatei explizit
diskutiert wird, sich aber unmittelbar aus der Faktenlage ergibt.

### 9.2 Kontrollverlust über Datenstandort und Drittlandtransfer [BELEGT als offene Frage]

`docs/legal.md` benennt selbst als ungeklärten Punkt: „Auftragsverarbeitungs-
verträge (Art. 28 DSGVO) mit Google (Firebase, Gemini) … sollte bestätigt
werden, dass sie akzeptiert ist", und ebenso ungeklärt, „ob die von Google
für die Gemini-API zugesagten Bedingungen (Datenverwendung, Speicherdauer,
**Standort**) … passen". Das ist eine unmittelbare Konsequenz der
BaaS-Entscheidung: **Wer die Datenhaltung an einen Drittanbieter
delegiert, gibt auch die direkte Kontrolle über Speicherort und
Verarbeitungsbedingungen ab** und muss sich stattdessen auf dessen
vertragliche Zusagen (Data Processing Addendum) verlassen. Bei einem
selbstgehosteten Server in einem EU-Rechenzentrum wäre diese Frage in
dieser Form nicht entstanden.

### 9.3 Clientseitiges Vertrauen als Sicherheitsmodell [ANNAHME, mit direktem Bezug zur Monetarisierungs-Analyse]

Abschnitt 4.2 hat gezeigt: Firebase verlagert Sicherheit von der
Netzwerk- auf die Autorisierungsebene. Das funktioniert gut, **solange
jede sicherheitsrelevante Prüfung tatsächlich in den Regeln steht** — und
schlägt fehl, wo sie es nicht tut. Genau das ist in dieser App an einer
Stelle der Fall: Der aktuelle Tarif eines Nutzers (`getCurrentPlan()` in
`src/features/billing/entitlements.ts`) wird **rein clientseitig** aus dem
Auth-Store gelesen und ist über die Browser-Entwicklerwerkzeuge
veränderbar (ausführlich diskutiert in `docs/monetarisierung.md`,
Abschnitt 14.1). Das ist keine Schwäche von Firebase als Plattform —
Firebase stellt mit Custom Claims genau das dafür vorgesehene Werkzeug
bereit —, sondern zeigt, dass die architektonische *Möglichkeit* einer
serverseitigen Durchsetzung nicht automatisch bedeutet, dass sie an jeder
Stelle bereits *genutzt* wird. Ein lohnender Punkt für den kritischen Teil
der Hausarbeit: **BaaS verschiebt Verantwortung, nimmt sie aber nicht ab.**

### 9.4 Abrechnungsrisiko bei nutzungsbasierten Diensten [BELEGT als Gegenmaßnahme]

Nutzungsbasierte Abrechnung (Abschnitt 8.2) ist vorteilhaft bei niedriger
Last, aber ohne Schutzmaßnahmen riskant bei einem Lastanstieg oder
Missbrauch — ein einzelner viraler Moment oder ein automatisiertes
Skript könnte theoretisch unerwartete Kosten erzeugen. Die App begegnet
dem an der einzigen Stelle mit echten variablen Kosten (Gemini-Aufrufe)
mit expliziten Schutzmaßnahmen: `maxInstances: 5`, Bildgrößenlimit,
Auth-Pflicht (Abschnitt 6.2) sowie der empfohlene Budget-Alarm
(`docs/deployment.md`: „Budget-Alarm (1 €) empfohlen"). Das zeigt: Das
Projekt hat das Risiko erkannt und mit den auf der Plattform verfügbaren
Mitteln begrenzt — aber eben nur dort, wo es aktiv adressiert wurde.

### 9.5 Abhängigkeit von einem einzelnen Anbieter für mehrere Funktionsebenen

Firebase deckt hier gleichzeitig Hosting, Auth, Datenbank, Backend-Compute
und Analytics ab — vier bis fünf traditionell getrennte
Infrastruktur-Ebenen liegen bei **einem** Anbieter. Das maximiert die
Einsparungen aus Abschnitt 8, konzentriert aber auch das Ausfallrisiko:
Eine Störung bei Google/Firebase beträfe potenziell Login,
Datenspeicherung und Auslieferung gleichzeitig. Der einzige in der App
eingebaute Ausweg aus dieser Abhängigkeit ist der lokale `localStorage`-
Zustand (Abschnitt 3.2) — die App bliebe bei einem Firebase-Ausfall für
angemeldete Nutzer mit bereits geladenen Daten nutzbar, nur der
Sync-Mechanismus würde pausieren.

---

## 10. Zusammenfassende Architekturübersicht

```
┌─────────────────────────────── Browser (Client) ───────────────────────────────┐
│                                                                                  │
│   React-SPA (Vite-Build, statisches Bundle)                                    │
│   ┌────────────────────────────┐        ┌───────────────────────────────────┐  │
│   │ Zustand-Stores              │        │ Firebase JS SDK                  │  │
│   │ (persist → localStorage)    │◄──────►│  Auth · Firestore · Functions ·  │  │
│   │ Fragebogen, Messungen,      │        │  Analytics (Client-Bibliothek)   │  │
│   │ Zählerstände, Tarif, …      │        │                                   │  │
│   └────────────────────────────┘        └───────────────┬───────────────────┘  │
│                                                            │                     │
│   Rein clientseitige Verarbeitung:                        │ nur bei Bedarf/     │
│   Bewertungslogik, PDF-Erzeugung (jsPDF),                 │ nach Anmeldung      │
│   On-Device-OCR (Tesseract.js)                            │                     │
└────────────────────────────────────────────────────────────┼──────────────────┘
                                                               │ HTTPS
                       ┌───────────────────────────────────────┼──────────────────┐
                       │              Firebase (Google Cloud, Projekt e-app-info) │
                       │                                                          │
                       │  ┌────────────┐  ┌────────────────┐  ┌────────────────┐ │
                       │  │  Hosting   │  │ Authentication │  │   Firestore    │ │
                       │  │ (dist/)    │  │ (E-Mail/Google)│  │ (profiles/*,   │ │
                       │  │            │  │                │  │  Security      │ │
                       │  │            │  │                │  │  Rules)        │ │
                       │  └────────────┘  └────────────────┘  └───────┬────────┘ │
                       │                                               │          │
                       │  ┌────────────────────────────────────────┐  │onSnapshot│
                       │  │ Cloud Function „scanMeter"              │  │(Realtime)│
                       │  │ (Secret: GEMINI_API_KEY)                │◄─┘          │
                       │  └───────────────────┬──────────────────────┘             │
                       └──────────────────────┼────────────────────────────────────┘
                                               │ HTTPS (serverseitig, Key bleibt geheim)
                                               ▼
                                   Google Gemini API (gemini-flash-latest)

Parallel dazu: GitHub Actions (CI/CD) baut dasselbe Bundle und deployt es
zusätzlich, unverändert, nach GitHub Pages (rein statisch, ohne Firebase-
Backend-Zugriff — Login/Sync/Scan funktionieren dort identisch, weil die
Firebase-Config bereits im Bundle steckt).
```

---

## 11. Belegstellen im Quellcode

Für Zitate und Fußnoten in der Hausarbeit.

| Aussage | Datei |
|---|---|
| Zentrale Firebase-Initialisierung, offene Web-Config begründet | `src/lib/firebase.ts` |
| Lazy-Firestore-Init wegen § 25 TDDDG | `src/lib/firebase.ts` |
| Analytics erst nach Einwilligung | `src/lib/firebase.ts`, `src/features/analytics/analytics.ts` |
| Google-Login: Popup/Redirect-Strategie, iOS-Safari-Sonderfall | `src/features/auth/auth.ts` |
| Cloud-Sync-Konzept, Debouncing, Live-Listener | `src/features/sync/cloudSync.ts` |
| Gemeinsame Store-Liste für Sync/Profile, Snapshot/Hydrate | `src/features/sync/stores.ts` |
| Wohnprofil-Datenmodell, Einladungslinks | `src/features/profiles/profiles.ts` |
| Vollständiges rollenbasiertes Zugriffsmodell | `firestore.rules` |
| Emulator-gestützter Regel-Test | `package.json` (Skript `test:rules`) |
| Zähler-Scan-Funktion, Secret-Handling, Kostenschutz | `functions/index.js` |
| On-Device-OCR als Rückfallebene | `src/features/monitoring/ocr.ts`, `MeterScanner.tsx` |
| Zwei Hosting-Ziele, Build-Pfad-Umschaltung | `vite.config.ts`, `firebase.json` |
| CI/CD-Workflows, Service-Account | `.github/workflows/firebase-deploy.yml`, `.github/workflows/deploy.yml` |
| Betriebskosten „real ~0", Blaze wegen Gemini | `CLAUDE.md`, `docs/deployment.md` |
| Migrationsregel bei zwei Ladepfaden | `CLAUDE.md`, `src/store/onboardingStore.ts` |
| Offene DSGVO-Fragen zu Google/Firebase/Gemini | `docs/legal.md` |
| Technologie-Stack, lokale Datenhaltung als Prinzip | `README.md`, `package.json` |

---

## 12. Offene Punkte für eine vertiefende Recherche

1. **[PRÜFEN]** Aktuelle Firestore-Freikontingente (Spark-Tarif) und
   Preise je Lese-/Schreib-/Löschvorgang zum Zeitpunkt der Abgabe — für
   eine belastbare Kostenrechnung.
2. **[PRÜFEN]** Serverstandort der genutzten Firestore-Instanz (Standard-
   Multiregion vs. explizit gewählte EU-Region) — im Repository nicht
   ersichtlich, müsste in der Firebase Console geprüft werden.
3. **[PRÜFEN]** Ob und wie das Google Cloud Data Processing Addendum für
   dieses Projekt bestätigt wurde (`docs/legal.md` benennt das als offen).
4. Ein direkter Kostenvergleich „Firebase Blaze bei N Nutzern" gegen
   „vergleichbarer selbstgehosteter Stack (z. B. VPS + PostgreSQL +
   eigene Auth)" wäre eine sinnvolle quantitative Ergänzung, sofern die
   Hausarbeit das verlangt — dafür wären aktuelle Preislisten beider
   Wege nötig.
