import { useTranslation } from 'react-i18next'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'

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
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${RATING_COLOR[result.rating]} 7%, transparent)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-2 py-1 text-center">
          {fixture && (
            <span className="text-xs font-medium text-muted">
              {t(`measurements.hot_water_wait.fixtures.${fixture}`)}
            </span>
          )}
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tabular-nums text-foreground">{nf(seconds)}</span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.hot_water_wait.result.secondsUnit')}
            </span>
          </div>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color: RATING_COLOR[result.rating],
              backgroundColor: `color-mix(in srgb, ${RATING_COLOR[result.rating]} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${RATING_COLOR[result.rating]} 32%, transparent)`,
            }}
          >
            {t(`measurements.hot_water_wait.result.ratings.${result.rating}`)}
          </span>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {t('measurements.hot_water_wait.result.explanation', {
              seconds: nf(seconds),
              liters: nf(litersPerDraw, 1),
            })}
          </p>
        </div>
      </div>

      {/* Kennzahlen */}
      <div className="grid grid-cols-3 gap-2">
        <MiniTile
          label={t('measurements.hot_water_wait.result.perDraw')}
          value={`${nf(litersPerDraw, 1)} L`}
        />
        <MiniTile
          label={t('measurements.hot_water_wait.result.perYear')}
          value={`${nf(litersPerYear)} L`}
        />
        <MiniTile
          label={t('measurements.hot_water_wait.result.savingYear')}
          value={`≈ ${nf(yearlySaving)} €`}
        />
      </div>

      {/* Wiederverwendungs-Ideen */}
      <div className="glass rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.hot_water_wait.result.reuseTitle')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {reuse.map((label) => (
            <Chip key={label} label={label} />
          ))}
        </div>
      </div>
    </div>
  )
}
