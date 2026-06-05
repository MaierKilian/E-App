import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'

/** Erklär-Phase des Duschkopf-Tests: was wird gemessen, was braucht man, Ablauf. */
export function ShowerheadIntro() {
  const { t } = useTranslation()
  const needs = t('measurements.showerhead.intro.needs', { returnObjects: true }) as string[]
  const steps = t('measurements.showerhead.intro.steps', { returnObjects: true }) as string[]

  return (
    <div className="space-y-4">
      <p className="text-muted">{t('measurements.showerhead.intro.lead')}</p>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('measurements.showerhead.intro.needsTitle')}
        </h2>
        <ul className="space-y-2.5">
          {needs.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('measurements.showerhead.intro.stepsTitle')}
        </h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="grid place-items-center w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold tabular-nums">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
