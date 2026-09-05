import { useTranslation } from 'react-i18next'
import { Field } from '@/components/ui/Field'
import { AppliancePicker } from '../AppliancePicker'
import type { OnboardingData } from '@/types'

interface Props {
  data: OnboardingData
  onChange: (partial: Partial<OnboardingData>) => void
}

/**
 * Kühl- und Gefriergeräte – seit dem 05.09.2026 ein eigener Schritt.
 *
 * Die Frage stand vorher am Fuß des Ausstattungs-Schritts, unterhalb der
 * Übersicht „Was du zum Messen brauchst". Das war die falsche Nachbarschaft:
 * Die Übersicht ist eine Auskunft, hier ist etwas zu beantworten – und die
 * Antwort entscheidet als einzige Angabe des Fragebogens darüber, welche Checks
 * überhaupt erscheinen und ob der Fortschritt je bei 100 % ankommt. Wer die
 * Übersicht überflog, scrollte an ihr vorbei.
 */
export function StepAppliances({ data, onChange }: Props) {
  const { t } = useTranslation()

  return (
    <Field
      /* Die Seitenüberschrift nennt schon „Kühl- & Gefriergeräte" – hier steht
         deshalb die Frage, nicht dieselbe Bezeichnung ein zweites Mal. */
      title={t('onboarding.appliances.question')}
      info={t('info.appliances')}
      hint={t('onboarding.appliances.subtitle')}
    >
      <AppliancePicker
        value={data.appliances}
        answered={data.appliancesAnswered}
        onChange={(appliances, appliancesAnswered) => onChange({ appliances, appliancesAnswered })}
      />
    </Field>
  )
}
