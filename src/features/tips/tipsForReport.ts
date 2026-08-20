import type { TFunction } from 'i18next'
import { roomLabel } from '@/features/measurements/rooms'
import type { Tip } from './buildTips'

/**
 * Übersetzt die Empfehlungen der App in fertige Sätze, gebündelt nach der
 * Messung, aus der sie stammen – die Form, die der PDF-Bericht braucht.
 *
 * Der Bericht hatte dafür ein eigenes, zweites Tipp-System
 * (`measurements.<id>.result.tip.<rating>`). Das existierte nur für zwei der
 * neun Messungen; bei den übrigen sieben blieb der Tipp-Block leer, obwohl die
 * App zum selben Befund längst eine Empfehlung kannte. Beide aus derselben
 * Quelle zu speisen ist der einzige Weg, sie dauerhaft gleich zu halten.
 */

/**
 * Welcher Messung ein Tipp zugeordnet ist. Mehrere Tipps können auf dieselbe
 * Messung zeigen: Das Raumklima liefert Temperatur, Luftfeuchte und Zugluft.
 * Tipps ohne Messbezug (z. B. smarte Thermostate) fehlen hier bewusst – im
 * Bericht steht nur, was aus einer Messung folgt.
 */
const TIP_TO_MEASUREMENT: Record<string, string> = {
  standby: 'standby',
  lighting: 'lighting',
  fridge: 'fridge',
  fridge_warm: 'fridge',
  freezer: 'freezer',
  base_load: 'base_load',
  showerhead: 'showerhead',
  hot_water_wait: 'hot_water_wait',
  room_temperature: 'room_temperature',
  room_cold: 'room_temperature',
  humidity_high: 'room_temperature',
  humidity_low: 'room_temperature',
  draft: 'room_temperature',
  furniture_spacing: 'furniture_spacing',
}

/** Zahlen für die Zielsprache formatieren (sonst steht dort „23.4 °C"). */
function localizeParams(
  params: Record<string, string | number> | undefined,
  language: string,
): Record<string, string | number> {
  if (!params) return {}
  const fmt = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, typeof v === 'number' ? fmt.format(v) : v]),
  )
}

/** Baut `{ messId: [Empfehlungssatz, …] }` in der Reihenfolge der Tipp-Liste. */
export function tipsByMeasurement(
  tips: Tip[],
  t: TFunction,
  language: string,
): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const tip of tips) {
    const measurementId = TIP_TO_MEASUREMENT[tip.id]
    if (!measurementId) continue
    const room = tip.room ? roomLabel(t, tip.room) : undefined
    const params = { ...localizeParams(tip.params, language), room }
    // Variante ohne Raumnamen, wo die Messung keinen Raumbezug hat.
    const text =
      t(`tips.items.${tip.id}.${room ? 'reason' : 'reasonNoRoom'}`, {
        ...params,
        defaultValue: '',
      }) || t(`tips.items.${tip.id}.reason`, params)
    if (!text) continue
    ;(out[measurementId] ??= []).push(text)
  }
  return out
}
