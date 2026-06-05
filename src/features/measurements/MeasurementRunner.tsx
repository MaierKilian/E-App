import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { getMeasurementMeta } from './catalog'
import { getMeasurementModule } from './registry'
import type { RunnerPhase, RunOutcome } from './runnerTypes'
import type { MeasurementResult } from './types'

const PHASES: RunnerPhase[] = ['intro', 'run', 'result']

const PHASE_LABEL: Record<RunnerPhase, string> = {
  intro: 'measurements.common.phaseIntro',
  run: 'measurements.common.phaseRun',
  result: 'measurements.common.phaseResult',
}

/**
 * Generischer, geführter Mess-Ablauf (Intro → Run → Result).
 * Liest die Messung aus `:id`; ist sie unbekannt oder nicht verfügbar, geht es
 * zurück zur Übersicht. Die messungsspezifischen Inhalte kommen aus der
 * Registry, sodass weitere Messungen leicht ergänzbar sind.
 */
export function MeasurementRunner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const saveResult = useMeasurementsStore((s) => s.saveResult)

  const meta = getMeasurementMeta(id)
  const mod = getMeasurementModule(id)

  const [phase, setPhase] = useState<RunnerPhase>('intro')
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)

  // Unbekannte oder (noch) nicht verfügbare Messung → zurück zur Übersicht.
  if (!meta || !meta.available || !mod) {
    return <Navigate to="/measurements" replace />
  }

  const { Intro, Run, Result } = mod
  const phaseIndex = PHASES.indexOf(phase)

  function handleEvaluate(next: RunOutcome) {
    setOutcome(next)
    setPhase('result')
  }

  function handleSave(result: MeasurementResult) {
    saveResult(result)
    navigate('/measurements')
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          onClick={() => navigate('/measurements')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('nav.measurements')}
        </button>

        <h1 className="mt-3 text-2xl font-bold">{t(`measurements.${id}.title`)}</h1>

        {/* Phasen-Segmente: Info · Messen · Ergebnis (aktuelle hervorgehoben) */}
        <div className="glass mt-3 flex gap-1 rounded-2xl p-1">
          {PHASES.map((p, i) => {
            const active = i === phaseIndex
            const passed = i < phaseIndex
            return (
              <div
                key={p}
                aria-current={active ? 'step' : undefined}
                className={`flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : passed
                      ? 'text-primary'
                      : 'text-muted'
                }`}
              >
                {t(PHASE_LABEL[p])}
              </div>
            )
          })}
        </div>
      </div>

      {phase === 'intro' && (
        <>
          <Intro />
          <button
            type="button"
            onClick={() => setPhase('run')}
            className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
          >
            {t([`measurements.${id}.intro.start`, 'measurements.common.start'])}
          </button>
        </>
      )}

      {phase === 'run' && <Run onEvaluate={handleEvaluate} />}

      {phase === 'result' && outcome && (
        <>
          <Result result={outcome.result} />
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <button
              type="button"
              onClick={() => handleSave(outcome.result)}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
            >
              {t('measurements.common.save')}
            </button>
            <button
              type="button"
              onClick={() => setPhase('run')}
              className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-surface/70 px-5 py-3 text-sm font-medium text-foreground transition-[transform,colors] hover:bg-surface-2 active:scale-[0.97]"
            >
              {t('measurements.common.again')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
