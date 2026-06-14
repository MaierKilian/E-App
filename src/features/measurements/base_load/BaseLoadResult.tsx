import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Gauge, ArrowRight } from 'lucide-react'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Grundlast-Checks: Grundlast in Watt mit Ampel und grober
 * €/kWh-Orientierung (kein Sparwert). Bei auffälliger Grundlast wird zum
 * Standby-Check verlinkt, der die Verursacher findet und beziffert.
 */
export function BaseLoadResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const color = RATING_COLOR[result.rating]
  const watts = result.primaryValue
  const annualKwh = result.details?.annualKwh ?? 0
  const annualEur = result.details?.annualEur ?? 0
  const showFunnel = result.rating !== 'good'

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: `color-mix(in srgb, ${color} 7%, transparent)` }}
        />
        <div className="relative flex flex-col items-center gap-2 py-1 text-center">
          <span
            className="grid h-12 w-12 place-items-center rounded-2xl"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          >
            <Gauge className="h-6 w-6" />
          </span>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {numFmt.format(watts)} <span className="text-lg font-semibold text-muted">W</span>
          </p>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
            }}
          >
            {t(`measurements.base_load.result.ratings.${result.rating}`)}
          </span>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {t(`measurements.base_load.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

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
