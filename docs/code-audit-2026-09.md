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

## Fortschritt

| Paket | Inhalt | Status |
|---|---|---|
| 0 | Baseline & Repo-Übersicht | ✅ fertig (16.09.) |
| 1 | Architektur-Überblick | ✅ fertig (16.09.) |
| 2 | Modul-Katalog `measurements/` + `tips/` | ✅ fertig (16.09.) |
| 3 | Modul-Katalog `education/` + `onboarding/` | ⏳ offen |
| 4 | Modul-Katalog Rest-Features | ⏳ offen |
| 5 | UI-Bausteine & Generalisierungspotenzial | ⏳ offen |
| 6 | Bloat & Vereinfachung | ⏳ offen |
| 7 | Performance (Speicher/Reaktionszeit/Bandbreite) | ⏳ offen |
| 8 | Priorisierte Empfehlungsliste & Abschluss | ⏳ offen |
