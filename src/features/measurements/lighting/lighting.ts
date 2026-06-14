import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Beleuchtungs-Check (pro Raum).
 *
 * Idee: Pro Raum erfasst der Nutzer, wie viele Lampen je Typ noch KEINE LED sind,
 * plus die typische Brenndauer pro Tag. Aus der Leistungsdifferenz zur LED ergibt
 * sich die jährliche Stromeinsparung beim Umstieg auf LED. Quantitativ: trägt mit
 * `yearlySaving` zum Gesamt-Sparpotenzial bei.
 *
 * Vereinfachung: typische Wattagen je Lampentyp und LED-Äquivalent (Näherung),
 * nur Strom-Arbeitspreis, keine Anschaffungskosten der LEDs (Brutto-Ersparnis).
 */

export type BulbType = 'incandescent' | 'halogen' | 'spot'

export const BULB_TYPES: BulbType[] = ['incandescent', 'halogen', 'spot']

/** Eingesparte Leistung je ersetzter Lampe (alt − LED) in Watt, Näherung. */
export const BULB_SAVE_W: Record<BulbType, number> = {
  incandescent: 52, // ~60 W Glühbirne → ~8 W LED
  halogen: 35, // ~40 W Halogen → ~5 W LED
  spot: 30, // ~35 W Halogenspot → ~5 W LED
}

const DAYS_PER_YEAR = 365

export interface LightingInput {
  /** Anzahl noch nicht auf LED umgestellter Lampen je Typ. */
  counts: Record<BulbType, number>
  /** Typische Brenndauer pro Tag in Stunden. */
  hoursPerDay: number
  /** Arbeitspreis Strom in ct/kWh. */
  workPriceCt: number
}

export interface LightingResult {
  /** Gesamtzahl noch nicht auf LED umgestellter Lampen. */
  totalBulbs: number
  /** Jährliche Stromeinsparung beim Umstieg in kWh. */
  annualKwh: number
  /** Jährliche Stromeinsparung in € (Brutto, trägt zum Sparpotenzial bei). */
  yearlySaving: number
  rating: MeasurementRating
}

/** Bewertung nach Höhe der jährlichen Einsparung (€). */
export function rateLighting(yearlySaving: number): MeasurementRating {
  if (yearlySaving <= 0) return 'good'
  if (yearlySaving < 8) return 'medium'
  if (yearlySaving < 25) return 'elevated'
  return 'high'
}

function clampCount(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.min(99, Math.floor(n))
}

export function calcLighting(input: LightingInput): LightingResult {
  const hours = Number.isFinite(input.hoursPerDay) && input.hoursPerDay > 0 ? input.hoursPerDay : 0
  let savedW = 0
  let totalBulbs = 0
  for (const type of BULB_TYPES) {
    const count = clampCount(input.counts[type])
    totalBulbs += count
    savedW += count * BULB_SAVE_W[type]
  }
  const annualKwh = (savedW * hours * DAYS_PER_YEAR) / 1000
  const yearlySaving = (annualKwh * input.workPriceCt) / 100
  return {
    totalBulbs,
    annualKwh: Math.round(annualKwh),
    yearlySaving: Math.round(yearlySaving),
    rating: rateLighting(yearlySaving),
  }
}
