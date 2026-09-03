import { useTranslation } from 'react-i18next'
import { MetricTiles } from '../MetricTiles'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import { CalculationNote } from '../CalculationNote'
import { CALIBRATION_PERSONS, FIXTURES, type FixtureType } from './hotWaterWait'

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

  // Der Durchfluss steht seit September 2026 im Ergebnis. Altergebnisse tragen
  // ihn nicht und fallen auf den Richtwert der Entnahmestelle zurück – genau
  // den, mit dem sie gerechnet wurden.
  const fixtureMeta = fixture ? FIXTURES[fixture as FixtureType] : undefined
  const flowLpm = result.details?.flowLpm ?? fixtureMeta?.flowLpm ?? 0
  const flowMeasured = (result.details?.flowMeasured ?? 0) === 1
  const drawsPerDay = fixtureMeta?.drawsPerPersonPerDay

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

      <CalculationNote
        formula={t('measurements.hot_water_wait.result.calculation.formula')}
        rows={[
          {
            label: t('measurements.hot_water_wait.result.calculation.seconds'),
            value: `${nf(seconds)} s`,
            measured: true,
          },
          {
            label: t('measurements.hot_water_wait.result.calculation.flow'),
            value: `${nf(flowLpm, 1)} l/min`,
            // Der Unterschied, um den es in dieser Etappe geht: Kommt die Zahl
            // aus dem Duschkopf-Check oder aus der Tabelle?
            measured: flowMeasured,
          },
          ...(drawsPerDay !== undefined
            ? [
                {
                  label: t('measurements.hot_water_wait.result.calculation.draws'),
                  value: nf(drawsPerDay, 2),
                },
              ]
            : []),
        ]}
        note={t('measurements.hot_water_wait.result.calculation.note', {
          persons: CALIBRATION_PERSONS,
        })}
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
