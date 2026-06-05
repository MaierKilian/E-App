import { Droplet, Snowflake, Plug, Thermometer } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MeasurementId } from './types'

export interface MeasurementMeta {
  id: MeasurementId
  icon: LucideIcon
  /** 1 = einfach, 3 = anspruchsvoller. Steuert die Reihenfolge im Katalog. */
  difficulty: 1 | 2 | 3
  /** Nur verfügbare Messungen sind anklickbar; der Rest erscheint als „bald". */
  available: boolean
}

/**
 * Zentrale Registry aller Messungen. Reihenfolge = empfohlene Reihenfolge
 * (einfach zuerst). Neue Messungen werden hier ergänzt und – sobald fertig –
 * auf `available: true` gesetzt sowie in der Runner-Registry registriert.
 */
export const MEASUREMENT_CATALOG: MeasurementMeta[] = [
  { id: 'showerhead', icon: Droplet, difficulty: 1, available: true },
  { id: 'room_temperature', icon: Thermometer, difficulty: 1, available: false },
  { id: 'standby', icon: Plug, difficulty: 2, available: false },
  { id: 'fridge', icon: Snowflake, difficulty: 3, available: false },
]

export function getMeasurementMeta(id: string): MeasurementMeta | undefined {
  return MEASUREMENT_CATALOG.find((m) => m.id === id)
}
