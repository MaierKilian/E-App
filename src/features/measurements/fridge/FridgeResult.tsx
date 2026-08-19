import { useTranslation } from 'react-i18next'
import { ResultHero } from '../ResultHero'
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
  const showSaving = yearlySaving > 0
  const methodIdx = result.details?.method ?? 0
  const methodKey = methodIdx === 2 ? 'measured' : methodIdx === 1 ? 'delta' : 'estimate'
  const estimated = (result.details?.savingEstimated ?? 0) === 1

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={fmt(temp, 1)}
        unit={t('measurements.fridge.run.tempUnit')}
        summary={t(`measurements.fridge.result.status.${status}`)}
      />

      <div className="flex flex-wrap gap-2">
        {status === 'optimal' ? (
          <Chip label={t('measurements.fridge.result.chips.optimal')} />
        ) : (
          <Chip label={t(`measurements.fridge.result.chips.${status}`)} />
        )}
      </div>

      {showSaving && (
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            {t('measurements.fridge.result.savingTitle')}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
            ≈ {t('measurements.fridge.result.perYear', { value: fmt(yearlySaving) })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t(`measurements.fridge.result.method.${methodKey}`)}
          </p>
          {estimated && (
            <span className="mt-2 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {t('measurements.fridge.result.estimated')}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
