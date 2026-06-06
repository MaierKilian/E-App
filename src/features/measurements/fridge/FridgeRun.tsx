import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTariffStore } from '@/store/tariffStore'
import { Stepper } from '@/components/ui/Stepper'
import { calcFridge } from './fridge'
import type { RunProps } from '../runnerTypes'

const TEMP_MIN = 0
const TEMP_MAX = 15
const TEMP_DEFAULT = 5
const TEMP_STEP = 0.5

/** Durchführungs-Phase des Kühlschrank-Checks: Innentemperatur per Stepper. */
export function FridgeRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [temperature, setTemperature] = useState(TEMP_DEFAULT)

  const fmtTemp = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(temperature)

  function handleEvaluate() {
    const calc = calcFridge({ temperature, workPriceCt })
    onEvaluate({
      result: {
        id: 'fridge',
        rating: calc.rating,
        primaryValue: temperature,
        unit: '°C',
        completedAt: new Date().toISOString(),
        details: { temperature, yearlySaving: calc.yearlySaving },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t('measurements.fridge.run.tempLabel')}
          </span>
          <span className="text-xs text-muted">
            {t('measurements.fridge.run.tempStandard')}
          </span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Stepper
            value={temperature}
            min={TEMP_MIN}
            max={TEMP_MAX}
            step={TEMP_STEP}
            onChange={setTemperature}
          />
          <div className="flex min-w-20 items-baseline justify-center gap-1">
            <span className="text-3xl font-bold tabular-nums text-foreground">{fmtTemp}</span>
            <span className="text-sm text-muted">
              {t('measurements.fridge.run.tempUnit')}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
