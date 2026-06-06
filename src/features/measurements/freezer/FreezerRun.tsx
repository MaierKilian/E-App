import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTariffStore } from '@/store/tariffStore'
import { Stepper } from '@/components/ui/Stepper'
import { SelectChip } from '@/components/ui/SelectChip'
import { calcFreezer } from './freezer'
import type { FrostLevel } from './freezer'
import type { RunProps } from '../runnerTypes'

const FROST_LEVELS: FrostLevel[] = ['none', 'light', 'heavy']

const TEMP_MIN = -30
const TEMP_MAX = -10
const TEMP_DEFAULT = -18
const TEMP_STEP = 1

/**
 * Durchführungs-Phase des Gefrierschrank-Checks: Vereisungsgrad als
 * Chip-Auswahl (Pflicht), Innentemperatur optional über einen Toggle.
 */
export function FreezerRun({ onEvaluate }: RunProps) {
  const { t } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [frost, setFrost] = useState<FrostLevel>('none')
  const [tempOn, setTempOn] = useState(false)
  const [temperature, setTemperature] = useState(TEMP_DEFAULT)

  function handleEvaluate() {
    const calc = calcFreezer({
      frost,
      temperature: tempOn ? temperature : undefined,
      workPriceCt,
    })
    const details: Record<string, number> = {
      frost: FROST_LEVELS.indexOf(frost),
      avoidableCost: calc.avoidableCost,
    }
    if (tempOn) details.temperature = temperature
    onEvaluate({
      result: {
        id: 'freezer',
        rating: calc.rating,
        primaryValue: calc.avoidableCost,
        unit: '€/Jahr',
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Vereisung */}
      <div className="glass rounded-3xl p-5">
        <span className="font-medium text-foreground">
          {t('measurements.freezer.run.frostLabel')}
        </span>
        <div className="mt-3 flex flex-wrap gap-2">
          {FROST_LEVELS.map((level) => (
            <SelectChip
              key={level}
              label={t(`measurements.freezer.run.frostOptions.${level}`)}
              selected={frost === level}
              onClick={() => setFrost(level)}
            />
          ))}
        </div>
      </div>

      {/* Temperatur (optional) */}
      <div className="glass rounded-3xl p-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t('measurements.freezer.run.tempToggle')}
          </span>
          <input
            type="checkbox"
            checked={tempOn}
            onChange={(e) => setTempOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        {tempOn && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Stepper
              value={temperature}
              min={TEMP_MIN}
              max={TEMP_MAX}
              step={TEMP_STEP}
              onChange={setTemperature}
            />
            <div className="flex min-w-20 items-baseline justify-center gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">{temperature}</span>
              <span className="text-sm text-muted">
                {t('measurements.freezer.run.tempUnit')}
              </span>
            </div>
          </div>
        )}
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
