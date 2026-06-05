import { useTranslation } from 'react-i18next'
import { SelectChip } from '@/components/ui/SelectChip'
import type { OnboardingData, InstrumentType, TemperatureSensorSubType } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
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

export function Step6Instruments({ data, onChange }: Props) {
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
    </div>
  )
}
