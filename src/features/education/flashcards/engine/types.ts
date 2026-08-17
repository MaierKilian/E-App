// Typen des Karteikarten-Trainers (Phase 0 – Fundament).
//
// Grundgedanke: Die Bewertungen sind die Quelle der Wahrheit (unveränderliches
// Ereignis-Log), der Kartenzustand ist daraus ABGELEITET. Deshalb lässt sich der
// Wiederholungs-Algorithmus jederzeit wechseln oder feinjustieren, ohne
// Lernfortschritt zu verlieren – und Statistiken können beliebig tief gehen,
// weil jede einzelne Bewertung samt Zeitmessung erhalten bleibt.
//
// Alles hier ist reines TypeScript ohne React/Firebase, damit die Engine ohne
// Oberfläche testbar und simulierbar bleibt. Siehe docs/flashcards-trainer.md.

/**
 * Kanonische Bewertung einer Karte – intern IMMER vierstufig, unabhängig davon,
 * wie viele Knöpfe die Oberfläche zeigt (`Scale`).
 *
 *  1 = again  („Nochmal" – nicht gewusst)
 *  2 = hard   („Fast"    – nicht ganz richtig)
 *  3 = good   („Gewusst")
 *  4 = easy   („Zu einfach")
 *
 * Kanonisch zu speichern ist wichtig: Wer die Skala später umstellt, behält
 * vergleichbare Historie und Statistik.
 */
export type Grade = 1 | 2 | 3 | 4

/** Anzahl der angezeigten Bewertungsknöpfe. Standard ist 3. */
export type Scale = 2 | 3 | 4

/** Welche kanonischen Noten eine Skala anzeigt (aufsteigend). */
export const GRADES_FOR_SCALE: Record<Scale, Grade[]> = {
  2: [1, 3],
  3: [1, 2, 3],
  4: [1, 2, 3, 4],
}

/** Alle kanonischen Noten in aufsteigender Reihenfolge. */
export const ALL_GRADES: Grade[] = [1, 2, 3, 4]

/**
 * Lebenszyklus einer Karte.
 *
 *  new        – noch nie bewertet
 *  learning   – in den Lernschritten (Minutenbereich), noch nicht graduiert
 *  relearning – nach einem Rückfall („Nochmal" auf einer graduierten Karte)
 *  young      – graduiert, Intervall < `MATURE_THRESHOLD_DAYS`
 *  mature     – graduiert, Intervall >= `MATURE_THRESHOLD_DAYS`
 *  suspended  – vom Nutzer ausgesetzt, kommt nicht in die Warteschlange
 */
export type CardStatus = 'new' | 'learning' | 'relearning' | 'young' | 'mature' | 'suspended'

/** Ab diesem Intervall gilt eine Karte als „reif" (wie bei Anki: 21 Tage). */
export const MATURE_THRESHOLD_DAYS = 21

/** Verfügbare Wiederholungs-Verfahren. */
export type SchedulerId = 'fsrs' | 'sm2' | 'leitner'

/**
 * In welchem Modus eine Bewertung entstanden ist.
 *
 *  study   – regulär geplantes Lernen; wirkt auf den Zeitplan
 *  relearn – Wiederholung innerhalb der Session nach „Nochmal"; wirkt
 *  cram    – Klausur-Sprint; zählt für die Statistik, wirkt standardmäßig NICHT
 *            auf den Langzeit-Zeitplan (eine Nacht vor der Klausur darf die
 *            über Monate aufgebauten Intervalle nicht zerstören)
 *  browse  – reines Durchblättern ohne Bewertung (wird nicht protokolliert,
 *            der Wert existiert für Vollständigkeit der Session-Modi)
 */
export type StudyMode = 'study' | 'relearn' | 'cram' | 'browse'

/** Modi, deren Bewertungen den Zeitplan verändern. */
export const SCHEDULING_MODES: StudyMode[] = ['study', 'relearn']

/** Nutzer-Aktionen an einer Karte, die ebenfalls im Log landen. */
export type CardAction = 'suspend' | 'unsuspend' | 'bury' | 'reset'

