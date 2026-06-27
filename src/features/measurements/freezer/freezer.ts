import type { MeasurementRating } from '../types'
import { annualKwhFromPeriod } from '../energyMeter'

/**
 * Reine Berechnungslogik für den Gefriertruhen-Check.
 *
 * Ablauf: Zuerst wird gefragt, ob die Truhe vereist ist. Falls nein, ist nichts
 * zu tun. Falls ja, kann der Nutzer den Stromverbrauch mit einem Energiekosten-
 * messgerät vor dem Abtauen und danach messen → daraus ergibt sich die echte
 * Ersparnis. Ohne Messung wird über den Vereisungsgrad geschätzt.
 *
 * Quellen zur Vereisung: ~1 cm Eis → +10–15 %, dick/lange nicht abgetaut bis
 * +50 % Mehrverbrauch (Verivox, BUND Hessen, klimaaktiv). Fallback-Jahres-
 * verbrauch ~200 kWh; reale Werte je Bauart/Klasse abweichend → Label optional.
 */

export type FrostLevel = 'none' | 'light' | 'heavy'

// Mehrverbrauch je Vereisungsgrad (Anteil des Jahresverbrauchs), an Quellen
// angelehnt: leicht (~bis 1 cm) ~12 %, stark (dick) ~30 %.
const EXTRA_SHARE: Record<FrostLevel, number> = {
  none: 0,
  light: 0.12,
  heavy: 0.3,
}

const RATING_BY_FROST: Record<FrostLevel, MeasurementRating> = {
  none: 'good',
  light: 'medium',
  heavy: 'high',
}

const YEARLY_KWH = 200 // Fallback-Jahresverbrauch

// Schwellenwerte Temperatur (°C). Optimal ~ -18 °C.
const TEMP_OPTIMAL = -18
const TEMP_TOO_WARM = -16 // wärmer als -16 °C = zu warm
const TEMP_TOO_COLD = -20 // kälter als -20 °C = zu kalt

export type FreezerTempStatus = 'optimal' | 'tooWarm' | 'tooCold'

export function rateFrost(frost: FrostLevel): MeasurementRating {
  return RATING_BY_FROST[frost]
}

export function freezerTempStatus(temp: number): FreezerTempStatus {
  if (temp > TEMP_TOO_WARM) return 'tooWarm'
  if (temp < TEMP_TOO_COLD) return 'tooCold'
  return 'optimal'
}

/** Wie die Ersparnis ermittelt wurde. */
export type FreezerMethod = 'measured' | 'estimate' | 'none'

/** Vorher/Nachher-Energie aus dem Energiekostenmessgerät (kWh über Stunden). */
export interface FreezerEnergy {
  beforeKwh: number
  beforeHours: number
  afterKwh: number
  afterHours: number
}

export interface FreezerSavingInput {
  /** Ist die Truhe vereist? */
  iced: boolean
  /** Vereisungsgrad für die Schätzung (nur relevant, wenn vereist). */
  frost?: FrostLevel
  /** Jahresverbrauch laut Energielabel in kWh (optional, sonst Fallback). */
  labelKwh?: number
  /** Optionale echte Strommessung vor/nach dem Abtauen. */
  energy?: Partial<FreezerEnergy>
  /** Innentemperatur in °C (nur wenn erfasst). */
  temperature?: number
  /** Arbeitspreis Strom in ct/kWh. */
  workPriceCt: number
}

export interface FreezerSaving {
  rating: MeasurementRating
  method: FreezerMethod
  /** Vermeidbare Jahreskosten in € durch Abtauen (gerundet). */
  avoidableCost: number
  /** true, wenn geschätzt (keine Messung). */
  estimated: boolean
  temperatureStatus?: FreezerTempStatus
}

function energyComplete(e?: Partial<FreezerEnergy>): e is FreezerEnergy {
  return (
    !!e &&
    [e.beforeKwh, e.beforeHours, e.afterKwh, e.afterHours].every(
      (v) => Number.isFinite(v) && (v as number) > 0,
    )
  )
}

/**
 * Ermittelt die vermeidbaren Jahreskosten durch Abtauen.
 * Nicht vereist → 0. Vereist: echte Messung > Schätzung über Vereisungsgrad.
 */
export function calcFreezerSaving(input: FreezerSavingInput): FreezerSaving {
  const price = Number.isFinite(input.workPriceCt) ? Math.max(0, input.workPriceCt) : 0
  const hasTemp = Number.isFinite(input.temperature)
  const temperatureStatus = hasTemp ? freezerTempStatus(input.temperature as number) : undefined

  if (!input.iced) {
    return { rating: 'good', method: 'none', avoidableCost: 0, estimated: false, temperatureStatus }
  }

  const frost: FrostLevel = input.frost && input.frost !== 'none' ? input.frost : 'light'
  const rating = RATING_BY_FROST[frost]
  const labelKwh =
    Number.isFinite(input.labelKwh) && (input.labelKwh as number) > 0 ? input.labelKwh : undefined
  const annualBaseKwh = labelKwh ?? YEARLY_KWH

  if (energyComplete(input.energy)) {
    const e = input.energy
    const saved =
      annualKwhFromPeriod(e.beforeKwh, e.beforeHours) - annualKwhFromPeriod(e.afterKwh, e.afterHours)
    const avoidableCost = Math.max(0, Math.round((saved * price) / 100))
    return { rating, method: 'measured', avoidableCost, estimated: false, temperatureStatus }
  }

  const extraKwh = annualBaseKwh * EXTRA_SHARE[frost]
  const avoidableCost = Math.max(0, Math.round((extraKwh * price) / 100))
  return { rating, method: 'estimate', avoidableCost, estimated: true, temperatureStatus }
}

export { TEMP_OPTIMAL }
