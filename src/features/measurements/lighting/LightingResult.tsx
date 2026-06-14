import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Beleuchtungs-Checks: jährliche Stromeinsparung beim Umstieg auf
 * LED, mit Aufschlüsselung (Lampen, kWh) und Tipp.
 */
export function LightingResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const color = RATING_COLOR[result.rating]
  const saving = result.primaryValue
  const annualKwh = result.details?.annualKwh ?? 0
  const totalBulbs = result.details?.totalBulbs ?? 0

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
            <Lightbulb className="h-6 w-6" />
          </span>
          <p className="text-3xl font-bold tabular-nums text-foreground">
            {numFmt.format(saving)} <span className="text-lg font-semibold text-muted">€/Jahr</span>
          </p>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
            }}
          >
            {t(`measurements.lighting.result.ratings.${result.rating}`)}
          </span>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {t(`measurements.lighting.result.summary.${result.rating}`, {
              count: totalBulbs,
            })}
          </p>
        </div>
      </div>

      {totalBulbs > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-3xl p-4 text-center">
            <p className="text-xs text-muted">{t('measurements.lighting.result.bulbsLabel')}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {numFmt.format(totalBulbs)}
            </p>
          </div>
          <div className="glass rounded-3xl p-4 text-center">
            <p className="text-xs text-muted">{t('measurements.lighting.result.kwhLabel')}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {numFmt.format(annualKwh)} kWh
            </p>
          </div>
        </div>
      )}

      <div className="glass rounded-3xl p-4 text-sm text-foreground">
        {t(`measurements.lighting.result.tip.${result.rating}`)}
      </div>
    </div>
  )
}
