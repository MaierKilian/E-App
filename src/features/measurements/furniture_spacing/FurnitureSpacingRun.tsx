import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Flame, Grip, Ruler } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { Stepper } from '@/components/ui/Stepper'
import { parseRoomKey } from '../rooms'
import {
  answerFromCoverage,
  answerFromDistance,
  questionKeys,
  rateFurniture,
  supportsCoverage,
  supportsDistance,
  COVER_DEFAULT_PCT,
  COVER_MAX_PCT,
  COVER_MIN_PCT,
  COVER_PARTLY_PCT,
  DISTANCE_DEFAULT_CM,
  DISTANCE_MAX_CM,
  DISTANCE_MIN_CM,
  DISTANCE_TARGET_CM,
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
  const setRoomHeatTransfer = useOnboardingStore((s) => s.setRoomHeatTransfer)

  const parsed = roomKey ? parseRoomKey(roomKey) : null
  const roomType = parsed?.type
  // Der Check braucht die Wärmeübergabe – er stellt völlig andere Fragen, je
  // nachdem ob ein Heizkörper freistehen muss oder eine Fußbodenheizung nicht
  // zugestellt werden darf. Weiß das Profil sie nicht (Raum aus dem
  // Schnellstart), erhebt der Check sie selbst, statt Heizkörper zu unterstellen.
  const transfer = roomType ? rooms.find((r) => r.type === roomType)?.heatTransfer : undefined
  const underfloor = transfer === 'underfloor'
  const keys = questionKeys(underfloor, roomType)
  const HeadIcon = underfloor ? Grip : Flame

  const [answers, setAnswers] = useState<FurnitureAnswers>({})
  // Abstandsmessung ist optional; vorbelegt, wenn im Profil ein Messgerät steht.
  // Die Flächen-Schätzung braucht kein Gerät, ist aber ein zusätzlicher Schritt
  // und deshalb nicht vorbelegt.
  const hasMeter = useOnboardingStore((s) =>
    s.data.instruments.some((i) => i.type === 'distance_meter'),
  )
  const [measureOn, setMeasureOn] = useState(hasMeter && !underfloor)
  const [distanceCm, setDistanceCm] = useState(DISTANCE_DEFAULT_CM)
  const [coverPct, setCoverPct] = useState(COVER_DEFAULT_PCT)

  // Welche Frage sich beziffern lässt, hängt an der Wärmeübergabe: beim
  // Heizkörper der freie Abstand davor, bei der Fußbodenheizung der Anteil der
  // zugestellten Fläche. Ein Abstand zum Heizkörper wäre dort gegenstandslos.
  const measurableKey = keys.find(underfloor ? supportsCoverage : supportsDistance)
  const measuring = measureOn && measurableKey !== undefined

  /** Antworten inkl. der aus der Messung/Schätzung abgeleiteten Stufe. */
  const effectiveAnswers: FurnitureAnswers = measuring
    ? {
        ...answers,
        [measurableKey]: underfloor
          ? answerFromCoverage(coverPct)
          : answerFromDistance(distanceCm),
      }
    : answers

  const canEvaluate = keys.every((k) => effectiveAnswers[k] !== undefined)

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = rateFurniture(effectiveAnswers)
    // Antworten einzeln mitspeichern, damit das Ergebnis die konkreten Befunde
    // zeigen kann statt einer festen Empfehlungsliste.
    const details: Record<string, number> = {
      issues: calc.issues,
      score: calc.score,
      underfloor: underfloor ? 1 : 0,
    }
    for (const k of keys) details[`ans_${k}`] = effectiveAnswers[k] as FurnitureAnswer
    if (measuring) {
      if (underfloor) details.coverPct = coverPct
      else details.distanceCm = distanceCm
    }
    onEvaluate({
      result: {
        id: 'furniture_spacing',
        rating: calc.rating,
        // Mit Messung hat der Check eine echte Messgröße – je nach
        // Wärmeübergabe der Abstand in cm oder die zugestellte Fläche in
        // Prozent. Ohne bleibt die Zahl der Befunde der Hauptwert.
        primaryValue: measuring ? (underfloor ? coverPct : distanceCm) : calc.issues,
        unit: measuring ? (underfloor ? '%' : 'cm') : '',
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  // Solange die Wärmeübergabe offen ist, wären die Fragen darunter geraten.
  if (!transfer) {
    return (
      <div className="glass rounded-3xl p-5">
        <p className="font-medium text-foreground">
          {t('measurements.furniture_spacing.run.transferQuestion')}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t('measurements.furniture_spacing.run.transferHint', {
            room: roomType ? t(`onboarding.step3.roomTypes.${roomType}`) : '',
          })}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {(['radiator', 'underfloor'] as const).map((option) => {
            const Icon = option === 'underfloor' ? Grip : Flame
            return (
              <button
                key={option}
                type="button"
                onClick={() => roomType && setRoomHeatTransfer(roomType, option)}
                disabled={!roomType}
                className="glass focus-ring flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-sm font-semibold text-foreground transition-transform active:scale-[0.97] disabled:opacity-40"
              >
                <Icon className="h-5 w-5 text-primary" />
                {t(`onboarding.step5.${option}Short`)}
              </button>
            )
          })}
        </div>
      </div>
    )
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

          {key === measurableKey && (
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 border-t border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pt-3">
              <span className="flex items-center gap-2 text-sm text-muted">
                <Ruler className="h-4 w-4 text-primary" />
                {t(
                  underfloor
                    ? 'measurements.furniture_spacing.run.coverToggle'
                    : 'measurements.furniture_spacing.run.measureToggle',
                )}
              </span>
              <input
                type="checkbox"
                checked={measureOn}
                onChange={(e) => setMeasureOn(e.target.checked)}
                className="h-5 w-5 shrink-0 accent-[var(--primary)]"
              />
            </label>
          )}

          {measuring && key === measurableKey ? (
            <div className="mt-4">
              <div className="flex items-center justify-center gap-3">
                <Stepper
                  value={underfloor ? coverPct : distanceCm}
                  min={underfloor ? COVER_MIN_PCT : DISTANCE_MIN_CM}
                  max={underfloor ? COVER_MAX_PCT : DISTANCE_MAX_CM}
                  step={underfloor ? 5 : 1}
                  onChange={underfloor ? setCoverPct : setDistanceCm}
                />
                <div className="flex min-w-20 items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold tabular-nums text-foreground">
                    {underfloor ? coverPct : distanceCm}
                  </span>
                  <span className="text-sm text-muted">
                    {t(
                      underfloor
                        ? 'measurements.furniture_spacing.run.coverUnit'
                        : 'measurements.furniture_spacing.run.distanceUnit',
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                {underfloor
                  ? t('measurements.furniture_spacing.run.coverHint', {
                      target: COVER_PARTLY_PCT,
                    })
                  : t('measurements.furniture_spacing.run.distanceHint', {
                      target: DISTANCE_TARGET_CM,
                    })}
              </p>
            </div>
          ) : (
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
          )}
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
