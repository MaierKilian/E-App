import { useTranslation } from 'react-i18next'
import { ResultHero } from '../ResultHero'
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
  const methodIdx = result.details?.method ?? 0
  const estimated = (result.details?.savingEstimated ?? 0) === 1

  const hasTemp = Number.isFinite(result.details?.temperature)
  const temperature = result.details?.temperature ?? 0
  const tempStatus = hasTemp ? freezerTempStatus(temperature) : undefined

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={hasFrost && avoidable > 0 ? `≈ ${fmt(avoidable)}` : t('measurements.freezer.result.allGood')}
        unit={hasFrost && avoidable > 0 ? t('measurements.freezer.result.costPerYear') : undefined}
        summary={t(`measurements.freezer.result.summary.${result.rating}`)}
      >
        {hasFrost && avoidable > 0 && (
          <>
            <p className="text-xs text-muted">
              {t(`measurements.freezer.result.method.${methodIdx === 2 ? 'measured' : 'estimate'}`)}
            </p>
            {estimated && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
                {t('measurements.freezer.result.estimated')}
              </span>
            )}
          </>
        )}
      </ResultHero>

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
    </div>
  )
}
