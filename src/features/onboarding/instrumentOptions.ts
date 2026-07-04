import type { InstrumentType } from '@/types'

/**
 * Verfügbare Subtypen/Modellvarianten je Messgerät.
 * Die Schlüssel werden für i18n genutzt:
 *   onboarding.step6.modelTypes.<instrument>.<key>
 * Geräte ohne Subtypen (none/unknown) sind hier bewusst nicht enthalten.
 */
export const INSTRUMENT_MODEL_TYPES: Partial<Record<InstrumentType, string[]>> = {
  temperature_sensor: [
    'room_thermometer',
    'room_thermostat',
    'mercury_thermometer',
    'infrared_surface',
    'digital_thermometer',
  ],
  humidity_sensor: [
    'analog_hygrometer',
    'digital_hygrometer',
    'thermo_hygrometer',
    'data_logger',
    'smart_sensor',
  ],
  distance_meter: ['folding_rule', 'ruler', 'tape_measure', 'laser_distance', 'ultrasonic'],
  power_meter: ['plug_meter', 'clamp_meter', 'multimeter', 'electricity_meter'],
  co2_sensor: ['portable_monitor', 'stationary_monitor', 'traffic_light', 'smart_sensor'],
}

/** Liefert die Subtyp-Schlüssel eines Geräts (leeres Array, wenn keine). */
export function getModelTypes(type: InstrumentType): string[] {
  return INSTRUMENT_MODEL_TYPES[type] ?? []
}

/** Hat das Gerät auswählbare Subtypen / eine Empfehlung? */
export function hasModelTypes(type: InstrumentType): boolean {
  return getModelTypes(type).length > 0
}
