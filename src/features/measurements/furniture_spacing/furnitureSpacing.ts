import type { MeasurementRating } from '../types'

/**
 * Reine Bewertungslogik für den Möbel-Abstands-Check.
 *
 * Der Nutzer beantwortet je nach Wärmeübergabe (Heizkörper oder
 * Fußbodenheizung) wenige Fragen. Antworten: 0 = nein/frei, 1 = teilweise,
 * 2 = ja/blockiert. Alle Fragen sind bewusst gleich gepolt – „ja" ist immer
 * der ungünstige Fall.
 *
 * Aus den Antworten entstehen **einzelne Befunde**, nicht nur eine Ampel: Jede
 * belastete Antwort liefert einen eigenen Eintrag mit Begründung und Handlung.
 * Eine feste Empfehlungsliste hätte auch Punkte gezeigt, die gar nicht zutreffen.
 */

export type FurnitureAnswer = 0 | 1 | 2

/** Fachlicher Befund hinter einer Frage. */
export type FindingKey =
  // Heizkörper
  | 'furniture'
  | 'cover'
  | 'valve'
  // Fußbodenheizung
  | 'footless'
  | 'carpet'
  | 'thermostat'

export const RADIATOR_KEYS: FindingKey[] = ['furniture', 'cover', 'valve']
export const UNDERFLOOR_KEYS: FindingKey[] = ['footless', 'carpet', 'thermostat']

/** Fragenreihenfolge je Wärmeübergabe. */
export function questionKeys(underfloor: boolean): FindingKey[] {
  return underfloor ? UNDERFLOOR_KEYS : RADIATOR_KEYS
}

/**
 * Gewicht je Befund als [teilweise, ja].
 *
 * Nicht alle Befunde wiegen gleich: Ein eingeschlossener Temperaturfühler
 * (Thermostatventil bzw. Raumthermostat) stört die **Regelung** und ist damit
 * der energetisch wirksamste Einzelbefund – ein Sofa davor verschiebt vor allem
 * die Wärmeverteilung. Die alte Punktsumme ohne Gewichtung hat beides
 * gleichgesetzt.
 */
const WEIGHTS: Record<FindingKey, readonly [number, number]> = {
  furniture: [1, 3],
  cover: [1, 3],
  valve: [2, 4],
  footless: [1, 3],
  carpet: [1, 3],
  thermostat: [2, 4],
}

export type FindingLevel = 'partly' | 'yes'

export interface Finding {
  key: FindingKey
  level: FindingLevel
  /** Gewicht dieses Befunds – bestimmt die Reihenfolge in der Anzeige. */
  points: number
}

export interface FurnitureCalc {
  rating: MeasurementRating
  /** Gewichtete Punktsumme. */
  score: number
  /** Anzahl der Befunde (Antwort > 0). */
  issues: number
  /** Befunde, wichtigster zuerst. */
  findings: Finding[]
}

export type FurnitureAnswers = Partial<Record<FindingKey, FurnitureAnswer>>

// Schwellen der 4-stufigen Ampel über die gewichtete Summe (max. 10).
const SCORE_MEDIUM = 1
const SCORE_ELEVATED = 3
const SCORE_HIGH = 6

/** Wertet die Antworten aus und leitet die einzelnen Befunde ab. */
export function rateFurniture(answers: FurnitureAnswers): FurnitureCalc {
  const findings: Finding[] = []
  let score = 0

  for (const key of Object.keys(WEIGHTS) as FindingKey[]) {
    const answer = answers[key]
    if (answer === undefined || answer === 0) continue
    const points = WEIGHTS[key][answer === 2 ? 1 : 0]
    score += points
    findings.push({ key, level: answer === 2 ? 'yes' : 'partly', points })
  }

  // Wichtigster Befund zuerst; bei Gleichstand bleibt die Fragenreihenfolge.
  findings.sort((a, b) => b.points - a.points)

  const rating: MeasurementRating =
    score >= SCORE_HIGH
      ? 'high'
      : score >= SCORE_ELEVATED
        ? 'elevated'
        : score >= SCORE_MEDIUM
          ? 'medium'
          : 'good'

  return { rating, score, issues: findings.length, findings }
}
