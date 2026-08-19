import { useTranslation } from 'react-i18next'
import type { MeasurementRating } from './types'
import { RATING_COLOR } from './rating'

interface RatingBadgeProps {
  rating: MeasurementRating
  /**
   * Eigenes Label statt der neutralen Skala.
   *
   * Nur nutzen, wo das Label den Befund benennt („Alles frei") und nicht bloß
   * die Stufe umschreibt – sonst entstehen wieder mehrere Vokabulare für
   * dieselbe vierstufige Skala.
   */
  label?: string
}

/** Dezenter Bewertungs-Badge in semantischer Farbe (good/medium/high). */
export function RatingBadge({ rating, label }: RatingBadgeProps) {
  const { t } = useTranslation()
  const color = RATING_COLOR[rating]
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        color,
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {label ?? t(`measurements.ratings.${rating}`)}
    </span>
  )
}
