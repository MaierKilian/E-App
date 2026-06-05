import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import type { OnboardingData, HeatGeneratorType, HotWaterType } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
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

const PV_OPTIONS = ['yes', 'no', 'planned'] as const
type PVOption = (typeof PV_OPTIONS)[number]

export function Step4Heating({ data, onChange, detailed = false }: Props) {
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
    <div className="space-y-5">
      <div className="space-y-3">
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step4.heatGenerators')}
          <InfoButton text={t('info.heatGenerators')} />
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
        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {t('onboarding.step4.hotWater')}
          <InfoButton text={t('info.hotWater')} />
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

      {detailed && (
        <>
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {t('onboarding.step4.hasPV')}
              <InfoButton text={t('info.pv')} />
            </label>
            <div className="flex flex-wrap gap-2">
              {PV_OPTIONS.map((option) => (
                <SelectChip
                  key={option}
                  label={t(`onboarding.step4.pvOptions.${option}`)}
                  selected={data.hasPV === option}
                  onClick={() => onChange({ hasPV: option as PVOption })}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {t('onboarding.step4.hasExtraFireplace')}
              <InfoButton text={t('info.fireplace')} />
            </label>
            <div className="flex gap-2">
              <SelectChip
                label={t('onboarding.step4.yes')}
                selected={data.hasExtraFireplace === true}
                onClick={() => onChange({ hasExtraFireplace: true })}
              />
              <SelectChip
                label={t('onboarding.step4.no')}
                selected={data.hasExtraFireplace === false}
                onClick={() => onChange({ hasExtraFireplace: false })}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
