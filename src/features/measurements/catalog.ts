import { Droplet, Snowflake, Plug, Thermometer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementId } from './types'
import type { RoomType } from '@/types'

/** Gewerk-Kategorie einer Messung (für die „Gewerke"-Ansicht). */
export type MeasurementCategory = 'heating' | 'hot_water' | 'electricity' | 'water'

export interface MeasurementMeta {
  id: MeasurementId
  icon: LucideIcon
  /** 1 = einfach, 3 = anspruchsvoller. Steuert die Reihenfolge im Katalog. */
  difficulty: 1 | 2 | 3
  /** Nur verfügbare Messungen sind anklickbar; der Rest erscheint als „bald". */
  available: boolean
  /** Gewerk, dem die Messung zugeordnet ist. */
  category: MeasurementCategory
  /** Geschätzte Dauer in Minuten. */
  estimatedMinutes: number
  /** Räume, in denen die Messung sinnvoll ist (alternativ `allRooms`). */
  rooms?: RoomType[]
  /** True = Messung gilt für alle Räume (überschreibt `rooms`). */
  allRooms?: boolean
}

/**
 * Zentrale Registry aller Messungen. Reihenfolge = empfohlene Reihenfolge
 * (einfach zuerst). Neue Messungen werden hier ergänzt und – sobald fertig –
 * auf `available: true` gesetzt sowie in der Runner-Registry registriert.
 */
export const MEASUREMENT_CATALOG: MeasurementMeta[] = [
  {
    id: 'showerhead',
    icon: Droplet,
    difficulty: 1,
    available: true,
    category: 'hot_water',
    estimatedMinutes: 5,
    rooms: ['bathroom'],
  },
  {
    id: 'room_temperature',
    icon: Thermometer,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 5,
    allRooms: true,
  },
  {
    id: 'standby',
    icon: Plug,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 12,
    allRooms: true,
  },
  {
    id: 'fridge',
    icon: Snowflake,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 10,
    rooms: ['kitchen'],
  },
  {
    id: 'freezer',
    icon: Snowflake,
    difficulty: 1,
    available: true,
    category: 'electricity',
    estimatedMinutes: 5,
    rooms: ['kitchen'],
  },
]

export function getMeasurementMeta(id: string): MeasurementMeta | undefined {
  return MEASUREMENT_CATALOG.find((m) => m.id === id)
}

/** Prüft, ob eine Messung auf einen Raumtyp anwendbar ist. */
export function appliesToRoom(meta: MeasurementMeta, room: RoomType): boolean {
  if (meta.allRooms) return true
  return Boolean(meta.rooms?.includes(room))
}
