import type { MeasurementRating } from './types'

/**
 * Semantische, bewusst dezente Bewertungsfarben (subtil eingesetzt):
 * good → grün, medium → gelb/amber, elevated → orange, high → rot.
 * Funktionieren in Light & Dark, da nur als zarte Tönung bzw. Textfarbe.
 */
export const RATING_COLOR: Record<MeasurementRating, string> = {
  good: '#16a34a',
  medium: '#d97706',
  elevated: '#ea580c',
  high: '#dc2626',
}
