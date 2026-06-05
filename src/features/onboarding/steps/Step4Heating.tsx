import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import type { OnboardingData, HeatGeneratorType, HotWaterType } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const HEAT_GENERATORS: HeatGeneratorType[] = [
  'gas_boiler',
  'oil_boiler',
  'heat_pump',
  'wood_stove',
  'pellets',
  'solar_thermal',
  'unknown',
]

const HOT_WATER_TYPES: HotWaterType[] = [
  'same_as_heating',
  'separate_system',
  'partially_combined',
  'unknown',
]

export function Step4Heating({ data, onChange }: Props) {
  const { t } = useTranslation()

  function toggleGenerator(type: HeatGeneratorType) {
    const current = data.heatGenerators
    if (current.includes(type)) {
      onChange({ heatGenerators: current.filter((g) => g !== type) })
    } else {
      onChange({ heatGenerators: [...current, type] })
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step4.heatGenerators')}
        </label>
        <div className="flex flex-wrap gap-2">
          {HEAT_GENERATORS.map((type) => (
            <SelectChip
              key={type}
              label={t(`onboarding.step4.generators.${type}`)}
              selected={data.heatGenerators.includes(type)}
              onClick={() => toggleGenerator(type)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          {t('onboarding.step4.hotWater')}
        </label>
        <div className="flex flex-wrap gap-2">
          {HOT_WATER_TYPES.map((type) => (
            <SelectChip
              key={type}
              label={t(`onboarding.step4.hotWaterOptions.${type}`)}
              selected={data.hotWaterType === type}
              onClick={() => onChange({ hotWaterType: type })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
