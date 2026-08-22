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

/**
 * Wie die Grundlast erfasst wird.
 *
 * `instant` – der Zähler zeigt die Leistung direkt in Watt an. Schnell, aber
 * eine Momentaufnahme: Der Kühlschrank taktet, je nach Zeitpunkt misst man
 * seinen Kompressor mit oder nicht.
 *
 * `readings` – zwei Zählerstände mit zeitlichem Abstand. Der ehrliche Weg: Er
 * funktioniert mit jedem Zähler (auch der Ferraris-Drehscheibe, die ebenfalls
 * ein kWh-Zählwerk hat) und mittelt über mehrere Kühlschrank-Zyklen.
 */
export type MeterMode = 'instant' | 'readings'

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
 * Auflösung des Zähler-Displays in kWh – die letzte Stelle, die er anzeigt.
 * Sie entscheidet allein darüber, wie lange gemessen werden muss: Ein Zähler
 * mit 0,1 kWh springt bei 100 W Grundlast nur einmal pro Stunde weiter.
 */
export const METER_RESOLUTIONS = [0.1, 0.01, 0.001] as const
export type MeterResolution = (typeof METER_RESOLUTIONS)[number]

/**
 * Mindestdauer, damit die Messung mehrere Kühlschrank-Zyklen abdeckt.
 *
 * Der Kompressor läuft getaktet (grob ein Drittel der Zeit, ~80 W). Eine kurze
 * Messung erwischt entweder „an" oder „aus" – der Fehler daraus ist größer als
 * jede Zähler-Ungenauigkeit und lässt sich nur durch Zeit herausmitteln.
 */
const CYCLE_SAFE_MS = 3 * MS_PER_HOUR

/** Ab dieser Unsicherheit ist die Zahl nur noch Rauschen und wird verworfen. */
const MAX_USABLE_UNCERTAINTY = 0.5
/** Bis hierher gilt die Messung als genau. */
const GOOD_UNCERTAINTY = 0.1
/** Typische Grundlast, mit der die empfohlene Wartezeit vorab geschätzt wird. */
const ASSUMED_WATTS = 100

/** Wie belastbar eine Zwei-Ablesungen-Messung ist. */
export interface ReadingsQuality {
  /** Relative Unsicherheit aus der Zähler-Auflösung (0,06 = ±6 %). */
  uncertainty: number
  /** true, wenn der Zeitraum mehrere Kühlschrank-Zyklen abdeckt. */
  longEnough: boolean
  /** false → der Zähler hat sich zu wenig bewegt, die Zahl sagt nichts aus. */
  usable: boolean
  level: 'good' | 'fair' | 'poor'
}

/**
 * Bewertet, wie belastbar zwei Zählerstände sind – aus der Auflösung des
 * Displays und der verstrichenen Zeit.
 *
 * Genau hier scheiterte die frühere Stoppuhr-Messung: Bei 0,1 kWh Auflösung und
 * fünf Minuten Wartezeit steht der Zähler noch auf demselben Wert. Statt eines
 * toten Buttons soll die App sagen können, dass es schlicht zu früh ist.
 */
export function readingsQuality(
  startKwh: number,
  endKwh: number,
  elapsedMs: number,
  resolutionKwh: number,
): ReadingsQuality {
  const delta = endKwh - startKwh
  if (!(delta > 0) || !(elapsedMs > 0) || !(resolutionKwh > 0)) {
    return { uncertainty: 1, longEnough: false, usable: false, level: 'poor' }
  }
  const uncertainty = Math.min(1, resolutionKwh / delta)
  const longEnough = elapsedMs >= CYCLE_SAFE_MS
  const usable = uncertainty <= MAX_USABLE_UNCERTAINTY
  const level: ReadingsQuality['level'] = !usable
    ? 'poor'
    : uncertainty <= GOOD_UNCERTAINTY && longEnough
      ? 'good'
      : 'fair'
  return { uncertainty, longEnough, usable, level }
}

/**
 * Empfohlene Wartezeit zwischen den beiden Ablesungen (ms).
 *
 * Ziel sind zehn Anzeige-Schritte (±10 %) bei einer angenommenen Grundlast von
 * {@link ASSUMED_WATTS} – mindestens aber {@link CYCLE_SAFE_MS}, weil ein
 * feiner Zähler zwar schneller genau, die Momentaufnahme dadurch aber nicht
 * repräsentativer wird.
 */
export function recommendedWaitMs(resolutionKwh: number): number {
  if (!(resolutionKwh > 0)) return CYCLE_SAFE_MS
  const targetKwh = 10 * resolutionKwh
  const hours = targetKwh / (ASSUMED_WATTS / 1000)
  return Math.max(CYCLE_SAFE_MS, hours * MS_PER_HOUR)
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
