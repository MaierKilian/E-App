import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Grundlast-Check (Diagnose am Stromzähler).
 *
 * Idee: Der Nutzer ermittelt die Dauerleistung, die sein Haushalt rund um die
 * Uhr zieht (Standby, Kühl-/Gefriergeräte, Router, Heizungspumpe …). Das Ergebnis
 * ist eine *Diagnose*: Es zeigt die Grundlast in Watt sowie eine grobe €/Jahr-
 * Orientierung, trägt aber bewusst NICHT zum Gesamt-Sparpotenzial bei – die
 * konkreten, bezifferten Einsparungen liefern die Folge-Checks (v. a. Standby,
 * Kühl-/Gefrierschrank), um Doppelzählung zu vermeiden.
 */

export type MeterMode = 'instant' | 'timed' | 'ferraris'

const HOURS_PER_YEAR = 24 * 365
const MS_PER_HOUR = 3_600_000

// Orientierungs-Schwellen für die Grundlast eines Haushalts (Watt). Bewusst grob
// – die tatsächliche „gute" Grundlast hängt von Haushaltsgröße und Geräten ab.
const GOOD_MAX = 70
const MEDIUM_MAX = 150
const ELEVATED_MAX = 250

/** Bewertet die Grundlast (vierstufig). */
export function rateBaseLoad(watts: number): MeasurementRating {
  if (watts <= GOOD_MAX) return 'good'
  if (watts <= MEDIUM_MAX) return 'medium'
  if (watts <= ELEVATED_MAX) return 'elevated'
  return 'high'
}

/** Leistung (W) aus einer Zeitmessung des kWh-Zählerstands. */
export function wattsFromTimed(startKwh: number, endKwh: number, elapsedMs: number): number {
  const deltaKwh = endKwh - startKwh
  const hours = elapsedMs / MS_PER_HOUR
  if (!Number.isFinite(deltaKwh) || deltaKwh <= 0 || hours <= 0) return 0
  return (deltaKwh * 1000) / hours
}

/**
 * Leistung (W) aus der Ferraris-Drehscheibe: Umdrehungen in einer gemessenen
 * Zeitspanne, Zählerkonstante in U/kWh (steht auf dem Zähler, z. B. „75 U/kWh").
 */
export function wattsFromFerraris(
  revolutions: number,
  constantPerKwh: number,
  elapsedMs: number,
): number {
  const hours = elapsedMs / MS_PER_HOUR
  if (revolutions <= 0 || constantPerKwh <= 0 || hours <= 0) return 0
  const kwh = revolutions / constantPerKwh
  return (kwh * 1000) / hours
}

export interface BaseLoadResult {
  /** Grundlast in Watt (auf 1 Nachkommastelle gerundet). */
  watts: number
  rating: MeasurementRating
  /** Grober jährlicher Dauerverbrauch in kWh. */
  annualKwh: number
  /** Grobe jährliche Kosten der Grundlast in € (nur Orientierung, kein Sparwert). */
  annualEur: number
}

/** Fasst eine ermittelte Grundlast (W) zu Verbrauch, Kosten und Bewertung zusammen. */
export function calcBaseLoad(rawWatts: number, workPriceCt: number): BaseLoadResult {
  const watts = Number.isFinite(rawWatts) && rawWatts > 0 ? Math.round(rawWatts * 10) / 10 : 0
  const annualKwh = (watts * HOURS_PER_YEAR) / 1000
  const annualEur = (annualKwh * workPriceCt) / 100
  return {
    watts,
    rating: rateBaseLoad(watts),
    annualKwh: Math.round(annualKwh),
    annualEur: Math.round(annualEur),
  }
}