/** Gemeinsame Felder aller Log-Einträge. */
interface LogEntryBase {
  /**
   * Eindeutige, stabile ID (`cardId:ts`). Weil Einträge unveränderlich sind,
   * ist das Zusammenführen zweier Geräte eine reine Vereinigungsmenge über
   * diese ID – ohne Konflikte, ohne „letzter gewinnt".
   */
  id: string
  cardId: string
  /** Zeitstempel in ms (Unix-Epoche). */
  ts: number
}

/** Eine abgegebene Bewertung. Unveränderlich. */
export interface ReviewEntry extends LogEntryBase {
  kind: 'review'
  grade: Grade
  /** Welche Skala angezeigt wurde (für die Auswertung der Knopf-Nutzung). */
  scale: Scale
  mode: StudyMode
  /** Verfahren, das zum Zeitpunkt der Bewertung aktiv war. */
  algo: SchedulerId
  /** Millisekunden von „Karte sichtbar" bis „umgedreht". */
  msToFlip: number
  /** Millisekunden von „umgedreht" bis „bewertet". */
  msToGrade: number
  /**
   * Tatsächlich verstrichene Tage seit der letzten Bewertung dieser Karte
   * (0 bei der ersten). Historische Messgröße – Grundlage der gemessenen
   * Behaltensquote je Intervall.
   */
  elapsedDays: number
  /** Damals geplantes Intervall in Tagen (0 bei neuen Karten). */
  scheduledDays: number
}

/** Eine Nutzer-Aktion an einer Karte. Unveränderlich. */
export interface ActionEntry extends LogEntryBase {
  kind: 'action'
  action: CardAction
}

/** Ein Eintrag im Ereignis-Log. */
export type LogEntry = ReviewEntry | ActionEntry

/**
 * Abgeleiteter Zustand einer Karte. Reiner Cache – jederzeit aus dem Log neu
 * berechenbar (siehe `derive.ts`). Nie ohne zugehöriges Log interpretieren.
 */
export interface CardState {
  cardId: string
  status: CardStatus
  /** Fälligkeit in ms. 0 = neu (noch nie bewertet). */
  due: number
  /** Aktuelles Intervall in Tagen. Bruchteile für Lernschritte (10 min = 1/144). */
  intervalDays: number
  /** SM-2: Leichtigkeitsfaktor. Bei anderen Verfahren null. */
  ease: number | null
  /** FSRS: Gedächtnisstabilität in Tagen. Bei anderen Verfahren null. */
  stability: number | null
  /** FSRS: Schwierigkeit 1–10. Bei anderen Verfahren null. */
  difficulty: number | null
  /** Leitner: aktuelle Box (0-basiert). Bei anderen Verfahren null. */
  box: number | null
  /** Position in den Lern-/Relearning-Schritten. */
  step: number
  /** Anzahl aller zeitplanwirksamen Bewertungen. */
  reps: number
  /** Anzahl Rückfälle (》Nochmal《 auf einer graduierten Karte). */
  lapses: number
  /** Aktuelle Serie von Bewertungen >= 2. */
  streak: number
  lastReviewed: number | null
  /** Wurde die Karte oft genug vergessen, um als „Problemkarte" zu gelten? */
  leech: boolean
}

/** Zustand einer Karte, die noch nie bewertet wurde. */
export function newCardState(cardId: string): CardState {
  return {
    cardId,
    status: 'new',
    due: 0,
    intervalDays: 0,
    ease: null,
    stability: null,
    difficulty: null,
    box: null,
    step: 0,
    reps: 0,
    lapses: 0,
    streak: 0,
    lastReviewed: null,
    leech: false,
  }
}

/** Gilt eine Bewertung als „erinnert"? (Retention: „Fast" zählt mit.) */
export function isPassed(grade: Grade): boolean {
  return grade >= 2
}

/** Gilt eine Bewertung als „sicher gewusst"? (strenge Trefferquote) */
export function isCorrect(grade: Grade): boolean {
  return grade >= 3
}
