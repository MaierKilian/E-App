import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/Card'
import { InfoButton } from '@/components/ui/InfoButton'
import { Stepper } from '@/components/ui/Stepper'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import { calcShowerhead } from './showerhead'
import type { RunProps } from '../runnerTypes'

/**
 * Durchführungs-Phase des Duschkopf-Tests: Eingabe von Litern (0,5er-Schritte)
 * und Sekunden. Robuste Zahleneingabe inkl. Division-durch-0-Schutz: Bei
 * seconds <= 0 wird nicht ausgewertet, sondern ein Hinweis gezeigt.
 */
export function ShowerheadRun({ onEvaluate }: RunProps) {
  const { t } = useTranslation()
  const persons = useOnboardingStore((s) => s.data.personsCount)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [liters, setLiters] = useState(1)
  const [seconds, setSeconds] = useState(10)

  const canEvaluate = liters > 0 && seconds > 0

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcShowerhead({ liters, seconds, persons, workPriceCt })
    onEvaluate({
      result: {
        id: 'showerhead',
        rating: calc.rating,
        primaryValue: calc.flowLpm,
        completedAt: new Date().toISOString(),
        details: { liters, seconds, yearlyCost: calc.yearlyCost, yearlySaving: calc.yearlySaving },
      },
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('measurements.showerhead.run.litersLabel')}</span>
            <InfoButton text={t('measurements.showerhead.run.litersInfo')} />
          </div>
          <Stepper
            value={liters}
            min={0.5}
            max={20}
            step={0.5}
            onChange={setLiters}
            unit={t('measurements.showerhead.run.litersUnit')}
          />
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{t('measurements.showerhead.run.secondsLabel')}</span>
            <InfoButton text={t('measurements.showerhead.run.secondsInfo')} />
          </div>
          <Stepper
            value={seconds}
            min={1}
            max={120}
            step={1}
            onChange={setSeconds}
            unit={t('measurements.showerhead.run.secondsUnit')}
          />
        </div>
      </Card>

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
