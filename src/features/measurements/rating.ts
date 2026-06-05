import type { MeasurementRating } from './types'

/**
 * Semantische, bewusst dezente Bewertungsfarben (subtil eingesetzt):
 * good → grün, medium → amber, high → rot. Funktionieren in Light & Dark,
 * da sie nur als zarte Tönung (color-mix) bzw. Textfarbe genutzt werden.
 */
export const RATING_COLOR: Record<MeasurementRating, string> = {
  good: '#16a34a',
  medium: '#d97706',
  high: '#dc2626',
}
