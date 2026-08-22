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
    // Die Zuordnung trägt der Tipp selbst (`source`) – vorher stand sie hier
    // als zweite, von Hand gepflegte Liste, die bei jeder neuen Regel
    // mitgezogen werden musste. Tipps ohne Messbezug (Verbrauchstrend aus
    // Zählerständen) haben keine Quelle und bleiben damit außen vor: Im
    // Bericht steht nur, was aus einer Messung folgt.
    const measurementId = tip.source?.measurementId
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
