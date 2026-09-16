# Code-Audit – Stand 16.09.2026 (Design Freeze)

> Ausgangspunkt: `main` @ `29a3a2d`. Dieses Dokument ändert **keinen Code** –
> weder auf `main` noch auf einem Feature-Branch. Es beschreibt, kategorisiert
> und bewertet den bestehenden Code, damit spätere Aufräum-Etappen (analog zu
> `verbesserungen-etappen.md`) auf einer gemeinsamen Bestandsaufnahme aufsetzen
> können.

## Methodik & wie dieses Dokument zu lesen ist

Die Analyse ist in **Pakete** geschnitten (siehe Fortschritt unten). Jedes
Paket ist ein eigener Abschnitt, wird einzeln fertiggestellt, committet und
gepusht – fällt eine Sitzung aus, geht höchstens der Rest des laufenden
Pakets verloren, nie ein bereits abgeschlossenes.

Drei Nichtziele vorab, damit die Empfehlungen später nicht überinterpretiert
werden:

- **Keine Bewertung der fachlichen Richtwerte oder Formeln.** Es geht um
  Code-Struktur, Wiederverwendung, Größe und Performance – nicht darum, ob
  z. B. ein Schwellenwert stimmt (das ist Sache von
  `docs/gefundene-probleme.md`).
- **Keine Umsetzungs-Reihenfolge wird hier festgelegt**, nur Kandidaten mit
  Aufwand/Wirkung-Einschätzung. Die Priorisierung (Paket 8) ist ein
  Vorschlag, keine Entscheidung.
- **„Verschlankung bei gleichbleibender Funktionalität"** heißt: Jeder
  Vorschlag hier ist – nach bestem Wissen – verhaltensneutral. Vorschläge,
  die das Nutzerverhalten ändern würden (z. B. eine Frage streichen), gehören
  nicht hierher, sondern in `gefundene-probleme.md`.

## Kennzahlen-Baseline

Ermittelt am 16.09.2026 durch `npm install` (frisch, kein `node_modules` im
Repo) + `npm run build:firebase` auf unverändertem `main`.

### Repo-Umfang

| Bereich | Dateien | LOC (`.ts`/`.tsx`) |
|---|---|---|
| `src/features/` | 240 | 40.959 |
| `src/store/` | 15 | 2.059 |
| `src/components/` (inkl. `ui/`) | 24 | 1.659 |
| `src/lib/` | 5 | 581 |
| `src/app/` | 6 | 281 |
| `src/types/` | 1 | 297 |
| **`src/` gesamt** | **291** | **~45.836** |
| `tests/` | 75 | – (564 KB) |
| `functions/` (Cloud Function) | 1 (`index.js`) | 316 |
| `archiv/` (bewusst stillgelegt, siehe CLAUDE.md) | 8 | – (64 KB) |
| `docs/` | 26 | – (636 KB) |

`src/features/` größte Unterbereiche (LOC):

| Feature | Dateien | LOC |
|---|---|---|
| `measurements/` | 77 | 10.357 |
| `education/` (Wissen) | 42 | 8.424 |
| `monitoring/` | 30 | 5.232 |
| `reports/` (PDF) | 16 | 4.875 |
| `onboarding/` | 25 | 3.576 |
| `tips/` | 4 | 1.545 |
| `legal/` | 9 | 1.191 |
| `profiles/` | 4 | 1.092 |
| `landing/` | 4 | 903 |
| `feedback/` | 6 | 836 |
| `home/` | 7 | 672 |
| `sync/` | 3 | 660 |
| `auth/` | 3 | 499 |
| `settings/` | 4 | 496 |
| `demo/` | 4 | 458 |
| `analytics/` | 1 | 76 |
| `billing/` | 1 | 67 |

