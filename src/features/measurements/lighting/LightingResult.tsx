import { useTranslation } from 'react-i18next'
import { Lightbulb, CheckCircle2 } from 'lucide-react'
import { ResultHero } from '../ResultHero'
import { displaySavingEur, savingRange } from '../savingsDisplay'
import { MAX_PAYBACK_MONTHS } from './lighting'
import type { ResultProps } from '../runnerTypes'

/**
 * Ergebnis des Beleuchtungs-Checks.
 *
 * Die Hauptzahl folgt derselben Regel wie überall in der App (siehe
 * `savingsDisplay.ts`): Ein Euro-Betrag erscheint nur, wenn die Nutzung bewusst
 * angegeben wurde **und** der Betrag über der Anzeigeschwelle liegt – dann als
 * Bereich, nie als Punktwert. Sonst steht dort die gezählte Größe.
 *
 * Dazu die Zahl, die die eigentliche Frage beantwortet: was der Tausch kostet
 * und ab wann er sich getragen hat. Die Bruttoersparnis allein („6 €/Jahr")
 * wirkt kleiner als die Entscheidung, die dahintersteht.
 */
export function LightingResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const details = result.details ?? {}
  const annualKwh = details.annualKwh ?? 0
  const totalBulbs = details.totalBulbs ?? 0
  const investEur = details.investEur ?? 0
  const paybackMonths = details.paybackMonths
  const estimated = (details.savingEstimated ?? 0) === 1

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const hoursFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  const shownEur = estimated ? undefined : displaySavingEur(result.primaryValue)
  const range = shownEur !== undefined ? savingRange(result.primaryValue) : undefined

  // Nichts zu tauschen: ein abgeschlossener Zustand, keine Null-Meldung.
  if (totalBulbs === 0) {
    return (
      <div className="space-y-4">
        <ResultHero
          rating="good"
          icon={CheckCircle2}
          badgeLabel={t('measurements.lighting.result.doneBadge')}
          summary={t('measurements.lighting.result.doneSummary')}
        />
        <div className="glass rounded-3xl p-4 text-sm text-foreground">
          {t('measurements.lighting.result.doneTip')}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        icon={range ? undefined : Lightbulb}
        value={
          range
            ? t('measurements.lighting.result.rangeValue', {
                low: numFmt.format(range.low),
                high: numFmt.format(range.high),
              })
            : numFmt.format(annualKwh)
        }
        unit={range ? t('measurements.lighting.result.perYear') : 'kWh/Jahr'}
        badgeLabel={t(`measurements.lighting.result.ratings.${result.rating}`)}
        summary={t(`measurements.lighting.result.summary.${result.rating}`, { count: totalBulbs })}
      />

      <div className="glass rounded-3xl p-4">
        <p className="text-sm font-semibold text-foreground">
          {paybackMonths !== undefined && paybackMonths <= MAX_PAYBACK_MONTHS
            ? t('measurements.lighting.result.payback', {
                invest: numFmt.format(investEur),
                months: paybackMonths,
              })
            : t('measurements.lighting.result.paybackSlow', {
                invest: numFmt.format(investEur),
              })}
        </p>
        <p className="mt-1 text-xs text-muted">
          {t('measurements.lighting.result.paybackHint', { count: totalBulbs })}
        </p>
      </div>

      {!range && (
        <div className="glass rounded-3xl p-4 text-xs text-muted">
          {estimated
            ? t('measurements.lighting.result.noticeEstimated')
            : t('measurements.lighting.result.noticeSmall')}
        </div>
      )}

      <div className="glass rounded-3xl p-4 text-sm text-foreground">
        {t(`measurements.lighting.result.tip.${result.rating}`)}
        <p className="mt-2 text-[11px] text-muted">
          {t('measurements.lighting.result.assumptions', {
            price: numFmt.format(details.workPriceCt ?? 0),
            hours: hoursFmt.format(details.hoursPerDay ?? 0),
          })}
        </p>
      </div>
    </div>
  )
}
