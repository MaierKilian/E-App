import { useTranslation } from 'react-i18next'
import { Thermometer, Ruler, Wind, Droplets, Plug, Ban, HelpCircle, ThermometerSun, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import { AffiliateRow } from '@/components/AffiliateCard'
import { getModelTypes, hasModelTypes } from '../instrumentOptions'
import { getAffiliateProducts } from '../affiliateProducts'
import type {
  OnboardingData,
  InstrumentType,
  InstrumentEntry,
  SmartHomeDevice,
  EnergyCostRange,
} from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const INSTRUMENT_TYPES: InstrumentType[] = [
  'temperature_sensor',
  'distance_meter',
  'co2_sensor',
  'humidity_sensor',
  'power_meter',
  'none',
  'unknown',
]
const INSTRUMENT_ICONS: Record<InstrumentType, LucideIcon> = {
  temperature_sensor: Thermometer,
  distance_meter: Ruler,
  co2_sensor: Wind,
  humidity_sensor: Droplets,
  power_meter: Plug,
  none: Ban,
  unknown: HelpCircle,
}

const SMART_HOME_DEVICES: SmartHomeDevice[] = ['smart_thermostat', 'smart_meter', 'smart_plugs', 'none']
const SMART_HOME_ICONS: Record<SmartHomeDevice, LucideIcon> = {
  smart_thermostat: ThermometerSun,
  smart_meter: Gauge,
  smart_plugs: Plug,
  none: Ban,
}
const ENERGY_COST_RANGES: EnergyCostRange[] = ['under_100', '100_200', '200_350', 'over_350', 'unknown']

/** Aufklappbares Detail-Panel je ausgewähltem Gerät: Subtypen + Empfehlung. */
function InstrumentPanel({
  type,
  selectedModels,
  onToggleModel,
}: {
  type: InstrumentType
  selectedModels: string[]
  onToggleModel: (model: string) => void
}) {
  const { t } = useTranslation()
  const models = getModelTypes(type)
  const products = getAffiliateProducts(type)

  return (
    <div className="animate-panel-in space-y-3 rounded-2xl glass p-3">
      {models.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted">{t('onboarding.step6.modelTypeLabel')}</p>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <SelectChip
                key={model}
                label={t(`onboarding.step6.modelTypes.${type}.${model}`)}
                selected={selectedModels.includes(model)}
                onClick={() => onToggleModel(model)}
                className="px-3 py-1.5"
              />
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && <AffiliateRow products={products} />}
    </div>
  )
}

export function Step6Instruments({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

  function getEntry(type: InstrumentType): InstrumentEntry | undefined {
    return data.instruments.find((i) => i.type === type)
  }

  function isSelected(type: InstrumentType) {
    return data.instruments.some((i) => i.type === type)
  }

  function toggleInstrument(type: InstrumentType) {
    // "none" und "unknown" sind exklusiv (heben jede andere Auswahl auf).
    if (type === 'none' || type === 'unknown') {
      onChange({ instruments: isSelected(type) ? [] : [{ type }] })
      return
    }
    const withoutExclusive = data.instruments.filter(
      (i) => i.type !== 'none' && i.type !== 'unknown',
    )
    if (withoutExclusive.some((i) => i.type === type)) {
      onChange({ instruments: withoutExclusive.filter((i) => i.type !== type) })
    } else {
      onChange({ instruments: [...withoutExclusive, { type }] })
    }
  }

  function toggleModel(type: InstrumentType, model: string) {
    onChange({
      instruments: data.instruments.map((i) => {
        if (i.type !== type) return i
        const current = i.modelTypes ?? []
        const updated = current.includes(model)
          ? current.filter((m) => m !== model)
          : [...current, model]
        return { ...i, modelTypes: updated }
      }),
    })
  }

  function toggleSmartHomeDevice(device: SmartHomeDevice) {
    const current = data.smartHomeDevices
    if (device === 'none') {
      onChange({ smartHomeDevices: current.includes('none') ? [] : ['none'] })
      return
    }
    const withoutNone = current.filter((d) => d !== 'none')
    if (withoutNone.includes(device)) {
      onChange({ smartHomeDevices: withoutNone.filter((d) => d !== device) })
    } else {
      onChange({ smartHomeDevices: [...withoutNone, device] })
    }
  }

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-1.5 text-sm text-muted">
        {t('onboarding.step6.subtitle')}
        <InfoButton text={t('info.instruments')} />
      </p>

      <div className="flex flex-wrap gap-2">
        {INSTRUMENT_TYPES.map((type) => (
          <OptionChip
            key={type}
            icon={INSTRUMENT_ICONS[type]}
            label={t(`onboarding.step6.instruments.${type}`)}
            selected={isSelected(type)}
            onClick={() => toggleInstrument(type)}
          />
        ))}
      </div>

      {/* Detail-Panels nur für ausgewählte Geräte mit Subtypen/Empfehlung. */}
      {INSTRUMENT_TYPES.filter((type) => isSelected(type) && hasModelTypes(type)).map((type) => (
        <InstrumentPanel
          key={type}
          type={type}
          selectedModels={getEntry(type)?.modelTypes ?? []}
          onToggleModel={(model) => toggleModel(type, model)}
        />
      ))}

      {detailed && (
        <>
          <Field title={t('onboarding.step6.smartHomeDevices')} info={t('info.smartHome')}>
            <div className="flex flex-wrap gap-2">
              {SMART_HOME_DEVICES.map((device) => (
                <OptionChip
                  key={device}
                  icon={SMART_HOME_ICONS[device]}
                  label={t(`onboarding.step6.smartHomeOptions.${device}`)}
                  selected={data.smartHomeDevices.includes(device)}
                  onClick={() => toggleSmartHomeDevice(device)}
                />
              ))}
            </div>
          </Field>

          <Field title={t('onboarding.step6.energyCostRange')} info={t('info.energyCost')}>
            <div className="flex flex-wrap gap-2">
              {ENERGY_COST_RANGES.map((range) => (
                <OptionChip
                  key={range}
                  label={t(`onboarding.step6.energyCostOptions.${range}`)}
                  selected={data.energyCostRange === range}
                  onClick={() => onChange({ energyCostRange: range })}
                />
              ))}
            </div>
          </Field>
        </>
      )}
    </div>
  )
}
