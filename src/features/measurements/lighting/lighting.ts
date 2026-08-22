import type { RoomType } from '@/types'
import type { RoomInstance } from '../rooms'
import type { MeasurementRating } from '../types'

/**
 * Logik des LED-Checks.
 *
 * Bewusst ohne Rechnung. Ein früherer Stand zählte Lampen je Typ, fragte die
 * Brenndauer ab und rechnete daraus einen Euro-Betrag – nur waren dort alle
 * Größen bis auf zwei Konstanten: Wattdifferenz, LED-Preis und Amortisation
 * hängen nicht vom Nutzer ab. Verrechnet man Konstanten mit zwei geschätzten
 * Eingaben, entsteht kein persönliches Ergebnis, sondern eine Tabelle mit
 * Nutzerdaten als Dekoration – und der ganze Aufwand, diese Zahl gegen ihre
 * eigene Unsicherheit abzusichern.
 *
 * Deshalb erhebt der Check nur noch, was der Nutzer wirklich weiß: **in welchen
 * Räumen noch alte Lampen hängen.** Die Reihenfolge des Tauschs folgt aus dem
 * Raumtyp, nicht aus einer Eingabe – wo Licht lange brennt, lohnt der Tausch
 * zuerst. Das Argument fürs Umrüsten steht als Text im Check, weil es für alle
 * gleich gilt.
 */

/** Antwort je Raum: hängen hier noch Lampen, die keine LED sind? */
export type RoomLampState = 'old' | 'led'

/**
 * Wie lange in einem Raumtyp typischerweise Licht brennt – 3 = am längsten.
 * Ersetzt die frühere Brenndauer-Abfrage: Die Rangfolge steckt schon im Raum.
 */
export const ROOM_PRIORITY: Record<RoomType, 1 | 2 | 3> = {
  living_room: 3,
  kitchen: 3,
  office: 3,
  dining_room: 2,
  children_room: 2,
  bedroom: 2,
  bathroom: 2,
  hallway: 2,
  toilet: 1,
  utility_room: 1,
  basement: 1,
  staircase: 1,
  attic: 1,
}

export function roomPriority(type: RoomType): number {
  return ROOM_PRIORITY[type] ?? 1
}

/** Präfix der Raum-Antworten in `details` (dort sind nur Zahlen erlaubt). */
const ROOM_DETAIL_PREFIX = 'room:'

/** Baut die `details` eines Ergebnisses aus den Antworten je Raum. */
export function lightingDetails(
  answers: Partial<Record<string, RoomLampState>>,
): Record<string, number> {
  const details: Record<string, number> = {}
  let openRooms = 0
  let checkedRooms = 0
  for (const [key, state] of Object.entries(answers)) {
    if (!state) continue
    checkedRooms += 1
    if (state === 'old') openRooms += 1
    details[`${ROOM_DETAIL_PREFIX}${key}`] = state === 'old' ? 1 : 0
  }
  return { ...details, openRooms, checkedRooms }
}

/** Liest die Raum-Schlüssel mit alten Lampen wieder aus den `details`. */
export function openRoomKeys(details: Record<string, number> | undefined): string[] {
  if (!details) return []
  return Object.entries(details)
    .filter(([key, value]) => key.startsWith(ROOM_DETAIL_PREFIX) && value === 1)
    .map(([key]) => key.slice(ROOM_DETAIL_PREFIX.length))
}

/**
 * Ob ein gespeichertes Ergebnis zum aktuellen Check gehört.
 *
 * Ergebnisse der früheren Zähl-Fassung tragen `totalBulbs` statt `checkedRooms`.
 * Ohne diese Prüfung läse der Ergebnis-Schirm dort „0 offene Räume" und meldete
 * fälschlich „alles auf LED".
 */
export function isCurrentLightingResult(details: Record<string, number> | undefined): boolean {
  return details?.checkedRooms !== undefined
}

/** Räume mit alten Lampen, die längste Brenndauer zuerst. */
export function rankOpenRooms(rooms: RoomInstance[], openKeys: string[]): RoomInstance[] {
  const open = new Set(openKeys)
  return rooms
    .filter((r) => open.has(r.key))
    .sort((a, b) => roomPriority(b.type) - roomPriority(a.type))
}

/**
 * Bewertung nach Gewicht der offenen Räume: Vier Kellerräume wiegen weniger als
 * Küche und Wohnzimmer, deshalb zählt die Priorität und nicht bloß die Anzahl.
 */
export function rateLighting(rooms: RoomInstance[], openKeys: string[]): MeasurementRating {
  const score = rankOpenRooms(rooms, openKeys).reduce((sum, r) => sum + roomPriority(r.type), 0)
  if (score === 0) return 'good'
  if (score <= 2) return 'medium'
  if (score <= 5) return 'elevated'
  return 'high'
}
