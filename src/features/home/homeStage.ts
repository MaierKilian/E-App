import type { EnergyType, MeterReading } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'
import { activeEnergyTypes, isSeasonal } from '@/features/monitoring/energyConfig'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import {
  sortByDate,
  stats,
  yearOverYearTrend,
  monthlyConsumption,
} from '@/features/monitoring/readings'
import {
  specificValue,
  heatBenchmark,
  type SpecificValue,
} from '@/features/monitoring/specificValues'
import { estimateEnvelope } from './estimateEnergy'
import type { ConsumptionTrend } from '@/features/monitoring/readings'

/**
 * Datengrundlage des Zuhause-Bildschirms.
 *
 * Der Bildschirm ist eine **wachsende Bühne**: dieselbe Darstellung in drei
 * Reifegraden, statt zweier Layouts mit einem Schalter dazwischen. Was gezeigt
 * wird, ergibt sich allein aus den vorhandenen Daten – niemand stellt das ein.
 *
 * - `benchmarkOnly` – noch keine belastbare Jahresmenge. Die Bühne zeigt, was
 *   ein Gebäude dieser Art üblicherweise braucht. Das ist keine
 *   Platzhalter-Grafik, sondern eine wahre Aussage, und sie macht neugierig,
 *   wo man selbst steht.
 * - `estimate` – erste Hochrechnung vorhanden, aber weniger als zwölf Monate.
 * - `fullYear` – ein voller Heizzyklus gemessen; erst hier gibt es einen
 *   echten Jahreswert und eine Jahreskurve.
 *
 * Alles hier ist seiteneffektfrei und aus Store-Daten ableitbar.
 */

export type StageLevel = 'benchmarkOnly' | 'estimate' | 'fullYear'

/** Kostenanteil eines Trägers am Jahr. */
export interface CarrierCost {
  type: EnergyType
  /** Jahreskosten in Euro, falls ein Preis hinterlegt bzw. voreingestellt ist. */
  costEur?: number
}

export interface HomeStageData {
  level: StageLevel
  /** Summe der Jahreskosten über alle kostenfähigen Träger. */
  totalCostEur?: number
  /** Einzelne Träger in Anzeige-Reihenfolge (Strom zuerst). */
  carriers: CarrierCost[]
  /** Monate, auf denen die Hochrechnung beruht (nur bei `estimate`). */
  estimateMonths?: number
  /** Spezifischer Heizkennwert des Haushalts (kWh/m²·a). */
  ownHeat?: SpecificValue
  /** Üblicher Wert für dieses Gebäude (kWh/m²·a) – auch ohne jede Ablesung. */
  benchmarkHeat?: number
  /** Jahr gegen Vorjahr über den Träger mit den höchsten Kosten. */
  trend?: ConsumptionTrend
  /** Zwölf Monatswerte des führenden Trägers – nur bei `fullYear`. */
  curve?: { type: EnergyType; values: number[] }
  /**
   * true, wenn überhaupt schon ein Zählerstand erfasst ist. Am ersten Tag
   * greift der Fälligkeits-Hinweis nicht (er braucht eine letzte Ablesung),
   * dann muss die Bühne selbst zum ersten Eintrag einladen.
   */
  hasAnyReading: boolean
}

interface StageInput {
  profile: OnboardingData
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>
  /** Preis je Zähler-Einheit (€), je Träger aufgelöst. */
  priceFor: (type: EnergyType) => number | undefined
  /** Energieinhalt je Zähler-Einheit (kWh), je Träger aufgelöst. */
  energyContentFor: (type: EnergyType) => number
}

/**
 * Der Sanierungsstand senkt den Heizbedarf gegenüber dem reinen
 * Baujahrs-Richtwert. `estimateEnvelope` liefert die Ersparnis in Prozent;
 * daraus wird der Faktor, mit dem der Vergleichswert korrigiert wird.
 */
function envelopeFactor(profile: OnboardingData): number {
  const pct = estimateEnvelope(profile).savingsPct
  if (!Number.isFinite(pct)) return 1
  return Math.min(1, Math.max(0.2, 1 - pct / 100))
}

