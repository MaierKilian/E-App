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
import { Slider } from '@/components/ui/Slider'
import { Field } from '@/components/ui/Field'
// OptionChip wird nur noch für das PV-Feld verwendet
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

export function Step4Heating({ data, onChange }: Props) {
  const { t } = useTranslation()
  const currentYear = new Date().getFullYear()
  const yearMin = data.buildingYear > 0 ? data.buildingYear : 1850
  // Vorbelegung in der Mitte zwischen Baujahr und heute: naeher an der Realitaet
  // als beides zu unterstellen, und der Slider laesst sich von dort schnell
  // in beide Richtungen ziehen.
  const defaultGeneratorYear = Math.round((yearMin + currentYear) / 2)

  function toggleGenerator(type: HeatGeneratorType) {
    const current = data.heatGenerators
    const isRemoving = current.includes(type)
    const years = { ...(data.heatGeneratorYears ?? {}) }
    // Wird der Erzeuger abgewaehlt, verschwindet sein Baujahr mit ihm – sonst
    // bliebe eine Angabe zu einer Heizung stehen, die es nicht mehr gibt.
    if (isRemoving) delete years[type]
    onChange({
      heatGenerators: isRemoving ? current.filter((g) => g !== type) : [...current, type],
      heatGeneratorYears: years,
    })
  }

  function setGeneratorYear(type: HeatGeneratorType, year: number | undefined) {
    const years = { ...(data.heatGeneratorYears ?? {}) }
    if (year === undefined) delete years[type]
    else years[type] = year
    onChange({ heatGeneratorYears: years })
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
            const year = data.heatGeneratorYears?.[type]
            return (
              <div key={type} className={isLonely ? 'col-span-2' : undefined}>
                <button
                  type="button"
                  onClick={() => toggleGenerator(type)}
                  aria-pressed={selected}
                  className={`flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-sm font-medium transition-[transform,background-color,box-shadow] active:scale-[0.97] ${
                    selected
                      ? 'border border-primary bg-primary text-primary-foreground shadow-[0_4px_14px_color-mix(in_srgb,var(--primary)_30%,transparent)]'
                      : 'glass text-foreground'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${selected ? '' : 'text-muted'}`} />
                  <span>{t(`onboarding.step4.generators.${type}`)}</span>
                </button>

                {/* Baujahr klappt unter dem gewaehlten Erzeuger auf – dasselbe
                    Muster wie die Modelltypen bei den Messgeraeten. Bei
                    mehreren Erzeugern waere ein einzelnes Jahr schlicht falsch.
                    „Weiss nicht" ist der Normalfall und deshalb der
                    Ausgangszustand, kein extra Knopf. */}
                {selected && type !== 'unknown' && (
                  <div className="animate-panel-in mt-1.5 rounded-2xl bg-surface-2/50 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted">
                        {t('onboarding.step4.generatorYear')}
                      </span>
                      {year === undefined ? (
                        <button
                          type="button"
                          onClick={() => setGeneratorYear(type, defaultGeneratorYear)}
                          className="focus-ring rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-primary"
                        >
                          {t('onboarding.step4.generatorYearAdd')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setGeneratorYear(type, undefined)}
                          className="focus-ring rounded-full px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:text-foreground"
                        >
                          {t('onboarding.step4.generatorYearUnknown')}
                        </button>
                      )}
                    </div>
                    {year !== undefined && (
                      <div className="mt-2">
                        <Slider
                          value={year}
                          min={yearMin}
                          max={currentYear}
                          onChange={(v) => setGeneratorYear(type, v)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
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

      {/* PV steht auch im Schnellstart: nicht als Freischaltung – die entfiel
          mit dem Entsperren der Zähler –, sondern damit die Erinnerung
          entstehen kann, den Erzeugungszähler anzulegen. */}
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

    </div>
  )
}
