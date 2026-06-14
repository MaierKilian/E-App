import { Droplet, Snowflake, Plug, Thermometer, Hourglass, Sofa, Gauge, Lightbulb } from 'lucide-react'
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
  /** Räume(typen), in denen die Messung sinnvoll ist (ein gemeinsames Ergebnis). */
  rooms?: RoomType[]
  /** True = Messung wird je Raum einzeln durchgeführt (eigenes Ergebnis pro Raum). */
  perRoom?: boolean
  /** True = Messung gilt fürs ganze Zuhause (ein Ergebnis, nicht je Raum). */
  wholeHome?: boolean
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
    id: 'hot_water_wait',
    icon: Hourglass,
    difficulty: 1,
    available: true,
    category: 'hot_water',
    estimatedMinutes: 2,
    rooms: ['bathroom', 'kitchen'],
  },
  {
    id: 'room_temperature',
    icon: Thermometer,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 5,
    perRoom: true,
  },
  {
    id: 'furniture_spacing',
    icon: Sofa,
    difficulty: 1,
    available: true,
    category: 'heating',
    estimatedMinutes: 2,
    perRoom: true,
  },
  {
    id: 'lighting',
    icon: Lightbulb,
    difficulty: 1,
    available: true,
    category: 'electricity',
    estimatedMinutes: 3,
    perRoom: true,
  },
  {
    id: 'base_load',
    icon: Gauge,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 5,
    wholeHome: true,
  },
  {
    id: 'standby',
    icon: Plug,
    difficulty: 2,
    available: true,
    category: 'electricity',
    estimatedMinutes: 12,
    wholeHome: true,
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

/** Prüft, ob eine Messung in einem Raum(typ) angeboten wird. */
export function appliesToRoom(meta: MeasurementMeta, room: RoomType): boolean {
  if (meta.wholeHome) return false
  if (meta.perRoom) return true
  return Boolean(meta.rooms?.includes(room))
}
