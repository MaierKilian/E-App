import type {
  MeasurementId,
  MeasurementResult,
  MeasurementRating,
} from '@/features/measurements/types'
import type { MeasurementCategory } from '@/features/measurements/catalog'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { anyResultFor } from '@/features/measurements/rooms'

/** Einheit je Messung (Fallback, falls ein Ergebnis ohne `unit` gespeichert wurde). */
const UNIT_FALLBACK: Partial<Record<MeasurementId, string>> = {
  showerhead: 'L/min',
  hot_water_wait: 's',
  room_temperature: '°C',
  standby: '€/Jahr',
  base_load: 'W',
  lighting: '€/Jahr',
  fridge: '°C',
  freezer: '€/Jahr',
}

/**
 * Reine Datenaufbereitung für die Messungen-Berichte.
 * Liefert erledigte Ergebnisse in Katalog-Reihenfolge, gruppiert nach Gewerk,
 * dazu Sparpotenzial-Summe und Fortschrittszähler. Keine Formatierung.
 */

/** Ein erledigtes Mess-Ergebnis für den Bericht. */
export interface MeasurementEntry {
  id: MeasurementId
  category: MeasurementCategory
  primaryValue: number
  unit: string
  rating: MeasurementRating
  /** Geschätzte Jahres-Ersparnis in € (falls in den Details vorhanden). */
  yearlySaving?: number
}

/** Gruppe erledigter Messungen je Gewerk (in Katalog-Reihenfolge). */
export interface MeasurementGroup {
  category: MeasurementCategory
  entries: MeasurementEntry[]
}

/** Eine offene oder „bald verfügbare" Messung. */
export interface OpenMeasurement {
  id: MeasurementId
  category: MeasurementCategory
  available: boolean
}

export interface MeasurementsReportData {
  /** Erledigte Messungen in stabiler Katalog-Reihenfolge. */
  entries: MeasurementEntry[]
  /** Erledigte Messungen, gruppiert nach Gewerk. */
  groups: MeasurementGroup[]
  /** Noch offene bzw. „bald" verfügbare Messungen. */
  open: OpenMeasurement[]
  /** Summe des geschätzten jährlichen Sparpotenzials in €. */
  savingsTotal: number
  /** Anzahl erledigter Messungen. */
  doneCount: number
  /** Gesamtzahl der Messungen im Katalog. */
  totalCount: number
}

/** Liest das geschätzte Sparpotenzial aus den Result-Details (mehrere Konventionen). */
function readSaving(details: MeasurementResult['details']): number | undefined {
  if (!details) return undefined
  const candidate = details.yearlySaving ?? details.avoidableCost
  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return candidate
  }
  return undefined
}

/**
 * Summiert das Sparpotenzial über ALLE (Raum-)Ergebnisse einer Messung.
 * Wichtig für Pro-Raum-Messungen mit Sparwert (z. B. Beleuchtung): jeder Raum
 * liefert ein eigenes Ergebnis unter `id@raum`, die alle zusammenzählen.
 */
function sumSavingsForMeasurement(
  results: Partial<Record<string, MeasurementResult>>,
  id: string,
): number {
  let total = 0
  const prefix = `${id}@`
  for (const [key, value] of Object.entries(results)) {
    if (!value) continue
    if (key === id || key.startsWith(prefix)) total += readSaving(value.details) ?? 0
  }
  return total
}

export interface BuildMeasurementsArgs {
  results: Partial<Record<MeasurementId, MeasurementResult>>
  /** Optional: nur diese Gewerke berücksichtigen (default: alle). */
  categories?: MeasurementCategory[]
}

/**
 * Baut das Messungen-Berichts-Datenobjekt.
 * Reine Funktion, leersicher; nur Ergebnisse mit endlichem Hauptwert zählen.
 */
export function buildMeasurementsReportData({
  results,
  categories,
}: BuildMeasurementsArgs): MeasurementsReportData {
  const catFilter = categories && categories.length > 0 ? new Set(categories) : undefined

  const entries: MeasurementEntry[] = []
  const open: OpenMeasurement[] = []
  let savingsTotal = 0
  let totalCount = 0

  for (const meta of MEASUREMENT_CATALOG) {
    if (catFilter && !catFilter.has(meta.category)) continue
    totalCount += 1
    // Repräsentatives Ergebnis (direkt oder erstes Raum-Ergebnis bei Pro-Raum-Messungen).
    const r = anyResultFor(results, meta.id)
    if (r && Number.isFinite(r.primaryValue)) {
      // Sparpotenzial über alle Räume summieren (relevant bei Pro-Raum mit Sparwert).
      const saving = sumSavingsForMeasurement(results, meta.id)
      if (saving > 0) savingsTotal += saving
      // Bei Pro-Raum-Messungen mit Sparwert die Räume-Summe als Hauptwert zeigen,
      // sonst das repräsentative Raum-/Direktergebnis.
      const showSavingAsValue = Boolean(meta.perRoom) && saving > 0
      entries.push({
        id: r.id,
        category: meta.category,
        primaryValue: showSavingAsValue ? saving : r.primaryValue,
        // Einheit aus dem Ergebnis; Fallback je Messung (robust gegen Altdaten).
        unit: showSavingAsValue ? '€/Jahr' : r.unit || UNIT_FALLBACK[r.id] || '',
        rating: r.rating,
        yearlySaving: saving > 0 ? saving : undefined,
      })
    } else {
      open.push({ id: meta.id, category: meta.category, available: meta.available })
    }
  }

  return {
    entries,
    groups: groupByCategory(entries),
    open,
    savingsTotal: Math.round(savingsTotal),
    doneCount: entries.length,
    totalCount,
  }
}

/** Gruppiert erledigte Messungen in Katalog-Gewerk-Reihenfolge. */
function groupByCategory(entries: MeasurementEntry[]): MeasurementGroup[] {
  const order: MeasurementCategory[] = []
  const map = new Map<MeasurementCategory, MeasurementEntry[]>()
  for (const e of entries) {
    if (!map.has(e.category)) {
      map.set(e.category, [])
      order.push(e.category)
    }
    map.get(e.category)!.push(e)
  }
  return order.map((category) => ({ category, entries: map.get(category)! }))
}
