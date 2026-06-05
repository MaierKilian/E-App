import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { AffiliateRow } from '@/components/AffiliateCard'
import { SHOWERHEAD_PRODUCT } from '@/features/onboarding/affiliateProducts'
import { RatingBadge } from '../RatingBadge'
import type { ResultProps } from '../runnerTypes'

/** Formatiert eine Zahl mit einer Nachkommastelle in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/**
 * Ergebnis-Phase des Duschkopf-Tests: großer Durchflusswert, Bewertung,
 * Warmwasserkosten/Jahr, bei medium/high ein Spartipp samt Ersparnis und eine
 * Affiliate-Empfehlung (Sparduschkopf).
 */
export function ShowerheadResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const flow = result.primaryValue
  const yearlyCost = result.details?.yearlyCost ?? 0
  const yearlySaving = result.details?.yearlySaving ?? 0
  const showSaving = result.rating !== 'good' && yearlySaving > 0
  const showAffiliate = result.rating !== 'good'

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-col items-center text-center gap-2 py-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tabular-nums text-foreground">{fmt(flow, 1)}</span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.showerhead.result.flowUnit')}
            </span>
          </div>
          <RatingBadge rating={result.rating} />
          <p className="text-muted mt-1 max-w-prose">
            {t(`measurements.showerhead.result.summary.${result.rating}`)}
          </p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">{t('measurements.showerhead.result.costLabel')}</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">
            {t('measurements.showerhead.result.perYear', { value: fmt(yearlyCost) })}
          </span>
        </div>
        {showSaving && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-sm text-foreground">
              {t(`measurements.showerhead.result.tip.${result.rating}`)}
            </p>
            <p className="mt-1.5 text-sm font-semibold text-primary">
              {t('measurements.showerhead.result.savingLabel', {
                value: t('measurements.showerhead.result.perYear', { value: fmt(yearlySaving) }),
              })}
            </p>
          </div>
        )}
      </Card>

      {showAffiliate && (
        <div className="space-y-2">
          <p className="text-sm text-muted">{t('measurements.showerhead.result.affiliateNote')}</p>
          <AffiliateRow products={[SHOWERHEAD_PRODUCT]} />
        </div>
      )}
    </div>
  )
}
