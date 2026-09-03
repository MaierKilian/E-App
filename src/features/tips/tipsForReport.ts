import type { TFunction } from 'i18next'
import { roomLabel } from '@/features/measurements/rooms'
import { applianceLabel } from '@/features/measurements/applianceLabel'
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
export function localizeParams(
  params: Record<string, string | number> | undefined,
  language: string,
): Record<string, string | number> {
  if (!params) return {}
  const fmt = new Intl.NumberFormat(language, { maximumFractionDigits: 1 })
  return Object.fromEntries(
    Object.entries(params).map(([k, v]) => [
      k,
      // `count` waehlt bei i18next die Pluralform und muss dafuer eine Zahl
      // bleiben – als lokalisierter String faellt die Wahl aus und i18next gibt
      // den rohen Schluessel aus. Alle anderen Zahlen werden lokalisiert, weil
      // i18next sie sonst roh durchreicht („23.4 °C" statt „23,4 °C").
      k === 'count' || typeof v !== 'number' ? v : fmt.format(v),
    ]),
  )
}

/**
 * Der Titel eines Tipps, wie ihn auch die Tipps-Seite zeigt.
 *
 * Ein Tipp mit Raumbezug trägt den Raum im Titel: Ohne ihn stünden
 * „Raumtemperatur senken" und „Räume nicht auskühlen lassen" unvermittelt
 * nebeneinander und läsen sich wie ein Widerspruch, statt zwei verschiedene
 * Räume zu meinen.
 */
export function tipTitle(tip: Tip, t: TFunction, language: string): string {
  const textId = tip.textId ?? tip.id
  const room = tip.room ? roomLabel(t, tip.room) : undefined
  const params = { ...localizeParams(tip.params, language), room }
  const title = t(`tips.items.${textId}.title`, params)
  // Raum oder Gerät – beides beantwortet dieselbe Frage: welches von mehreren
  // ist gemeint? Der Gerätename nur, wenn es mehrere gleichartige gibt.
  const appliance =
    tip.appliance && tip.appliance.all.length > 1
      ? applianceLabel(t, tip.appliance.entry, tip.appliance.all)
      : undefined
  const suffix = room ?? appliance
  return suffix ? `${title} (${suffix})` : title
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
    const appliance =
      tip.appliance && tip.appliance.all.length > 1
        ? applianceLabel(t, tip.appliance.entry, tip.appliance.all)
        : undefined
    const params = { ...localizeParams(tip.params, language), room }
    // Mehrere Tipps teilen sich einen Text (ein Tipp je Gerät); `textId`
    // benennt dann den gemeinsamen i18n-Schlüssel.
    const textId = tip.textId ?? tip.id
    // Variante ohne Raumnamen, wo die Messung keinen Raumbezug hat.
    const text =
      t(`tips.items.${textId}.${room ? 'reason' : 'reasonNoRoom'}`, {
        ...params,
        defaultValue: '',
      }) || t(`tips.items.${textId}.reason`, params)
    if (!text) continue
    // „Gefriertruhe Keller: …" – ohne den Vorsatz stünden zwei Sätze über
    // verschiedene Geräte im Bericht ununterscheidbar untereinander.
    ;(out[measurementId] ??= []).push(appliance ? `${appliance}: ${text}` : text)
  }
  return out
}
