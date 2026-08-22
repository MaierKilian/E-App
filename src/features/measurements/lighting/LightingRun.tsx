import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Lightbulb, HelpCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useOnboardingStore } from '@/store/onboardingStore'
import { roomInstances, roomLabel } from '../rooms'
import { lightingDetails, openRoomKeys, rateLighting, type RoomLampState } from './lighting'
import type { RunProps } from '../runnerTypes'

/**
 * Der LED-Check in einem Schirm: einmal durch die Wohnung, pro Raum eine Frage.
 *
 * Kein Zählen, keine Brenndauer, kein Betrag. Was der Nutzer wissen muss, um zu
 * handeln, steht als Text über der Liste – es gilt für jeden gleich und braucht
 * keine Eingabe. Was die App wissen muss, um ihm zu sagen, wo er anfängt, ist
 * eine einzige Antwort je Raum.
 */
export function LightingRun({ onEvaluate }: RunProps) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const instances = roomInstances(rooms)

  const [answers, setAnswers] = useState<Partial<Record<string, RoomLampState>>>({})
  const [helpOpen, setHelpOpen] = useState(false)

  const answered = Object.values(answers).filter(Boolean).length

  function handleEvaluate() {
    const details = lightingDetails(answers)
    onEvaluate({
      result: {
        id: 'lighting',
        rating: rateLighting(instances, openRoomKeys(details)),
        primaryValue: details.openRooms,
        unit: t('measurements.lighting.unit'),
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Lightbulb className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold text-foreground">
            {t('measurements.lighting.run.leadTitle')}
          </p>
        </div>
        <p className="text-sm text-muted">{t('measurements.lighting.run.lead')}</p>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {t('measurements.lighting.run.helpButton')}
        </button>
      </div>

      <div className="glass rounded-3xl p-5">
        <p className="mb-1 text-sm font-semibold text-foreground">
          {t('measurements.lighting.run.roomsTitle')}
        </p>
        <p className="mb-4 text-xs text-muted">{t('measurements.lighting.run.roomsHint')}</p>
        <ul className="space-y-2.5">
          {instances.map((inst) => {
            const value = answers[inst.key]
            return (
              <li key={inst.key} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">
                  {roomLabel(t, inst)}
                </span>
                <div className="flex shrink-0 gap-1.5">
                  {(['old', 'led'] as RoomLampState[]).map((state) => {
                    const active = value === state
                    return (
                      <button
                        key={state}
                        type="button"
                        onClick={() => setAnswers((a) => ({ ...a, [inst.key]: state }))}
                        aria-pressed={active}
                        className={`focus-ring rounded-2xl px-3 py-2 text-xs font-semibold transition-[background-color,color,transform] active:scale-[0.97] ${
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'glass text-muted hover:text-foreground'
                        }`}
                      >
                        {t(`measurements.lighting.run.answers.${state}`)}
                      </button>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <span className="text-sm text-muted">
          {t('measurements.lighting.run.progress', {
            answered,
            total: instances.length,
          })}
        </span>
        {answered === instances.length && instances.length > 0 && (
          <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        )}
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={answered === 0}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t('measurements.lighting.run.helpTitle')}
      >
        <ul className="space-y-3">
          {(t('measurements.lighting.run.helpItems', { returnObjects: true }) as string[]).map(
            (item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-muted">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ),
          )}
        </ul>
      </Modal>
    </div>
  )
}
