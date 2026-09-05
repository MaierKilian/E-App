import { useTranslation } from 'react-i18next'
import { Field } from '@/components/ui/Field'
import { InstrumentGuide } from '../InstrumentGuide'

/**
 * „Ausstattung" – seit dem 05.09.2026 eine reine Auskunft, ohne eine einzige
 * Frage.
 *
 * Der Schritt fragte einmal drei Dinge ab. Geblieben ist keines davon: Die
 * vorhandenen Messgeräte sind der Übersicht gewichen, die daraus hergeleitet
 * ist, was die Checks tatsächlich verlangen (Punkt 18 in
 * `docs/gefundene-probleme.md`). Die Kühl- und Gefriergeräte haben einen
 * eigenen Schritt bekommen – sie sind eine Frage und gehören nicht unter eine
 * Auskunft. Und die Smart-Home-Frage ist ganz entfallen: Sie erhob drei
 * Gerätearten, deren gesamte Wirkung eine Zeile im PDF-Steckbrief war.
 *
 * Damit ist er der erste Schritt ohne Zugriff auf `OnboardingData` – er zeigt
 * nur, was die Checks verlangen, und nimmt nichts entgegen.
 */
export function Step6Instruments() {
  const { t } = useTranslation()

  return (
    <Field
      title={t('onboarding.step6.guide.title')}
      info={t('info.instruments')}
      hint={t('onboarding.step6.guide.intro')}
    >
      <InstrumentGuide />
    </Field>
  )
}
