import type { RoomType } from '@/types'
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
  | 'builtin'
  | 'towels'
  | 'cover'
  | 'valve'
  // Fußbodenheizung
  | 'footless'
  | 'carpet'
  | 'thermostat'

export const RADIATOR_KEYS: FindingKey[] = ['furniture', 'cover', 'valve']
export const UNDERFLOOR_KEYS: FindingKey[] = ['footless', 'carpet', 'thermostat']

/** Alle Befunde – für das Auslesen gespeicherter Ergebnisse. */
export const ALL_FINDING_KEYS: FindingKey[] = [
  'furniture',
  'builtin',
  'towels',
  'cover',
  'valve',
  'footless',
  'carpet',
  'thermostat',
]

/**
 * Erste Frage je Raumtyp bei Heizkörpern.
 *
 * „Steht ein Sofa davor?" trifft in der Küche niemand – dort ist der Heizkörper
 * typischerweise von Einbaumöbeln überbaut, im Bad hängen Handtücher darüber.
 * Der Raum ist über `roomKey` bekannt und wurde bisher nur für die Überschrift
 * genutzt.
 */
const ROOM_PRIMARY_KEY: Partial<Record<RoomType, FindingKey>> = {
  kitchen: 'builtin',
  bathroom: 'towels',
}

/** Fragenreihenfolge je Wärmeübergabe und Raumtyp. */
export function questionKeys(underfloor: boolean, roomType?: RoomType): FindingKey[] {
  if (underfloor) return UNDERFLOOR_KEYS
  const primary = (roomType && ROOM_PRIMARY_KEY[roomType]) ?? 'furniture'
  return [primary, 'cover', 'valve']
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
  // Überbaute Einbaumöbel wiegen schwerer: dauerhaft und nicht umstellbar.
  builtin: [2, 4],
  towels: [1, 3],
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

// --- Gemessener Abstand (optional) -------------------------------------------
//
// Der Check heißt „Abstands-Check", fragte aber nur ja/teilweise/nein. Wer einen
// Zollstock zur Hand hat, kann den Abstand zwischen Möbel und Heizkörper direkt
// eingeben; daraus wird dieselbe 0/1/2-Antwort abgeleitet. Bewusst optional –
// die Aussage soll auch ohne Messgerät funktionieren.

/** Empfohlener freier Abstand vor dem Heizkörper in cm. */
export const DISTANCE_TARGET_CM = 10

/** Darunter ist die Luftzufuhr von unten praktisch unterbunden (cm). */
export const DISTANCE_BLOCKED_CM = 5

export const DISTANCE_MIN_CM = 0
export const DISTANCE_MAX_CM = 40
export const DISTANCE_DEFAULT_CM = 10

/**
 * Übersetzt einen gemessenen Abstand in die Antwortstufe.
 *
 * Der Heizkörper arbeitet mit freier Konvektion: Luft strömt unten ein, erwärmt
 * sich und tritt oben aus. Entscheidend ist der freie Querschnitt davor, nicht
 * der Abstand als solcher – deshalb die grobe Dreiteilung statt einer
 * Prozentkurve, die eine Genauigkeit vortäuschen würde.
 */
export function answerFromDistance(distanceCm: number): FurnitureAnswer {
  if (!Number.isFinite(distanceCm)) return 0
  if (distanceCm < DISTANCE_BLOCKED_CM) return 2
  if (distanceCm < DISTANCE_TARGET_CM) return 1
  return 0
}

/** Befunde, für die eine Abstandsmessung sinnvoll ist. */
export function supportsDistance(key: FindingKey): boolean {
  return key === 'furniture'
}

// --- Verstellte Bodenfläche (optional, Fußbodenheizung) ----------------------
//
// Der Abstand zum Heizkörper ist bei einer Fußbodenheizung gegenstandslos –
// dort gibt es keinen Heizkörper, vor dem etwas frei bleiben müsste. Die
// entsprechende Größe ist der Anteil der beheizten Fläche, der zugestellt ist:
// Die Anlage ist auf die ganze Fläche ausgelegt, jede ausgefallene Teilfläche
// muss der Rest mit höherer Vorlauftemperatur ausgleichen.
//
// Geschätzt statt gemessen: Anders als der Abstand braucht das keinen
// Zollstock, sondern einen Blick durch den Raum.

/** Ab diesem Anteil fällt spürbar Fläche aus (%). */
export const COVER_PARTLY_PCT = 15
/** Ab hier fehlt so viel Fläche, dass die Vorlauftemperatur steigen muss (%). */
export const COVER_BLOCKED_PCT = 30

export const COVER_MIN_PCT = 0
export const COVER_MAX_PCT = 80
export const COVER_DEFAULT_PCT = 15

/**
 * Übersetzt den geschätzten Flächenanteil in die Antwortstufe.
 *
 * Dieselbe grobe Dreiteilung wie beim Abstand: Die Schwellen sind gerundete
 * Erfahrungswerte, keine Norm – eine feinere Kurve würde eine Genauigkeit
 * vortäuschen, die eine Schätzung nach Augenmaß nicht hergibt.
 */
export function answerFromCoverage(pct: number): FurnitureAnswer {
  if (!Number.isFinite(pct)) return 0
  if (pct >= COVER_BLOCKED_PCT) return 2
  if (pct >= COVER_PARTLY_PCT) return 1
  return 0
}

/** Befunde, für die eine Flächen-Schätzung sinnvoll ist (Fußbodenheizung). */
export function supportsCoverage(key: FindingKey): boolean {
  return key === 'footless'
}

// Schwellen der 4-stufigen Ampel – als Anteil der erreichbaren Punkte, nicht
// als absolute Summe. Sonst wäre dieselbe Antwort je nach Fragensatz
// unterschiedlich streng bewertet, sobald ein Raumtyp anders gewichtete Fragen
// bekommt.
const RATIO_ELEVATED = 0.25
const RATIO_HIGH = 0.55

/** Wertet die Antworten aus und leitet die einzelnen Befunde ab. */
export function rateFurniture(answers: FurnitureAnswers): FurnitureCalc {
  const findings: Finding[] = []
  let score = 0
  let maxScore = 0

  for (const key of ALL_FINDING_KEYS) {
    const answer = answers[key]
    if (answer === undefined) continue
    maxScore += WEIGHTS[key][1]
    if (answer === 0) continue
    const points = WEIGHTS[key][answer === 2 ? 1 : 0]
    score += points
    findings.push({ key, level: answer === 2 ? 'yes' : 'partly', points })
  }

  // Wichtigster Befund zuerst; bei Gleichstand bleibt die Fragenreihenfolge.
  findings.sort((a, b) => b.points - a.points)

  const ratio = maxScore > 0 ? score / maxScore : 0
  const rating: MeasurementRating =
    ratio >= RATIO_HIGH
      ? 'high'
      : ratio >= RATIO_ELEVATED
        ? 'elevated'
        : score > 0
          ? 'medium'
          : 'good'

  return { rating, score, issues: findings.length, findings }
}
