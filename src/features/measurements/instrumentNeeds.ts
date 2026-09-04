import type { InstrumentType } from '@/types'
import { MEASUREMENT_CATALOG } from './catalog'
import type { MeasurementId } from './types'

/**
 * Welche Rolle ein Messgerät für die App spielt.
 *
 * - `required` – mindestens ein Check lässt sich ohne das Gerät nicht
 *   abschließen.
 * - `optional` – jeder Check läuft auch ohne durch; das Gerät schaltet nur
 *   einen genaueren Schritt frei.
 * - `unused` – zurzeit liest keine Messung dieses Gerät.
 *
 * `unused` ist bewusst eine eigene Stufe und kein weggelassener Eintrag: Der
 * CO₂-Sensor stand im Fragebogen zur Auswahl, ohne dass ihn je etwas gelesen
 * hätte. Ihn stillschweigend aus der Übersicht zu nehmen, hieße die Lücke zu
 * verstecken; sie zu benennen, ist die ehrlichere Auskunft.
 */
export type InstrumentRole = 'required' | 'optional' | 'unused'

export interface InstrumentNeedSummary {
  type: InstrumentType
  role: InstrumentRole
  /** Messungen, die das Gerät voraussetzen (leer bei `optional`/`unused`). */
  requiredFor: MeasurementId[]
  /** Messungen, die es zusätzlich nutzen können. */
  optionalFor: MeasurementId[]
}

/**
 * Die Geräte in der Reihenfolge, in der die Übersicht sie zeigt. Sortiert wird
 * darin nach Rolle – wer nur eine Sache mitnimmt, soll die Pflichtgeräte oben
 * finden.
 */
const DEVICE_TYPES: InstrumentType[] = [
  'temperature_sensor',
  'power_meter',
  'humidity_sensor',
  'distance_meter',
  'co2_sensor',
]

const ROLE_ORDER: Record<InstrumentRole, number> = { required: 0, optional: 1, unused: 2 }

/**
 * Dreht die Zuordnung des Katalogs um: dort steht je Messung, was sie braucht –
 * hier je Gerät, wofür es gut ist.
 *
 * Abgeleitet, nicht gepflegt: Nimmt eine Messung ihren Mess-Schritt weg (wie
 * der Gefrierschrank-Check die Strommessung), verschwindet sie hier von selbst.
 * Eine zweite Liste würde genau das verpassen.
 */
export function summarizeInstrumentNeeds(): InstrumentNeedSummary[] {
  const available = MEASUREMENT_CATALOG.filter((m) => m.available)

  return DEVICE_TYPES.map((type) => {
    const requiredFor: MeasurementId[] = []
    const optionalFor: MeasurementId[] = []

    for (const meta of available) {
      const need = meta.instruments.find((i) => i.type === type)
      if (!need) continue
      ;(need.required ? requiredFor : optionalFor).push(meta.id)
    }

    const role: InstrumentRole =
      requiredFor.length > 0 ? 'required' : optionalFor.length > 0 ? 'optional' : 'unused'

    return { type, role, requiredFor, optionalFor }
  }).sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
}

/**
 * Messungen, die ohne Anschaffung auskommen.
 *
 * Maßstab ist das Pflichtgerät, nicht die leere Liste: Der Möbelabstand-Check
 * nennt ein Abstandsmessgerät, läuft aber vollständig ohne eines durch. Für die
 * Frage „womit kann ich sofort anfangen?" zählt genau das.
 *
 * Gehört in dieselbe Übersicht wie die Geräte: „Du brauchst nichts" ist auf die
 * Frage nach der Ausrüstung eine ebenso gute Antwort wie ein Gerätename – und
 * die Hälfte der Checks kann sie geben.
 */
export function measurementsWithoutRequiredInstrument(): MeasurementId[] {
  return MEASUREMENT_CATALOG.filter(
    (m) => m.available && !m.instruments.some((i) => i.required),
  ).map((m) => m.id)
}
