import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/Slider'
import { Stepper } from '@/components/ui/Stepper'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, BuildingType, WindowAge } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const BUILDING_TYPES: BuildingType[] = ['apartment', 'house']
const WINDOW_AGES: WindowAge[] = ['before_1980', '1980_2000', '2000_2015', 'after_2015', 'unknown']

export function Step2Building({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()
  const [areaText, setAreaText] = useState(String(data.livingArea))

  function handleAreaBlur() {
    const parsed = Number.parseInt(areaText, 10)
    const clamped = Number.isFinite(parsed)
      ? Math.max(10, Math.min(1000, parsed))
      : data.livingArea
    setAreaText(String(clamped))
    onChange({ livingArea: clamped })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step2.buildingYear')}
          <InfoButton text={t('info.buildingYear')} />
        </label>
        <Slider
          value={data.buildingYear}
          min={1900}
          max={2025}
          onChange={(v) => onChange({ buildingYear: v })}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step2.buildingType')}
        </label>
        <div className="flex gap-3">
          {BUILDING_TYPES.map((type) => (
            <SelectChip
              key={type}
              label={t(`onboarding.step2.${type}`)}
              selected={data.buildingType === type}
              onClick={() => onChange({ buildingType: type })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step2.livingArea')}
          <InfoButton text={t('info.livingArea')} />
        </label>
        <div className="relative">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={1000}
            value={areaText}
            onChange={(e) => {
              setAreaText(e.target.value)
              const parsed = Number.parseInt(e.target.value, 10)
              if (Number.isFinite(parsed)) onChange({ livingArea: parsed })
            }}
            onBlur={handleAreaBlur}
            className="focus-ring w-full px-4 py-3 pr-12 rounded-2xl glass text-foreground tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            m²
          </span>
        </div>
      </div>

      {detailed && (
        <>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-medium text-foreground">
              {t('onboarding.step2.floors')}
            </label>
            <Stepper
              value={data.floors}
              min={1}
              max={6}
              onChange={(v) => onChange({ floors: v })}
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {t('onboarding.step2.windowAge')}
              <InfoButton text={t('info.windowAge')} />
            </label>
            <div className="flex flex-wrap gap-2">
              {WINDOW_AGES.map((age) => (
                <SelectChip
                  key={age}
                  label={t(`onboarding.step2.windowAgeOptions.${age}`)}
                  selected={data.windowAge === age}
                  onClick={() => onChange({ windowAge: age })}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