/** Baut die Daten des Zuhause-Bildschirms aus Profil, Ablesungen und Preisen. */
export function buildHomeStage({
  profile,
  readingsByType,
  priceFor,
  energyContentFor,
}: StageInput): HomeStageData {
  const factor = envelopeFactor(profile)
  const benchmarkHeat = heatBenchmark(profile, factor)

  const types = activeEnergyTypes(profile).filter((t) => t !== 'water')
  const hasAnyReading = activeEnergyTypes(profile).some(
    (t) => (readingsByType[t] ?? []).length > 0,
  )
  const carriers: CarrierCost[] = []
  let anyFullYear = false
  let anyProjection = false
  let shortestMonths: number | undefined
  let ownHeat: SpecificValue | undefined
  let leadType: EnergyType | undefined
  let leadCost = -1

  for (const type of types) {
    const readings = sortByDate(readingsByType[type] ?? [])
    const s = stats(readings, priceFor(type), { seasonal: isSeasonal(type) })
    if (s.projectionBasis === 'fullYear') anyFullYear = true
    if (s.projectionBasis !== undefined) {
      anyProjection = true
      const months = Math.max(1, Math.round((s.projectionDays ?? 0) / 30))
      shortestMonths = shortestMonths === undefined ? months : Math.min(shortestMonths, months)
    }

    // Nur kostenfähige Träger zählen in die Summe – bei den anderen fehlt der
    // Preis, und eine Summe mit Lücken wäre schlechter als keine.
    if (PRICE_META[type]) carriers.push({ type, costEur: s.projectedYearCostEur })

    if (isSeasonal(type) && ownHeat === undefined) {
      ownHeat = specificValue(
        type,
        s.projectedYearKwh,
        profile,
        energyContentFor(type),
        factor,
      )
    }

    // Der teuerste Träger führt den Trend – er bestimmt die Gesamtsumme am stärksten.
    const cost = s.projectedYearCostEur ?? -1
    if (cost > leadCost) {
      leadCost = cost
      leadType = type
    }
  }

  const known = carriers.map((c) => c.costEur).filter((c): c is number => c !== undefined)
  // Nur eine vollständige Summe zeigen: fehlt bei einem Träger die Zahl, wäre
  // das Ergebnis zu niedrig und damit irreführend.
  const complete = known.length > 0 && known.length === carriers.length
  const totalCostEur = complete ? known.reduce((a, b) => a + b, 0) : undefined

  const level: StageLevel = anyFullYear ? 'fullYear' : anyProjection ? 'estimate' : 'benchmarkOnly'

  return {
    level,
    totalCostEur,
    carriers,
    estimateMonths: level === 'estimate' ? shortestMonths : undefined,
    ownHeat,
    benchmarkHeat,
    trend:
      level === 'fullYear' && leadType
        ? yearOverYearTrend(sortByDate(readingsByType[leadType] ?? []))
        : undefined,
    curve: level === 'fullYear' ? buildCurve(types, readingsByType, leadType) : undefined,
    hasAnyReading,
  }
}

/**
 * Position eines Kennwerts auf der Effizienz-Skala (0 = links/A+, 1 = rechts/H).
 *
 * Die Skala läuft von 30 bis 250 kWh/m²·a – das deckt vom Passivhaus bis zum
 * unsanierten Altbau alles ab, was in der Praxis vorkommt. Werte außerhalb
 * werden an den Rand geklemmt, damit die Marke nie aus dem Bild läuft.
 */
export const SCALE_MIN_KWH = 30
export const SCALE_MAX_KWH = 250

export function scalePosition(kwhPerSqm: number): number {
  if (!Number.isFinite(kwhPerSqm)) return 0
  const t = (kwhPerSqm - SCALE_MIN_KWH) / (SCALE_MAX_KWH - SCALE_MIN_KWH)
  return Math.min(1, Math.max(0, t))
}

/**
 * Wählt den Träger für die Jahreskurve.
 *
 * Bevorzugt Heizenergie: Nur sie hat die charakteristische Jahresform. Gibt es
 * keine (reiner Strom-Haushalt), führt der teuerste Träger.
 */
function buildCurve(
  types: EnergyType[],
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  leadType: EnergyType | undefined,
): { type: EnergyType; values: number[] } | undefined {
  const candidates = [...types.filter(isSeasonal), ...(leadType ? [leadType] : [])]
  for (const type of candidates) {
    const values = monthlyConsumption(sortByDate(readingsByType[type] ?? []))
    if (values && values.some((v) => v > 0)) return { type, values }
  }
  return undefined
}
