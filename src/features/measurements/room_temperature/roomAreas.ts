import type { RoomType } from '@/types'

/**
 * Typische Wohnfläche je Raumtyp in m² – Fallback, wenn der Nutzer keine
 * konkrete Fläche hinterlegt hat. Bewusst grobe Orientierungswerte für eine
 * deutsche Durchschnittswohnung; sie dienen nur der anteiligen Gewichtung beim
 * Raumklima-Spar-Check, nicht als exakte Angabe.
 */
export const TYPICAL_AREA_SQM: Record<RoomType, number> = {
  living_room: 28,
  dining_room: 14,
  bedroom: 14,
  children_room: 12,
  office: 12,
  kitchen: 10,
  bathroom: 8,
  toilet: 3,
  hallway: 6,
  utility_room: 6,
  basement: 12,
  staircase: 6,
  attic: 14,
}
