import { useTranslation } from 'react-i18next'
import { Beaker, Timer, PencilLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { IntroHeroVideo } from '../IntroHeroVideo'

const STEP_ICONS: LucideIcon[] = [Beaker, Timer, PencilLine]

/** Minimaler Erklär-Schritt des Duschkopf-Tests: kompakte 1-2-3-Anleitung. */
export function ShowerheadIntro() {
  const { t } = useTranslation()
  const steps = t('measurements.showerhead.intro.steps', { returnObjects: true }) as string[]

  return (
    <div className="space-y-4">
      <IntroHeroVideo
        src="measurements/showerhead.mp4"
        label={t('measurements.showerhead.intro.videoAlt')}
      />

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t('measurements.categories.hot_water')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">
          {t('measurements.showerhead.title')}
        </h2>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.showerhead.intro.stepsTitle')}
        </h3>
        <ol className="space-y-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Beaker
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-foreground">{step}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
