# Karteikarten-Trainer für den HTW-GEIT-Bereich

> Stand: 2026-08-17 · Ersetzt `docs/flashcards-roadmap.md` (Stand 2026-08-02).
>
> **Zielgruppe:** Studierende der Gebäudeenergie- und Informationstechnik (GEIT)
> an der HTW Berlin.
> **Ziel in einem Satz:** Ein Trainer, der pro Fach eine belastbare Antwort auf
> **„Bin ich am Klausurtag bereit?"** gibt – mit transparenter, einstellbarer und
> messbar richtiger Wiederholungslogik.
> **Tonalität:** Apple-Fitness-Stil – dezent, seriös, Ringe und Fortschritt statt
> verspieltem Comic-Look (konsistent mit `docs/ux-roadmap.md`).

Aus der Vorgänger-Roadmap übernommen: das Kartenformat **Hybrid** (Bild und/oder
Text) und der **kontogebundene** Fortschritt (`users/{uid}`, nicht am Wohnprofil).
Neu ist alles, was mit Fortschritt, Algorithmus und Statistik zu tun hat.

---

## 1. Die drei Qualitätsmerkmale, an denen alles ausgerichtet ist

1. **Ereignis-basiert.** Jede Bewertung ist ein unveränderliches Ereignis im Log.
   Der Kartenzustand ist daraus abgeleitet und jederzeit neu berechenbar. Nur so
   lassen sich Verfahren wechseln, Parameter nachjustieren und zwei Geräte
   konfliktfrei zusammenführen, ohne Lernfortschritt zu verlieren.
2. **Reine Engine.** Scheduler, Warteschlange, Session und Statistik sind pure
   TypeScript-Funktionen ohne React und ohne Firebase – testbar, simulierbar,
   austauschbar.
3. **Klausur-zentriert.** Nicht „Karten lernen", sondern „bis zum 12.02.
   Thermodynamik sitzen haben".

---

## 2. Bewertung: drei Stufen, kanonisch gespeichert

Angezeigt werden standardmäßig drei Knöpfe – **Nochmal · Fast · Gewusst**.
Intern wird **immer vierstufig** gespeichert (`again · hard · good · easy`), die
Skala ist nur die Projektion darauf. Wer später auf zwei oder vier Knöpfe
umstellt, behält damit vergleichbare Historie und Statistik.

