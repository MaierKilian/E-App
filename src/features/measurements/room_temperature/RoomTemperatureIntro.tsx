import { useTranslation } from 'react-i18next'
import { Thermometer, Droplets, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEP_ICONS: LucideIcon[] = [Thermometer, Droplets, Wind]

/** Intro des Raumklima-Checks: kompakte 1-2-3-Anleitung. */
export function RoomTemperatureIntro() {
  const { t } = useTranslation()
  const steps = t('measurements.room_temperature.intro.steps', {
    returnObjects: true,
  }) as string[]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {t('measurements.categories.heating')}
        </p>
        <h2 className="mt-1 text-xl font-bold text-foreground">
          {t('measurements.room_temperature.title')}
        </h2>
      </div>

      <div className="glass rounded-3xl p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
          {t('measurements.room_temperature.intro.stepsTitle')}
        </h3>
        <ol className="space-y-4">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Thermometer
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
