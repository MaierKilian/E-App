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
// OptionChip wird nur noch für die PV/Kamin-Felder verwendet
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
        <div className="grid grid-cols-2 gap-2 items-start">
          {HEAT_GENERATORS.map((type, i) => {
            const selected = data.heatGenerators.includes(type)
            const Icon = GENERATOR_ICONS[type]
            const isLonely = HEAT_GENERATORS.length % 2 === 1 && i === HEAT_GENERATORS.length - 1
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleGenerator(type)}
                aria-pressed={selected}
                className={`${isLonely ? 'col-span-2' : ''} flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition-[transform,background-color,box-shadow] active:scale-[0.97] ${
                  selected
                    ? 'border border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
                    : 'glass text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? '' : 'text-muted'}`} />
                <span>{t(`onboarding.step4.generators.${type}`)}</span>
              </button>
            )
          })}
        </div>
      </Field>

      <Field
        title={t('onboarding.step4.hotWater')}
        info={t('info.hotWater')}
        hint={t('onboarding.step4.hotWaterHint')}
      >
        <div className="grid grid-cols-2 gap-2 items-start">
          {HOT_WATER_TYPES.map((type, i) => {
            const selected = data.hotWaterType === type
            const Icon = HOT_WATER_ICONS[type]
            const isLonely = HOT_WATER_TYPES.length % 2 === 1 && i === HOT_WATER_TYPES.length - 1
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ hotWaterType: type })}
                aria-pressed={selected}
                className={`${isLonely ? 'col-span-2' : ''} flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition-[transform,background-color,box-shadow] active:scale-[0.97] ${
                  selected
                    ? 'border border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
                    : 'glass text-foreground'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${selected ? '' : 'text-muted'}`} />
                <span>{t(`onboarding.step4.hotWaterOptions.${type}`)}</span>
              </button>
            )
          })}
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