Größte Einzeldateien (Kandidaten für „genauer hinsehen" in späteren Paketen):
`reports/pdf/pdfKit.ts` (1.556 Zeilen), `education/educationContent.ts`
(1.304), `tips/buildTips.ts` (838), `education/flashcards/flashcardsContent.ts`
(744), `education/EducationPage.tsx` (722), `monitoring/MeterDetailPage.tsx`
(644).

### Abhängigkeiten (`package.json`)

**Laufzeit (`dependencies`, 14):** `firebase` (Auth/Firestore/Functions/
Analytics), `jspdf` (PDF-Erzeugung), `html-to-image` (Screenshots für
PDF/Teilen), `tesseract.js` (Client-seitige OCR, Fallback/Alternative zum
Gemini-Scan), `lucide-react` (Icons), `react` + `react-dom` (19.2), `react-
router-dom` (7), `react-i18next` + `i18next` + `i18next-browser-
languagedetector`, `tailwindcss` + `@tailwindcss/vite`, `zustand`
(State/Persist).

**Build/Dev (`devDependencies`, 16):** TypeScript 6, Vite 8 (inkl. Rolldown-
Unterbau, siehe unten), ESLint 10 + typescript-eslint, Vitest 4,
`firebase-tools`, `@firebase/rules-unit-testing`, `cross-env`.

`node_modules` nach frischem Install: **759 MB** – zum Vergleich, das ist
**kein** Bandbreiten-Problem (wird nie ausgeliefert), aber ein Hinweis auf
Dev-Tooling-Gewicht:

| Paket | Größe | Anmerkung |
|---|---|---|
| `@firebase/*` + `firebase` | 171 MB | Quellpaket groß, ausgelieferter Anteil viel kleiner (s. Paket 7) |
| `re2`, `pglite-2`, `@electric-sql`, `@opentelemetry`, `google-gax`, `@google-cloud`, `@modelcontextprotocol` | ~135 MB zusammen | transitiv über `firebase-tools` (CLI), **nicht** Teil der App |
| `@rolldown` | 43 MB | Vites neuer (experimenteller) Bundler-Unterbau |
| `lucide-react` | 39 MB | Icon-Set als Quellpaket; ausgeliefert wird nur das Genutzte (s. Paket 7) |
| `tesseract.js-core` | 30 MB | WASM-OCR-Engine, Quellpaket |
| `jspdf` | 29 MB | inkl. Schriftarten/Beispiele im Quellpaket |
| `typescript` | 24 MB | – |

### Produktions-Build (real gemessen, `npm run build:firebase`, unveränderter Code)

```
dist/assets/index-7NjhAC0J.js          1.856,78 kB   gzip: 546,80 kB   ← Haupt-Bundle
dist/assets/jspdf.es.min-*.js            399,73 kB   gzip: 129,72 kB   (lazy, code-split)
dist/assets/html2canvas-*.js             199,56 kB   gzip:  46,78 kB   (lazy, Teil der jsPDF-Kette)
dist/assets/index.es-*.js                151,42 kB   gzip:  48,90 kB   (Firebase-Chunk)
dist/assets/generateReportPdf-*.js        36,24 kB   gzip:  11,84 kB   (lazy)
dist/assets/purify.es-*.js                24,94 kB   gzip:   9,78 kB   (DOMPurify, Teil der jsPDF-Kette)
dist/assets/MeterScanner-*.js              9,04 kB   gzip:   3,53 kB   (lazy)
dist/assets/index-*.css                   88,28 kB   gzip:  14,46 kB
```

Vite/Rolldown warnt selbst: *"Some chunks are larger than 500 kB after
minification."* Das Haupt-Bundle (1,86 MB / 547 KB gzip) enthält **die
gesamte App** – Onboarding, alle neun Mess-Checks, Monitoring, Wissen
(FAQ/Glossar/Karteikarten), Tipps, Rechtstexte, Profile, Settings – weil
`App.tsx` jede Seite statisch importiert (`import { X } from
'@/features/.../XPage'`) statt `React.lazy()`. Das ist unabhängig von
Feature-Größe: ob ein Neuling gerade erst die Landing Page sieht oder ein
Bestandsnutzer nur den Zählerstand einträgt, lädt in beiden Fällen dasselbe
547-KB-Paket. Wird in Paket 7 vertieft (größter Einzel-Hebel für
Reaktionszeit **und** Bandbreite, ohne Funktionalitätsverlust).

Zusätzlich auffällig: `src/i18n/locales/de.json` **und** `en.json` (je
2.827 Zeilen, 136 KB bzw. 132 KB unkomprimiert) werden beide statisch
importiert und sind damit **beide** im Haupt-Bundle enthalten, obwohl zur
Laufzeit immer nur eine Sprache aktiv ist (`src/i18n/index.ts`).

### Statische Assets (`public/`, 2,4 MB gesamt)

Größte Einzeldateien: `measurements/showerhead.mp4` (464 KB),
`measurements/showerhead.webm` (424 KB), `og-invite.png` / `og-cover.png`
(je 244 KB), Rest sind `.webp`-Illustrationen der Mess-Checks (36–88 KB
je Datei, hell/dunkel getrennt).

## Paket 1 – Architektur-Überblick

### Schichten

```
src/app/          Routing, Layout, Theme-Anwendung (6 Dateien, 281 LOC)
src/features/*/   Fachliche Module, je eigener Ordner (240 Dateien, 41k LOC)
src/store/        Zustand/Persist – je Fachbereich ein Store (15 Dateien)
src/components/   Reine UI-Bausteine ohne Fachlogik (24 Dateien)
src/lib/          Technische Helfer ohne Fachbezug (Firebase-Client, Zahlen-
                  Eingabe, Bild-Helfer, Zeitachse, Test-Log)
src/i18n/         i18next-Setup + die zwei Sprachdateien
src/types/        Geteilte TS-Typen
```

Kein Layer-Verstoß gefunden: Features importieren aus `store`/`lib`/
`components`, nie umgekehrt. `src/features/sync/` ist der einzige Ort, der
mehrere Fach-Stores kennt (siehe unten) – bewusst, weil er ihre Klammer ist.

### Routing & Rendering

`src/app/App.tsx` definiert **eine** flache `<Routes>`-Liste (React Router 7,
`BrowserRouter`). Alle 19 Seiten werden am Modulkopf **statisch** importiert
(`import { OnboardingPage } from '@/features/onboarding/OnboardingPage'` usw.)
– keine einzige nutzt `React.lazy()`. Zwei Weichen davor:

- `LandingRoute`/`useIsReturningVisitor()` entscheidet Landing Page vs.
  direkter Sprung ins Onboarding (Erstbesucher-Erkennung über
  `settingsStore.introSeen` + `onboardingStore.data.completed` +
  `demoMode`).
- `FirstVisitGate` fängt Deep-Links eines frischen Browsers ab (leerer
  Speicher, neues Gerät) und leitet auf `/`, außer bei öffentlichen Pfaden
  oder einem `?demo`-Parameter.

`LoginGate` umschließt einzeln die Routen, die eine Anmeldung voraussetzen
(`/measurements`, `/monitoring`, `/reports` u. a.) – Onboarding, Wissen,
Tipps und die Rechtstexte sind ohne Anmeldung erreichbar. Diese
Static-Import-Struktur ist die Ursache des 1,86-MB-Haupt-Bundles aus Paket 0;
Auswirkung und Lösungsvorschlag stehen in Paket 7, nicht hier – Paket 1
beschreibt nur den Ist-Zustand.

`Layout.tsx` ist bewusst dünn: Header, `DemoBanner`, `<Outlet/>`,
`LegalFooter`, `BottomNav`, ein einzelnes globales `FeedbackModal`. Die
Landing Page (`/`, `/willkommen`) läuft außerhalb dieses Layouts (eigene
Topbar, siehe Kommentar im Code).

### State-Management

Durchgängig **Zustand** (`zustand` v5), 15 Stores nach Fachbereich getrennt
(kein God-Store). 14 von 15 nutzen die `persist`-Middleware mit
konsistentem Namensschema `eapp-<bereich>` im `localStorage` (`eapp-
onboarding`, `eapp-measurements`, `eapp-readings`, `eapp-tariff`, `eapp-
progress`, `eapp-settings`, `eapp-tips`, `eapp-feedback`, `eapp-flashcards`,
`eapp-widget-order`, `eapp-report-settings`, `eapp-measurement-drafts`,
`eapp-account-avatar`, `eapp-active-profile`). Nur `authStore` persistiert
nicht (folgt dem Firebase-SDK-eigenen Sitzungszustand). Migrationen laufen
projektweit über die eine dokumentierte Konvention
(`migrateOnboardingData`, siehe CLAUDE.md) statt verstreut im
`persist`-Merge – das wurde eingehalten, keine Abweichung gefunden.

### Cloud-Sync (`src/features/sync/`)

Sauber geschnittene, kleine Architektur (660 LOC über 3 Dateien):

- `stores.ts` definiert **explizit**, welche sieben Stores zu einem
  „Wohnprofil" gehören (`onboarding`, `measurements`, `readings`, `tariff`,
  `progress`, `drafts`, `widgetOrder`) und bietet `snapshot()`/`hydrate()`/
  `resetAllStores()` als einzige Schnittstelle darauf. `settingsStore`
  (Theme/Sprache) ist bewusst ausgenommen – Geräte-, keine Wohnungssache.
