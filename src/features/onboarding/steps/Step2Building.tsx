import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Home } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Slider } from '@/components/ui/Slider'
import { Stepper } from '@/components/ui/Stepper'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import type { OnboardingData, BuildingType, WindowAge } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const BUILDING_TYPES: BuildingType[] = ['apartment', 'house']
const BUILDING_ICONS: Record<BuildingType, LucideIcon> = {
  apartment: Building2,
  house: Home,
}
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
    <div className="space-y-6">
      <Field
        title={t('onboarding.step2.buildingYear')}
        info={t('info.buildingYear')}
        hint={t('onboarding.step2.buildingYearHint')}
      >
        <Slider
          value={data.buildingYear}
          min={1850}
          max={2025}
          onChange={(v) => onChange({ buildingYear: v })}
        />
      </Field>

      <Field title={t('onboarding.step2.buildingType')}>
        <div className="flex gap-2">
          {BUILDING_TYPES.map((type) => (
            <OptionChip
              key={type}
              icon={BUILDING_ICONS[type]}
              label={t(`onboarding.step2.${type}`)}
              selected={data.buildingType === type}
              onClick={() => onChange({ buildingType: type })}
            />
          ))}
        </div>
      </Field>

      <Field
        title={t('onboarding.step2.livingArea')}
        info={t('info.livingArea')}
        hint={t('onboarding.step2.livingAreaHint')}
      >
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
            className="focus-ring w-full rounded-2xl glass px-4 py-3 pr-12 text-foreground tabular-nums"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted">
            m²
          </span>
        </div>
      </Field>

      {detailed && (
        <>
          <div className="flex items-center justify-between gap-4">
            <label className="text-sm font-semibold text-foreground">
              {t('onboarding.step2.floors')}
            </label>
            <Stepper value={data.floors} min={1} max={6} onChange={(v) => onChange({ floors: v })} />
          </div>

          <Field title={t('onboarding.step2.windowAge')} info={t('info.windowAge')}>
            <div className="flex flex-wrap gap-2">
              {WINDOW_AGES.map((age) => (
                <OptionChip
                  key={age}
                  label={t(`onboarding.step2.windowAgeOptions.${age}`)}
                  selected={data.windowAge === age}
                  onClick={() => onChange({ windowAge: age })}
                />
              ))}
            </div>
          </Field>
        </>
      )}
    </div>
  )
}
