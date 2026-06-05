import type { InstrumentType } from '@/types'

/**
 * Verfügbare Subtypen/Modellvarianten je Messgerät.
 * Die Schlüssel werden für i18n genutzt:
 *   onboarding.step6.modelTypes.<instrument>.<key>
 * Geräte ohne Subtypen (none/unknown) sind hier bewusst nicht enthalten.
 */
export const INSTRUMENT_MODEL_TYPES: Partial<Record<InstrumentType, string[]>> = {
  temperature_sensor: ['contact', 'room', 'infrared'],
  distance_meter: ['laser', 'ultrasonic'],
  co2_sensor: ['portable', 'stationary'],
  humidity_sensor: ['hygrometer', 'combined'],
  power_meter: ['plug', 'clamp'],
}

/** Liefert die Subtyp-Schlüssel eines Geräts (leeres Array, wenn keine). */
export function getModelTypes(type: InstrumentType): string[] {
  return INSTRUMENT_MODEL_TYPES[type] ?? []
}

/** Hat das Gerät auswählbare Subtypen / eine Empfehlung? */
export function hasModelTypes(type: InstrumentType): boolean {
  return getModelTypes(type).length > 0
}
