import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, Grip } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { parseRoomKey } from '../rooms'
import { rateFurniture, type FurnitureAnswer } from './furnitureSpacing'
import type { RunProps } from '../runnerTypes'

interface QOption {
  labelKey: string
  value: FurnitureAnswer
}
interface Question {
  textKey: string
  options: QOption[]
}

const OPT3: QOption[] = [
  { labelKey: 'no', value: 0 },
  { labelKey: 'partly', value: 1 },
  { labelKey: 'yes', value: 2 },
]
const OPT_YESNO: QOption[] = [
  { labelKey: 'no', value: 0 },
  { labelKey: 'yes', value: 2 },
]

const RADIATOR_Q: Question[] = [
  { textKey: 'radiator.q1', options: OPT3 },
  { textKey: 'radiator.q2', options: OPT_YESNO },
]
const UNDERFLOOR_Q: Question[] = [
  { textKey: 'underfloor.q1', options: OPT3 },
  { textKey: 'underfloor.q2', options: OPT3 },
]

/**
 * Durchführung: je nach Wärmeübergabe des Raums (Heizkörper / Fußbodenheizung)
 * werden passende Ja/Teilweise/Nein-Fragen gestellt und qualitativ bewertet.
 */
export function FurnitureSpacingRun({ onEvaluate, roomKey }: RunProps) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)

  const parsed = roomKey ? parseRoomKey(roomKey) : null
  const underfloor = parsed
    ? rooms.find((r) => r.type === parsed.type)?.heatTransfer === 'underfloor'
    : false
  const questions = underfloor ? UNDERFLOOR_Q : RADIATOR_Q
  const HeadIcon = underfloor ? Grip : Flame

  const [answers, setAnswers] = useState<(FurnitureAnswer | undefined)[]>(
    () => questions.map(() => undefined),
  )

  const canEvaluate = answers.every((a) => a !== undefined)

  function handleEvaluate() {
    if (!canEvaluate) return
    const final = answers as FurnitureAnswer[]
    const calc = rateFurniture(final)
    onEvaluate({
      result: {
        id: 'furniture_spacing',
        rating: calc.rating,
        primaryValue: calc.issues,
        unit: '',
        completedAt: new Date().toISOString(),
        details: { issues: calc.issues, score: calc.score, underfloor: underfloor ? 1 : 0 },
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1 text-sm font-medium text-muted">
        <HeadIcon className="h-4 w-4 text-primary" />
        {underfloor
          ? t('measurements.furniture_spacing.run.underfloorTitle')
          : t('measurements.furniture_spacing.run.radiatorTitle')}
      </div>

      {questions.map((q, qi) => (
        <div key={q.textKey} className="glass rounded-3xl p-5">
          <p className="font-medium text-foreground">
            {t(`measurements.furniture_spacing.run.${q.textKey}`)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.options.map((opt) => {
              const selected = answers[qi] === opt.value
              return (
                <button
                  key={opt.labelKey}
                  type="button"
                  onClick={() =>
                    setAnswers((cur) => cur.map((a, i) => (i === qi ? opt.value : a)))
                  }
                  aria-pressed={selected}
                  className={`focus-ring rounded-2xl px-4 py-2 text-sm font-medium transition-[transform,background-color,color] active:scale-[0.97] ${
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'glass text-foreground hover:bg-surface-2/70'
                  }`}
                >
                  {t(`measurements.furniture_spacing.run.options.${opt.labelKey}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
