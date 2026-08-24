import { useTranslation } from 'react-i18next'
import {
  Wind,
  Recycle,
  Fan,
  HelpCircle,
  ShieldCheck,
  Shield,
  ShieldAlert,
  ShieldX,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { Field } from '@/components/ui/Field'
import type { OnboardingData, WindowAge, VentilationType, InsulationState } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

const WINDOW_AGES: WindowAge[] = ['before_1980', '1980_2000', '2000_2015', 'after_2015', 'unknown']

const VENTILATION_TYPES: VentilationType[] = [
  'natural',
  'mechanical_hrv',
  'mechanical_no_hrv',
  'unknown',
]
const VENTILATION_ICONS: Record<VentilationType, LucideIcon> = {
  natural: Wind,
  mechanical_hrv: Recycle,
  mechanical_no_hrv: Fan,
  unknown: HelpCircle,
}

const INSULATION_STATES: InsulationState[] = ['very_good', 'good', 'medium', 'poor', 'unknown']
const INSULATION_ICONS: Record<InsulationState, LucideIcon> = {
  very_good: ShieldCheck,
  good: Shield,
  medium: ShieldAlert,
  poor: ShieldX,
  unknown: HelpCircle,
}

/**
 * „Gebäudehülle" – alles, was den Wärmebedarf des Gebäudes bestimmt.
 *
 * Das Fensteralter stand vorher bei den Basisdaten, die Sanierung der Fenster
 * zwei Schritte später: dieselbe Information, zweimal gefragt, auf zwei
 * verschiedenen Skalen. Jetzt liegen beide im selben Schritt, direkt
 * untereinander (die Sanierungshistorie folgt unmittelbar danach).
 *
 * Baujahr, Gebäudetyp und Wohnfläche sind in den Zuhause-Schritt gezogen – sie
 * beschreiben die Wohnung, nicht ihre Hülle, und die Plausibilitätsprüfung
 * braucht sie neben der Personenzahl.
 */
export function Step2Building({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <Field title={t('onboarding.step2.windowAge')} info={t('info.windowAge')}>
        <div className="flex flex-wrap gap-2">
          {WINDOW_AGES.map((age) => (
            <OptionChip
              key={age}
              label={t(`onboarding.step2.windowAgeOptions.${age}`)}
              selected={data.windowAge === age}
              onClick={() => onChange({ windowAge: age })}
            />
          ))}
        </div>
      </Field>

      <Field
        title={t('onboarding.step5.insulationState')}
        info={t('info.insulation')}
        hint={t('onboarding.step5.insulationHint')}
      >
        <div className="flex flex-wrap gap-2">
          {INSULATION_STATES.map((state) => (
            <OptionChip
              key={state}
              icon={INSULATION_ICONS[state]}
              label={t(`onboarding.step5.insulationOptions.${state}`)}
              selected={data.insulationState === state}
              onClick={() => onChange({ insulationState: state })}
            />
          ))}
        </div>
      </Field>

      <Field title={t('onboarding.step5.ventilationType')} info={t('info.ventilation')}>
        <div className="flex flex-wrap gap-2">
          {VENTILATION_TYPES.map((type) => (
            <OptionChip
              key={type}
              icon={VENTILATION_ICONS[type]}
              label={t(`onboarding.step5.ventilationOptions.${type}`)}
              selected={data.ventilationType === type}
              onClick={() => onChange({ ventilationType: type })}
            />
          ))}
        </div>
      </Field>
    </div>
  )
}
