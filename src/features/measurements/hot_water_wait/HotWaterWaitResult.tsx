import { useTranslation } from 'react-i18next'
import { MetricTiles } from '../MetricTiles'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Ergebnis des Warmwasser-Wartezeit-Checks: Wartezeit als Hauptzahl, vierstufige
 * Bewertung, geschätzte ungenutzte Wassermenge und jährliches Einsparpotenzial.
 */
export function HotWaterWaitResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const nf = (v: number, d = 0) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

  const seconds = result.details?.seconds ?? result.primaryValue ?? 0
  const litersPerDraw = result.details?.litersPerDraw ?? 0
  const litersPerYear = result.details?.litersPerYear ?? 0
  const yearlySaving = result.details?.yearlySaving ?? 0
  const fixture = result.roomKey
  const reuse = t('measurements.hot_water_wait.result.reuse', { returnObjects: true }) as string[]

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        eyebrow={fixture ? t(`measurements.hot_water_wait.fixtures.${fixture}`) : undefined}
        value={nf(seconds)}
        unit={t('measurements.hot_water_wait.result.secondsUnit')}
        summary={t('measurements.hot_water_wait.result.explanation', {
          liters: nf(litersPerDraw, 1),
        })}
      />

      {/* Gemessen und hochgerechnet sichtbar getrennt. */}
      <MetricTiles
        metrics={[
          {
            label: t('measurements.hot_water_wait.result.perDraw'),
            value: `${nf(litersPerDraw, 1)} L`,
          },
          {
            label: t('measurements.hot_water_wait.result.perYear'),
            value: `${nf(litersPerYear)} L`,
            estimated: true,
          },
          {
            label: t('measurements.hot_water_wait.result.savingYear'),
            value: `≈ ${nf(yearlySaving)} €`,
            estimated: true,
          },
        ]}
      />

      {/* Beiläufige Ideen – bewusst zurückgenommen, damit sie die Kennzahlen
          nicht optisch überstrahlen. */}
      <div className="glass rounded-3xl p-4">
        <p className="mb-2 text-xs text-muted">
          {t('measurements.hot_water_wait.result.reuseTitle')}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {reuse.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}
