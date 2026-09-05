import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/store/onboardingStore'
import { Stopwatch } from '@/components/ui/Stopwatch'
import { Stepper } from '@/components/ui/Stepper'
import { calcShowerhead } from './showerhead'
import type { RunProps } from '../runnerTypes'
import { DecimalField } from '@/components/ui/DecimalField'

const DEFAULT_LITERS = 5
const MIN_LITERS = 0.5
const MAX_LITERS = 20
const LITERS_STEP = 0.1

/**
 * Durchführungs-Phase: Stoppuhr laufen lassen, bis das Gefäß voll ist, und
 * bei Bedarf die Füllmenge anpassen.
 *
 * Die Reihenfolge folgt dem Tun, nicht der Datenstruktur: Wer den Eimer unter
 * die Dusche hält, braucht zuerst „Start" – die Stoppuhr ist das Messgerät.
 * Die Füllmenge steht darunter, weil sie in aller Regel unverändert bleibt
 * (Standard 5 L), und die manuelle Zeiteingabe erscheint erst, wenn eine Zeit
 * vorliegt: Dann ist sie eine Korrektur und keine zweite Bedienweise, die mit
 * der Stoppuhr um dieselbe Frage konkurriert. (Vorbild: der Wartezeit-Check.)
 *
 * Die Warmwasserquelle wurde hier bis zum 05.09.2026 abgefragt. Sie ging
 * ausschließlich in einen Euro-Betrag, den das Ergebnis nicht mehr zeigt –
 * siehe `showerhead.ts`.
 */
export function ShowerheadRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const persons = useOnboardingStore((s) => s.data.personsCount)

  const [liters, setLiters] = useState(DEFAULT_LITERS)
  const [seconds, setSeconds] = useState(0)

  const canEvaluate = liters > 0 && seconds > 0

  const fmtLiters = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(liters)

  function handleManualSeconds(value: number | undefined) {
    setSeconds(value !== undefined && value > 0 ? value : 0)
  }

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcShowerhead({ liters, seconds, persons })
    onEvaluate({
      result: {
        id: 'showerhead',
        rating: calc.rating,
        primaryValue: calc.flowLpm,
        unit: 'L/min',
        completedAt: new Date().toISOString(),
        details: {
          liters,
          seconds,
          savingPct: calc.savingPct,
          litersSavedPerYear: calc.litersSavedPerYear,
          // Die Wassermenge ist aufs Jahr hochgerechnet (Personen, Duschen pro
          // Tag, Minuten je Dusche) – der Prozentsatz nicht. Die Markierung
          // gilt den Details als Ganzes und bleibt deshalb stehen.
          savingEstimated: 1,
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Das Messgerät zuerst. */}
      <div className="glass rounded-3xl p-5">
        <p className="font-medium text-foreground">
          {t('measurements.showerhead.run.stopwatchLabel')}
        </p>
        <p className="mt-1 text-xs leading-snug text-muted">
          {t('measurements.showerhead.run.stopwatchHint', { liters: fmtLiters })}
        </p>
        <div className="mt-4">
          <Stopwatch onChange={setSeconds} />
        </div>

        {/* Korrektur statt zweiter Bedienweise: erst sichtbar, wenn eine Zeit
            vorliegt – wie im Wartezeit-Check. */}
        {seconds > 0 && (
          <label
            htmlFor="manual-seconds"
            className="mt-4 flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-muted">{t('measurements.showerhead.run.secondsManual')}</span>
            <span className="flex items-center gap-1.5">
              <DecimalField
                id="manual-seconds"
                value={seconds}
                onChange={handleManualSeconds}
                className="focus-ring w-20 rounded-xl bg-surface-2 px-3 py-1.5 text-right font-semibold tabular-nums text-foreground"
              />
              <span className="text-muted">{t('measurements.showerhead.run.secondsUnit')}</span>
            </span>
          </label>
        )}
      </div>

      {/* Füllmenge – selten geändert, deshalb kompakt und zweitrangig. Der
          gemeinsame Stepper bringt das beschleunigte Halten mit (Punkt 7);
          die vier handgebauten Knöpfe von zuvor konnten es nicht. */}
      <div className="glass rounded-3xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">
              {t('measurements.showerhead.run.litersLabel')}
            </p>
            <p className="text-xs text-muted">{t('measurements.showerhead.run.litersStandard')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums text-foreground">{fmtLiters}</span>
              <span className="text-sm text-muted">
                {t('measurements.showerhead.run.litersUnit')}
              </span>
            </div>
            <Stepper
              value={liters}
              min={MIN_LITERS}
              max={MAX_LITERS}
              step={LITERS_STEP}
              onChange={setLiters}
              showValue={false}
            />
          </div>
        </div>
      </div>

      {/* Kein ausgegrauter Knopf ohne Begründung: Solange nichts auszuwerten
          ist, steht dort, was noch fehlt. */}
      {canEvaluate ? (
        <button
          type="button"
          onClick={handleEvaluate}
          className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
        >
          {t('measurements.common.evaluate')}
        </button>
      ) : (
        <p className="px-1 text-center text-sm text-muted">
          {t('measurements.showerhead.run.hintStopwatch')}
        </p>
      )}
    </div>
  )
}
