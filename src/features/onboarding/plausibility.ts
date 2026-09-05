import type { OnboardingData } from '@/types'

/**
 * Stiller Abgleich der Wohnfläche gegen Bewohner und Zimmer.
 *
 * Ein Tippfehler – 700 statt 70 m² – schlägt ungebremst auf jede €- und
 * kWh-Zahl der App durch: Verbrauchsschätzung, Raumflächen, spezifische
 * Kennwerte im Monitoring. Die Wohnfläche ist damit die eine Zahl, bei der ein
 * Vertipper alles Nachfolgende entwertet.
 *
 * **Ein Hinweis, keine Sperre.** Es gibt WGs mit 9 m² pro Person und Erbhäuser
 * mit 200 m² für eine Person. Die Schwellen liegen deshalb weit außerhalb des
 * Üblichen – sie sollen Vertipper fangen, nicht Lebensentwürfe kommentieren.
 */

export type PlausibilityHintId =
  | 'area_per_person_low'
  | 'area_per_person_high'
  | 'area_per_room_low'
  | 'area_per_room_high'

export interface PlausibilityHint {
  id: PlausibilityHintId
  /** Werte für den Text (gerundet, wie sie der Nutzer lesen soll). */
  params: Record<string, number>
}

// Üblich sind grob 25–80 m² je Person und 15–40 m² je Zimmer. Gewarnt wird erst
// weit darunter bzw. darüber.
const AREA_PER_PERSON_LOW = 12
const AREA_PER_PERSON_HIGH = 150
const AREA_PER_ROOM_LOW = 6
const AREA_PER_ROOM_HIGH = 80

/**
 * Zimmerzahl, mit der gerechnet wird.
 *
 * Sind Räume angelegt, sind sie die Wahrheit – die Schnellstart-Angabe
 * `roomsCount` ist dann nur noch der grobe Vorläufer.
 */
export function effectiveRoomCount(data: OnboardingData): number {
  const listed = data.rooms.reduce((sum, r) => sum + r.instances.length, 0)
  return listed > 0 ? listed : Math.max(0, Math.floor(data.roomsCount ?? 0))
}

export function checkPlausibility(data: OnboardingData): PlausibilityHint[] {
  const out: PlausibilityHint[] = []
  const area = data.livingArea
  if (!Number.isFinite(area) || area <= 0) return out

  const persons = Math.max(0, Math.floor(data.personsCount ?? 0))
  if (persons > 0) {
    const perPerson = area / persons
    if (perPerson < AREA_PER_PERSON_LOW) {
      out.push({ id: 'area_per_person_low', params: { area, persons, perPerson: Math.round(perPerson) } })
    } else if (perPerson > AREA_PER_PERSON_HIGH) {
      out.push({ id: 'area_per_person_high', params: { area, persons, perPerson: Math.round(perPerson) } })
    }
  }

  const rooms = effectiveRoomCount(data)
  if (rooms > 0) {
    const perRoom = area / rooms
    if (perRoom < AREA_PER_ROOM_LOW) {
      out.push({ id: 'area_per_room_low', params: { area, rooms, perRoom: Math.round(perRoom) } })
    } else if (perRoom > AREA_PER_ROOM_HIGH) {
      out.push({ id: 'area_per_room_high', params: { area, rooms, perRoom: Math.round(perRoom) } })
    }
  }

  return out
}

/**
 * Fingerabdruck der geprüften Werte.
 *
 * „Passt so" gilt für **diese** Kombination, nicht für alle Zeit: Wer später
 * 700 statt 70 eintippt, soll den Hinweis wieder sehen. Ohne diesen Schlüssel
 * bliebe eine einmal weggeklickte Warnung für jeden künftigen Tippfehler stumm.
 */
export function plausibilityKey(data: OnboardingData): string {
  return `${Math.round(data.livingArea)}|${data.personsCount}|${effectiveRoomCount(data)}`
}
