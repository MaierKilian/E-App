import { useTranslation } from 'react-i18next'
import {
  Thermometer,
  Ruler,
  Wind,
  Droplets,
  Plug,
  Ban,
  HelpCircle,
  ThermometerSun,
  Gauge,
  Check,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { SelectChip } from '@/components/ui/SelectChip'
import { InfoButton } from '@/components/ui/InfoButton'
import { getModelTypes } from '../instrumentOptions'
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

// Die vier Hauptkategorien zuerst, CO₂ als ergänzende Kategorie zuletzt.
const DEVICE_TYPES: InstrumentType[] = [
  'temperature_sensor',
  'humidity_sensor',
  'distance_meter',
  'power_meter',
  'co2_sensor',
]
// "Keines" / "Nicht bekannt" sind exklusive Antworten, keine Geräte.
const SPECIAL_TYPES: InstrumentType[] = ['none', 'unknown']

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

/**
 * Eine Geräte-Zeile (Checklist-Stil): Icon + Name + Auswahl-Haken. Ist das Gerät
 * ausgewählt, klappen die passenden Subtypen direkt darunter auf – so bleibt der
 * Bezug "Subtyp gehört zu diesem Gerät" immer sichtbar.
 */
function InstrumentRow({
  type,
  selected,
  selectedModels,
  onToggle,
  onToggleModel,
}: {
  type: InstrumentType
  selected: boolean
  selectedModels: string[]
  onToggle: () => void
  onToggleModel: (model: string) => void
}) {
  const { t } = useTranslation()
  const Icon = INSTRUMENT_ICONS[type]
  const models = getModelTypes(type)
  const hasModels = models.length > 0

  return (
    <div
      className={`overflow-hidden rounded-2xl border transition-colors duration-200 ${
        selected ? 'border-primary/40 bg-primary/[0.05]' : 'border-border/60 bg-surface/40'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className="focus-ring flex w-full items-center gap-3 px-3.5 py-3 text-left transition-transform active:scale-[0.99]"
      >
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
            selected ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1 text-sm font-semibold text-foreground">
          {t(`onboarding.step6.instruments.${type}`)}
        </span>
        <span
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors ${
            selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface/60'
          }`}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>

      {selected && hasModels && (
        <div className="animate-panel-in border-t border-border/50 px-3.5 pb-3.5 pt-3">
          <p className="mb-2 text-xs font-medium text-muted">
            {t('onboarding.step6.modelTypeLabel')}
            <span className="ml-1 font-normal opacity-70">· {t('onboarding.step6.modelTypeHint')}</span>
          </p>
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

      {/* Geräte-Checkliste: kompakte Zeilen, Subtypen klappen je Gerät auf. */}
      <div className="space-y-2">
        {DEVICE_TYPES.map((type) => (
          <InstrumentRow
            key={type}
            type={type}
            selected={isSelected(type)}
            selectedModels={getEntry(type)?.modelTypes ?? []}
            onToggle={() => toggleInstrument(type)}
            onToggleModel={(model) => toggleModel(type, model)}
          />
        ))}
      </div>

      {/* Exklusive Antworten: kein Gerät vorhanden / nicht bekannt. */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-medium text-muted">{t('onboarding.step6.orNone')}</span>
        <div className="flex flex-wrap gap-2">
          {SPECIAL_TYPES.map((type) => (
            <OptionChip
              key={type}
              icon={INSTRUMENT_ICONS[type]}
              label={t(`onboarding.step6.instruments.${type}`)}
              selected={isSelected(type)}
              onClick={() => toggleInstrument(type)}
            />
          ))}
        </div>
      </div>

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
