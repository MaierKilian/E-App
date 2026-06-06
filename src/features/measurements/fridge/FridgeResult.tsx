import { useTranslation } from 'react-i18next'
import { AffiliateLink } from '@/components/AffiliateLink'
import { INFRARED_THERMOMETER_PRODUCT } from '@/features/onboarding/affiliateProducts'
import { RatingBadge } from '../RatingBadge'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'
import { fridgeStatus } from './fridge'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Ergebnis-Phase des Kühlschrank-Checks: Hero mit Temperatur + Bewertung,
 * Status-Satz (zu kalt/optimal/zu warm), Tipp-Chip und – bei zu kalt – eine
 * grobe jährliche Ersparnis plus dezente Infrarot-Thermometer-Empfehlung.
 */
export function FridgeResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const temp = result.primaryValue
  const status = fridgeStatus(temp)
  const yearlySaving = result.details?.yearlySaving ?? 0
  const showSaving = status === 'tooCold' && yearlySaving > 0

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
              {t('measurements.fridge.run.tempUnit')}
            </span>
          </div>
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.fridge.result.status.${status}`)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {status === 'optimal' ? (
          <Chip label={t('measurements.fridge.result.chips.optimal')} />
        ) : (
          <Chip label={t(`measurements.fridge.result.chips.${status}`)} />
        )}
      </div>

      {showSaving && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-primary">
            {t('measurements.fridge.result.savingLabel', {
              value: t('measurements.fridge.result.perYear', { value: fmt(yearlySaving) }),
            })}
          </p>
          <p className="text-sm text-muted">{t('measurements.fridge.result.affiliateNote')}</p>
          <AffiliateLink product={INFRARED_THERMOMETER_PRODUCT} />
        </div>
      )}

      {status === 'tooWarm' && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t('measurements.fridge.result.affiliateNote')}</p>
          <AffiliateLink product={INFRARED_THERMOMETER_PRODUCT} />
        </div>
      )}
    </div>
  )
}
