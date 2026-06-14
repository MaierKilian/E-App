import { useTranslation } from 'react-i18next'
import {
  Flame,
  Fuel,
  Fan,
  TreePine,
  Wheat,
  Sun,
  HelpCircle,
  Droplets,
  Blend,
  Check,
  X,
  CalendarClock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
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
const GENERATOR_ICONS: Record<HeatGeneratorType, LucideIcon> = {
  gas_boiler: Flame,
  oil_boiler: Fuel,
  heat_pump: Fan,
  wood_stove: TreePine,
  pellets: Wheat,
  solar_thermal: Sun,
  unknown: HelpCircle,
}

const HOT_WATER_TYPES: HotWaterType[] = [
  'same_as_heating',
  'separate_system',
  'partially_combined',
  'unknown',
]
const HOT_WATER_ICONS: Record<HotWaterType, LucideIcon> = {
  same_as_heating: Flame,
  separate_system: Droplets,
  partially_combined: Blend,
  unknown: HelpCircle,
}

const PV_OPTIONS = ['yes', 'no', 'planned'] as const
type PVOption = (typeof PV_OPTIONS)[number]
const PV_ICONS: Record<PVOption, LucideIcon> = {
  yes: Check,
  no: X,
  planned: CalendarClock,
}

export function Step4Heating({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

  function toggleGenerator(type: HeatGeneratorType) {
    const current = data.heatGenerators
    onChange({
      heatGenerators: current.includes(type)
        ? current.filter((g) => g !== type)
        : [...current, type],
    })
  }

  return (
    <div className="space-y-6">
      <Field
        title={t('onboarding.step4.heatGenerators')}
        info={t('info.heatGenerators')}
        hint={t('onboarding.step4.generatorsHint')}
      >
        <div className="flex flex-wrap gap-2">
          {HEAT_GENERATORS.map((type) => (
            <OptionChip
              key={type}
              icon={GENERATOR_ICONS[type]}
              label={t(`onboarding.step4.generators.${type}`)}
              selected={data.heatGenerators.includes(type)}
              onClick={() => toggleGenerator(type)}
            />
          ))}
        </div>
      </Field>

      <Field
        title={t('onboarding.step4.hotWater')}
        info={t('info.hotWater')}
        hint={t('onboarding.step4.hotWaterHint')}
      >
        <div className="flex flex-wrap gap-2">
          {HOT_WATER_TYPES.map((type) => (
            <OptionChip
              key={type}
              icon={HOT_WATER_ICONS[type]}
              label={t(`onboarding.step4.hotWaterOptions.${type}`)}
              selected={data.hotWaterType === type}
              onClick={() => onChange({ hotWaterType: type })}
            />
          ))}
        </div>
      </Field>

      {detailed && (
        <>
          <Field title={t('onboarding.step4.hasPV')} info={t('info.pv')}>
            <div className="flex flex-wrap gap-2">
              {PV_OPTIONS.map((option) => (
                <OptionChip
                  key={option}
                  icon={PV_ICONS[option]}
                  label={t(`onboarding.step4.pvOptions.${option}`)}
                  selected={data.hasPV === option}
                  onClick={() => onChange({ hasPV: option as PVOption })}
                />
              ))}
            </div>
          </Field>

          <Field title={t('onboarding.step4.hasExtraFireplace')} info={t('info.fireplace')}>
            <div className="flex gap-2">
              <OptionChip
                icon={Check}
                label={t('onboarding.step4.yes')}
                selected={data.hasExtraFireplace === true}
                onClick={() => onChange({ hasExtraFireplace: true })}
              />
              <OptionChip
                icon={X}
                label={t('onboarding.step4.no')}
                selected={data.hasExtraFireplace === false}
                onClick={() => onChange({ hasExtraFireplace: false })}
              />
            </div>
          </Field>
        </>
      )}
    </div>
  )
}
