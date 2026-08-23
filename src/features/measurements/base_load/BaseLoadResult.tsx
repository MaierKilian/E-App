import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Gauge, ArrowRight, AlertTriangle, LineChart, TrendingDown } from 'lucide-react'
import { useReadingsStore } from '@/store/readingsStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useTariffStore } from '@/store/tariffStore'
import { stats } from '@/features/monitoring/readings'
import { ResultHero } from '../ResultHero'
import { RATING_COLOR } from '../rating'
import { baseLoadShare, baseLoadChange } from './baseLoad'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Grundlast-Checks: Grundlast in Watt mit Ampel und grober
 * €/kWh-Orientierung (kein Sparwert). Bei auffälliger Grundlast wird zum
 * Standby-Check verlinkt, der die Verursacher findet und beziffert.
 *
 * Kern der Aussage ist der **Anteil am tatsächlichen Jahresverbrauch** aus den
 * Monitoring-Ablesungen: „180 W" bleibt abstrakt, „ein Drittel deiner
 * Stromrechnung" trifft. Liegen dafür zu wenige Ablesungen vor, führt statt
 * dessen ein Hinweis ins Monitoring; ist der Anteil unmöglich hoch, wird die
 * Messung als fehlerhaft gekennzeichnet statt bewertet.
 */
export function BaseLoadResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const watts = result.primaryValue
  const annualKwh = result.details?.annualKwh ?? 0
  const annualEur = result.details?.annualEur ?? 0
  const showFunnel = result.rating !== 'good'

  const electricityReadings = useReadingsStore((st) => st.readings.electricity)
  // Strom ist ein flacher Träger – keine saisonale Gewichtung, kein Preis nötig
  // (für den Anteil zählt allein die kWh-Menge).
  const share = baseLoadShare(annualKwh, stats(electricityReadings ?? []))

  // Vorher/Nachher: der einzige Nachweis in der App, dem keine Schätzung
  // zugrunde liegt – hier steht, was eine Maßnahme wirklich gebracht hat.
  // Der Ergebnis-Schirm erscheint, *bevor* gespeichert wird: Dann steht in
  // `results` noch die vorherige Messung, `previousResults` ist leer. Nach dem
  // Speichern ist es umgekehrt. Deshalb beides prüfen und die Messung nehmen,
  // die nicht die gerade gezeigte ist.
  const stored = useMeasurementsStore((st) => st.results['base_load'])
  const storedBefore = useMeasurementsStore((st) => st.previousResults['base_load'])
  const previous =
    stored && stored.completedAt !== result.completedAt ? stored : storedBefore
  const workPriceCt = useTariffStore((st) => st.electricityWorkPrice)
  const change = previous
    ? baseLoadChange(
        { watts: previous.primaryValue, uncertainty: previous.details?.uncertainty },
        { watts, uncertainty: result.details?.uncertainty },
        workPriceCt,
      )
    : undefined

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const pctFmt = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 0,
  })

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        icon={Gauge}
        value={numFmt.format(watts)}
        unit="W"
        badgeLabel={t(`measurements.base_load.result.ratings.${result.rating}`)}
        summary={t(`measurements.base_load.result.summary.${result.rating}`)}
      />

      {change && (
        <div className="glass rounded-3xl p-4">
          <div className="flex gap-2.5">
            {change.significant && change.direction === 'down' ? (
              <TrendingDown
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: RATING_COLOR.good }}
                aria-hidden="true"
              />
            ) : (
              <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {t('measurements.base_load.result.change.title')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t(
                  change.significant
                    ? `measurements.base_load.result.change.${change.direction}`
                    : 'measurements.base_load.result.change.none',
                  {
                    before: numFmt.format(previous?.primaryValue ?? 0),
                    after: numFmt.format(watts),
                    delta: numFmt.format(change.deltaWatts),
                    tolerance: numFmt.format(change.toleranceWatts),
                    eur: numFmt.format(change.annualEur),
                  },
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="glass rounded-3xl p-4 text-center">
          <p className="text-xs text-muted">{t('measurements.base_load.result.perYearKwh')}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {numFmt.format(annualKwh)} kWh
          </p>
        </div>
        <div className="glass rounded-3xl p-4 text-center">
          <p className="text-xs text-muted">{t('measurements.base_load.result.perYearEur')}</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            ≈ {numFmt.format(annualEur)} €
          </p>
        </div>
      </div>

      {share && !share.implausible && (
        <div className="glass rounded-3xl p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">
              {t('measurements.base_load.result.share.title')}
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {pctFmt.format(share.share)}
            </p>
          </div>
          <p className="mt-1 text-sm text-muted">
            {t('measurements.base_load.result.share.text', {
              total: numFmt.format(share.totalYearKwh),
            })}
          </p>
          <p className="mt-2 text-[11px] text-muted">
            {share.basis === 'fullYear'
              ? t('measurements.base_load.result.share.basisFullYear')
              : t('measurements.base_load.result.share.basisProjected', {
                  days: numFmt.format(share.measuredDays),
                })}{' '}
            {t('measurements.base_load.result.share.ratedByShare')}
          </p>
        </div>
      )}

      {share?.implausible && (
        <div className="glass rounded-3xl p-4">
          <div className="flex gap-2.5">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: RATING_COLOR.elevated }}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {t('measurements.base_load.result.implausible.title')}
              </p>
              <p className="mt-1 text-sm text-muted">
                {t('measurements.base_load.result.implausible.text')}
              </p>
            </div>
          </div>
        </div>
      )}

      {!share && (
        <button
          type="button"
          onClick={() => navigate('/monitoring')}
          className="focus-ring glass flex w-full items-center gap-2.5 rounded-3xl p-4 text-left transition-transform active:scale-[0.99]"
        >
          <LineChart className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="flex-1 text-sm text-muted">
            {t('measurements.base_load.result.share.missing')}
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      )}

      <p className="px-1 text-[11px] text-muted">{t('measurements.base_load.result.note')}</p>

      {showFunnel && (
        <div className="glass rounded-3xl p-4">
          <p className="text-sm font-semibold text-foreground">
            {t('measurements.base_load.result.funnelTitle')}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('measurements.base_load.result.funnelText')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/measurements/standby')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
          >
            {t('measurements.base_load.result.funnelCta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
