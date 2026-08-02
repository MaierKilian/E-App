# E-App – Karteikarten für den HTW-GEIT-Wissensbereich

> Stand: 2026-08-02 · Roadmap für ein professionelles, lerneffizienz­optimiertes
> Karteikarten-System im „Hochschule"-Bereich der E-App.
>
> **Zielgruppe:** Studierende des Studiengangs Gebäudeenergie- und
> Informationstechnik (GEIT) an der HTW Berlin.
> **Ziel:** Vorhandene, professionell aufbereitete GoodNotes-Karteikartensets für
> nahezu alle einschlägigen Fächer schrittweise in die App integrieren – mit
> Wiederholungs-Statistiken, richtig/falsch-Tracking und einem anpassbaren
> Wiederholungs-Algorithmus (Spaced Repetition).
>
> **Tonalität:** Apple-Fitness-Stil – dezent, seriös, Ringe/Fortschritt statt
> verspieltem Comic-Look (konsistent mit `docs/ux-roadmap.md`).

---

## 0. Wo wir andocken (Ist-Zustand)

Der Wissensbereich (`src/features/education/EducationPage.tsx`) hat vier Chips:
`FAQ · Glossar · Messungen · Hochschule`. Der „Hochschule"-Teil (`UniversityView`)
listet aktuell **Laborversuche** (`LAB_EXPERIMENTS` in `educationContent.ts`) mit
je einem Vorbereitungs-Quiz (`Quiz.tsx`). Ergebnisse landen im `progressStore`.

Die Karteikarten sind ein **eigenständiges, größeres Lernmodul** neben den
Laborversuchen. Wir bauen sie als neuen Bereich innerhalb von „Hochschule" auf
(Fächer → Sets → Lernsession), nicht als Ersatz der Laborversuche.

### Wichtige Architektur-Erkenntnisse aus dem Code

| Thema | Fund im Code | Konsequenz für Karteikarten |
|---|---|---|
| Lernfortschritt-Speicher | `progressStore` (`quizResults`), persistiert als `eapp-progress` | Wird als Vorlage genutzt, aber **eigener Store** für Karteikarten. |
| Sync-Geltungsbereich | `stores.ts` synct `progress` **pro Wohnprofil** (`profiles/{id}`) | ⚠️ Lernfortschritt darf **nicht** an die Wohnung hängen – ein Student wechselt Wohnprofile, sein Lernstand muss bleiben. → **kontogebunden** speichern. |
| Kontogebundene Cloud-Daten | `accountAvatarSync.ts` schreibt `users/{uid}.accountPhoto` | **Exakte Vorlage** für den Karteikarten-Fortschritt: `users/{uid}` + lokaler Cache-Store + Live-Listener. |
| Content-Ablage | Fachinhalte als deutscher TS-Content in `educationContent.ts` (nicht i18n) | Karteikarten-Inhalte analog als versioniertes Content-Modul; nur UI-Labels via i18n. |
| UI-Bausteine | `Card`, `ProgressRing`, `Modal`, `SelectChip`, `Sparkline` vorhanden | Wiederverwenden – kein neues Design-System nötig. |

---

## 1. Die drei zentralen Entscheidungen (bitte vorab gemeinsam festlegen)

Diese Weichen bestimmen den Zuschnitt von Phase 1. Meine Empfehlung ist jeweils
markiert; alles ist später erweiterbar.

### Entscheidung A – Kartenformat (wie werden GoodNotes-Karten zu App-Karten?)
GoodNotes-Karten sind i. d. R. **handschriftlich/gezeichnet** → Bildinhalt, nicht
reiner Text.

- **A1 (Empfehlung): Bild-Karten.** Vorder-/Rückseite je als Bild (aus GoodNotes
  als PNG/PDF exportiert). Schnellster Weg zur vollständigen Integration deiner
  bestehenden Sets, kein Neuschreiben. Später optional pro Karte durch Text
  ergänzbar (Suche/Barrierefreiheit).
- **A2: Text-Karten.** Höchste Qualität (durchsuchbar, klein, skaliert, TTS),
  aber jede Karte muss abgetippt/strukturiert werden – hoher Initialaufwand.
- **A3: Hybrid.** Bild + optionale Textfelder (Titel/Tags/Antworttext). Beste
  Endqualität, etwas mehr Modell-Komplexität.

→ **Empfehlung: A1 jetzt, Datenmodell aber A3-fähig auslegen** (Textfelder
optional von Anfang an im Schema, nur noch nicht befüllt).

### Entscheidung B – Sync-Geltungsbereich des Lernfortschritts
- **B1 (Empfehlung): Kontogebunden** (`users/{uid}`), wie der Konto-Avatar.
  Fortschritt folgt dem Studenten geräteübergreifend, unabhängig vom Wohnprofil.
- **B2: Nur lokal** (localStorage). Simpel, aber Verlust bei Gerätewechsel/Logout.

→ **Empfehlung: B1**, mit lokalem Cache als Offline-Puffer (Muster:
`accountAvatarSync.ts`).

