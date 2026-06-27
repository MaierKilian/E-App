import type { EnergyType, MeterReading } from '@/store/readingsStore'
import { resolvePrice } from '@/store/tariffStore'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { HEAT_GENERATOR_MAP } from '@/features/monitoring/energyConfig'
import { consumptionSegments } from '@/features/monitoring/readings'

/** Anteil der Heizenergie, der auf Warmwasser entfällt (temperaturunabhängig). */
export const WARM_WATER_SHARE = 0.15

/** Mindest-Datenspanne (Tage), ab der die Jahres-Hochrechnung als belastbar gilt. */
const RELIABLE_SPAN_DAYS = 300

export interface HeatingCost {
  /** Hochgerechnete Jahres-Heizkosten in € (über alle Heizträger summiert). */
  costEur: number
  /** true, wenn Default-Preis genutzt wird oder die Datenspanne < ~1 Jahr ist. */
  estimated: boolean
}

/**
 * Hochgerechnete jährliche Heizkosten aus den vorhandenen Monitoring-Ablesungen
 * und dem hinterlegten Preis je Heizträger (Gas/Öl/Pellets/Wärmepumpe).
 *
 * Reine Funktion. Liefert `undefined`, wenn kein Heizträger verwertbare
 * Ablesungen (≥ 2) hat – dann kann keine €-Einsparung ausgewiesen werden.
 *
 * @param heatGenerators Wärmeerzeuger aus dem Profil (`OnboardingData.heatGenerators`).
 * @param readingsByType Ablesungen je Energieträger (Readings-Store).
 * @param tariff Tarif-Store-State (für `resolvePrice`).
 */
export function annualHeatingCostEur(
  heatGenerators: string[],
  readingsByType: Partial<Record<EnergyType, MeterReading[]>>,
  tariff: Parameters<typeof resolvePrice>[0],
): HeatingCost | undefined {
  const types = new Set<EnergyType>()
  for (const gen of heatGenerators ?? []) {
    const mapped = HEAT_GENERATOR_MAP[gen]
    if (mapped && mapped in PRICE_META) types.add(mapped)
  }

  let costEur = 0
  let estimated = false
  let contributing = 0

  for (const type of types) {
    const segments = consumptionSegments(readingsByType[type] ?? [])
    if (segments.length === 0) continue
    const totalUnits = segments.reduce((sum, s) => sum + s.kwh, 0)
    const totalDays = segments.reduce((sum, s) => sum + s.days, 0)
    if (totalDays <= 0) continue
    const annualUnits = (totalUnits / totalDays) * 365

    const price = resolvePrice(tariff, type)
    const meta = PRICE_META[type]
    if (!meta) continue
    const eurPerUnit = price.work * meta.priceToEur

    costEur += annualUnits * eurPerUnit
    if (!price.custom || totalDays < RELIABLE_SPAN_DAYS) estimated = true
    contributing += 1
  }

  if (contributing === 0) return undefined
  return { costEur, estimated }
}
