import { useTranslation } from 'react-i18next'
import { Sofa, Check } from 'lucide-react'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Möbel-Abstands-Checks: qualitative 4-stufige Einordnung mit
 * konkreten, an die Wärmeübergabe angepassten Empfehlungen. Kein €-Wert.
 */
export function FurnitureSpacingResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const underfloor = (result.details?.underfloor ?? 0) === 1
  const color = RATING_COLOR[result.rating]
  const tipsKey = underfloor ? 'underfloor' : 'radiator'
  const tips = t(`measurements.furniture_spacing.result.tips.${tipsKey}`, {
    returnObjects: true,
  }) as string[]

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
            <Sofa className="h-6 w-6" />
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{
              color,
              backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
            }}
          >
            {t(`measurements.furniture_spacing.result.ratings.${result.rating}`)}
          </span>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {t(`measurements.furniture_spacing.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      <div className="glass rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.furniture_spacing.result.tipsTitle')}
        </h3>
        <ul className="space-y-2.5">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-2.5 text-sm text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
