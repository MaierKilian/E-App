import type { TFunction } from 'i18next'
import type { RoomEntry, RoomType } from '@/types'
import type { MeasurementResult } from './types'

/** Eine einzelne Raum-Instanz (ein konkreter Raum, auch bei mehreren gleichen). */
export interface RoomInstance {
  /** Stabiler Schlüssel, z. B. "bedroom#0". */
  key: string
  type: RoomType
  index: number
  /** Gesamtzahl dieses Raumtyps (für die Beschriftung „Schlafzimmer 2"). */
  total: number
}

/** Expandiert Raumtyp+Anzahl in einzelne Raum-Instanzen. */
export function roomInstances(rooms: RoomEntry[]): RoomInstance[] {
  const out: RoomInstance[] = []
  for (const r of rooms) {
    const n = Math.max(1, Math.floor(r.count ?? 1))
    for (let i = 0; i < n; i++) {
      out.push({ key: `${r.type}#${i}`, type: r.type, index: i, total: n })
    }
  }
  return out
}

/** Anzeigename einer Raum-Instanz, nummeriert nur bei mehreren gleichen Räumen. */
export function roomLabel(
  t: TFunction,
  inst: { type: RoomType; index: number; total: number },
): string {
  const base = t(`onboarding.step3.roomTypes.${inst.type}`)
  return inst.total > 1 ? `${base} ${inst.index + 1}` : base
}

/** Zerlegt einen Raum-Schlüssel "bedroom#0" wieder in Typ und Index. */
export function parseRoomKey(roomKey: string): { type: RoomType; index: number } | null {
  const m = /^(.+)#(\d+)$/.exec(roomKey)
  if (!m) return null
  return { type: m[1] as RoomType, index: Number(m[2]) }
}

/** Schlüssel eines Mess-Ergebnisses inkl. optionalem Raum (z. B. "room_temperature@bedroom#0"). */
export function instanceKey(id: string, roomKey?: string): string {
  return roomKey ? `${id}@${roomKey}` : id
}

/**
 * Liefert ein repräsentatives Ergebnis einer Messung – das direkte (ohne Raum)
 * oder, falls die Messung pro Raum läuft, das erste vorhandene Raum-Ergebnis.
 * Nützlich für Übersichten (z. B. Berichte), die nur „gemessen ja/nein" brauchen.
 */
export function anyResultFor(
  results: Partial<Record<string, MeasurementResult>>,
  id: string,
): MeasurementResult | undefined {
  if (results[id]) return results[id]
  const prefix = `${id}@`
  for (const [key, value] of Object.entries(results)) {
    if (key.startsWith(prefix) && value) return value
  }
  return undefined
}
