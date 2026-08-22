import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Beleuchtungs-Check (pro Raum).
 *
 * Idee: Pro Raum erfasst der Nutzer, wie viele Lampen je Typ noch KEINE LED
 * sind, plus wie viel das Licht hier brennt. Aus der Leistungsdifferenz zur LED
 * ergibt sich die jährliche Stromeinsparung – und aus den Kosten der Ersatz-LEDs
 * die Zeit bis zur Amortisation.
 *
 * Die Bruttoersparnis allein beantwortet die Frage des Nutzers nicht: „6 €/Jahr"
 * klingt nach nichts, „12 € investieren, ab Monat 5 im Plus" ist dieselbe
 * Rechnung und trägt die Entscheidung. Deshalb rechnet dieses Modul beide Seiten.
 *
 * Vereinfachung: typische Wattagen und LED-Preise je Lampentyp (Näherung),
 * nur Strom-Arbeitspreis, keine Entsorgung, keine Lebensdauer-Ersparnis.
 */

export type BulbType = 'incandescent' | 'halogen' | 'spot'

export const BULB_TYPES: BulbType[] = ['incandescent', 'halogen', 'spot']

/** Eingesparte Leistung je ersetzter Lampe (alt − LED) in Watt, Näherung. */
export const BULB_SAVE_W: Record<BulbType, number> = {
  incandescent: 52, // ~60 W Glühbirne → ~8 W LED
  halogen: 35, // ~40 W Halogen → ~5 W LED
  spot: 30, // ~35 W Halogenspot → ~5 W LED
}

/**
 * Preis einer Ersatz-LED je Typ in Euro (Retrofit, Einzelhandel, Größenordnung).
 * Bewusst eher großzügig gewählt: Eine zu optimistische Amortisation wäre der
 * Fehler, den der Nutzer beim Einkauf merkt.
 */
export const BULB_COST_EUR: Record<BulbType, number> = {
  incandescent: 3, // E27/E14 Retrofit
  halogen: 3,
  spot: 4, // GU10, meist etwas teurer
}

/**
 * Wie viel das Licht in diesem Raum brennt – als Auswahl statt als Stundenwert.
 *
 * Niemand kann „1,5 h/Tag" beziffern, und ein Stepper mit 0,5-Stunden-Schritten
 * behauptet eine Genauigkeit, die es nicht gibt. Die drei Stufen wirken als
 * Faktor auf den typischen Wert des Raumtyps.
 */
export type UsageLevel = 'low' | 'normal' | 'high'

export const USAGE_LEVELS: UsageLevel[] = ['low', 'normal', 'high']

export const USAGE_FACTOR: Record<UsageLevel, number> = {
  low: 0.5,
  normal: 1,
  high: 2,
}

const HOURS_MIN = 0.25
const HOURS_MAX = 16

/** Brenndauer je Tag aus dem typischen Raumwert und der gewählten Stufe. */
export function usageHours(baseHours: number, level: UsageLevel): number {
  const base = Number.isFinite(baseHours) && baseHours > 0 ? baseHours : 2
  const raw = base * USAGE_FACTOR[level]
  const clamped = Math.min(HOURS_MAX, Math.max(HOURS_MIN, raw))
  return Math.round(clamped * 100) / 100
}

const DAYS_PER_YEAR = 365

/** Ab dieser Dauer lohnt sich keine Monatsangabe mehr – dann nur noch „dauert". */
export const MAX_PAYBACK_MONTHS = 24

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
  /** Einmalige Anschaffungskosten der Ersatz-LEDs in €. */
  investEur: number
  /**
   * Monate bis zur Amortisation, aufgerundet. `undefined`, wenn nichts zu
   * tauschen ist oder die Ersparnis rechnerisch nicht trägt.
   */
  paybackMonths?: number
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
  let investEur = 0
  for (const type of BULB_TYPES) {
    const count = clampCount(input.counts[type])
    totalBulbs += count
    savedW += count * BULB_SAVE_W[type]
    investEur += count * BULB_COST_EUR[type]
  }
  const annualKwh = (savedW * hours * DAYS_PER_YEAR) / 1000
  const yearlySaving = (annualKwh * input.workPriceCt) / 100
  const paybackMonths =
    yearlySaving > 0 && investEur > 0 ? Math.ceil(investEur / (yearlySaving / 12)) : undefined
  return {
    totalBulbs,
    annualKwh: Math.round(annualKwh),
    yearlySaving: Math.round(yearlySaving),
    investEur: Math.round(investEur),
    paybackMonths,
    rating: rateLighting(yearlySaving),
  }
}
