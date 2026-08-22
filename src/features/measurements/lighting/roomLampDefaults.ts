import type { RoomType } from '@/types'
import type { BulbType } from './lighting'

/** Typische Brenndauer pro Tag (Stunden) je Raumtyp – Basis der Nutzungsstufen. */
export const HOURS_BASE: Partial<Record<RoomType, number>> = {
  living_room: 4,
  dining_room: 2.5,
  bedroom: 1.5,
  children_room: 2,
  office: 4,
  kitchen: 3,
  bathroom: 1.5,
  toilet: 0.5,
  hallway: 1,
  utility_room: 0.5,
  basement: 0.5,
  staircase: 0.5,
  attic: 0.5,
}

export const HOURS_FALLBACK = 2

/** Typische Brenndauer des Raumtyps, mit Rückfall auf einen Mittelwert. */
export function baseHoursFor(type: RoomType | undefined): number {
  return (type && HOURS_BASE[type]) || HOURS_FALLBACK
}

/**
 * Typische Lampen-Bestückung je Raumtyp – als **Vorschlag**, nicht als Behauptung.
 *
 * Grund: Drei Zähler auf 0 machen den Schirm beim Öffnen zu einer leeren Maske,
 * die erst der Nutzer mit Sinn füllen muss. Ein plausibler Vorschlag dreht die
 * Aufgabe um – korrigieren geht deutlich schneller als befüllen – und zeigt
 * nebenbei, was mit „Lampe" überhaupt gemeint ist.
 *
 * Die Zahlen sind bewusst konservativ (eher zu wenig als zu viel): Der Vorschlag
 * darf keine Ersparnis erfinden, die es nicht gibt. Bestätigt wird er ohnehin
 * erst durch das Auswerten, und wer nichts zu tauschen hat, kommt über
 * „Hier ist alles LED" in einem Tipp durch.
 */
export const ROOM_LAMP_HINT: Partial<Record<RoomType, Partial<Record<BulbType, number>>>> = {
  living_room: { incandescent: 1, halogen: 2 },
  dining_room: { incandescent: 1 },
  bedroom: { incandescent: 1, halogen: 1 },
  children_room: { incandescent: 1 },
  office: { incandescent: 1 },
  kitchen: { spot: 3 },
  bathroom: { spot: 2 },
  toilet: { incandescent: 1 },
  hallway: { incandescent: 1 },
  utility_room: { incandescent: 1 },
  basement: { incandescent: 1 },
  staircase: { incandescent: 1 },
  attic: { incandescent: 1 },
}

/** Vorbelegte Zähler für einen Raumtyp (fehlende Typen ergeben 0). */
export function lampHintFor(type: RoomType | undefined): Record<BulbType, number> {
  const hint = (type && ROOM_LAMP_HINT[type]) || {}
  return {
    incandescent: hint.incandescent ?? 0,
    halogen: hint.halogen ?? 0,
    spot: hint.spot ?? 0,
  }
}
