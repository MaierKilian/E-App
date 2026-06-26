import { useTranslation } from 'react-i18next'
import { Snowflake, Eye, PencilLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEP_ICONS: LucideIcon[] = [Snowflake, Eye, PencilLine]

/** Intro des Gefrierschrank-Checks: kompakte 1-2-3-Anleitung. */
export function FreezerIntro() {
  const { t } = useTranslation()
  const steps = t('measurements.freezer.intro.steps', { returnObjects: true }) as string[]

  return (
    <div className="space-y-3">
      <div className="glass rounded-3xl p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.freezer.intro.stepsTitle')}
        </h3>
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Snowflake
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-foreground">{step}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
