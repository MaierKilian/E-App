import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/store/onboardingStore'
import { AppliancePicker } from '@/features/onboarding/AppliancePicker'
import { hasAppliance } from '@/features/onboarding/appliances'
import type { ApplianceKind } from '@/types'
import type { RunProps } from './runnerTypes'
import { FridgeRun } from './fridge/FridgeRun'
import { FreezerRun } from './freezer/FreezerRun'

interface Props {
  /** Der Check, um den es geht. */
  kind: 'fridge' | 'freezer'
  /** Der eigentliche Check – wird gezeigt, sobald das Gerät bekannt ist. */
  children: React.ReactNode
}

/** Im Check zur Wahl: das Einzelgerät und die Kombination, die es mitbedient. */
const KINDS: Record<'fridge' | 'freezer', ApplianceKind[]> = {
  fridge: ['fridge', 'fridge_freezer'],
  freezer: ['freezer', 'fridge_freezer'],
}

/**
 * Fragt im Check nach, was das Profil noch nicht weiß – und schreibt die
 * Antwort ins Profil zurück.
 *
 * Dieselbe Mechanik wie bei der Wärmeübergabe im Möbelabstand-Check: Wer über
 * den Schnellstart gekommen ist, soll nicht zurück in den Fragebogen geschickt
 * werden, und die hier gegebene Antwort soll dort trotzdem ankommen. Der Check
 * ist nie der einzige Ort, an dem ein Feld existiert.
 *
 * „Keines" beendet den Check: Der Nutzer hat gerade gesagt, dass es nichts zu
 * messen gibt. Er landet in der Übersicht, in der der Check ab sofort weder im
 * Zähler noch im Nenner steht.
 */
export function ApplianceGate({ kind, children }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const appliances = useOnboardingStore((s) => s.data.appliances)
  const answered = useOnboardingStore((s) => s.data.appliancesAnswered)
  const setAppliances = useOnboardingStore((s) => s.setAppliances)

  // Beantwortet und vorhanden: Der Check läuft ganz normal, ohne Zwischenfrage.
  if (answered && hasAppliance(appliances, kind)) return <>{children}</>

  return (
    <div className="glass rounded-3xl p-5">
      <p className="font-medium text-foreground">
        {t(`measurements.${kind}.gate.question`)}
      </p>
      <p className="mt-1 mb-4 text-sm text-muted">{t('measurements.common.gateHint')}</p>
      <AppliancePicker
        value={appliances}
        answered={answered}
        kinds={KINDS[kind]}
        onChange={(next, nextAnswered) => {
          setAppliances(next, nextAnswered)
          // „Keines" heißt: hier gibt es nichts zu messen. Zurück zur Übersicht,
          // statt den Nutzer vor einem Check stehen zu lassen, den er gerade
          // abgewählt hat.
          if (nextAnswered && !hasAppliance(next, kind)) navigate('/measurements')
        }}
      />
    </div>
  )
}

/**
 * Setzt den Check hinter die Gerätefrage.
 *
 * Als Hülle um die Run-Komponente statt als Zeile auf der Erklärseite: So
 * bleibt der Check selbst frei von der Frage, ob es sein Gerät überhaupt gibt –
 * und die Frage lässt sich nicht durch „weiter"-Sprünge (`begin=1`,
 * gespeicherter Entwurf) übergehen, die die Erklärseite auslassen.
 */
export function GatedFridgeRun(props: RunProps) {
  return (
    <ApplianceGate kind="fridge">
      <FridgeRun {...props} />
    </ApplianceGate>
  )
}

export function GatedFreezerRun(props: RunProps) {
  return (
    <ApplianceGate kind="freezer">
      <FreezerRun {...props} />
    </ApplianceGate>
  )
}
