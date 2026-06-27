import type { MeasurementRating } from '../types'
import { annualKwhFromPeriod } from '../energyMeter'

/**
 * Reine Berechnungslogik für den Kühlschrank-Check.
 *
 * Ablauf: Der Nutzer misst die aktuelle Innentemperatur, senkt anschließend die
 * Kühlstufe (wärmer) und misst erneut. Aus der erreichten Temperaturdifferenz –
 * oder, noch belastbarer, aus einer echten Strommessung vorher/nachher – ergibt
 * sich die jährliche Stromersparnis. Ohne Anpassung wird das Potenzial bis zur
 * empfohlenen Temperatur (~7 °C) geschätzt.
 *
 * Faustregel: ~6 % Mehrverbrauch je °C kälter (mehrere Quellen, teils 6–10 %).
 * Fallback-Jahresverbrauch ~150 kWh (modernes Gerät); reale Werte reichen von
 * ~100 kWh (A) bis ~400 kWh (Altgerät) – daher optionale Label-Eingabe.
 */

// Schwellenwerte für die Bewertung (°C).
const GOOD_MIN = 5
const GOOD_MAX = 7
const TOO_COLD_MAX = 2 // <3 °C = zu kalt
const TOO_WARM_MIN = 8 // >8 °C = zu warm

// Annahmen für die Ersparnis.
const YEARLY_KWH = 150 // Fallback-Jahresverbrauch (modernes Gerät)
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

/**
 * Wie die Ersparnis ermittelt wurde:
 * - `measured`: aus echter Strommessung vorher/nachher (am belastbarsten),
 * - `delta`:    aus der tatsächlich erreichten Temperaturdifferenz,
 * - `estimate`: Potenzial bis zur empfohlenen Temperatur (ohne Anpassung).
 */
export type FridgeMethod = 'measured' | 'delta' | 'estimate'

/** Vorher/Nachher-Energie aus dem Energiekostenmessgerät (kWh über Stunden). */
export interface FridgeEnergy {
  beforeKwh: number
  beforeHours: number
  afterKwh: number
  afterHours: number
}

export interface FridgeSavingInput {
  /** Aktuelle Innentemperatur in °C. */
  tempBefore: number
  /** Innentemperatur nach dem Senken der Stufe (optional). */
  tempAfter?: number
  /** Jahresverbrauch laut Energielabel in kWh (optional, sonst Fallback). */
  labelKwh?: number
  /** Optionale echte Strommessung. */
  energy?: Partial<FridgeEnergy>
  /** Arbeitspreis Strom in ct/kWh. */
  workPriceCt: number
}

export interface FridgeSaving {
  rating: MeasurementRating
  status: FridgeStatus
  method: FridgeMethod
  /** Jährliche Ersparnis in € (gerundet). */
  yearlySaving: number
  /** true, wenn (Mit-)Annahmen statt Messung einflossen. */
  estimated: boolean
  /** Angesetzter Jahresverbrauch (Label oder Fallback) in kWh. */
  annualBaseKwh: number
}

function energyComplete(e?: Partial<FridgeEnergy>): e is FridgeEnergy {
  return (
    !!e &&
    [e.beforeKwh, e.beforeHours, e.afterKwh, e.afterHours].every(
      (v) => Number.isFinite(v) && (v as number) > 0,
    )
  )
}

/**
 * Ermittelt die Stromersparnis durch eine wärmere Kühlschrank-Einstellung.
 * Priorität: echte Messung > Temperaturdifferenz > Potenzial-Schätzung.
 */
export function calcFridgeSaving(input: FridgeSavingInput): FridgeSaving {
  const temp = Number.isFinite(input.tempBefore) ? input.tempBefore : REFERENCE_TEMP
  const rating = rateFridge(temp)
  const status = fridgeStatus(temp)
  const price = Number.isFinite(input.workPriceCt) ? Math.max(0, input.workPriceCt) : 0
  const labelKwh =
    Number.isFinite(input.labelKwh) && (input.labelKwh as number) > 0 ? input.labelKwh : undefined
  const annualBaseKwh = labelKwh ?? YEARLY_KWH

  let method: FridgeMethod
  let kwhSaved: number
  let estimated: boolean

  if (energyComplete(input.energy)) {
    const e = input.energy
    kwhSaved =
      annualKwhFromPeriod(e.beforeKwh, e.beforeHours) - annualKwhFromPeriod(e.afterKwh, e.afterHours)
    method = 'measured'
    estimated = false
  } else if (Number.isFinite(input.tempAfter)) {
    // Sparen entsteht durchs Wärmer-Stellen: erreichte Erwärmung in °C.
    const warmupDegrees = Math.max(0, (input.tempAfter as number) - temp)
    kwhSaved = annualBaseKwh * PERCENT_PER_DEGREE * warmupDegrees
    method = 'delta'
    estimated = labelKwh === undefined
  } else {
    // Potenzial: Erwärmung vom aktuellen (zu kalten) Wert bis zur Empfehlung.
    const warmupDegrees = Math.max(0, REFERENCE_TEMP - temp)
    kwhSaved = annualBaseKwh * PERCENT_PER_DEGREE * warmupDegrees
    method = 'estimate'
    estimated = true
  }

  const yearlySaving = Math.max(0, Math.round((kwhSaved * price) / 100))
  return { rating, status, method, yearlySaving, estimated, annualBaseKwh }
}
