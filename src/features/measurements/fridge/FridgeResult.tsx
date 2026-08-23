import { useTranslation } from 'react-i18next'
import { TrendingDown } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import { fridgeStatus, fridgeChange } from './fridge'

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
 * Status-Satz (zu kalt/optimal/zu warm), Tipp-Chip und – je nach Lage – entweder
 * das geschätzte Sparpotenzial (Erstmessung) oder, bei einer Folgemessung nach
 * angepasster Stufe, was der Vergleich zur vorherigen Messung tatsächlich
 * gebracht hat.
 */
export function FridgeResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const fmt = useNumberFormat()

  const temp = result.primaryValue
  const status = fridgeStatus(temp)
  const savingPct = result.details?.savingPct ?? 0
  const pctFmt = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 0,
  })

  // Vorherige Messung: Der Ergebnis-Schirm erscheint, *bevor* gespeichert wird
  // – dann steht sie noch in `results`, `previousResults` ist leer. Nach dem
  // Speichern ist es umgekehrt (siehe BaseLoadResult für dasselbe Muster).
  const stored = useMeasurementsStore((s) => s.results['fridge'])
  const storedBefore = useMeasurementsStore((s) => s.previousResults['fridge'])
  const previous =
    stored && stored.completedAt !== result.completedAt ? stored : storedBefore
  // Nur als Folgemessung werten, wenn die vorherige Messung nicht gut war –
  // genau die Bedingung, unter der `FridgeRun` den Hinweis überhaupt zeigt.
  const isFollowUp = previous !== undefined && previous.rating !== 'good'
  const change = isFollowUp ? fridgeChange(previous!.primaryValue, temp) : undefined

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

      {change && (
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            {t('measurements.fridge.result.change.title')}
          </p>
          <p className="mt-1 text-sm text-foreground">
            {t('measurements.fridge.result.change.text', {
              before: fmt(previous!.primaryValue, 1),
              after: fmt(temp, 1),
            })}
          </p>
          {change.direction === 'up' && change.savingPct > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-primary" aria-hidden="true" />
              {t('measurements.fridge.result.change.saved', {
                value: pctFmt.format(change.savingPct),
              })}
            </p>
          )}
        </div>
      )}

      {!change && savingPct > 0 && (
        <div className="glass rounded-3xl p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            {t('measurements.fridge.result.savingTitle')}
          </p>
          <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
            ≈ {pctFmt.format(savingPct)}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t('measurements.fridge.result.savingHint')}
          </p>
        </div>
      )}
    </div>
  )
}