- `cloudSync.ts` synchronisiert ein Profil als **ein** Firestore-Dokument
  (`profiles/{pid}`) mit dem kompletten Snapshot als Feld `state`: Schreiben
  debounced (1.500 ms, sammelt schnelle Änderungen), Lesen über
  `onSnapshot` mit Filter auf `hasPendingWrites` (verhindert, dass ein
  eigener Schreibvorgang sich selbst als Fremdänderung erneut einspielt).
  Login/Logout, Profilwechsel, Beitritt/Verlassen einer geteilten Wohnung
  und Zugriffsverlust (`permission-denied`) sind eigene, klar benannte
  Funktionen. Netzausfall beim ersten Laden hat eine gestaffelte
  Wiederholung (2 s/5 s/15 s) plus Trigger auf `online` und
  `visibilitychange`.
- `profiles.ts` (in `features/profiles/`) kapselt die Firestore-Zugriffe
  selbst (Anlegen, Einladen, Rollen, Legacy-Migration einzelner Alt-Nutzer).

Bewertung an dieser Stelle rein strukturell (funktionale Fragen dazu – z. B.
Feingranularität – gehören in Paket 7): Der **ganze** Profil-Zustand wird bei
jeder Änderung neu geschrieben und gelesen, es gibt keine Teil-Updates
einzelner Felder. Bei den heutigen Datengrößen (Stores sind Konfiguration +
Messergebnisse, keine Rohmessreihen) unauffällig; wird in Paket 7 im Hinblick
auf Bandbreite/Firestore-Kosten eingeordnet, sobald `readingsStore` über
Jahre Zählerstände ansammelt.

### Firebase-Schicht (`src/lib/firebase.ts`)

Vorbildlich lazy: `initializeApp`/`getAuth` laufen beim Modul-Import (nötig,
da praktisch immer gebraucht), aber **Firestore** (`getDb()`) und
**Analytics** (`loadAnalytics()`) sind hinter Funktionen versteckt, die erst
bei echtem Bedarf bzw. nach Consent aufgerufen werden – exakt die
Rechtsgrundlage, die CLAUDE.md unter „Rechtliches" vorschreibt, ist im Code
technisch erzwungen (`applyAnalyticsConsent()` läuft bei jeder
Consent-Änderung, setzt zusätzlich Googles eigenen Opt-out-Schalter
`ga-disable-<ID>` und räumt bei Widerruf die `_ga`-Cookies weg). Einzige
kleine Inkonsistenz: `getFunctions(app, 'europe-west1')` steht auf
Modulebene (eager), obwohl nur der Zähler-Scan es braucht – bei aktuell einer
Callable Function vernachlässigbar, aber nicht demselben Lazy-Muster wie
Firestore/Analytics folgend (Notiz für Paket 6, kein eigener Befund, da
Wirkung minimal).

### Internationalisierung

`react-i18next` mit **beiden** Sprachdateien (`de.json`, `en.json`, je
~2.800 Zeilen) statisch importiert und beim Start vollständig ins
i18next-Resource-Objekt geladen (siehe Paket 0). Sprachwahl über
`i18next-browser-languagedetector` (`localStorage` → `navigator`),
Speicherung unter dem eigenen Schlüssel `eapp-language`. Architektonisch
einfach und wartbar (ein Key pro Text, eine Datei pro Sprache) – der
Bandbreiten-Aspekt (immer beide Sprachen laden) ist ein Paket-7-Thema, keine
strukturelle Schwäche.

