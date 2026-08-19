import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Beleuchtungs-Checks: jährliche Stromeinsparung beim Umstieg auf
 * LED, mit Aufschlüsselung (Lampen, kWh) und Tipp.
 */
export function LightingResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const saving = result.primaryValue
  const annualKwh = result.details?.annualKwh ?? 0
  const totalBulbs = result.details?.totalBulbs ?? 0

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        icon={Lightbulb}
        value={numFmt.format(saving)}
        unit="€/Jahr"
        badgeLabel={t(`measurements.lighting.result.ratings.${result.rating}`)}
        summary={t(`measurements.lighting.result.summary.${result.rating}`, { count: totalBulbs })}
      />

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
