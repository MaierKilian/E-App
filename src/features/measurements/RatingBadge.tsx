import { useTranslation } from 'react-i18next'
import type { MeasurementRating } from './types'
import { RATING_COLOR } from './rating'

interface RatingBadgeProps {
  rating: MeasurementRating
}

/** Dezenter Bewertungs-Badge in semantischer Farbe (good/medium/high). */
export function RatingBadge({ rating }: RatingBadgeProps) {
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
      {t(`measurements.ratings.${rating}`)}
    </span>
  )
}
