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

## Fortschritt

| Paket | Inhalt | Status |
|---|---|---|
| 0 | Baseline & Repo-Übersicht | ✅ fertig (16.09.) |
| 1 | Architektur-Überblick | ⏳ offen |
| 2 | Modul-Katalog `measurements/` + `tips/` | ⏳ offen |
| 3 | Modul-Katalog `education/` + `onboarding/` | ⏳ offen |
| 4 | Modul-Katalog Rest-Features | ⏳ offen |
| 5 | UI-Bausteine & Generalisierungspotenzial | ⏳ offen |
| 6 | Bloat & Vereinfachung | ⏳ offen |
| 7 | Performance (Speicher/Reaktionszeit/Bandbreite) | ⏳ offen |
| 8 | Priorisierte Empfehlungsliste & Abschluss | ⏳ offen |