### Consent/Legal als Querschnittsthema

`features/legal/consent.ts` hält die Einwilligung als eigenen, versionierten
Store-Wert (`CONSENT_VERSION`, siehe CLAUDE.md-Konvention); `ConsentBanner`
und `ConsentSettings` liegen – weil beide auf Impressum/Datenschutz
verlinken – direkt im Router in `App.tsx`, nicht im `Layout`. Analytics-
Tracking (`features/analytics/analytics.ts`) prüft `hasAnalyticsConsent()`
**vor** jedem `loadAnalytics()`-Aufruf, nie danach – die Reihenfolge ist im
Code selbst dokumentiert als der Punkt, der die Rechtskonformität trägt.

### Grober Datenfluss

```
Onboarding (onboardingStore)
   → schaltet Mess-Checks/Monitoring-Kacheln/Wissens-Bereiche frei
     (fieldUsage.ts / instrumentNeeds.ts als deklarierte Abnehmer-Register)
   → Measurements (measurementsStore, measurementDraftStore) liefern Ergebnisse
   → Monitoring (readingsStore) sammelt Zählerstände über die Zeit
   → Tips (tipsStore, buildTips.ts) leitet aus alledem Handlungsempfehlungen ab
   → Reports (reports/pdf) fasst Steckbrief + Handlungsplan + Messwerte zum PDF
```

Die in CLAUDE.md dokumentierten Register (`fieldUsage.ts`,
`measurementThresholds.ts`-Herkunftskennzeichnung, `MeasurementMeta.
instruments`) sind der eigentliche „Klebstoff" zwischen den Modulen – sie
werden in Paket 2/3 im Detail bewertet.

## Paket 2 – Modul-Katalog `measurements/` + `tips/`

Größter Einzelbereich (10.357 LOC, 77 Dateien). Neun Mess-Checks nach
identischem Muster plus eine gemeinsame Infrastruktur, die dieses Muster
trägt.

### Kern-Infrastruktur (wird bereits geteilt – kein Wiederholungsbefund)

| Datei | Rolle |
|---|---|
| `catalog.ts` | Deklarative Registry (`MEASUREMENT_CATALOG`): je Check Icon, Kategorie, Dauer, `perRoom`/`perAppliance`/`wholeHome`, `skipWhenUnheated`, `yieldsSaving`, `instruments`. Steuert Sichtbarkeit, Reihenfolge, Raum-/Geräte-Zuordnung – **ohne** dass eine Ansicht das selbst entscheidet. |
| `registry.ts` + `runnerTypes.ts` | `MEASUREMENT_MODULES`: id → `{ Intro?, Run, Result }`. Ein Interface, neun Implementierungen. |
| `MeasurementRunner.tsx` (538 LOC) | **Ein** generischer Ablauf (Intro → Run → Result) für alle neun Checks: liest Katalog + Registry, klärt Raum-/Geräte-Auswahl, Zwischenstände (`measurementDraftStore`), Speichern, Erfolgs-Zwischenschritt, „nächste Messung"-Vorschlag. Kein Check baut seinen eigenen Ablauf. |
| `progress.ts`, `tasks.ts`, `order.ts`, `rooms.ts`, `useSkipped.ts` | Leiten aus Katalog + Ergebnissen ab, was erledigt/offen/übersprungen ist – für alle Checks gleich, nicht je Ansicht neu gerechnet. |
| `instrumentNeeds.ts` | Dreht `catalog.ts` um (Messung→Gerät wird Gerät→Messung) für die Fragebogen-Übersicht „Was du zum Messen brauchst" – abgeleitet, nicht gepflegt (siehe CLAUDE.md-Konvention). |
| `impact.ts`, `savingsDisplay.ts`, `resultValue.ts`, `rating.ts`, `ambientTemperature.ts`, `followUps.ts`, `applianceLabel.ts` | Reine Formatierungs-/Ableitungsfunktionen, von mehreren Checks und Views genutzt (z. B. `ambientFor()` für Kühlschrank **und** Gefrierschrank, `resultValueText()` in allen Grid-Ansichten). |
| `views/GroupTileGrid.tsx` | **Eine** Kachel-Grid-Komponente, die `ByRoomView`, `TradesView` **und** die Fortschrittsanzeige teilen (Gruppen/Items als Props, keine eigene Fachlogik). |

Das ist bereits die Art Generalisierung, nach der gefragt wurde – hier gibt es
strukturell nichts zu verschlanken, nur ein UI-Detail (siehe unten).

### Die neun Checks

| Check | Ordner-LOC | Besonderheit |
|---|---|---|
| `base_load` | 1.440 | zwei Zählerstände, `power_meter` Pflicht; größter Check (Zeitdifferenz-Logik, `remeasure.ts`) |
| `room_temperature` | 1.002 | optionaler Feuchte-Zusatzschritt → Taupunkt (`dewPoint.ts`, `roomClimate.ts`, `heatingCost.ts`, `roomAreas.ts` als vier Rechendateien statt einer) |
| `furniture_spacing` | 950 | `skipWhenUnheated`, optionales Messgerät, eigener `context.ts` |
| `standby` | 751 | mehrere Geräte gleicher Art einzeln erfassbar, eigene `deviceHistory.ts` |
| `hot_water_wait` | 537 | nutzt gemessenen Duschkopf-Durchfluss statt Pauschalwert |
| `showerhead` (Duschkopf) | 508 | rechnet Prozentsatz statt €-Betrag (siehe CLAUDE.md, Umbau 05.09.) |
| `freezer` | 496 | `perAppliance`, läuft über `ApplianceGate`/`GatedFreezerRun` |
| `fridge` | 408 | `perAppliance`, läuft über `ApplianceGate`/`GatedFridgeRun` |
| `lighting` | 378 | einziger Check ohne `Intro`-Screen, `wholeHome`, kleinster Check |

