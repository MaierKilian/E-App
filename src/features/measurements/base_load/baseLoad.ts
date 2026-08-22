import type { MeasurementRating } from '../types'
import type { ProjectionBasis, ReadingStats } from '@/features/monitoring/readings'

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

/**
 * Ab diesem Anteil am Jahresverbrauch kann die Messung nicht stimmen: Die
 * Grundlast ist per Definition eine Teilmenge des Gesamtverbrauchs. Kommt mehr
 * heraus, liefen bei der Messung noch aktiv genutzte Geräte mit (oder der
 * Zählerstand wurde vertippt). Dann lieber keine Zahl zeigen als eine falsche.
 */
const IMPLAUSIBLE_SHARE = 0.95

export interface BaseLoadShare {
  /** Anteil der Grundlast am Jahres-Stromverbrauch (0…1). */
  share: number
  /** Jahresverbrauch laut Monitoring (kWh, gerundet). */
  totalYearKwh: number
  /** Worauf dieser Jahreswert beruht – bestimmt, wie belastbar der Anteil ist. */
  basis: ProjectionBasis
  /** Zahl der tatsächlich gemessenen Tage hinter dem Jahreswert. */
  measuredDays: number
  /** true, wenn der Anteil unmöglich hoch ist (siehe {@link IMPLAUSIBLE_SHARE}). */
  implausible: boolean
}

/**
 * Setzt die gemessene Grundlast ins Verhältnis zum tatsächlichen
 * Jahres-Stromverbrauch aus den Monitoring-Ablesungen.
 *
 * „180 W" sagt niemandem etwas, „ein Drittel deiner Stromrechnung" schon – und
 * der Anteil macht die Zahl zusätzlich unabhängig von der Haushaltsgröße, für
 * die absolute Watt-Schwellen zwangsläufig unfair sind.
 *
 * Reine Funktion. Liefert `undefined`, solange kein belastbarer Jahreswert
 * vorliegt (zu kurze Ableshistorie – siehe `stats()`) – dann
 * gibt es schlicht nichts zu vergleichen.
 *
 * @param annualBaseKwh Jahres-Dauerverbrauch der Grundlast (aus {@link calcBaseLoad}).
 * @param stats Kennzahlen der Strom-Ablesungen (`stats()` aus dem Monitoring).
 */
export function baseLoadShare(
  annualBaseKwh: number,
  stats: Pick<ReadingStats, 'projectedYearKwh' | 'projectionBasis' | 'projectionDays'>,
): BaseLoadShare | undefined {
  const total = stats.projectedYearKwh
  if (!Number.isFinite(annualBaseKwh) || annualBaseKwh <= 0) return undefined
  if (total === undefined || stats.projectionBasis === undefined || !(total > 0)) return undefined
  const share = annualBaseKwh / total
  return {
    share,
    totalYearKwh: Math.round(total),
    basis: stats.projectionBasis,
    measuredDays: stats.projectionDays ?? 0,
    implausible: share > IMPLAUSIBLE_SHARE,
  }
}
