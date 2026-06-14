import type { MeasurementRating } from '../types'

/**
 * Reine Bewertungslogik für den Möbel-Abstands-Check.
 *
 * Qualitativ: Der Nutzer beantwortet je nach Wärmeübergabe (Heizkörper oder
 * Fußbodenheizung) wenige Fragen, ob Möbel/Teppiche die Heizfläche blockieren.
 * Antworten: 0 = nein/frei, 1 = teilweise, 2 = ja/blockiert.
 */

export type FurnitureAnswer = 0 | 1 | 2

export interface FurnitureCalc {
  rating: MeasurementRating
  /** Summe der Antwortpunkte. */
  score: number
  /** Anzahl der Fragen mit einem Hinweis (Antwort > 0). */
  issues: number
}

/** Wertet die Antworten aus (4-stufige Ampel über die Punktsumme). */
export function rateFurniture(answers: FurnitureAnswer[]): FurnitureCalc {
  const score = answers.reduce<number>((sum, a) => sum + (a ?? 0), 0)
  const issues = answers.filter((a) => a > 0).length
  const rating: MeasurementRating =
    score === 0 ? 'good' : score === 1 ? 'medium' : score >= 4 ? 'high' : 'elevated'
  return { rating, score, issues }
}
