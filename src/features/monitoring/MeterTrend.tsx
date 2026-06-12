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

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${tone} ${
        compact ? 'px-1.5 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {label}
    </span>
  )
}

/** Lesbarer Text „heute / vor N Tagen abgelesen" (oder null ohne Ablesung). */
export function useLastReadingText(days: number | undefined): string | null {
  const { t } = useTranslation()
  if (days === undefined) return null
  if (days === 0) return t('monitoring.overview.readToday')
  return t('monitoring.overview.readDaysAgo', { count: days })
}