### Entscheidung C – Content-Auslieferung (wo liegen die Karten-Bilder?)
- **C1 (Empfehlung, Start): Im Repo gebündelt** unter `src/features/education/flashcards/assets/…`,
  als statische Imports. Versioniert, offline-fähig, kein Backend nötig. Achtung
  Bundle-Größe → WebP/komprimiert, Lazy-Loading pro Set.
- **C2: Firebase Storage / CDN**, Manifest im Repo. Skaliert für sehr viele Sets,
  hält das App-Bundle klein, braucht aber Upload-/Cache-Logik.

→ **Empfehlung: C1 für die ersten Fächer**, Wechsel zu C2 sobald die Gesamt­größe
der Bilder das App-Bundle spürbar belastet (Schwelle grob > 10–15 MB).

---

## 2. Zielbild (was am Ende steht)

- **Fächer-Übersicht** im „Hochschule"-Bereich: pro Fach eine Kachel mit
  Fortschritts-Ring (fällig / gelernt / gesamt).
- **Set-/Deck-Ansicht** je Fach: mehrere Karteikartensets, jeweils mit
  „X fällig heute", Trefferquote, letzter Lerntag.
- **Lernsession** (Kernbildschirm): Karte zeigen → umdrehen → Selbstbewertung
  (z. B. „Nochmal / Schwer / Gut / Einfach"). Große, ruhige Karte, wischbar,
  tastaturfähig, Fortschrittsleiste der Session.
- **Statistiken** je Karte / Set / Fach: Anzahl Wiederholungen, richtig/falsch,
  Trefferquote, Streak, Fälligkeits-Vorschau, Heatmap der Lerntage,
  Retention-Kurve. Prägnant, Apple-Health-artig (bestehende `Sparkline`,
  `ProgressRing`).
- **Anpassbarer Algorithmus:** wählbares Verfahren + Feinparameter (siehe §4).
- **Geräteübergreifend & offline:** kontogebundener Fortschritt, lokaler Cache.

---

## 3. Datenmodell (Entwurf)

Getrennt in **Content** (statisch, im Repo) und **Fortschritt** (pro Nutzer).

```ts
// Content – src/features/education/flashcards/flashcardsContent.ts
interface FlashcardSubject {        // Fach, z. B. „Thermodynamik"
  id: string
  title: string
  semester?: number
  icon?: string
  setIds: string[]
}

interface FlashcardSet {            // Karteikartenset innerhalb eines Fachs
  id: string
  subjectId: string
  title: string
  description?: string
  cardIds: string[]
  version: number                   // erhöht sich bei Inhaltsänderung
}

interface Flashcard {
  id: string                        // stabil! (Fortschritt hängt daran)
  setId: string
  frontImage?: string               // A1/A3 – Bild-Import oder Asset-Pfad
  backImage?: string
  frontText?: string                // A2/A3 – optional
  backText?: string
  tags?: string[]
}

// Fortschritt – src/store/flashcardStore.ts (kontogebunden, gecacht)
interface CardProgress {
  cardId: string
  reps: number                      // Anzahl Wiederholungen
  correct: number                   // als „gewusst" bewertet
  wrong: number                     // als „nicht gewusst" bewertet
  streak: number                    // aktuelle Serie korrekter Antworten
  ease: number                      // Leichtigkeitsfaktor (SM-2)
  intervalDays: number              // aktuelles Intervall
  due: string                       // ISO – nächste Fälligkeit
  lastReviewed?: string
  lapses: number                    // Anzahl Rückfälle
  history: { date: string; grade: number }[]  // für Statistik/Heatmap
}

interface FlashcardSettings {       // anpassbarer Algorithmus
  algorithm: 'sm2' | 'leitner' | 'custom'
  newCardsPerDay: number
  maxReviewsPerDay: number
  startingEase: number
  easyBonus: number
  intervalModifier: number          // globaler Faktor (schneller/langsamer lernen)
  gradingScale: 2 | 4               // „gewusst/nicht" vs. „Nochmal/Schwer/Gut/Einfach"
}
```

**Cloud-Ablage (Empfehlung B1):** `users/{uid}.flashcards = { progress, settings, updatedAt }`.
Sync-Modul `flashcardSync.ts` analog zu `accountAvatarSync.ts` (Live-Listener +
optimistischer, entprellter Schreibvorgang). **Nicht** in `stores.ts` aufnehmen,
damit der Fortschritt nicht ans Wohnprofil gekoppelt wird.

---

## 4. Der anpassbare Wiederholungs-Algorithmus

Kern der „maximalen Lerneffizienz". Wir kapseln ihn hinter einer schmalen
Schnittstelle, damit das Verfahren austauschbar bleibt:

```ts
// scheduleNext(progress, grade, settings) -> CardProgress
```

- **Standard: SM-2** (Anki-Verwandter) – bewährt, wenige Parameter, gut erklärbar.
- **Alternativ: Leitner-Boxen** – sehr anschaulich, ideal als „einfacher Modus".
- **Custom:** SM-2 mit den in `FlashcardSettings` einstellbaren Parametern
  (Intervall-Faktor, Easy-Bonus, Karten/Tag …).

Der/die Studierende kann in den Einstellungen zwischen Verfahren wählen und die
Aggressivität justieren (z. B. „intensiv vor Klausur" vs. „locker im Semester").
Die Bewertungsskala (2- oder 4-stufig) ist ebenfalls einstellbar.

---

## 5. Schritt-für-Schritt-Umsetzung (Phasen)

Jede Phase ist eigenständig lauffähig, testbar und mergebar (kleine PRs auf
`main`, gemäß `CLAUDE.md`).

### Phase 0 – Fundament & Entscheidungen ✅ *(dieses Dokument)*
- Roadmap abstimmen, Entscheidungen A/B/C festlegen.
- **1 Pilot-Set** aus einem Fach auswählen (kleines, repräsentatives Set) als
  Referenz für Export-Qualität, Bildgröße und Lesbarkeit auf dem Handy.

### Phase 1 – Statisches Karteikarten-MVP (ohne Algorithmus)
- Datenmodell + Content-Modul anlegen (`flashcardsContent.ts`), Pilot-Set einpflegen.
- Neuer Unterbereich in „Hochschule": Fächer → Sets → **einfache Blätter-Ansicht**
  (Karte antippen zum Umdrehen, vor/zurück). Noch keine Bewertung/Persistenz.
- UI mit vorhandenen Bausteinen (`Card`, `Modal`), voll responsiv & theme-fähig.
- **Ziel:** Deine echten Karten laufen sichtbar in der App – wir validieren
  Bildpipeline, Lesbarkeit und Bedienung an einem realen Set.

### Phase 2 – Lernsession + Fortschritt (lokal)
- Selbstbewertung nach dem Umdrehen; `flashcardStore` (lokal) zählt
  reps/correct/wrong/streak pro Karte.
- SM-2 als erster Algorithmus, Fälligkeitslogik („heute fällig").
- Session-Fluss: fällige Karten der Reihe nach, Fortschrittsleiste, Abschluss-Screen.

### Phase 3 – Statistiken
- Statistik-Screen je Set/Fach: Trefferquote, Wiederholungen, Streak,
  Fälligkeits-Vorschau, Lern-Heatmap (Kalender), Retention-Kurve.
- Wiederverwendung von `ProgressRing`/`Sparkline`; dezente, prägnante Aufbereitung.

### Phase 4 – Geräteübergreifende Synchronisation
- `flashcardSync.ts` (Muster `accountAvatarSync.ts`): `users/{uid}.flashcards`.
- Firestore-Sicherheitsregeln für das Feld ergänzen; Merge-Strategie bei
  Konflikten (jüngster `updatedAt` bzw. feldweises Maximum der Zähler).
- Offline-Cache + optimistische Updates.

### Phase 5 – Anpassbarer Algorithmus & Einstellungen
- Einstellungs-Panel (Verfahren, Karten/Tag, Intervall-Faktor, Bewertungsskala).
- Leitner-Modus + „custom"-Parameter; Umschalten ohne Datenverlust.

### Phase 6 – Content-Skalierung (alle Fächer)
- Restliche Fächer/Sets schrittweise einpflegen (semesterweise).
- Bei Bundle-Druck: Umstieg auf Firebase Storage/CDN (Entscheidung C2) inkl.
  Manifest + Lazy-Loading.
- Optional: Import-Workflow/Skript, um GoodNotes-Exporte halbautomatisch in das
  Content-Schema zu überführen (Dateinamens-Konvention → `cardId`).

### Phase 7 – Feinschliff & Bindung (optional)
- Tastatur-/Wisch-Gesten, Haptik, „Nur schwierige Karten"-Modus.
- Tages-Lernziel + dezenter Streak (Apple-Fitness-Stil).
- Text-Layer für Suche/Barrierefreiheit (Migration A1 → A3).

---

## 6. Offene Punkte / Risiken

- **Bundle-Größe** bei vielen Bild-Karten → früh WebP + Lazy-Loading, Schwelle für
  C2-Umstieg definieren.
- **Karten-IDs müssen stabil bleiben** – Fortschritt hängt an `cardId`. Umbenennen
  von Sets darf IDs nicht ändern (Content-Versionierung).
- **Urheberrecht/Quellen**: sicherstellen, dass die Karten deine eigenen sind und
  ggf. genutzte Vorlagen zulässig sind (die App zeigt sonst Quellen an).
- **Firestore-Dokumentgröße** (1 MB/Dokument): Fortschritt ist klein, aber bei
  sehr vielen Karten ggf. `history` begrenzen/auslagern.

---

## 7. Nächster konkreter Schritt

1. Entscheidungen A/B/C bestätigen (Empfehlung: **A1 · B1 · C1**).
2. **Ein Pilot-Set** als Export bereitstellen (z. B. 15–30 Karten eines Fachs,
   Vorder-/Rückseiten als Bilder) – damit starte ich Phase 1 an echtem Material.
