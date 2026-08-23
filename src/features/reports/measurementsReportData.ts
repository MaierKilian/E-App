import type {
  MeasurementId,
  MeasurementResult,
  MeasurementRating,
} from '@/features/measurements/types'
import type { MeasurementCategory } from '@/features/measurements/catalog'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { anyResultFor, roomInstances, type RoomInstance } from '@/features/measurements/rooms'
import { displaySavingEur } from '@/features/measurements/savingsDisplay'
import { hasWordUnit } from '@/features/measurements/resultValue'
import type { RoomEntry } from '@/types'

/** Einheit je Messung (Fallback, falls ein Ergebnis ohne `unit` gespeichert wurde). */
const UNIT_FALLBACK: Partial<Record<MeasurementId, string>> = {
  showerhead: 'L/min',
  hot_water_wait: 's',
  room_temperature: '°C',
  standby: '€/Jahr',
  base_load: 'W',
  lighting: 'Räume',
  fridge: '°C',
  freezer: '€/Jahr',
}

/**
 * Reine Datenaufbereitung für die Messungen-Berichte.
 * Liefert erledigte Ergebnisse in Katalog-Reihenfolge, gruppiert nach Gewerk,
 * dazu Sparpotenzial-Summe und Fortschrittszähler. Keine Formatierung.
 */

/**
 * Ein Einzelergebnis einer raumbezogenen Messung.
 *
 * Ohne diese Aufschlüsselung zeigte der Bericht von einer Messung über drei
 * Räume nur einen einzigen, willkürlich gewählten Wert – „21,5 °C" ohne
 * Angabe, welcher Raum gemeint ist, und ohne die beiden anderen.
 */
export interface MeasurementRoomResult {
  /** Raum-Instanz für die Beschriftung („Schlafzimmer 2"). */
  room: RoomInstance
  value: number
  unit: string
  rating: MeasurementRating
  /** Zeitpunkt der Messung als ISO-String. */
  measuredAt: string
}

/** Ein erledigtes Mess-Ergebnis für den Bericht. */
export interface MeasurementEntry {
  id: MeasurementId
  category: MeasurementCategory
  primaryValue: number
  unit: string
  rating: MeasurementRating
  /** Geschätzte Jahres-Ersparnis in € (falls in den Details vorhanden). */
  yearlySaving?: number
  /**
   * Wann gemessen wurde (jüngste Messung, ISO). Ein Bericht ohne Messdatum
   * lässt sich nicht einordnen – und nicht mit einem späteren vergleichen.
   */
  measuredAt?: string
  /** Einzelergebnisse je Raum; leer bei Messungen fürs ganze Zuhause. */
  rooms: MeasurementRoomResult[]
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
  /** Räume des Profils – nur damit lassen sich Raum-Ergebnisse benennen. */
  rooms?: RoomEntry[]
}

/**
 * Baut das Messungen-Berichts-Datenobjekt.
 * Reine Funktion, leersicher; nur Ergebnisse mit endlichem Hauptwert zählen.
 */
export function buildMeasurementsReportData({
  results,
  categories,
  rooms = [],
}: BuildMeasurementsArgs): MeasurementsReportData {
  const catFilter = categories && categories.length > 0 ? new Set(categories) : undefined
  const roomByKey = new Map(roomInstances(rooms).map((inst) => [inst.key, inst]))

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
      // Es gilt dieselbe Anzeigeschwelle wie in der App: Beträge unterhalb von
      // `MIN_DISPLAY_EUR` liegen in der Modellunsicherheit und erscheinen weder
      // als Einzelwert noch in der Summe – sonst stünden im Bericht Zahlen, die
      // die App selbst nicht mehr zeigt.
      const saving = displaySavingEur(sumSavingsForMeasurement(results, meta.id))
      if (saving) savingsTotal += saving
      // Bei Pro-Raum-Messungen mit Sparwert die Räume-Summe als Hauptwert zeigen,
      // sonst das repräsentative Raum-/Direktergebnis.
      const showSavingAsValue = Boolean(meta.perRoom) && saving !== undefined
      const roomResults = meta.perRoom ? collectRoomResults(results, meta.id, roomByKey) : []
      entries.push({
        id: r.id,
        category: meta.category,
        primaryValue: showSavingAsValue ? saving : r.primaryValue,
        // Einheit aus dem Ergebnis; Fallback je Messung (robust gegen Altdaten).
        // Wort-Einheiten stehen nicht im Ergebnis (siehe resultValue.ts) und
        // koennen dort bei aelteren Daten unaufgeloest sein – hier zaehlt der
        // Katalogwert. Der Bericht erscheint in der Profilsprache.
        unit: showSavingAsValue
          ? '€/Jahr'
          : (hasWordUnit(r.id) ? undefined : r.unit) || UNIT_FALLBACK[r.id] || '',
        rating: r.rating,
        yearlySaving: saving,
        measuredAt: newestDate([r, ...roomResults.map((rr) => rr.measuredAt)]),
        rooms: roomResults,
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

/**
 * Alle Raum-Ergebnisse einer raumbezogenen Messung, in der Raum-Reihenfolge des
 * Profils. Ergebnisse zu Räumen, die es im Profil nicht (mehr) gibt, fallen
 * weg – ein Wert ohne benennbaren Ort sagt im Bericht nichts.
 */
function collectRoomResults(
  results: Partial<Record<string, MeasurementResult>>,
  id: string,
  roomByKey: Map<string, RoomInstance>,
): MeasurementRoomResult[] {
  const prefix = `${id}@`
  const out: MeasurementRoomResult[] = []
  for (const [key, value] of Object.entries(results)) {
    if (!key.startsWith(prefix) || !value || !Number.isFinite(value.primaryValue)) continue
    const roomKey = key.slice(prefix.length)
    const room = roomByKey.get(roomKey)
    if (!room) continue
    out.push({
      room,
      value: value.primaryValue,
      unit: (hasWordUnit(value.id) ? undefined : value.unit) || UNIT_FALLBACK[value.id] || '',
      rating: value.rating,
      measuredAt: value.completedAt,
    })
  }
  const order = [...roomByKey.keys()]
  out.sort((a, b) => order.indexOf(a.room.key) - order.indexOf(b.room.key))
  return out
}

/** Jüngstes gültiges Datum aus Ergebnissen bzw. ISO-Strings. */
function newestDate(items: (MeasurementResult | string | undefined)[]): string | undefined {
  let best: string | undefined
  let bestTime = -Infinity
  for (const item of items) {
    const iso = typeof item === 'string' ? item : item?.completedAt
    if (!iso) continue
    const time = Date.parse(iso)
    if (!Number.isFinite(time) || time <= bestTime) continue
    bestTime = time
    best = iso
  }
  return best
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
