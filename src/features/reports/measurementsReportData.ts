import type {
  MeasurementId,
  MeasurementResult,
  MeasurementRating,
} from '@/features/measurements/types'
import type { MeasurementCategory } from '@/features/measurements/catalog'
import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { anyResultFor, roomInstances, type RoomInstance } from '@/features/measurements/rooms'
import {
  displaySavingEur,
  isMeasuredSaving,
  savingRange,
} from '@/features/measurements/savingsDisplay'
import { resultSavingsEur } from '@/features/measurements/impact'
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
  // Der Gefrier-Check liefert seit August 2026 den Anteil am Verbrauch statt
  // eines geschätzten Euro-Betrags. Ältere Ergebnisse tragen ihre Einheit
  // ('€/Jahr') selbst im Ergebnis – diese Rückfalleinheit greift nur, wenn gar
  // keine gespeichert ist.
  freezer: '%',
  // Ohne Abstandsmessung ist der Hauptwert die Zahl der Befunde (siehe
  // FurnitureSpacingRun.tsx), kein physikalischer Messwert – ohne Einheit stand
  // im Bericht eine nackte Zahl wie „3" ohne jeden Bezug. Wurde gemessen, trägt
  // das Ergebnis bereits die Einheit „cm" und diese Rückfalleinheit greift nicht.
  furniture_spacing: 'Befunde',
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
  /** Jahres-Ersparnis in €, gerundet (nur belegbare Beträge – siehe `readSaving`). */
  yearlySaving?: number
  /**
   * Dieselbe Ersparnis als Spanne. Der Bericht zeigt **sie** statt des
   * Punktwerts: „ca. 35–55 €" behauptet die Unsicherheit, die in jeder
   * Hochrechnung steckt, statt sie hinter einer glatten Zahl zu verstecken.
   * `yearlySaving` bleibt für Sortierung und Summe der Rechenwert.
   */
  savingRange?: { low: number; high: number }
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
  /** Summe des jährlichen Sparpotenzials in €, gerundet (Rechenwert). */
  savingsTotal: number
  /**
   * Dieselbe Summe als Spanne – die Kachel im Bericht zeigt sie. Eine Summe
   * aus lauter Spannen darf nicht als punktgenaue Zahl auftreten, sonst
   * behauptet die Zusammenfassung mehr Genauigkeit als jede Karte darunter.
   */
  savingsRange?: { low: number; high: number }
  /** Anzahl erledigter Messungen. */
  doneCount: number
  /** Gesamtzahl der Messungen im Katalog. */
  totalCount: number
}

/**
 * Liest das Sparpotenzial eines Ergebnisses für den Bericht.
 *
 * Der Rohwert kommt aus {@link resultSavingsEur} – derselben Funktion, aus der
 * auch Wirkungs-Summe und Empfehlungen ihre Beträge holen. Dort sitzt der
 * Katalog-Riegel gegen Beträge aus Altergebnissen; hier kommt nur die zweite
 * Regel dazu: Beträge, deren größte Unsicherheit in einer Modellannahme steckt,
 * fallen heraus (`isMeasuredSaving`). Der Bericht ist das Dokument, das jemand
 * einem Dritten vorlegt; eine Zahl, die in der App als „geschätzt" markiert
 * ist, darf dort nicht ohne diesen Vorbehalt auftauchen. Statt ihrer steht dann
 * die gemessene Größe (°C, L, W), die niemand nachrechnen muss.
 */
function readSaving(result: MeasurementResult): number | undefined {
  if (!isMeasuredSaving(result.details)) return undefined
  const value = resultSavingsEur(result)
  return value > 0 ? value : undefined
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
    if (key === id || key.startsWith(prefix)) total += readSaving(value) ?? 0
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
      // Sparpotenzial über alle Räume summieren (relevant bei Pro-Raum mit
      // Sparwert). Ob die Messung überhaupt einen Euro-Betrag führt, entscheidet
      // `resultSavingsEur` anhand des Katalogs – hier gilt danach nur noch
      // dieselbe Anzeigeschwelle wie in der App: Beträge unterhalb von
      // `MIN_DISPLAY_EUR` liegen in der Modellunsicherheit und erscheinen weder
      // als Einzelwert noch in der Summe.
      const saving = displaySavingEur(sumSavingsForMeasurement(results, meta.id))
      if (saving) savingsTotal += saving
      const roomResults = meta.perRoom ? collectRoomResults(results, meta.id, roomByKey) : []
      entries.push({
        id: r.id,
        category: meta.category,
        // Der Hauptwert ist immer die **gemessene** Größe – auch dann, wenn
        // eine Ersparnis vorliegt. Früher ersetzte sie bei Pro-Raum-Messungen
        // den Messwert, womit ausgerechnet der Raumklima-Check (er misst °C)
        // mit einer Hochrechnung überschrieb, was er belegen kann. Die
        // Ersparnis steht jetzt nur noch im Chip daneben.
        primaryValue: r.primaryValue,
        // Einheit aus dem Ergebnis; Fallback je Messung (robust gegen Altdaten).
        // Wort-Einheiten stehen nicht im Ergebnis (siehe resultValue.ts) und
        // koennen dort bei aelteren Daten unaufgeloest sein – hier zaehlt der
        // Katalogwert. Der Bericht erscheint in der Profilsprache.
        unit: (hasWordUnit(r.id) ? undefined : r.unit) || UNIT_FALLBACK[r.id] || '',
        rating: r.rating,
        yearlySaving: saving,
        savingRange: saving !== undefined ? savingRange(saving) : undefined,
        measuredAt: newestDate([r, ...roomResults.map((rr) => rr.measuredAt)]),
        rooms: roomResults,
      })
    } else {
      open.push({ id: meta.id, category: meta.category, available: meta.available })
    }
  }

  const savingsRounded = Math.round(savingsTotal)

  return {
    entries,
    groups: groupByCategory(entries),
    open,
    savingsTotal: savingsRounded,
    savingsRange: savingsRounded > 0 ? savingRange(savingsRounded) : undefined,
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
