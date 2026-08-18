// Einstellbare Parameter des Wiederholungs-Algorithmus (Phase 0).
//
// Die Bedienung erfolgt später (Phase 4) über vier Presets; die Einzelparameter
// sind der Expertenmodus darunter. Alle Werte sind JSON-sicher serialisierbar
// (kein Infinity, keine Funktionen), damit sie unverändert in localStorage und
// Firestore liegen können.

import type { Scale, SchedulerId } from './types'

/** Reihenfolge, in der fällige Karten in die Warteschlange kommen (Phase 1). */
export type QueueOrder = 'dueFirst' | 'mixed' | 'hardestFirst'

/** Vollständiger Parametersatz des Trainers. */
export interface SchedulerParams {
  /** Aktives Verfahren. */
  algorithm: SchedulerId
  /**
   * Ziel-Behaltensquote (nur FSRS): Wahrscheinlichkeit, eine Karte bei
   * Fälligkeit noch zu wissen. Höher = kürzere Intervalle = mehr Aufwand.
   */
  requestRetention: number
  /** Neue Karten pro Tag. */
  newCardsPerDay: number
  /** Wiederholungen pro Tag. 0 = unbegrenzt (JSON-sicher statt Infinity). */
  maxReviewsPerDay: number
  /**
   * Lernschritte in Minuten für neue Karten. Leeres Array = Karte graduiert
   * sofort in den Tagesrhythmus (z. B. für den Leitner-Modus).
   */
  learningStepsMinutes: number[]
  /** Lernschritte in Minuten nach einem Rückfall. */
  relearningStepsMinutes: number[]
  /**
   * „Nochmal" bewertete Karten erscheinen nach so vielen anderen Karten erneut
   * in derselben Session. 0 = sofort als nächste Karte.
   */
  reinsertAfterCards: number
  /** Globaler Faktor auf alle Langzeit-Intervalle (< 1 dichter, > 1 luftiger). */
  intervalModifier: number
  /** Zusatzfaktor für „Zu einfach" (nur SM-2; FSRS nutzt sein Gewicht w16). */
  easyBonus: number
  /** Faktor für „Fast" (nur SM-2; FSRS nutzt sein Gewicht w15). */
  hardFactor: number
  /** Start-Leichtigkeit einer neuen Karte (nur SM-2). */
  startingEase: number
  /** Obergrenze für Intervalle in Tagen. */
  maxIntervalDays: number
  /** Ab so vielen Rückfällen gilt eine Karte als Problemkarte („Leech"). */
  leechThreshold: number
  /** Reihenfolge der Warteschlange. */
  order: QueueOrder
  /** Fächer/Sets im Lernstapel verschachteln statt blockweise abarbeiten. */
  interleaveSubjects: boolean
  /** Anzahl angezeigter Bewertungsknöpfe. */
  scale: Scale
  /**
   * Stunde des Tageswechsels (0–23). Wer um 1 Uhr nachts lernt, soll den Streak
   * des Vortags behalten – deshalb nicht Mitternacht.
   */
  dayCutoffHour: number
  /** Boxen-Intervalle in Tagen (nur Leitner). */
  leitnerBoxDays: number[]
  /** Gewichte des FSRS-Modells (nur FSRS). */
  fsrsWeights: number[]
}

/**
 * Standardgewichte des FSRS-Modells (FSRS-4.5, 17 Gewichte).
 *
 * w0–w3   Anfangsstabilität je Note (again/hard/good/easy) in Tagen
 * w4–w5   Anfangsschwierigkeit (Achsenabschnitt / Steigung über die Note)
 * w6–w7   Schwierigkeits-Aktualisierung und Rückkehr zum Mittel
 * w8–w10  Stabilitätszuwachs bei Erfolg
 * w11–w14 Stabilität nach einem Rückfall
 * w15–w16 Abschlag für „Fast", Zuschlag für „Zu einfach"
 *
 * Bewusst als Parameter und nicht als Konstante im Code: Die Gewichte lassen
 * sich später aus dem eigenen Ereignis-Log nachtrainieren, ohne die Engine
 * anzufassen. Bis dahin gelten diese Standardwerte für alle Nutzer.
 */
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474, 0.1367, 1.0461, 2.1072,
  0.0793, 0.3246, 1.587, 0.2272, 2.8755,
]

/** Standardeinstellungen – entsprechen dem Preset „Standard". */
export const DEFAULT_PARAMS: SchedulerParams = {
  algorithm: 'fsrs',
  requestRetention: 0.88,
  newCardsPerDay: 20,
  maxReviewsPerDay: 150,
  learningStepsMinutes: [1, 10],
  relearningStepsMinutes: [10],
  reinsertAfterCards: 3,
  intervalModifier: 1,
  easyBonus: 1.3,
  hardFactor: 1.2,
  startingEase: 2.5,
  maxIntervalDays: 365 * 3,
  leechThreshold: 8,
  order: 'dueFirst',
  interleaveSubjects: true,
  scale: 3,
  dayCutoffHour: 4,
  leitnerBoxDays: [1, 3, 7, 21, 60],
  fsrsWeights: DEFAULT_FSRS_WEIGHTS,
}

