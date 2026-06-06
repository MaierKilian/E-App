import { useTranslation } from 'react-i18next'
import { AffiliateLink } from '@/components/AffiliateLink'
import { INFRARED_THERMOMETER_PRODUCT } from '@/features/onboarding/affiliateProducts'
import { RatingBadge } from '../RatingBadge'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'
import { freezerTempStatus, type FrostLevel } from './freezer'

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

const FROST_LEVELS: FrostLevel[] = ['none', 'light', 'heavy']

/**
 * Ergebnis-Phase des Gefrierschrank-Checks: Hero mit vermeidbaren Jahreskosten
 * (eisfrei → „alles gut"), Bewertung, Status-Chip, optionaler Temperatur-Hinweis
 * und – bei Vereisung – eine dezente Infrarot-Thermometer-Empfehlung.
 */
export function FreezerResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const avoidable = result.primaryValue
  const frostIndex = result.details?.frost ?? 0
  const frost = FROST_LEVELS[frostIndex] ?? 'none'
  const hasFrost = frost !== 'none'

  const hasTemp = Number.isFinite(result.details?.temperature)
  const temperature = result.details?.temperature ?? 0
  const tempStatus = hasTemp ? freezerTempStatus(temperature) : undefined

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
          {hasFrost && avoidable > 0 ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold tabular-nums text-foreground">
                ≈ {fmt(avoidable)}
              </span>
              <span className="text-lg font-medium text-muted">
                {t('measurements.freezer.result.costPerYear')}
              </span>
            </div>
          ) : (
            <span className="text-3xl font-bold text-foreground">
              {t('measurements.freezer.result.allGood')}
            </span>
          )}
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.freezer.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip label={t(`measurements.freezer.result.frostChips.${frost}`)} />
        {hasFrost && <Chip label={t('measurements.freezer.result.chips.defrost')} />}
      </div>

      {hasTemp && tempStatus && (
        <p className="text-sm text-muted">
          {t('measurements.freezer.result.tempHint', {
            value: `${temperature} ${t('measurements.freezer.run.tempUnit')}`,
            status: t(`measurements.freezer.result.tempStatus.${tempStatus}`),
          })}
        </p>
      )}

      {hasFrost && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t('measurements.freezer.result.affiliateNote')}</p>
          <AffiliateLink product={INFRARED_THERMOMETER_PRODUCT} />
        </div>
      )}
    </div>
  )
}
