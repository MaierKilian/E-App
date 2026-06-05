import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import type { OnboardingData, InstrumentType, TemperatureSensorSubType, SmartHomeDevice, EnergyCostRange } from '@/types'

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

const TEMP_SUB_TYPES: TemperatureSensorSubType[] = ['contact', 'room', 'infrared']
const SMART_HOME_DEVICES: SmartHomeDevice[] = ['smart_thermostat', 'smart_meter', 'smart_plugs', 'none']
const ENERGY_COST_RANGES: EnergyCostRange[] = ['under_100', '100_200', '200_350', 'over_350', 'unknown']

export function Step6Instruments({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

  function isSelected(type: InstrumentType) {
    return data.instruments.some((i) => i.type === type)
  }

  function getTempSubTypes(): TemperatureSensorSubType[] {
    return data.instruments.find((i) => i.type === 'temperature_sensor')?.temperatureSubTypes ?? []
  }

  function toggleInstrument(type: InstrumentType) {
    if (isSelected(type)) {
      onChange({ instruments: data.instruments.filter((i) => i.type !== type) })
    } else {
      onChange({ instruments: [...data.instruments, { type }] })
    }
  }

  function toggleTempSubType(sub: TemperatureSensorSubType) {
    const current = getTempSubTypes()
    const updated = current.includes(sub)
      ? current.filter((s) => s !== sub)
      : [...current, sub]
    onChange({
      instruments: data.instruments.map((i) =>
        i.type === 'temperature_sensor' ? { ...i, temperatureSubTypes: updated } : i,
      ),
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

  const hasTempSensor = isSelected('temperature_sensor')

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{t('onboarding.step6.subtitle')}</p>
      <div className="flex flex-wrap gap-2">
        {INSTRUMENT_TYPES.map((type) => (
          <SelectChip
            key={type}
            label={t(`onboarding.step6.instruments.${type}`)}
            selected={isSelected(type)}
            onClick={() => toggleInstrument(type)}
          />
        ))}
      </div>

      {hasTempSensor && (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t('onboarding.step6.temperatureSubLabel')}
          </p>
          <div className="flex flex-wrap gap-2">
            {TEMP_SUB_TYPES.map((sub) => (
              <SelectChip
                key={sub}
                label={t(`onboarding.step6.temperatureSubTypes.${sub}`)}
                selected={getTempSubTypes().includes(sub)}
                onClick={() => toggleTempSubType(sub)}
              />
            ))}
          </div>
        </div>
      )}

      {detailed && (
        <>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t('onboarding.step6.smartHomeDevices')}
            </label>
            <div className="flex flex-wrap gap-2">
              {SMART_HOME_DEVICES.map((device) => (
                <SelectChip
                  key={device}
                  label={t(`onboarding.step6.smartHomeOptions.${device}`)}
                  selected={data.smartHomeDevices.includes(device)}
                  onClick={() => toggleSmartHomeDevice(device)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              {t('onboarding.step6.energyCostRange')}
            </label>
            <div className="flex flex-wrap gap-2">
              {ENERGY_COST_RANGES.map((range) => (
                <SelectChip
                  key={range}
                  label={t(`onboarding.step6.energyCostOptions.${range}`)}
                  selected={data.energyCostRange === range}
                  onClick={() => onChange({ energyCostRange: range })}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
