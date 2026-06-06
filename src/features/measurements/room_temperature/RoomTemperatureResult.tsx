import { useTranslation } from 'react-i18next'
import { Thermometer, Droplets, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AffiliateLink } from '@/components/AffiliateLink'
import { HYGROMETER_PRODUCT } from '@/features/onboarding/affiliateProducts'
import { RatingBadge } from '../RatingBadge'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'
import {
  rateTemperature,
  rateHumidity,
  type DimensionStatus,
} from './roomClimate'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Eine Zeile mit Icon, Dimension und kurzem Status-Hinweis. */
function StatusRow({
  Icon,
  label,
  status,
}: {
  Icon: LucideIcon
  label: string
  status: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-medium text-foreground">{status}</p>
      </div>
    </li>
  )
}

const DRAFT_LEVELS = ['none', 'noticeable', 'strong'] as const

/**
 * Ergebnis-Phase des Raumklima-Checks: Hero mit Temperatur + Bewertung, je
 * erfasster Dimension (Temperatur, Luftfeuchte, Zugluft) ein Status-Hinweis,
 * dezente Thermo-Hygrometer-Empfehlung.
 */
export function RoomTemperatureResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const temp = result.primaryValue
  const tempStatus = rateTemperature(temp)

  const hasHumidity = Number.isFinite(result.details?.humidity)
  const humidity = result.details?.humidity ?? 0
  const humidityStatus: DimensionStatus | undefined = hasHumidity
    ? rateHumidity(humidity)
    : undefined

  const draftIndex = result.details?.draft ?? 0
  const draftLevel = DRAFT_LEVELS[draftIndex] ?? 'none'

  return (
    <div className="space-y-4">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${RATING_COLOR[result.rating]} 7%, transparent)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-2 py-1 text-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tabular-nums text-foreground">{fmt(temp, 1)}</span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.room_temperature.run.tempUnit')}
            </span>
          </div>
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.room_temperature.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      <ul className="glass space-y-4 rounded-3xl p-5">
        <StatusRow
          Icon={Thermometer}
          label={t('measurements.room_temperature.result.dimensions.temperature')}
          status={t(`measurements.room_temperature.result.status.${tempStatus}`)}
        />
        {hasHumidity && humidityStatus && (
          <StatusRow
            Icon={Droplets}
            label={`${t('measurements.room_temperature.result.dimensions.humidity')} · ${fmt(humidity)} ${t('measurements.room_temperature.run.humidityUnit')}`}
            status={t(`measurements.room_temperature.result.status.${humidityStatus}`)}
          />
        )}
        <StatusRow
          Icon={Wind}
          label={t('measurements.room_temperature.result.dimensions.draft')}
          status={t(`measurements.room_temperature.result.draftStatus.${draftLevel}`)}
        />
      </ul>

      <div className="space-y-2">
        <p className="text-sm text-muted">
          {t('measurements.room_temperature.result.affiliateNote')}
        </p>
        <AffiliateLink product={HYGROMETER_PRODUCT} />
      </div>
    </div>
  )
}