Summe der neun Ordner: 6.470 LOC; die restlichen ~3.887 LOC von
`measurements/` liegen in der oben beschriebenen gemeinsamen Infrastruktur
(Katalog, Runner, Views, Helfer) – ein plausibles Verhältnis für neun
Implementierungen eines gemeinsamen Musters, kein Ausreißer.

Jeder Check folgt demselben Datei-Trio: `<Check>Intro.tsx` (Erklärung,
optional), `<Check>Run.tsx` (Erfassung), `<Check>Result.tsx` (Auswertungs-
Anzeige) + eine reine `<check>.ts`-Rechendatei ohne React-Import (z. B.
`freezer.ts`, `hotWaterWait.ts`). Diese Trennung Rechnung/Darstellung ist
konsequent durchgehalten – **jede** der neun Rechendateien ist ohne
UI-Abhängigkeit testbar (siehe `tests/unit/*` – ein Test pro Rechendatei).

### Gefundene Duplikation (konkret, risikolos behebbar)

Eine lokale `Chip`-Komponente ist **wortgleich** in fünf `Result.tsx`
dupliziert:

```
standby/StandbyResult.tsx, hot_water_wait/HotWaterWaitResult.tsx,
showerhead/ShowerheadResult.tsx, fridge/FridgeResult.tsx,
freezer/FreezerResult.tsx
```

jeweils:
```tsx
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}
```

Kandidat für `src/components/ui/Chip.tsx` (Paket 5 vertieft
UI-Baustein-Kandidaten wie diesen).

### `tips/` (1.545 LOC, 4 Dateien)

- `buildTips.ts` (838 LOC): **eine** große Funktion `buildTips()` liest quer
  über alle Mess-Ergebnisse, das Onboarding-Profil und die Ziele
  (`goalCategoryBonus`) und leitet daraus die Liste offener Empfehlungen ab –
  je Tip-Quelle (`standby`, `lighting`, `base_load`, `showerhead`,
  `hot_water_wait`, `room_temperature` + vier Unterbefunde, `furniture_
  spacing`, `old_boiler`, `pv_self_consumption`) ein eigener Codeblock.
  Umfang folgt direkt aus der Zahl der Quellen (ca. 60–70 Zeilen je Tip inkl.
  i18n-Texten und Bedingungen) – strukturell **kein** Bloat, aber die Datei
  ist der natürliche Ort, an dem ein zehnter/elfter Tip sie weiter wachsen
  lässt. Beobachtung für Paket 6: keine Umsetzung, nur Vormerkung, falls die
  Datei über ~1.000 Zeilen wächst, in `tips/sources/<id>.ts` je Quelle zu
  trennen.
- `TipsPage.tsx` (584 LOC): reine Darstellung (Sortierung, Filter, Gruppen),
  liest ausschließlich über `buildTips()` – keine eigene Ableitung.

## Paket 3 – Modul-Katalog `education/` (Wissen) + `onboarding/`

### `education/` (8.424 LOC, 42 Dateien)

Drei Bereiche mit einer gemeinsamen Infrastruktur:

