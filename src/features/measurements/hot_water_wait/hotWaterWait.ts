import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Warmwasser-Wartezeit-Check.
 *
 * Idee: Der Nutzer misst, wie lange es dauert, bis an einer Entnahmestelle
 * warmes Wasser ankommt. In dieser Zeit fließt (kaltes) Trinkwasser ungenutzt
 * ab. Aus der Wartezeit, einem typischen Durchfluss und einer groben Häufigkeit
 * je Entnahmestelle ergibt sich eine Schätzung der ungenutzten Wassermenge und
 * – über den Wasserpreis – ein jährliches Einsparpotenzial.
 *
 * Alle Mengen-/Kostenwerte sind bewusste Näherungen zur Veranschaulichung.
 */

export type FixtureType = 'shower' | 'bath' | 'kitchen' | 'washbasin'

export interface FixtureMeta {
  /** Typischer Durchfluss in L/min. */
  flowLpm: number
  /** Grobe Anzahl Warmwasser-Zapfungen pro Tag (Haushalt). */
  drawsPerDay: number
  /** Als bevorzugter Messort hervorheben (großer Wasserdurchsatz). */
  recommended: boolean
}

/** Reihenfolge = Anzeigereihenfolge der Auswahl. */
export const FIXTURES: Record<FixtureType, FixtureMeta> = {
  shower: { flowLpm: 9, drawsPerDay: 1.5, recommended: true },
  bath: { flowLpm: 12, drawsPerDay: 0.3, recommended: true },
  kitchen: { flowLpm: 6, drawsPerDay: 4, recommended: false },
  washbasin: { flowLpm: 5, drawsPerDay: 5, recommended: false },
}

export const FIXTURE_ORDER: FixtureType[] = ['shower', 'bath', 'kitchen', 'washbasin']

export interface HotWaterWaitInput {
  fixture: FixtureType
  /** Gemessene Wartezeit in Sekunden. */
  seconds: number
  /** Wasserpreis in €/m³ (aus dem Preis-Store). */
  waterPriceEurPerM3: number
}

export interface HotWaterWaitResult {
  rating: MeasurementRating
  /** Ungenutzt abgeflossene Wassermenge pro Zapfung in Litern. */
  litersPerDraw: number
  /** Hochgerechnete ungenutzte Menge pro Jahr in Litern. */
  litersPerYear: number
  /** Jährliches Einsparpotenzial in € (Wasserkosten der ungenutzten Menge). */
  yearlySaving: number
}

/** Bewertung der Wartezeit (vierstufig). */
export function rateWait(seconds: number): MeasurementRating {
  if (seconds <= 15) return 'good'
  if (seconds <= 30) return 'medium'
  if (seconds <= 60) return 'elevated'
  return 'high'
}

export function calcHotWaterWait(input: HotWaterWaitInput): HotWaterWaitResult {
  const fixture = FIXTURES[input.fixture]
  const seconds = Math.max(0, input.seconds)

  const litersPerDraw = (seconds / 60) * fixture.flowLpm
  const litersPerYear = litersPerDraw * fixture.drawsPerDay * 365
  const price = Number.isFinite(input.waterPriceEurPerM3) ? Math.max(0, input.waterPriceEurPerM3) : 0
  const yearlySaving = (litersPerYear / 1000) * price

  return {
    rating: rateWait(seconds),
    litersPerDraw: Math.round(litersPerDraw * 10) / 10,
    litersPerYear: Math.round(litersPerYear),
    yearlySaving: Math.round(yearlySaving),
  }
}
