import { useTranslation } from 'react-i18next'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { ConsumptionTrend } from './readings'

/** Trend-Badge mit Pfeil und Prozent. Sinkender Verbrauch ist „gut" (grün). */
export function TrendBadge({ trend, compact }: { trend: ConsumptionTrend; compact?: boolean }) {
  const { t } = useTranslation()
  const pct = trend.changePct
  const tone =
    trend.direction === 'down'
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
      : trend.direction === 'up'
        ? 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
        : 'text-muted bg-surface-2/70'
  const Icon =
    trend.direction === 'down' ? TrendingDown : trend.direction === 'up' ? TrendingUp : Minus
  const label =
    pct !== undefined
      ? `${pct > 0 ? '+' : ''}${Math.round(pct * 100)}%`
      : t('monitoring.overview.trendNew')

  // Der Badge zeigt nur „−12 %". Womit verglichen wurde, steht am Ort der
  // Verwendung (Bildunterschrift bzw. gleicher Zeitraum wie die Zahl daneben) –
  // für Screenreader fehlt dieser Kontext, deshalb hier als Label.
  const baselineLabel =
    trend.baseline === 'lastYear'
      ? t('monitoring.overview.trendVsLastYear')
      : trend.baseline === 'previousPeriod'
        ? t('monitoring.overview.trendVsPrevious')
        : undefined

  return (
    <span
      aria-label={baselineLabel ? `${label} ${baselineLabel}` : label}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${tone} ${
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  )
}
