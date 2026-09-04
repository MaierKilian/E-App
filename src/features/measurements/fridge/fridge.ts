import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Kühlschrank-Check.
 *
 * Ablauf: Der Nutzer misst die aktuelle Innentemperatur. Ist sie zu kalt, zeigt
 * das Ergebnis das Sparpotenzial bis zur empfohlenen Temperatur (~7 °C) als
 * Prozentwert – nicht als Euro-Betrag, denn dafür bräuchte es entweder eine
 * echte Strommessung oder eine angenommene Jahres-Nutzung, beides bewusst
 * entfallen (siehe unten). War die Temperatur nicht gut, kann später eine
 * Folgemessung zeigen, was die angepasste Stufe tatsächlich gebracht hat
 * (siehe `FridgeRun`, `pendingFollowUps`).
 *
 * Faustregel: ~6 % Mehrverbrauch je °C kälter (mehrere Quellen, teils 6–10 %).
 *
 * Früher gab es zusätzlich eine optionale echte Strommessung (Energiekosten-
 * messgerät vorher/nachher) und einen Jahresverbrauch laut Energielabel, aus
 * denen sich ein Euro-Betrag ergab. Beides wieder entfernt: Ein Wert, der auf
 * einem angenommenen Jahresverbrauch beruht, ist ohnehin nur eine Schätzung –
 * der Prozentwert sagt dasselbe, ohne einen Euro-Betrag vorzutäuschen, den
 * niemand nachrechnen kann.
 */

// Schwellenwerte für die Bewertung (°C).
export const GOOD_MIN = 5
export const GOOD_MAX = 7
export const TOO_COLD_MAX = 2 // <3 °C = zu kalt
export const TOO_WARM_MIN = 8 // >8 °C = zu warm

const PERCENT_PER_DEGREE = 0.06 // ~6 % Mehrverbrauch je °C kälter
const REFERENCE_TEMP = 7 // empfohlene Innentemperatur

export type FridgeStatus = 'tooCold' | 'optimal' | 'tooWarm'

export function rateFridge(temp: number): MeasurementRating {
  if (temp >= GOOD_MIN && temp <= GOOD_MAX) return 'good'
  if (temp < TOO_COLD_MAX + 1 || temp > TOO_WARM_MIN) return 'high'
  return 'medium'
}

export function fridgeStatus(temp: number): FridgeStatus {
  if (temp < GOOD_MIN) return 'tooCold'
  if (temp > GOOD_MAX) return 'tooWarm'
  return 'optimal'
}

export interface FridgeSaving {
  rating: MeasurementRating
  status: FridgeStatus
  /**
   * Geschätztes Stromsparpotenzial als Anteil (0,06 = 6 %), wenn die Stufe bis
   * zur empfohlenen Temperatur angepasst wird. **Nur bei „zu kalt" > 0** – bei
   * „zu warm" ist Kälterstellen die richtige Richtung (das erhöht den
   * Verbrauch), bei „optimal" ist nichts zu holen.
   */
  savingPct: number
}

/**
 * Ermittelt Bewertung und Stromsparpotenzial aus der Innentemperatur.
 *
 * Ein Potenzial gibt es **nur bei „zu kalt"**. Bis September 2026 rechnete die
 * Funktion bis 7 °C hoch, egal wie die Temperatur bewertet war – wer 5,0 °C maß,
 * bekam „Sehr gut · Optimal eingestellt · Weiter so" und direkt darunter
 * „Mögliches Sparpotenzial ≈ 12 %". Das widerspricht sich, und es widersprach
 * auch dem Rest der App: Das gute Band ist 5–7 °C, und die Empfehlungsliste
 * legt erst unter 5 °C einen Tipp an (`FRIDGE_COLD_C` in `buildTips`).
 */
export function calcFridgeSaving(tempBefore: number): FridgeSaving {
  const temp = Number.isFinite(tempBefore) ? tempBefore : REFERENCE_TEMP
  const rating = rateFridge(temp)
  const status = fridgeStatus(temp)
  // Erwärmung vom aktuellen (zu kalten) Wert bis zur Empfehlung.
  const warmupDegrees = status === 'tooCold' ? Math.max(0, REFERENCE_TEMP - temp) : 0
  const savingPct = PERCENT_PER_DEGREE * warmupDegrees
  return { rating, status, savingPct }
}

/**
 * Tatsächlich erreichte Verbesserung zwischen zwei Messungen (Folgemessung
 * nach angepasster Stufe) – analog zum Vorher/Nachher-Vergleich des
 * Grundlast-Checks, nur bezogen auf die Temperatur statt auf Watt.
 */
export interface FridgeChange {
  deltaDegrees: number
  /** Grobe Ersparnis aus der tatsächlich erreichten Erwärmung. */
  savingPct: number
  /** Richtung der Temperatur (nicht des Verbrauchs): „up" = wärmer = spart bei vormals zu kaltem Kühlschrank Strom. */
  direction: 'up' | 'down' | 'none'
}

export function fridgeChange(beforeTemp: number, afterTemp: number): FridgeChange {
  const deltaDegrees = afterTemp - beforeTemp
  const warmedDegrees = Math.max(0, Math.min(deltaDegrees, REFERENCE_TEMP - beforeTemp))
  const savingPct = PERCENT_PER_DEGREE * warmedDegrees
  const direction = deltaDegrees > 0.2 ? 'up' : deltaDegrees < -0.2 ? 'down' : 'none'
  return { deltaDegrees, savingPct, direction }
}