- **Inhalt** (`educationContent.ts`, 1.304 LOC): vier Content-Arrays – `FAQ`
  (35), `GLOSSARY` (58), `MEASUREMENT_INFOS` (9), `LAB_EXPERIMENTS` – alle
  auf derselben Basis `LookupFields`. Reine Daten, keine Logik; Umfang folgt
  direkt aus der Zahl der Einträge (siehe CLAUDE.md „Wissen-Ausbau"). Bewusst
  deutschsprachiger Fach-Content **außerhalb** von i18n (nur UI-Beschriftung
  ist zweisprachig) – dieselbe, konsistente Entscheidung wie bei
  `flashcardsContent.ts`.
- **Suche/Navigation** (`lookup/`, 8 Dateien): **eine** generische
  Nachschlage-Infrastruktur (`search.ts`, `glossary.ts` [A–Z-Gliederung],
  `topics.ts` [gemeinsamer Themen-Vorrat], `useLookup.ts`,
  `AlphabetRail`/`FilterChips`/`Highlight`/`SearchField`/`LookupList`/
  `NoResults` als reine Anzeige-Bausteine), die **von FAQ, Glossar und
  Mess-Hintergründen gemeinsam genutzt wird** (siehe `docs/wissen-concept.md`:
  „dieselbe Konstruktion: ein Suchfeld über zugeklappten Accordions"). Genau
  die Art Wiederverwendung, nach der gefragt wurde – hier bereits umgesetzt,
  kein Befund.
- **Karteikarten-Trainer** (`flashcards/`, 20 Dateien, davon `engine/` mit 14
  Dateien/2.331 LOC): eigenständiges Teilsystem mit eigenem Content
  (`flashcardsContent.ts`, Hochschul-Prüfungsstoff, 744 LOC) und einer
  sauber gekapselten Lern-Engine. Bemerkenswert als **positives** Muster:
  `engine/scheduler.ts` definiert eine `MemoryModel`-Schnittstelle, gegen die
  drei echte, nutzerseitig wählbare Wiederholungs-Algorithmen implementiert
  sind (`fsrs.ts` 145 LOC, `sm2.ts` 80 LOC, `leitner.ts` 65 LOC) – „alles
  außerhalb der Engine … kennt weder FSRS noch SM-2 noch Leitner" (Kommentar
  im Code). Auswahl läuft über `PaceView.tsx`, ist also erreichbar, kein
  totes Angebot. Kein Befund – als Beleg dafür aufgeführt, dass das Projekt
  Strategie-Muster bereits kennt und einsetzt, wo mehrere echte Varianten
  existieren.
- **Richtwerte-Brücke** (`measurementThresholds.ts`, 261 LOC): hält die
  CLAUDE.md-Konvention „Zahlen stehen an einer Stelle" ein – 9 Fundstellen
  von `ThresholdOrigin`/`'reference'`/`'own'`/`'pending'`, keine Zahl wird
  hier neu erfunden, alle importiert aus den Mess-Modulen. Stichprobe
  bestätigt: eingehalten.

Größte Einzeldatei bleibt `EducationPage.tsx` (722 LOC) – Layout- und
Tab-Logik für die drei Bereiche; bei genauerem Hinsehen (Paket 6) ein
Kandidat, um Tab-spezifisches Markup in je eine Unterkomponente zu ziehen,
aber ohne Redundanz zu anderen Dateien – kein Wiederholungsbefund, nur eine
Größenbeobachtung.

### `onboarding/` (3.576 LOC, 25 Dateien)

- **Schritte** (`steps/`, 9 Dateien, 2.440 LOC): Die tatsächliche
  Reihenfolge legt eine Schlüssel-Map in `OnboardingPage.tsx` fest
  (`profile → goals → rooms → heating → prices → appliances → equipment →
  review`), **nicht** die Dateinamen. Die Dateinamen (`Step0Mode`,
  `Step1Profile`, `Step3Rooms`, `Step4Heating`, `Step6Instruments`,
  `Step8Review`) stammen aus einer früheren, inzwischen mehrfach veränderten
  Nummerierung (Schritte 2/5/7 wurden im Zuge der in CLAUDE.md dokumentierten
  Umbauten entfernt oder umsortiert; neuere Schritte wie `StepGoals`,
  `StepAppliances`, `StepPrices` tragen konsequenterweise gar keine Nummer
  mehr). Rein kosmetischer Befund ohne Funktionsänderung: Die Nummern in den
  verbliebenen Dateinamen sind irreführend, weil sie weder die heutige
  Reihenfolge noch eine Lücke korrekt wiedergeben. Ein Umbenennen (z. B. auf
  die Namen aus der Schlüssel-Map) würde nichts am Verhalten ändern – siehe
  Paket 6.
- **Register** (`fieldUsage.ts` 231 LOC, `sections.ts` 337 LOC): dieselbe
  „deklarativ statt gepflegt"-Idee wie `measurements/catalog.ts` –
  `fieldUsage.ts` ist laut CLAUDE.md die Pflicht-Abnehmer-Liste jedes
  `OnboardingData`-Felds (testgestützt, siehe `tests/unit/fieldUsage.test.ts`).
  Gute bereichsübergreifende Konsistenz: Beide großen Fragebogen- und
  Mess-Bereiche lösen dasselbe Problem („woher weiß ich, was noch benutzt
  wird") mit demselben Muster.
- Restliche Dateien (`appliances.ts`, `goals.ts`, `plausibility.ts`,
  `renovationProjection.ts`, `instrumentOptions.ts`, `roomIcons.ts` u. a.)
  sind kleine, einzeln verständliche Ableitungsfunktionen ohne
  Überschneidung untereinander.

### Bandbreiten-Relevanz (Vorgriff auf Paket 7)

`educationContent.ts` (1.304 LOC Content), `flashcardsContent.ts` (744 LOC)
und die vollständige Lern-Engine landen – wie in Paket 0/1 beschrieben – im
selben ungeteilten Haupt-Bundle wie Onboarding und alle Mess-Checks, weil
`EducationPage`/`LearnPage` nicht per `React.lazy()` geladen werden. Kein
neuer Befund, nur eine weitere Bestätigung des Paket-1-Fundes anhand
konkreter Dateigrößen.

## Paket 4 – Modul-Katalog Rest-Features

### `monitoring/` (5.232 LOC, 30 Dateien)

Zählerstände/Füllstände über die Zeit: Erfassung (`AddReadingScreen`,
`AddRefillScreen`, `OdometerInput`, `FillLevelInput`), Auswertung
(`counterSeries.ts`, `range.ts`, `rangeFilter.ts`, `seasonality.ts`,
`heatingPeriod.ts`, `specificValues.ts`), Darstellung (`AbsoluteLineChart.tsx`
405 LOC, `Sparkline.tsx` + `sparklineGeometry.ts`), Zähler-Scan
(`MeterScanner.tsx`, `ocr.ts`, `scanRemote.ts` – Cloud-Function-Aufruf +
Tesseract-Fallback). Größte Dateien `MeterDetailPage.tsx` (644) und
`WidgetBoard.tsx` (558) sind Seiten-Kompositionen, keine Wiederholung.

Bemerkenswert: **kein** Chart-Framework als Abhängigkeit – beide
Diagrammtypen (großes interaktives Verlaufsdiagramm mit Pointer-/Tastatur-
Scrubbing, kleine Sparkline) sind handgeschriebenes SVG. Das ist eine
bewusste (oder zumindest wirksame) Entscheidung gegen zusätzliches
Bundle-Gewicht – siehe Paket 0/7, keine der üblichen Chart-Bibliotheken
taucht in `package.json` auf. Kein Befund, sondern eine Stärke, die bei
künftigen Diagramm-Wünschen erhalten bleiben sollte.

### `reports/` (4.875 LOC, 16 Dateien)

Sechs PDF-Typen (`generateReportPdf`, `generateMeasurementsPdf`,
`generateMonitoringPdf`, `generateProfilePdf`, `generateActionPlanPdf`,
`generateSourcesPdf`) plus eigene `*ReportData.ts`-Dateien, die Store-Daten
in PDF-taugliche Strukturen übersetzen. Alle sechs Generatoren teilen sich
**eine** Zeichen-Grundlage: `pdf/pdfKit.ts` (1.556 LOC, größte Einzeldatei
im Projekt) – eine `PdfKit`-Klasse über `jsPDF` mit Farbpalette,
Typografie- und Layout-Helfern. Das ist die richtige Stelle für diese
Größe: **eine** geteilte Klasse statt sechsmal dieselbe Kopf-/Fußzeilen-
und Tabellen-Logik. Einzige Beobachtung (Wartbarkeit, nicht Performance:
`jsPDF` wird ohnehin als ein Lazy-Chunk gebündelt, egal wie viele
Quelldateien ihn zusammensetzen): Die 1.556 Zeilen liegen in einer
einzigen Klasse – eine spätere Aufteilung nach Zuständigkeit (Typografie /
Seiten- und Paginierung / Tabellen / eingebettete Mini-Diagramme) wäre rein
kosmetisch, siehe Paket 6.

### `legal/` (1.191 LOC, 9 Dateien)

`LegalPage.tsx` ist bereits die geteilte Hülle (Kopfzeile + Warnhinweis auf
fehlende Pflichtangaben) für `ImprintPage` und `PrivacyPage` – keine
Redundanz. `consent.ts`/`cookies.ts`/`operator.ts` sind fokussierte,
einzeln verständliche Module genau im Zuschnitt, den `docs/legal.md`
vorschreibt.

### `profiles/`, `auth/`, `settings/`, `home/`, `landing/`, `feedback/`, `demo/`, `billing/`

Alle klein (67–1.092 LOC) und ohne gegenseitige Überschneidung. Zwei
konkrete, kleine Befunde:

- **`components/ui/ProgressRing.tsx` vs. `features/home/ProgressRing.tsx`**:
  zwei eigenständige SVG-Fortschrittsringe mit **unterschiedlicher** API
  (die eine nimmt `done`/`total` als Zählpaar plus feste Größe/Strichstärke,
  die andere einen fertigen `value`-Prozentsatz plus optionalen
  `children`-Slot für einen Avatar in der Mitte) aber **identischer**
  Kreis-Geometrie (Umfang, `stroke-dashoffset`-Animation). Kein reiner
  Kopier-Fund wie der `Chip` aus Paket 2, sondern ein echter
  Vereinheitlichungs-Kandidat: eine gemeinsame Komponente, die sowohl
  Zählpaare als auch Prozentsätze annimmt und optional eigenen Inhalt in der
  Mitte zeigt, würde beide Anwendungsfälle abdecken. Vertieft in Paket 5.
- **`demo/demoProfile.ts`** (241 LOC Fixture-Daten für den `?demo`-Modus)
  hängt statisch an `App.tsx` (`App → DemoLoader → enterDemo →
  demoProfile`) und lädt damit für **jeden** Besuch mit, auch ohne
  `?demo`-Parameter. Kleiner, aber sauberer Kandidat für einen dynamischen
  Import in `enterDemo.ts` (`await import('./demoProfile')`, nur wenn
  `wantsDemo()` zutrifft) – siehe Paket 7.

`analytics/` (76 LOC) und die Cloud-Sync-Seite von `sync/`/`auth/` (State-
Ebene) sind bereits in Paket 1 im Detail beschrieben.

## Paket 5 – UI-Bausteine & Generalisierungspotenzial

### Bestand

`src/components/ui/` (15 Bausteine, 872 LOC) + `src/components/*.tsx`
(9 App-Chrome-Komponenten, 787 LOC, z. B. `Header`, `BottomNav`,
`ProfileMenu`, `LoginGate`). Nutzungsbreite der `ui/`-Bausteine (Anzahl
Dateien, die sie importieren):

| Baustein | Genutzt in | Baustein | Genutzt in |
|---|---|---|---|
| `Modal` | 16 | `Stepper` | 6 |
| `Card` | 12 | `SelectChip` | 6 |
| `PageHeader` | 10 | `Avatar` | 4 |
| `Stopwatch` | 3 | `DecimalField` | 4 |
| `ProgressRing` | 3 | `Field` | 4 |
| `Slider` | 2 | `InfoButton` | 4 |
| `Toggle` | 2 | `OptionChip` | 4 |
| `Logo` | 1 | | |

Die Bausteine mit geringer Nutzungsbreite (`Logo`, `Slider`, `Toggle`) sind
nicht automatisch Kandidaten zum Entfernen – sie decken je einen echten,
wiederkehrenden Bedarf (Marke, Zahlenregler, Ein/Aus-Schalter). Interessanter
sind die Fälle, in denen **kein** gemeinsamer Baustein existiert, obwohl das
Muster mehrfach vorkommt – drei konkrete, nach Aufwand aufsteigend:

### 1. `SelectChip` ist eine Teilmenge von `OptionChip`

```
SelectChip: label, selected, onClick, className        → 28 Zeilen
OptionChip: label, selected, onClick, icon?, className  → 32 Zeilen
```

Bis auf einen minimalen Unterschied im Active-Scale (`0.94` vs. `0.95`) und
das optionale Icon ist die Auswahl-Optik **identisch** (dieselben
Tailwind-Klassen für aktiv/inaktiv, denselben Farbverlauf). `OptionChip`
deckt den Fall „ohne Icon" bereits ab (`icon` ist optional). `SelectChip`
ließe sich ersatzlos durch `OptionChip` ersetzen (6 Aufrufstellen anpassen,
0 Verhaltensänderung außer dem Rundungsdetail beim Klick-Feedback, das sich
angleichen ließe oder als Prop bestehen bliebe). Niedrigstes Risiko der drei
Kandidaten hier, weil beide Komponenten bereits exportierte, stabile Props
haben.

### 2. Zwei `ProgressRing`-Implementierungen (bereits in Paket 4 notiert)

`components/ui/ProgressRing.tsx` (done/total, feste Beschriftung) und
`features/home/ProgressRing.tsx` (value-Prozent, `children`-Slot für
Avatar) rechnen dieselbe Kreis-Geometrie zweimal. Ein gemeinsamer Baustein
bräuchte eine Vereinigung beider APIs (z. B. `value`-Prozentsatz als
gemeinsamer Nenner, `done`/`total` in den zwei bestehenden Aufrufstellen zu
einem Prozentsatz vorgerechnet) – etwas mehr Abstimmungsaufwand als bei
Punkt 1, weil drei Aufrufstellen mit unterschiedlichen Erwartungen
zusammenkämen.

### 3. Hand-gerollte „Card"-Optik statt `<Card>`

**19 Dateien** (fast ausschließlich in `measurements/`, siehe Liste in
Paket 4/Fundstelle unten) schreiben `className="glass rounded-3xl p-4"`
direkt auf ein `<div>`, obwohl `components/ui/Card.tsx` exakt diesen
Glass-Stil kapselt – nur mit `p-5` statt `p-4` als Standard-Padding. Das ist
kein Kopierfehler, sondern zwei leicht unterschiedliche Innenabstände für
denselben visuellen Baustein, die vermutlich unabhängig voneinander
entstanden sind (Intro-/Result-Screens vs. Card-Erstnutzung an anderer
Stelle). Zusammenführen hieße: `Card` um eine engere Padding-Variante
ergänzen (`className="p-4"` überschreibt das bereits – ein Blick in die 19
Stellen zeigt, ob sonst identisches Markup vorliegt) und die 19 `<div>`
durch `<Card className="p-4">` ersetzen. Reine Optik, keine Logik – aber die
größte Zahl an Fundstellen der drei Kandidaten, deshalb auch der Kandidat
mit dem meisten Diff.

### 4. Zahlenformatierung: 36 Dateien bauen ihr eigenes `Intl.NumberFormat`

Kein UI-Baustein, aber dieselbe Kategorie „an einer Stelle statt an 36":
Fast jeder Run/Result-Screen aus `measurements/`, dazu Teile von `reports/`,
`monitoring/` und `onboarding/`, erzeugt lokal ein
`new Intl.NumberFormat(i18n.language, { … })` – wiederkehrend für Euro
(`style: 'currency'`), Prozent (`style: 'percent'`) und Zahlen mit fester
Nachkommastellenzahl (0–3). Einige Dateien kapseln das zusätzlich in einer
eigenen kleinen `useNumberFormat()`/`nf()`-Hilfsfunktion – das Muster „einen
Formatter pro Fall" wird also wiederholt **erfunden**, nicht nur der
Formatter selbst. Ein gemeinsames `src/lib/format.ts` (oder ein Hook
`useFormatters()`, der die vier/fünf wiederkehrenden Formate liefert) würde
nicht nur Code sparen, sondern auch vermeiden, dass bei jedem Render ein
neues `Intl.NumberFormat`-Objekt entsteht (dessen Konstruktion nicht
kostenlos ist) – ein kleiner, aber echter Beitrag zur „Reaktionszeit"-Frage
aus dem Auftrag, zusätzlich zum Bandbreiten-/Speicher-Fokus der anderen
Befunde.

### Einordnung

Alle vier Kandidaten sind **verhaltensneutral** umsetzbar (gleiche Optik,
gleiche Zahlenwerte) und unabhängig voneinander – keiner setzt einen
anderen voraus. Sie unterscheiden sich vor allem im Diff-Umfang: Kandidat 1
(6 Stellen) und 2 (3 Stellen, aber API-Abstimmung nötig) sind klein,
Kandidat 3 (19 Stellen) und 4 (36 Stellen) sind größere, aber mechanische
Änderungen. Priorisierung folgt in Paket 8.

## Fortschritt

| Paket | Inhalt | Status |
|---|---|---|
| 0 | Baseline & Repo-Übersicht | ✅ fertig (16.09.) |
| 1 | Architektur-Überblick | ✅ fertig (16.09.) |
| 2 | Modul-Katalog `measurements/` + `tips/` | ✅ fertig (16.09.) |
| 3 | Modul-Katalog `education/` + `onboarding/` | ✅ fertig (16.09.) |
| 4 | Modul-Katalog Rest-Features | ✅ fertig (16.09.) |
| 5 | UI-Bausteine & Generalisierungspotenzial | ✅ fertig (16.09.) |
| 6 | Bloat & Vereinfachung | ⏳ offen |
| 7 | Performance (Speicher/Reaktionszeit/Bandbreite) | ⏳ offen |
| 8 | Priorisierte Empfehlungsliste & Abschluss | ⏳ offen |
