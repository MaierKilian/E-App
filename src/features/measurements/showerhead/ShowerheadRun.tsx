import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import { Stopwatch } from '@/components/ui/Stopwatch'
import { calcShowerhead } from './showerhead'
import type { RunProps } from '../runnerTypes'

const DEFAULT_LITERS = 5

/**
 * Minimale Durchführungs-Phase: Füllmenge fein justieren, Zeit per Stoppuhr oder
 * manuell. Stoppuhr und manuelle Eingabe teilen denselben Sekundenwert.
 */
export function ShowerheadRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const persons = useOnboardingStore((s) => s.data.personsCount)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [liters, setLiters] = useState(DEFAULT_LITERS)
  const [seconds, setSeconds] = useState(0)

  const canEvaluate = liters > 0 && seconds > 0

  const fmtLiters = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(liters)

  function adjustLiters(delta: number) {
    setLiters((v) => Math.max(0.1, Math.min(50, Math.round((v + delta) * 10) / 10)))
  }

  function handleManualSeconds(raw: string) {
    const value = Number(raw.replace(',', '.'))
    setSeconds(Number.isFinite(value) && value > 0 ? value : 0)
  }

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcShowerhead({ liters, seconds, persons, workPriceCt })
    onEvaluate({
      result: {
        id: 'showerhead',
        rating: calc.rating,
        primaryValue: calc.flowLpm,
        completedAt: new Date().toISOString(),
        details: { liters, seconds, yearlyCost: calc.yearlyCost, yearlySaving: calc.yearlySaving },
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* Füllmenge */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t('measurements.showerhead.run.litersLabel')}
          </span>
          <span className="text-xs text-muted">{t('measurements.showerhead.run.litersStandard')}</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => adjustLiters(-1)}
            className="focus-ring glass h-10 w-10 rounded-2xl text-lg font-bold text-foreground transition-transform active:scale-90"
            aria-label="-1"
          >
            −1
          </button>
          <button
            type="button"
            onClick={() => adjustLiters(-0.1)}
            className="focus-ring glass h-10 w-12 rounded-2xl text-sm font-bold text-foreground transition-transform active:scale-90"
            aria-label="-0.1"
          >
            −0,1
          </button>
          <div className="flex min-w-24 items-baseline justify-center gap-1 px-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{fmtLiters}</span>
            <span className="text-sm text-muted">{t('measurements.showerhead.run.litersUnit')}</span>
          </div>
          <button
            type="button"
            onClick={() => adjustLiters(0.1)}
            className="focus-ring glass h-10 w-12 rounded-2xl text-sm font-bold text-foreground transition-transform active:scale-90"
            aria-label="+0.1"
          >
            +0,1
          </button>
          <button
            type="button"
            onClick={() => adjustLiters(1)}
            className="focus-ring glass h-10 w-10 rounded-2xl text-lg font-bold text-foreground transition-transform active:scale-90"
            aria-label="+1"
          >
            +1
          </button>
        </div>
      </div>

      {/* Stoppuhr */}
      <div className="space-y-2">
        <p className="px-1 text-sm font-medium text-muted">
          {t('measurements.showerhead.run.stopwatchLabel')}
        </p>
        <Stopwatch onChange={setSeconds} />
      </div>

      {/* Manuelle Sekundeneingabe */}
      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <label htmlFor="manual-seconds" className="font-medium text-foreground">
          {t('measurements.showerhead.run.secondsManual')}
        </label>
        <div className="flex items-center gap-1.5">
          <input
            id="manual-seconds"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={seconds > 0 ? seconds : ''}
            onChange={(e) => handleManualSeconds(e.target.value)}
            placeholder={t('measurements.showerhead.run.secondsPlaceholder')}
            className="focus-ring w-24 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
          />
          <span className="text-sm text-muted">{t('measurements.showerhead.run.secondsUnit')}</span>
        </div>
      </div>

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
