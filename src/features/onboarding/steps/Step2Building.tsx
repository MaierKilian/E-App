import { useTranslation } from 'react-i18next'
import { Slider } from '@/components/ui/Slider'
import { Stepper } from '@/components/ui/Stepper'
import { SelectChip } from '@/components/ui/SelectChip'
import type { OnboardingData, BuildingType } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const BUILDING_TYPES: BuildingType[] = ['apartment', 'house']

export function Step2Building({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step2.buildingYear')}
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

      <div className="flex items-center justify-between gap-4">
        <label className="text-sm font-medium text-foreground">
          {t('onboarding.step2.livingArea')}
        </label>
        <Stepper
          value={data.livingArea}
          min={10}
          max={1000}
          onChange={(v) => onChange({ livingArea: v })}
        />
      </div>
    </div>
  )
}