/** Die vier Voreinstellungen, die in der Oberfläche die Hauptbedienung sind. */
export type PresetId = 'relaxed' | 'standard' | 'intensive' | 'sprint'

/**
 * Presets als Teilmengen: Sie überschreiben nur, was ihren Charakter ausmacht.
 * Alles andere bleibt bei den Standardwerten – so wirkt eine Änderung an
 * `DEFAULT_PARAMS` konsistent auf alle Presets.
 */
export const PRESETS: Record<PresetId, Partial<SchedulerParams>> = {
  relaxed: {
    requestRetention: 0.8,
    newCardsPerDay: 10,
    maxReviewsPerDay: 60,
    reinsertAfterCards: 10,
  },
  standard: {
    requestRetention: 0.88,
    newCardsPerDay: 20,
    maxReviewsPerDay: 150,
    reinsertAfterCards: 3,
  },
  intensive: {
    requestRetention: 0.92,
    newCardsPerDay: 40,
    maxReviewsPerDay: 300,
    reinsertAfterCards: 5,
  },
  sprint: {
    requestRetention: 0.95,
    newCardsPerDay: 60,
    maxReviewsPerDay: 0,
    reinsertAfterCards: 0,
  },
}

/**
 * Welches Preset gerade eingestellt ist – oder null, wenn die Werte zu keinem
 * passen (nur möglich, wenn Parameter von Hand gesetzt wurden).
 *
 * Bewusst aus den Werten abgeleitet statt zusätzlich gespeichert: So kann der
 * gespeicherte Zustand nicht behaupten, „Intensiv" zu sein, während andere Werte
 * gelten.
 */
export function currentPreset(p: SchedulerParams): PresetId | null {
  for (const id of Object.keys(PRESETS) as PresetId[]) {
    const preset = PRESETS[id]
    const matches = Object.entries(preset).every(
      ([key, value]) => p[key as keyof SchedulerParams] === value,
    )
    if (matches) return id
  }
  return null
}

/** Baut einen vollständigen Parametersatz aus einem Preset. */
export function paramsFromPreset(preset: PresetId): SchedulerParams {
  return { ...DEFAULT_PARAMS, ...PRESETS[preset] }
}

/**
 * Ergänzt fehlende Felder mit den Standardwerten und begrenzt alle Zahlen auf
 * sinnvolle Bereiche. Nötig, weil Einstellungen aus localStorage/Firestore
 * kommen können und dort veraltet oder unvollständig sein dürfen.
 */
export function normalizeParams(input?: Partial<SchedulerParams> | null): SchedulerParams {
  const p = { ...DEFAULT_PARAMS, ...(input ?? {}) }
  return {
    ...p,
    requestRetention: clamp(p.requestRetention, 0.7, 0.99),
    newCardsPerDay: Math.max(0, Math.round(p.newCardsPerDay)),
    maxReviewsPerDay: Math.max(0, Math.round(p.maxReviewsPerDay)),
    learningStepsMinutes: sanitizeSteps(p.learningStepsMinutes),
    relearningStepsMinutes: sanitizeSteps(p.relearningStepsMinutes),
    reinsertAfterCards: clamp(Math.round(p.reinsertAfterCards), 0, 100),
    intervalModifier: clamp(p.intervalModifier, 0.5, 2),
    easyBonus: clamp(p.easyBonus, 1, 3),
    hardFactor: clamp(p.hardFactor, 0.5, 1.5),
    startingEase: clamp(p.startingEase, 1.3, 4),
    maxIntervalDays: clamp(Math.round(p.maxIntervalDays), 1, 365 * 20),
    leechThreshold: clamp(Math.round(p.leechThreshold), 2, 50),
    dayCutoffHour: clamp(Math.round(p.dayCutoffHour), 0, 23),
    leitnerBoxDays:
      p.leitnerBoxDays?.length > 0 ? p.leitnerBoxDays.map((d) => Math.max(1, Math.round(d))) : DEFAULT_PARAMS.leitnerBoxDays,
    fsrsWeights:
      p.fsrsWeights?.length === DEFAULT_FSRS_WEIGHTS.length ? p.fsrsWeights : DEFAULT_FSRS_WEIGHTS,
  }
}

/** Ist die Anzahl der Wiederholungen pro Tag unbegrenzt? */
export function isUnlimitedReviews(p: SchedulerParams): boolean {
  return p.maxReviewsPerDay === 0
}

function sanitizeSteps(steps?: number[]): number[] {
  if (!Array.isArray(steps)) return []
  return steps.filter((m) => Number.isFinite(m) && m > 0).map((m) => Math.min(m, 60 * 24))
}

function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}
