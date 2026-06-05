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

        <div className="mt-3 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">{t(`measurements.${id}.title`)}</h1>
          <span className="shrink-0 pt-1.5 text-xs font-medium text-muted tabular-nums">
            {t('measurements.common.progress', { current: phaseIndex + 1, total: PHASES.length })}
          </span>
        </div>

        {/* Dezenter Fortschritt 1–3 */}
        <div className="mt-2 flex gap-1.5">
          {PHASES.map((p, i) => (
            <span
              key={p}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= phaseIndex ? 'bg-primary' : 'bg-surface-2'
              }`}
            />
          ))}
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
            {t('measurements.common.start')}
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
