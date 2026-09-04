import { useTranslation } from 'react-i18next'
import { Ban, Plug, ThermometerSun, Gauge } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import { InstrumentGuide } from '../InstrumentGuide'
import { AppliancePicker } from '../AppliancePicker'
import type { OnboardingData, SmartHomeDevice } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
  detailed?: boolean
}

const SMART_HOME_DEVICES: SmartHomeDevice[] = ['smart_thermostat', 'smart_meter', 'smart_plugs', 'none']
const SMART_HOME_ICONS: Record<SmartHomeDevice, LucideIcon> = {
  smart_thermostat: ThermometerSun,
  smart_meter: Gauge,
  smart_plugs: Plug,
  none: Ban,
}

export function Step6Instruments({ data, onChange, detailed = false }: Props) {
  const { t } = useTranslation()

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
      {/* Keine Frage, sondern eine Auskunft: Wer hier steht, legt gerade sein
          Zuhause an und weiß noch nicht, dass die Hälfte der Checks ohne jede
          Anschaffung läuft – und wofür die andere Hälfte etwas braucht. Die
          frühere Abfrage der vorhandenen Geräte stand an derselben Stelle und
          bewirkte fast nichts (Punkt 18 in `docs/gefundene-probleme.md`). */}
      <Field
        title={t('onboarding.step6.guide.title')}
        info={t('info.instruments')}
        hint={t('onboarding.step6.guide.intro')}
      >
        <InstrumentGuide />
      </Field>

      {/* Kühl- und Gefriergeräte: die einzige Angabe, die beide Checks brauchen
          und die bisher nirgends stand. Ohne sie bekam ein Haushalt ohne
          Gefriertruhe einen Check, den er nie abschließen konnte. */}
      <Field title={t('onboarding.appliances.title')} info={t('info.appliances')}>
        <p className="mb-2.5 text-sm text-muted">{t('onboarding.appliances.subtitle')}</p>
        <AppliancePicker
          value={data.appliances}
          answered={data.appliancesAnswered}
          onChange={(appliances, appliancesAnswered) =>
            onChange({ appliances, appliancesAnswered })
          }
        />
      </Field>

      {detailed && (
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
      )}
    </div>
  )
}
