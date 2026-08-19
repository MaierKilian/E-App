import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, Grip } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { parseRoomKey } from '../rooms'
import {
  questionKeys,
  rateFurniture,
  type FindingKey,
  type FurnitureAnswer,
  type FurnitureAnswers,
} from './furnitureSpacing'
import type { RunProps } from '../runnerTypes'

const OPTIONS: { labelKey: string; value: FurnitureAnswer }[] = [
  { labelKey: 'no', value: 0 },
  { labelKey: 'partly', value: 1 },
  { labelKey: 'yes', value: 2 },
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
  const roomType = parsed?.type
  const keys = questionKeys(underfloor, roomType)
  const HeadIcon = underfloor ? Grip : Flame

  const [answers, setAnswers] = useState<FurnitureAnswers>({})

  const canEvaluate = keys.every((k) => answers[k] !== undefined)

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = rateFurniture(answers)
    // Antworten einzeln mitspeichern, damit das Ergebnis die konkreten Befunde
    // zeigen kann statt einer festen Empfehlungsliste.
    const details: Record<string, number> = {
      issues: calc.issues,
      score: calc.score,
      underfloor: underfloor ? 1 : 0,
    }
    for (const k of keys) details[`ans_${k}`] = answers[k] as FurnitureAnswer
    onEvaluate({
      result: {
        id: 'furniture_spacing',
        rating: calc.rating,
        primaryValue: calc.issues,
        unit: '',
        completedAt: new Date().toISOString(),
        details,
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

      {keys.map((key: FindingKey) => (
        <div key={key} className="glass rounded-3xl p-5">
          <p className="font-medium text-foreground">
            {/* Raumspezifische Formulierung, sonst die allgemeine. */}
            {t([
              `measurements.furniture_spacing.run.questionsByRoom.${roomType}.${key}`,
              `measurements.furniture_spacing.run.questions.${key}`,
            ])}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {OPTIONS.map((opt) => {
              const selected = answers[key] === opt.value
              return (
                <button
                  key={opt.labelKey}
                  type="button"
                  onClick={() => setAnswers((cur) => ({ ...cur, [key]: opt.value }))}
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
