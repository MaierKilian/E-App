import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, ChevronRight, DoorOpen } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { getMeasurementMeta } from './catalog'
import { getMeasurementModule } from './registry'
import { roomInstances, roomLabel, instanceKey } from './rooms'
import { resultSavingsEur } from './impact'
import type { RunnerPhase, RunOutcome } from './runnerTypes'
import type { MeasurementResult } from './types'

/** Zustand des Erfolgs-Zwischenschritts nach dem Speichern. */
interface SavedState {
  savings: number
  nextHref: string
  nextRoomName?: string
}

const PHASES: RunnerPhase[] = ['intro', 'run', 'result']

const PHASE_LABEL: Record<RunnerPhase, string> = {
  intro: 'measurements.common.phaseIntro',
  run: 'measurements.common.phaseRun',
  result: 'measurements.common.phaseResult',
}

/**
 * Generischer, geführter Mess-Ablauf (Intro → Run → Result).
 * Liest die Messung aus `:id` und – bei raumbezogenen Messungen – den Raum aus
 * `?room=`. Fehlt der Raum bei einer Pro-Raum-Messung, erscheint zuerst eine
 * Raum-Auswahl. Die messungsspezifischen Inhalte kommen aus der Registry.
 */
export function MeasurementRunner() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const roomKey = searchParams.get('room') ?? undefined
  const saveResult = useMeasurementsStore((s) => s.saveResult)
  const rooms = useOnboardingStore((s) => s.data.rooms)

  const meta = getMeasurementMeta(id)
  const mod = getMeasurementModule(id)

  const [phase, setPhase] = useState<RunnerPhase>('intro')
  // Höchste bereits erreichte Phase – steuert, welche Segmente rückwärts
  // anklickbar sind (man darf nur zu schon erreichten Phasen zurückspringen).
  const [maxReached, setMaxReached] = useState(0)
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [justSaved, setJustSaved] = useState<SavedState | null>(null)

  // Wechselt der Raum (z. B. „auto weiter" durch die Räume), Ablauf zurücksetzen.
  useEffect(() => {
    setPhase('intro')
    setMaxReached(0)
    setOutcome(null)
    setJustSaved(null)
  }, [roomKey])

  // Erfolgs-Zwischenschritt: nach kurzer Anzeige automatisch weiter.
  useEffect(() => {
    if (!justSaved) return
    const tid = setTimeout(() => navigate(justSaved.nextHref), 1600)
    return () => clearTimeout(tid)
  }, [justSaved, navigate])

  // Unbekannte oder (noch) nicht verfügbare Messung → zurück zur Übersicht.
  if (!meta || !meta.available || !mod) {
    return <Navigate to="/measurements" replace />
  }

  // Pro-Raum-Messung ohne gewählten Raum → Raum-Auswahl anzeigen.
  if (meta.perRoom && !roomKey) {
    return <RoomPicker id={id} />
  }

  // Erfolgsmoment nach dem Speichern.
  if (justSaved) {
    return <SavedInterstitial state={justSaved} onContinue={() => navigate(justSaved.nextHref)} />
  }

  const { Intro, Run, Result } = mod
  const phaseIndex = PHASES.indexOf(phase)
  const roomInst = roomKey ? roomInstances(rooms).find((r) => r.key === roomKey) : undefined
  const roomSuffix = roomInst ? ` · ${roomLabel(t, roomInst)}` : ''

  function goToPhase(next: RunnerPhase) {
    const nextIndex = PHASES.indexOf(next)
    setMaxReached((prev) => Math.max(prev, nextIndex))
    setPhase(next)
  }

  function handleEvaluate(next: RunOutcome) {
    setOutcome(next)
    goToPhase('result')
  }

  function handleSave(result: MeasurementResult) {
    const full = { ...result, roomKey }
    saveResult(full)
    // Nächstes Ziel bestimmen: bei Pro-Raum der nächste offene Raum, sonst Übersicht.
    let nextHref = '/measurements'
    let nextRoomName: string | undefined
    if (meta!.perRoom) {
      const fresh = useMeasurementsStore.getState().results
      const open = roomInstances(rooms).find((inst) => !fresh[instanceKey(id, inst.key)])
      if (open) {
        nextHref = `/measurements/${id}?room=${encodeURIComponent(open.key)}`
        nextRoomName = roomLabel(t, open)
      }
    }
    setJustSaved({ savings: resultSavingsEur(full), nextHref, nextRoomName })
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

        <h1 className="mt-3 text-2xl font-bold">
          {t(`measurements.${id}.title`)}
          {roomSuffix && <span className="text-muted font-semibold">{roomSuffix}</span>}
        </h1>

        {/* Phasen-Segmente: Info · Messen · Ergebnis. Bereits erreichte
            vorherige Segmente dienen als Rück-Navigation (nur zurück). */}
        <div className="glass mt-3 flex gap-1 rounded-2xl p-1">
          {PHASES.map((p, i) => {
            const active = i === phaseIndex
            const passed = i < phaseIndex
            const canGoBack = i < phaseIndex && i <= maxReached
            const baseClass = `flex-1 rounded-xl px-2 py-1.5 text-center text-xs font-semibold transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : passed
                  ? 'text-primary'
                  : 'text-muted'
            }`
            if (canGoBack) {
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => goToPhase(p)}
                  className={`${baseClass} focus-ring transition-transform active:scale-[0.97] hover:text-foreground`}
                >
                  {t(PHASE_LABEL[p])}
                </button>
              )
            }
            return (
              <div key={p} aria-current={active ? 'step' : undefined} className={baseClass}>
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
            onClick={() => goToPhase('run')}
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
              onClick={() => goToPhase('run')}
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

/** Kurzer Erfolgsmoment nach dem Speichern, dann automatisch weiter. */
function SavedInterstitial({ state, onContinue }: { state: SavedState; onContinue: () => void }) {
  const { t, i18n } = useTranslation()
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const backToOverview = state.nextHref === '/measurements'

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="glass relative w-full overflow-hidden rounded-3xl p-8 text-center">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-12 mx-auto h-40 w-40 rounded-full bg-emerald-500 opacity-[0.16] blur-3xl"
        />
        <div className="relative flex flex-col items-center gap-3">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
            <Check className="h-8 w-8" />
          </span>
          <h2 className="text-xl font-bold text-foreground">{t('measurements.flow.savedTitle')}</h2>
          {state.savings > 0 && (
            <p className="text-sm text-muted">
              {t('measurements.flow.savedSavings', { value: eurFmt.format(state.savings) })}
            </p>
          )}
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
          >
            {state.nextRoomName
              ? t('measurements.flow.continueRoom', { room: state.nextRoomName })
              : backToOverview
                ? t('measurements.flow.continueOverview')
                : t('measurements.flow.continue')}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

/** Raum-Auswahl für Pro-Raum-Messungen (mit Status je Raum). */
function RoomPicker({ id }: { id: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const results = useMeasurementsStore((s) => s.results)
  const instances = roomInstances(rooms)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => navigate('/measurements')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t('nav.measurements')}
      </button>

      <div>
        <h1 className="text-2xl font-bold">{t(`measurements.${id}.title`)}</h1>
        <p className="mt-1 text-muted">{t('measurements.roomPicker.subtitle')}</p>
      </div>

      {instances.length === 0 ? (
        <div className="glass rounded-3xl p-6 text-center text-sm text-muted">
          {t('measurements.byRoom.noRooms')}
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => {
            const done = Boolean(results[instanceKey(id, inst.key)])
            return (
              <button
                key={inst.key}
                type="button"
                onClick={() => navigate(`/measurements/${id}?room=${encodeURIComponent(inst.key)}`)}
                className="glass flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-transform active:scale-[0.99]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <DoorOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 font-semibold text-foreground">
                  {roomLabel(t, inst)}
                </span>
                {done ? (
                  <Check className="h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
