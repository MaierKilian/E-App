import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Standby-Check.
 *
 * Idee: Der Nutzer misst mit einem Energiekosten-Messgerät die Leistung
 * einzelner Geräte im Standby (Watt). Aus der Gesamtleistung ergeben sich die
 * jährlichen Stromkosten und eine Bewertung.
 *
 * Vereinfachung: Es wird nur der Strom-Arbeitspreis angesetzt (kein Grundpreis,
 * keine Nutzungsmuster) und durchgängig 24 h/Tag Standby angenommen. Die Werte
 * sind bewusste Näherungen zur Veranschaulichung, keine exakte Abrechnung.
 */

export type StandbyDeviceType =
  | 'tv'
  | 'console'
  | 'pc'
  | 'router'
  | 'audio'
  | 'charger'
  | 'other'

export interface StandbyDevice {
  type: StandbyDeviceType
  /** Gemessene Standby-Leistung in Watt. */
  watts: number
}

// Schwellenwerte für die Bewertung der Gesamt-Standby-Leistung (Watt).
const GOOD_MAX = 5
const MEDIUM_MAX = 20

const HOURS_PER_YEAR = 24 * 365

/** Summe der gemessenen Standby-Leistung in Watt (defensiv gegen NaN). */
export function totalWatts(devices: StandbyDevice[]): number {
  return devices.reduce((sum, d) => {
    const w = Number.isFinite(d.watts) && d.watts > 0 ? d.watts : 0
    return sum + w
  }, 0)
}

/** Jährlicher Energieverbrauch in kWh bei dauerhaftem Standby. */
export function annualKwh(totalW: number): number {
  return (totalW * HOURS_PER_YEAR) / 1000
}

/**
 * Jährliche Stromkosten in € aus kWh und Arbeitspreis (ct/kWh).
 * Vereinfachung: nur Arbeitspreis Strom (siehe Modul-Doku).
 */
export function annualCost(kwh: number, workPriceCt: number): number {
  return (kwh * workPriceCt) / 100
}

/** Bewertung nach Gesamt-Standby-Leistung. */
export function rateStandby(totalW: number): MeasurementRating {
  if (totalW <= GOOD_MAX) return 'good'
  if (totalW <= MEDIUM_MAX) return 'medium'
  return 'high'
}

export interface StandbyResult {
  /** Gesamt-Standby-Leistung in Watt, auf eine Nachkommastelle gerundet. */
  totalWatts: number
  rating: MeasurementRating
  /** Jährlicher Verbrauch in kWh (gerundet). */
  annualKwh: number
  /** Jährliche Stromkosten in € (gerundet). */
  annualCost: number
  /**
   * Vermeidbare Jahreskosten in € (bei medium/high gleich den Jahreskosten):
   * eine schaltbare Steckdosenleiste / ein Smart-Plug kann den Standby quasi
   * eliminieren. 0 bei guter Bewertung.
   */
  avoidableCost: number
  /** Geräte absteigend nach Leistung sortiert (größter „Stromfresser" zuerst). */
  devices: StandbyDevice[]
}

export interface StandbyInput {
  devices: StandbyDevice[]
  /** Arbeitspreis Strom in ct/kWh (aus dem Tarif-Store). */
  workPriceCt: number
}

export function calcStandby(input: StandbyInput): StandbyResult {
  const cleaned = input.devices.filter(
    (d) => Number.isFinite(d.watts) && d.watts > 0,
  )
  const total = Math.round(totalWatts(cleaned) * 10) / 10
  const rating = rateStandby(total)
  const kwh = annualKwh(total)
  const cost = annualCost(kwh, input.workPriceCt)
  const avoidable = rating === 'good' ? 0 : cost

  const sorted = [...cleaned].sort((a, b) => b.watts - a.watts)

  return {
    totalWatts: total,
    rating,
    annualKwh: Math.round(kwh),
    annualCost: Math.round(cost),
    avoidableCost: Math.round(avoidable),
    devices: sorted,
  }
}
