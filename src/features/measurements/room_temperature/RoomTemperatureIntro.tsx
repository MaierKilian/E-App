import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Thermometer, Droplets, Wind, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { IntroHeroImage } from '../IntroHeroImage'

const STEP_ICONS: LucideIcon[] = [Thermometer, Droplets, Wind]

/** Intro des Raumklima-Checks: Hero-Illustration + kompakte 1-2-3-Anleitung. */
export function RoomTemperatureIntro() {
  const { t } = useTranslation()
  const steps = t('measurements.room_temperature.intro.steps', {
    returnObjects: true,
  }) as string[]
  const details = t('measurements.room_temperature.intro.details', {
    returnObjects: true,
  }) as string[]
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <div className="space-y-3">
      <IntroHeroImage
        srcLight="measurements/room-climate-light.webp"
        srcDark="measurements/room-climate-dark.webp"
        label={t('measurements.room_temperature.intro.imageAlt')}
        ratio="941 / 875"
        widthClassName="max-w-[248px]"
      />

      <div className="glass rounded-3xl p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
            {t('measurements.room_temperature.intro.stepsTitle')}
          </h3>
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <Info className="h-3.5 w-3.5" />
            {t('measurements.room_temperature.intro.detailsButton')}
          </button>
        </div>
        <ol className="space-y-2">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] ?? Thermometer
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

      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title={t('measurements.room_temperature.intro.detailsTitle')}
      >
        <ul className="space-y-3">
          {details.map((tip, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  )
}
