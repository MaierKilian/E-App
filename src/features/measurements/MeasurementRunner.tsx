import { useState } from 'react'
import { useParams, useNavigate, useSearchParams, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, ChevronDown, ChevronRight, DoorOpen, Plus } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { getMeasurementMeta, roomsForMeasurement } from './catalog'
import { getMeasurementModule } from './registry'
import { roomInstances, roomLabel, instanceKey, type RoomInstance } from './rooms'
import { displayableSavingEur } from './impact'
import { RoomCreateSheet } from './RoomCreateSheet'
import { FeedbackPrompt } from '@/features/feedback/FeedbackPrompt'
import { applianceInstances } from '@/features/onboarding/appliances'
import { applianceResult } from './progress'
import { ApplianceChooser } from './ApplianceChooser'
import { applianceLabel } from './applianceLabel'
import type { RunnerPhase, RunOutcome } from './runnerTypes'
import type { MeasurementResult } from './types'

/** Zustand des Erfolgs-Zwischenschritts nach dem Speichern. */
interface SavedState {
  savings: number
  nextHref: string
  nextRoomName?: string
}

const PHASES: RunnerPhase[] = ['intro', 'run', 'result']

/** Ablauf einer Messung ohne eigene Erklärseite (siehe `MeasurementModule.Intro`). */
const PHASES_WITHOUT_INTRO: RunnerPhase[] = ['run', 'result']

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
  // Aus der Vorschau heraus gestartet (Info kam bereits im Bottom-Sheet) →
  // die Intro-Phase überspringen und direkt mit dem Messen beginnen.
  const skipIntro = searchParams.get('begin') === '1'
  const saveResult = useMeasurementsStore((s) => s.saveResult)
  const results = useMeasurementsStore((s) => s.results)
  const clearDraft = useMeasurementDraftStore((s) => s.clearDraft)
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const appliances = useOnboardingStore((s) => s.data.appliances)

  const meta = getMeasurementMeta(id)
  const mod = getMeasurementModule(id)

  // Messungen ohne eigene Erklärseite starten direkt beim Erfassen. Dasselbe
  // gilt, wenn zu dieser Instanz bereits ein Zwischenstand liegt (App
  // geschlossen und später weitergemacht, z. B. der zweite Zählerstand beim
  // Grundlast-Check): dann direkt zur Erfassung springen statt wieder bei der
  // Erklärseite zu beginnen, wo der Nutzer erneut durchklicken müsste.
  const phases = mod?.Intro ? PHASES : PHASES_WITHOUT_INTRO
  const hasDraft = Object.keys(readDraft(instanceKey(id, roomKey))).length > 0
  const initialPhase: RunnerPhase = mod?.Intro && !skipIntro && !hasDraft ? 'intro' : 'run'

  const [phase, setPhase] = useState<RunnerPhase>(initialPhase)
  // Höchste bereits erreichte Phase – steuert, welche Segmente rückwärts
  // anklickbar sind (man darf nur zu schon erreichten Phasen zurückspringen).
  const [maxReached, setMaxReached] = useState(phases.indexOf(initialPhase))
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [justSaved, setJustSaved] = useState<SavedState | null>(null)
  const [addRoomOpen, setAddRoomOpen] = useState(false)

  // Wechselt der Raum (z. B. „auto weiter" durch die Räume), Ablauf zurücksetzen.
  // Bewusst während des Renderns statt im Effekt: Sonst zeigt der neue Raum für
  // einen Bildaufbau lang noch den Stand des vorherigen.
  const runKey = `${roomKey ?? ''}|${skipIntro}`
  const [activeRunKey, setActiveRunKey] = useState(runKey)
  if (activeRunKey !== runKey) {
    setActiveRunKey(runKey)
    setPhase(initialPhase)
    setMaxReached(phases.indexOf(initialPhase))
    setOutcome(null)
    setJustSaved(null)
  }

  // Unbekannte oder (noch) nicht verfügbare Messung → zurück zur Übersicht.
  if (!meta || !meta.available || !mod) {
    return <Navigate to="/measurements" replace />
  }

  const devices = meta.perAppliance
    ? applianceInstances(appliances, id as 'fridge' | 'freezer')
    : []

  // Pro-Raum-Messung ohne gewählten Raum → Raum-Auswahl anzeigen.
  if (meta.perRoom && !roomKey) {
    return <RoomPicker id={id} />
  }

  // Geräte-Messung ohne gewähltes Gerät. Bei genau einem Gerät springt die
  // Auswahl von selbst weiter – für den häufigen Fall bleibt der Ablauf damit
  // derselbe wie vorher, nur landet das Ergebnis unter dem Geräteschlüssel.
  // Ohne Gerät fällt es durch: Dann fragt der `ApplianceGate` zuerst, ob es
  // überhaupt eines gibt.
  if (meta.perAppliance && !roomKey && devices.length > 0) {
    if (devices.length === 1) {
      return <Navigate to={`/measurements/${id}?room=${encodeURIComponent(devices[0].id)}`} replace />
    }
    return <ApplianceChooser id={id} devices={devices} results={results} />
  }

  // Erfolgsmoment nach dem Speichern. Er wartet auf den Weiter-Knopf: Bis
  // September 2026 lief hier ein Timer (1600 ms, 700 ms beim Weitermachen)
  // gegen den Knopf an und nahm den Schirm weg, bevor das Ergebnis gelesen
  // war. Wer nichts tut, bleibt jetzt stehen.
  if (justSaved) {
    return <SavedInterstitial state={justSaved} onContinue={() => navigate(justSaved.nextHref)} />
  }

  const { Intro, Run, Result } = mod
  const phaseIndex = phases.indexOf(phase)
  // Nur die Räume, in denen diese Messung etwas zu sagen hat: Der
  // Möbelabstand-Check entfällt in unbeheizten Räumen.
  const instances = roomsForMeasurement(meta, roomInstances(rooms))
  const roomInst = roomKey ? instances.find((r) => r.key === roomKey) : undefined

  // Nächster noch offener Raum dieser Messung – schon vor dem Speichern
  // bekannt, damit der Ergebnis-Schirm ihn beim Namen nennen kann.
  const nextOpenRoom = meta.perRoom
    ? instances.find((inst) => inst.key !== roomKey && !results[instanceKey(id, inst.key)])
    : undefined

  // Dasselbe für Geräte: Der Ergebnis-Schirm soll das nächste beim Namen
  // nennen können, statt nur „weiter" zu sagen.
  const nextOpenDevice = devices.find(
    (device, i) => device.id !== roomKey && !applianceResult(results, id, device.id, i === 0),
  )

  /** Nächste offene Instanz – Raum oder Gerät – samt Beschriftung. */
  const nextOpen = nextOpenRoom
    ? { key: nextOpenRoom.key, label: roomLabel(t, nextOpenRoom) }
    : nextOpenDevice
      ? { key: nextOpenDevice.id, label: applianceLabel(t, nextOpenDevice, devices) }
      : undefined

  function goToPhase(next: RunnerPhase) {
    const nextIndex = phases.indexOf(next)
    setMaxReached((prev) => Math.max(prev, nextIndex))
    setPhase(next)
  }

  function handleEvaluate(next: RunOutcome) {
    setOutcome(next)
    goToPhase('result')
  }

  /** Wohin es nach dem Speichern geht – der Nutzer entscheidet das im Ergebnis. */
  type SaveTarget = 'overview' | 'nextRoom'

  function handleSave(result: MeasurementResult, target: SaveTarget = 'overview') {
    // Eine Messung darf ihren Schlüssel selbst setzen (z. B. Entnahmestelle);
    // sonst greift der Raum aus der URL.
    const full = { ...result, roomKey: result.roomKey ?? roomKey }
    saveResult(full)
    // Zwischenspeicher dieser Messung verwerfen (Ablauf abgeschlossen).
    clearDraft(instanceKey(id, full.roomKey))

    // Vorher sprang der Ablauf nach dem Speichern ungefragt zum nächsten Raum.
    // Wer nur einen Raum messen wollte, landete überraschend im nächsten; wer
    // alle messen wollte, wusste vorher nicht, wohin es geht. Jetzt steht die
    // Wahl auf dem Ergebnis-Schirm, und hier wird sie nur noch ausgeführt.
    const goNext = target === 'nextRoom' && nextOpen !== undefined
    setJustSaved({
      // Nur ein belastbarer Betrag ueber der Anzeigeschwelle wird genannt – der
      // Schirm direkt nach dem Messen ist die sichtbarste Euro-Aussage der App.
      savings: displayableSavingEur(full) ?? 0,
      // `begin=1` überspringt die Erklärseite: Wer „weiter" wählt, hat sie für
      // diesen Check gerade gelesen. Ohne das steht sie vor jedem einzelnen
      // Raum erneut da – und aus dem schnellen Durchlauf wird ein Hindernislauf.
      nextHref: goNext
        ? `/measurements/${id}?room=${encodeURIComponent(nextOpen!.key)}&begin=1`
        : '/measurements',
      nextRoomName: goNext ? nextOpen!.label : undefined,
    })
  }

  /** Zu einem anderen Raum derselben Messung wechseln (Chip im Kopf). */
  function switchRoom(key: string) {
    navigate(`/measurements/${id}?room=${encodeURIComponent(key)}`, { replace: true })
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

        {/* Der Raum stand bisher als toter Text-Suffix in der Überschrift. Wer
            versehentlich im falschen Raum landete, kam nur über den Rückweg zur
            Übersicht wieder heraus – als Chip ist der Wechsel eine Berührung. */}
        {roomInst && (
          <RoomChip
            current={roomInst.key}
            instances={instances}
            onSwitch={switchRoom}
            onAddRoom={() => setAddRoomOpen(true)}
          />
        )}

        {/* Phasen-Segmente: Info · Messen · Ergebnis. Bereits erreichte
            vorherige Segmente dienen als Rück-Navigation (nur zurück). */}
        <div className="glass mt-3 flex gap-1 rounded-2xl p-1">
          {phases.map((p, i) => {
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

      {phase === 'intro' && Intro && (
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

      {phase === 'run' && <Run onEvaluate={handleEvaluate} roomKey={roomKey} />}

      {phase === 'result' && outcome && (
        <>
          <Result result={outcome.result} />
          <div className="flex flex-col gap-2.5">
            {/* Wer alle Heizkörper am Stück abarbeitet, soll nicht nach jedem
                Raum über die Übersicht laufen. Der Knopf nennt den nächsten
                Raum – „weiter" ohne Ziel ist vor einem Bildschirmwechsel eine
                Zumutung. */}
            {nextOpen && (
              <button
                type="button"
                onClick={() => handleSave(outcome.result, 'nextRoom')}
                className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
              >
                {t('measurements.common.saveAndNext', { room: nextOpen.label })}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={() => handleSave(outcome.result)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-2xl px-5 py-3 text-sm transition-[transform,opacity,colors] active:scale-[0.97] ${
                  nextOpen
                    ? 'border border-border bg-surface/70 font-medium text-foreground hover:bg-surface-2'
                    : 'bg-primary font-semibold text-primary-foreground hover:opacity-90'
                }`}
              >
                {t(nextOpen ? 'measurements.common.saveAndOverview' : 'measurements.common.save')}
              </button>
              <button
                type="button"
                onClick={() => goToPhase('run')}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl border border-border bg-surface/70 px-5 py-3 text-sm font-medium text-foreground transition-[transform,colors] hover:bg-surface-2 active:scale-[0.97]"
              >
                {t('measurements.common.again')}
              </button>
            </div>
          </div>
        </>
      )}

      <RoomCreateSheet
        open={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
        onCreated={switchRoom}
      />
    </div>
  )
}

/**
 * Raum-Anzeige im Kopf einer Pro-Raum-Messung: zeigt den aktuellen Raum und
 * klappt die übrigen zum Wechseln auf – samt „Raum anlegen".
 */
function RoomChip({
  current,
  instances,
  onSwitch,
  onAddRoom,
}: {
  current: string
  instances: RoomInstance[]
  onSwitch: (key: string) => void
  onAddRoom: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const inst = instances.find((r) => r.key === current)
  if (!inst) return null

  return (
    <div className="relative mt-1.5 inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="glass focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground"
      >
        <DoorOpen className="h-4 w-4 text-primary" />
        {roomLabel(t, inst)}
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="glass absolute left-0 z-20 mt-2 w-52 rounded-2xl p-1">
            {instances.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => {
                  setOpen(false)
                  if (r.key !== current) onSwitch(r.key)
                }}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  r.key === current
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-surface-2/70'
                }`}
              >
                {roomLabel(t, r)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onAddRoom()
              }}
              className="flex w-full items-center gap-1.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-surface-2/70"
            >
              <Plus className="h-4 w-4" />
              {t('measurements.roomPicker.add')}
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
    // Spalte statt Raster: Die Nachfrage-Karte darunter soll die volle Breite
    // der Erfolgskarte einnehmen, nicht auf Inhaltsbreite schrumpfen.
    <div className="flex min-h-[60vh] flex-col justify-center">
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

      {/* Nachfrage im besten Moment: Der Versuch ist geschafft, die Ersparnis
          steht da. Bewusst UNTER der Erfolgskarte und ohne Overlay, damit der
          Belohnungsmoment nicht gekappt wird. Ob überhaupt gefragt wird,
          entscheidet `shouldPrompt()` im feedbackStore. */}
      <FeedbackPrompt />
    </div>
  )
}

/**
 * Raum-Auswahl für Pro-Raum-Messungen (mit Status je Raum).
 *
 * Ohne angelegte Räume stand hier bisher nur „Du hast noch keine Zimmer
 * ausgewählt" – eine Sackgasse, in der jeder Schnellstart-Nutzer landete. Jetzt
 * ist das Anlegen dort die Hauptaktion und steht sonst als Zeile unter der
 * Liste.
 */
function RoomPicker({ id }: { id: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const results = useMeasurementsStore((s) => s.results)
  const meta = getMeasurementMeta(id)
  // Unbeheizte Räume stehen hier nicht zur Wahl – im Keller ohne Heizung gibt
  // es nichts freizuhalten.
  const instances = meta ? roomsForMeasurement(meta, roomInstances(rooms)) : roomInstances(rooms)
  const [addOpen, setAddOpen] = useState(false)

  function startIn(key: string) {
    navigate(`/measurements/${id}?room=${encodeURIComponent(key)}`)
  }

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
        <p className="mt-1 text-muted">
          {t(instances.length === 0 ? 'measurements.roomPicker.emptyHint' : 'measurements.roomPicker.subtitle')}
        </p>
      </div>

      {instances.length > 0 && (
        <div className="space-y-2">
          {instances.map((inst) => {
            const done = Boolean(results[instanceKey(id, inst.key)])
            return (
              <button
                key={inst.key}
                type="button"
                onClick={() => startIn(inst.key)}
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

      {/* Ohne Räume der Primärknopf, mit Räumen eine ruhige Zeile darunter. */}
      <button
        type="button"
        onClick={() => setAddOpen(true)}
        className={
          instances.length === 0
            ? 'flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]'
            : 'focus-ring flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground'
        }
      >
        <Plus className="h-4 w-4" />
        {t('measurements.roomPicker.add')}
      </button>

      <RoomCreateSheet open={addOpen} onClose={() => setAddOpen(false)} onCreated={startIn} />
    </div>
  )
}