Zu jeder Bewertung werden **Zeit bis Umdrehen** und **Zeit bis Bewertung**
erfasst. Das kostet nichts und ist die Grundlage der Flüssigkeits-Analyse
(„du weißt es, brauchst aber zwölf Sekunden").

### Festgeschriebene Definitionen

| Kennzahl | Definition |
|---|---|
| **Behaltensquote** (Retention) | Anteil Bewertungen mit Note ≥ 2 – „Fast" zählt als erinnert |
| **Trefferquote** (streng) | Anteil Bewertungen mit Note ≥ 3 |
| **Rückfall** (Lapse) | „Nochmal" auf einer bereits graduierten Karte |
| **Problemkarte** (Leech) | Rückfälle ≥ `leechThreshold` (Standard 8) |
| **Reife Karte** | Intervall ≥ 21 Tage |

Beide Quoten werden getrennt ausgewiesen und nie vermischt.

---

## 3. Datenmodell

### 3.1 Inhalt (statisch, im Repo, versioniert)

Vier Kartenarten – begründet durch den Studiengang:

| Art | Zweck |
|---|---|
| `basic` | Frage/Antwort, Bild und/oder Text |
| `cloze` | Lückentext („Q ~ n, H ~ n{{c1::²}}") |
| `numeric` | Rechenkarte mit Zielwert, Einheit und Toleranz (z. B. U-Wert ±5 %) |
| `occlusion` | Bild mit abgedeckten Bereichen (h-x-Diagramm, Pumpenkennlinie, Hydraulikschema) |

`numeric` und `occlusion` sind genau die Karten, die in GEIT-Klausuren zählen und
sich als reiner Frage/Antwort-Text nicht abbilden lassen. Formeln über KaTeX,
weil Formelbilder nicht durchsuchbar und im Dunkelmodus unschön sind.

Jede Karte trägt eine **stabile ID** (Anker des Fortschritts, nie ändern) und
einen **Inhalts-Hash**: Tippfehler zu korrigieren darf den Fortschritt nicht
töten, eine geänderte Antwort schon (`resetOnChange`).

### 3.2 Ereignis-Log (Quelle der Wahrheit)

Zwei Eintragsarten, beide unveränderlich und mit stabiler ID (`cardId:ts`):

- **Bewertung** – Note, Skala, Modus, Verfahren, Zeitmessungen, tatsächlich
  verstrichene Tage, damals geplantes Intervall.
- **Aktion** – aussetzen, fortsetzen, vertagen, zurücksetzen.

Weil Einträge unveränderlich sind, ist das Zusammenführen zweier Geräte eine
**Vereinigungsmenge** – kein „letzter gewinnt", keine Konflikte, doppelt
übertragene Einträge sind harmlos.

### 3.3 Abgeleiteter Zustand

Pro Karte: Status, Fälligkeit, Intervall, Gedächtnisgrößen des jeweiligen
Verfahrens, Wiederholungen, Rückfälle, Serie, Problemkarten-Kennzeichen. Dazu
**Tages-Aggregate**, damit die Statistik-Seiten nicht bei jedem Öffnen
zehntausende Einträge durchrechnen.

Der Zustand ist ein **reiner Cache**: Er wird aus einem Schnappschuss plus den
Einträgen danach fortgeschrieben und darf jederzeit verworfen werden.

### 3.4 Speicherung

| Was | Lokal | Cloud |
|---|---|---|
| Einstellungen | localStorage `eapp-flashcards` | `users/{uid}.flashcards.settings` |
| Kartenzustand + Aggregate | IndexedDB (Schnappschuss) | `users/{uid}/flashcards/state` |
| Ereignis-Log | IndexedDB, Monatspakete | `users/{uid}/flashcardLog/{yyyy-mm}` |

**Kontogebunden, nicht am Wohnprofil** (also *nicht* in `features/sync/stores.ts`):
Ein Student wechselt die Wohnung, sein Lernstand bleibt.

**IndexedDB statt localStorage**, weil localStorage synchron ist, bei jeder
Änderung den gesamten JSON-Block neu schreibt und bei wenigen MB endet – bei
täglich 50 Karten entstehen über ein Studium hinweg sechsstellige Einträge.

**Monatspakete** wegen der 1-MB-Grenze pro Firestore-Dokument; alte Monate werden
nie wieder geschrieben.

**Gast-Fall:** Die App ist ohne Login nutzbar. Der Trainer läuft vollständig
lokal; beim ersten Login wird das lokale Log eingemischt – gefahrlos, weil
Vereinigungsmenge.

---

## 4. Der Algorithmus

### 4.1 Zwei getrennte Mechanismen

1. **Innerhalb der Session:** „Nochmal" bringt die Karte nach `reinsertAfterCards`
   Karten zurück, plus Lernschritte im Minutenbereich.
2. **Über Tage:** Spaced Repetition bestimmt die nächste Fälligkeit.

Beide sind unabhängig einstellbar. Die Lernschritte folgen einer Regel, die für
alle Verfahren gilt: `1` → zurück auf den ersten Schritt, `2` → derselbe Schritt,
`3` → ein Schritt weiter, `4` → sofort graduieren. Leere Schrittliste heißt:
sofort in den Tagesrhythmus.

### 4.2 Drei Verfahren hinter einer Schnittstelle

| Verfahren | Charakter | Rolle |
|---|---|---|
| **FSRS** – Stabilität, Schwierigkeit, Abrufbarkeit | modern, deutlich effizienter, Ziel-Behaltensquote als Regler | **Standard** |
| **SM-2** – Leichtigkeitsfaktor | bewährter Anki-Klassiker, wenige Parameter | Alternative |
| **Leitner** – fünf Boxen (1 · 3 · 7 · 21 · 60 Tage) | maximal anschaulich | „Einfacher Modus" |

FSRS ist Standard, weil es genau den Regler mitbringt, den Klausurvorbereitung
braucht: die **Ziel-Behaltensquote** (im Semester 0,85, zwei Wochen vor der
Klausur 0,95). Umgesetzt ist der FSRS-4.5-Kern mit veröffentlichten
Standardgewichten; das Nachtrainieren der Gewichte auf den eigenen Bewertungen
ist bewusst nicht Teil des Plans – das Log enthält alles Nötige, um es später
nachzurüsten.

Ein Verfahren zu ergänzen heißt: ein Gedächtnismodell schreiben und registrieren.
Alles Gemeinsame (Lernschritte, Rückfälle, Status, Zähler, Grenzen) liegt im Kern
und ist einmal getestet.

**Wechsel ohne Datenverlust:** Kommt eine Karte aus einem anderen Verfahren, wird
der Gedächtniszustand aus dem bisherigen Intervall geschätzt (30 Tage Intervall
≈ Stabilität 30). Zusätzlich lässt sich der Zeitplan auf Wunsch komplett aus dem
Log neu rechnen.

### 4.3 Einstellbarkeit: Presets vor Schrauben

| Preset | Ziel-Behaltensquote | Neue Karten/Tag | Wiederholungen/Tag | „Nochmal" zurück nach |
|---|---|---|---|---|
| Locker | 0,80 | 10 | 60 | 10 Karten |
| Standard | 0,88 | 20 | 150 | 3 Karten |
| Intensiv | 0,92 | 40 | 300 | 5 Karten |
| Klausur-Sprint | 0,95 | 60 | unbegrenzt | sofort |

Expertenmodus darunter: Intervall-Faktor, Easy-Bonus, „Fast"-Faktor,
Lernschritte, Obergrenze, Problemkarten-Schwelle, Reihenfolge, Verschachtelung
über Fächer, Bewertungsskala, Tagesgrenze.

### 4.4 Zwei Dinge, die den Unterschied machen

**Simulator als Vorschau.** Jede Parameteränderung zeigt ihre Wirkung, bevor sie
greift: „Karte, die du wusstest: wieder in ~4 Tagen · geschätzt 42
Wiederholungen/Tag in 4 Wochen · Prognose Klausurtag 91 %".

**Transparenz.** Die Bewertungsknöpfe zeigen das resultierende Intervall
(„Gewusst → in 5 Tagen"), und ein Hinweis erklärt, *warum* diese Karte jetzt
erscheint. Ein Trainer, dessen Logik man nicht versteht, wird nicht vertraut.

---

## 5. Session

Reiner Reducer, die Oberfläche bleibt dumm. Warteschlange:

```
Relearning (fällig) → Wiederholungen (fällig, bis Limit)
                    → neue Karten (bis Limit) → optional vorgezogene
Reihenfolge: Standard über Fächer verschachtelt
```

Verschachteltes Üben ist lernpsychologisch besser belegt als blockweises –
deshalb Standard, aber abschaltbar.

**Modi**

| Modus | Verhalten |
|---|---|
| **Lernen** | geplant, wirkt auf den Zeitplan |
| **Klausur-Sprint** | alle Karten eines Fachs, hohe Frequenz; wirkt **nicht** auf den Langzeit-Zeitplan (eine Nacht vor der Klausur darf über Monate aufgebaute Intervalle nicht zerstören), optional zuschaltbar |
| **Nur schwierige Karten** | Problemkarten und schwache Trefferquoten |
| **Prüfungssimulation** | gemischt, auf Zeit; `numeric`/`cloze` automatisch geprüft, Punktzahl am Ende |
| **Blättern** | ohne Bewertung (heutiges Verhalten, bleibt erhalten) |

**Robustheit**, weil mobil gelernt wird: Undo der letzten Bewertung (Fehltipper
verfälschen sonst die Statistik), laufend gesicherter Session-Zustand für
Wiedereinstieg nach Anruf/Reload/leerem Akku, entprellte Knöpfe, einhändige
Erreichbarkeit, Karte aussetzen/vertagen und **Inhaltsfehler melden** über die
bestehende Feedback-Strecke (`feedback`-Collection, kein neues Backend).

---

## 6. Analytics

**Session-Abschluss:** bearbeitet, beide Quoten, Ø Zeit/Karte, Verteilung der
Noten, „diese fünf Karten kommen morgen wieder".

**Heute:** Ziel-Ring, Serie, verbleibend fällig, Lernzeit.

**Verlauf:** Kalender-Heatmap · Wiederholungen/Tag gestapelt (neu/jung/reif/
Relearning) · **Fälligkeits-Prognose 30 Tage** (zeigt Lastspitzen vor der
Klausur) · **gemessene Behaltensquote je Intervall gegen die Ziel-Quote** –
weicht sie ab, schlägt die App eine Parameteranpassung vor · Kartenzustands-
Verteilung · Antwortzeit-Trend · Tageszeit-Performance.

**Pro Fach/Set/Tag:** beide Quoten, Reifegrad, Schwachstellen-Top-10,
Problemkarten.

**Klausur-Bereitschaft:** Termin pro Fach eintragbar → prognostizierte
Behaltensquote am Klausurtag, Bereitschafts-Score, benötigte Karten/Tag, Warnung
bei Nichterreichbarkeit („bei 20 neuen/Tag schaffst du 340 von 520 Karten –
erhöhe auf 32 oder priorisiere Sets X/Y"), danach Vorschlag zurück auf
„Standard".

**Export:** Statistik als PDF (`jspdf` ist vorhanden, `generateCertificate.ts`
als Muster), Log als CSV/JSON – zugleich die DSGVO-Auskunft.

---

## 7. Einstiegspunkt

Heute liegt der Trainer fünf Ebenen tief (*Wissen → Hochschule → Karteikarten →
Semester → Modul → Set*). Für etwas, das täglich benutzt wird, ist das zu tief.

- Eigene Route **`/lernen`** mit „Heute": fällige Karten, „Weiterlernen",
  Ziel-Ring, Klausur-Countdown
- Einstiegskarte im Wissensbereich oben angepinnt, mit Fälligkeits-Zähler
- Deep-Links auf Fach und Set
- **Kein** sechster Eintrag in der Navigationsleiste (dort sind schon fünf)
- Erinnerungen per Web-Push nur als installierte PWA sinnvoll (iOS-Grenzen) →
  später und optional; stattdessen dezente Serie und Tagesziel

---

## 8. Barrierefreiheit und Bedienung

Tasten `1/2/3` bewerten, Leertaste umdrehen, `Z` Undo, `Esc` schließen · Wischen
hoch/runter bewertet, links/rechts blättert · Haptik über `navigator.vibrate` ·
`prefers-reduced-motion` schaltet die Umdreh-Animation ab · Vorlesen über
SpeechSynthesis (deshalb Textebene auch bei Bildkarten) · Kontraste und
Dunkelmodus über die bestehenden Tokens · Safe-Areas wie im heutigen Lernmodus ·
Alternativtexte für alle Bilder.

---

## 9. Qualitätssicherung

Vor diesem Plan gab es keine Unit-Tests für `src/` und kein `npm test`; die CI
baute nur. Für einen Scheduler ist das zu wenig – Fehler dort sind unsichtbar und
zerstören Lernstände über Wochen.

- `npm test` (Vitest, `tests/unit/`) läuft ohne Emulator in Sekunden;
  `npm run test:rules` bleibt für die Firestore-Regeln
- `.github/workflows/ci.yml` prüft Push und Pull-Request: Tests, Typprüfung,
  Build und Lint – alle blockierend
- Getestet werden Zusagen, nicht Zahlen: Monotonie (bessere Note ⇒ nie kürzeres
  Intervall), Rückfall holt binnen eines Tages zurück, Obergrenzen, Idempotenz
  und Kommutativität des Log-Merges, inkrementelle Ableitung = vollständige
  Ableitung, Lerntagsgrenze
- Performance-Budget: 5.000 Karten, Warteschlange < 50 ms, virtualisierter
  Kartenbrowser
- Telemetrie über das bestehende `analytics.ts` (Opt-out gilt)

---

## 10. Dateistruktur

```
src/features/education/flashcards/
  engine/     types · params · core · fsrs · sm2 · leitner · scheduler
              derive · rollups · log · time          ← rein, ohne React
              queue · session · simulate · stats      (Phase 1/3/4)
  content/    index (Registry, Lazy-Load pro Set) · subjects · sets/* · validate
  ui/         TodayView · SubjectGrid · SetList · StudySession · CardFace
              GradeBar · SessionSummary · StatsView · AlgorithmSettings
              CardBrowser · ExamPlanner
src/lib/reviewLog.ts                (IndexedDB: anhängen, lesen, löschen)
src/store/flashcardStore.ts         (Einstellungen + Zustands-Cache, Phase 1)
src/features/sync/flashcardSync.ts  (Vereinigungs-Merge, Muster accountAvatarSync)
tests/unit/*.test.ts
```

---

## 11. Phasen

Jede Phase ist eigenständig lauffähig, testbar und mergebar (kleine Änderungen
auf `main` gemäß `CLAUDE.md`).

| Phase | Inhalt | Ergebnis |
|---|---|---|
| **P0** ✅ | Modell, Ereignis-Log (IndexedDB), Scheduler-Schnittstelle + FSRS/SM-2/Leitner, Ableitung, Tages-Aggregate, Test-Setup + CI | Fundament, keine Änderung an der Oberfläche |
| **P1** | Session-Reducer, Warteschlange, neuer Lernmodus mit drei Knöpfen, Relearning in der Session, Undo, Wiedereinstieg, Abschluss-Screen, `flashcardStore` | Trainer läuft lokal |
| **P2** | `/lernen` mit „Heute", Fälligkeits-Zähler in Semester/Modul/Set, Ziel-Ring, Serie | täglich benutzbar |
| **P3** | Statistik v1: Heatmap, Wiederholungen/Tag, Fälligkeits-Prognose, Quoten, Kartenzustände | Statistik-Seite |
| **P4** | Presets, Expertenparameter, Simulator-Vorschau, Intervall auf den Knöpfen | Algorithmus anpassbar |
| **P5** | `flashcardSync.ts`, Firestore-Regeln, Offline, Gast→Konto-Übernahme | geräteübergreifend |
| **P6** | Klausurtermine, Bereitschafts-Score, gemessene gegen gewünschte Behaltensquote, Problemkarten, Export | Klausurvorbereitung im engeren Sinn |
| **P7** | `cloze`, `numeric` mit Toleranz, `occlusion`, KaTeX, Prüfungssimulation | GEIT-taugliche Kartenarten |
| **P8** | Import-Werkzeug für GoodNotes-Exporte, Lazy-Loading, ggf. Storage/CDN, eigene Karten anlegen | Inhalte in der Breite |

P0–P2 sind der harte Kern. Eigene Karten (P8) ohne Teilen-Funktion – Sets unter
Kommilitonen zu teilen wirft Moderation und Urheberrecht auf und bleibt außen vor.

---

## 12. Risiken

- **Bundle-Größe** bei Bildkarten → WebP, Lazy-Load pro Set, Umstieg auf
  Firebase Storage/CDN ab grob 10–15 MB Gesamtgröße
- **Karten-IDs** sind der Anker des Fortschritts; Sets umbenennen darf IDs nie
  ändern – `validate` prüft Eindeutigkeit und Stabilität beim Build
- **Log-Wachstum**: ~200 Byte pro Eintrag, 50 Bewertungen/Tag ⇒ ~3,5 MB in sechs
  Jahren; Monatspakete und Schnappschuss-Verdichtung genügen
- **Urheberrecht** der Inhalte (eigene Karten, Quellen bei Fremdvorlagen)
- **Personenbezogene Lerndaten**: zweckgebunden, lokal-first, Export und
  vollständige Löschung über die bestehende `DataResetPage`
- **Umfang**: Der Reiz ist, alles zu bauen. P0–P2 zuerst, sonst gibt es lange
  nichts Benutzbares.

---

## 13. Was in Phase 0 entstanden ist

| Datei | Inhalt |
|---|---|
| `engine/types.ts` | Noten, Skalen, Kartenstatus, Log-Einträge, Kartenzustand, feste Definitionen von „bestanden"/„gewusst" |
| `engine/params.ts` | vollständiger Parametersatz, vier Presets, Absichern fremder Werte, FSRS-Standardgewichte |
| `engine/core.ts` | Gedächtnismodell-Schnittstelle, Lernschritte, Rückfälle, Status, Zähler, Fälligkeit, Vorschau |
| `engine/fsrs.ts` | Vergessenskurve, Ziel-Behaltensquote, Stabilität/Schwierigkeit |
| `engine/sm2.ts` | Leichtigkeitsfaktor, 1 → 6 → mal Leichtigkeit |
| `engine/leitner.ts` | Boxen-Logik |
| `engine/scheduler.ts` | öffentliche Schnittstelle + Registry der Verfahren |
| `engine/derive.ts` | Kartenzustand aus dem Log, inkrementell über Schnappschuss |
| `engine/rollups.ts` | Tages-Aggregate, Serie |
| `engine/log.ts` | Einträge erzeugen, Vereinigungs-Merge, Monatspakete |
| `engine/time.ts` | Lerntage mit einstellbarer Tagesgrenze |
| `lib/reviewLog.ts` | IndexedDB-Anbindung mit Rückfallebene |
| `tests/unit/` | 95 Tests über alle drei Verfahren, Ableitung, Log, Aggregate, Zeit, Parameter |
| `.github/workflows/ci.yml` | Tests, Typprüfung, Build auf jedem Push |

Noch nichts davon ist an die Oberfläche angeschlossen – das ist Phase 1.

---

## 14. Nächster Schritt

**Phase 1**: Warteschlange und Session-Reducer, danach der neue Lernmodus mit
drei Bewertungsknöpfen anstelle des heutigen Blätter-Modus (der als „Blättern"
erhalten bleibt).

Inhaltlich unabhängig davon: ein **Pilot-Set** aus echtem GoodNotes-Material
(15–30 Karten eines überschaubaren Fachs, Vorder- und Rückseiten als Bilder),
um Bildpipeline und Lesbarkeit auf dem Handy früh zu prüfen.
