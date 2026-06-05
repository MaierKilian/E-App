import { useTranslation } from 'react-i18next'
import { AffiliateRow } from '@/components/AffiliateCard'
import { SHOWERHEAD_PRODUCT } from '@/features/onboarding/affiliateProducts'
import { RatingBadge } from '../RatingBadge'
import type { ResultProps } from '../runnerTypes'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Kleine Kennzahl-Kachel (Label oben, Wert unten). */
function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
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
 * Minimale Ergebnis-Phase: großer Durchflusswert + Bewertung, drei Mini-Kacheln,
 * Tipp-Chips und bei medium/high eine Sparduschkopf-Empfehlung samt Ersparnis.
 */
export function ShowerheadResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const flow = result.primaryValue
  const liters = result.details?.liters ?? 0
  const seconds = result.details?.seconds ?? 0
  const yearlySaving = result.details?.yearlySaving ?? 0
  const isGood = result.rating === 'good'
  const showSaving = !isGood && yearlySaving > 0

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <div className="flex flex-col items-center gap-2 py-1 text-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tabular-nums text-foreground">{fmt(flow, 1)}</span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.showerhead.result.flowUnit')}
            </span>
          </div>
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.showerhead.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <MiniTile
          label={t('measurements.showerhead.result.mini.liters')}
          value={`${fmt(liters, 1)} ${t('measurements.showerhead.run.litersUnit')}`}
        />
        <MiniTile
          label={t('measurements.showerhead.result.mini.seconds')}
          value={`${fmt(seconds, 1)} ${t('measurements.showerhead.run.secondsUnit')}`}
        />
        <MiniTile
          label={t('measurements.showerhead.result.mini.reference')}
          value={t('measurements.showerhead.result.referenceValue')}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {isGood ? (
          <Chip label={t('measurements.showerhead.result.chips.good')} />
        ) : (
          <>
            <Chip label={t('measurements.showerhead.result.chips.saver')} />
            <Chip label={t('measurements.showerhead.result.chips.time')} />
          </>
        )}
      </div>

      {!isGood && (
        <div className="space-y-2">
          {showSaving && (
            <p className="text-sm font-semibold text-primary">
              {t('measurements.showerhead.result.savingLabel', {
                value: t('measurements.showerhead.result.perYear', { value: fmt(yearlySaving) }),
              })}
            </p>
          )}
          <p className="text-sm text-muted">{t('measurements.showerhead.result.affiliateNote')}</p>
          <AffiliateRow products={[SHOWERHEAD_PRODUCT]} />
        </div>
      )}
    </div>
  )
}
