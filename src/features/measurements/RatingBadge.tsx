import { useTranslation } from 'react-i18next'
import type { MeasurementRating } from './types'

interface RatingBadgeProps {
  rating: MeasurementRating
}

/**
 * Dezenter Bewertungs-Badge in Theme-Token-Farben.
 * good  → Primary-Akzent (sparsam)
 * medium→ gedämpft (muted)
 * high  → kräftigerer Primary-Border als Warnhinweis (ohne feste Farben).
 */
export function RatingBadge({ rating }: RatingBadgeProps) {
  const { t } = useTranslation()
  const styles: Record<MeasurementRating, string> = {
    good: 'bg-primary/15 text-primary border border-primary/30',
    medium: 'bg-surface-2 text-muted border border-border',
    high: 'bg-primary/10 text-foreground border border-primary',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[rating]}`}
    >
      {t(`measurements.ratings.${rating}`)}
    </span>
  )
}
