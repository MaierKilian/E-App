import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, RotateCcw, Clock, Check, AlertTriangle } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { useReadingsStore } from '@/store/readingsStore'
import { stats } from '@/features/monitoring/readings'
import { SelectChip } from '@/components/ui/SelectChip'
import { Stepper } from '@/components/ui/Stepper'
import { Stopwatch } from '@/components/ui/Stopwatch'
import { DecimalField } from '@/components/ui/DecimalField'
import { parseDecimalInput } from '@/lib/decimalInput'
import { instanceKey } from '../rooms'
import { RATING_COLOR } from '../rating'
import { ReadingCapture } from './ReadingCapture'
import {
  calcBaseLoad,
  CYCLE_SAFE_MS,
  plausibleWatts,
  readableOvernight,
  readingsQuality,
  recommendedWaitMs,
  wattsFromImpulses,
  wattsFromTimed,
  METER_RESOLUTIONS,
  type MeterMode,
} from './baseLoad'
import type { RunProps } from '../runnerTypes'

const MODES: MeterMode[] = ['instant', 'impulse', 'readings']
const DEFAULT_RESOLUTION = 0.1
/** Zehn Impulse sind ein guter Kompromiss aus Wartezeit und Reaktionsfehler. */
const DEFAULT_IMPULSES = 10

/** Welcher Zählerstand gerade erfasst wird. */
type Capturing = 'start' | 'end'

/**
 * Durchführung des Grundlast-Checks.
 *
 * Zwei Wege: Zeigt der Zähler die Leistung direkt in Watt an, wird sie
 * eingetippt. Sonst werden **zwei Zählerstände mit zeitlichem Abstand**
 * erfasst – das funktioniert mit jedem Zähler und ist der ehrlichere Weg, weil
 * es über die Taktung des Kühlschranks mittelt.
 *
 * Die frühere Stoppuhr ist ersatzlos entfallen: Sie verlangte, Minuten lang vor
 * dem Zähler zu warten, in denen sich dessen Anzeige gar nicht bewegen konnte.
 * Stattdessen merkt sich die Messung ihren Startpunkt im Draft-Store – der
 * Nutzer legt das Handy weg und kommt am nächsten Morgen wieder, so wie es
 * Kühlschrank- und Gefriertruhen-Check schon halten.
 */
export function BaseLoadRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const setDraft = useMeasurementDraftStore((s) => s.setDraft)
  const electricityReadings = useReadingsStore((s) => s.readings.electricity)
  const key = instanceKey('base_load')
  const d = readDraft(key)

  // Liegt bereits eine erste Ablesung im Zwischenspeicher, direkt im
  // Ablesungs-Modus starten – sonst verschwindet der Zwischenstand beim
  // Wiedereinstieg hinter dem Watt-Eingabefeld, obwohl er noch da ist.
  const [mode, setMode] = useState<MeterMode>(d.startAt ? 'readings' : 'instant')
  const [instantText, setInstantText] = useState('')

  // Impuls-Messung. Die Zählerkonstante steht auf dem Typenschild und ändert
  // sich nie – sie im Entwurf zu halten erspart das Nachschauen beim nächsten
  // Mal. Die gestoppte Zeit dagegen gehört zu genau einem Versuch.
  const [impulsesPerKwh, setImpulsesPerKwh] = useState<number | undefined>(
    d.impulsesPerKwh || undefined,
  )
  const [impulses, setImpulses] = useState(d.impulses || DEFAULT_IMPULSES)
  const [seconds, setSeconds] = useState(0)

  // Zwei Ablesungen – über Stunden hinweg, daher persistiert.
  const [resolution, setResolution] = useState(d.resolution ?? DEFAULT_RESOLUTION)
  // Der Zeitstempel entscheidet, ob eine Ablesung vorliegt: Der Draft-Store
  // speichert nur Zahlen und kennt kein „gelöscht", ein Zählerstand darf aber
  // 0 sein. Ein Zeitstempel von 0 kann dagegen nie echt sein.
  const [startKwh, setStartKwh] = useState<number | undefined>(
    d.startAt ? d.startKwh : undefined,
  )
  const [startAt, setStartAt] = useState<number | undefined>(d.startAt || undefined)
  const [endKwh, setEndKwh] = useState<number | undefined>(d.endAt ? d.endKwh : undefined)
  const [endAt, setEndAt] = useState<number | undefined>(d.endAt || undefined)
  const [capturing, setCapturing] = useState<Capturing | undefined>()

  // Uhrzeit-Anzeige aktuell halten, solange die Messung läuft.
  const [now, setNow] = useState(() => Date.now())
  const waiting = startAt !== undefined && endAt === undefined
  useEffect(() => {
    if (!waiting) return
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [waiting])

  useEffect(() => {
    // Alle Felder immer schreiben: setDraft ergänzt nur, es entfernt nichts –
    // ausgelassene Schlüssel behielten sonst nach „Neu beginnen" ihren alten Wert.
    setDraft(key, {
      resolution,
      startKwh: startKwh ?? 0,
      startAt: startAt ?? 0,
      endKwh: endKwh ?? 0,
      endAt: endAt ?? 0,
      impulsesPerKwh: impulsesPerKwh ?? 0,
      impulses,
    })
  }, [key, setDraft, resolution, startKwh, startAt, endKwh, endAt, impulsesPerKwh, impulses])

  function restart() {
    setStartKwh(undefined)
    setStartAt(undefined)
    setEndKwh(undefined)
    setEndAt(undefined)
  }

  function handleCaptured(value: number) {
    if (capturing === 'start') {
      setStartKwh(value)
      setStartAt(Date.now())
      setEndKwh(undefined)
      setEndAt(undefined)
    } else {
      setEndKwh(value)
      setEndAt(Date.now())
    }
    setCapturing(undefined)
  }

  const elapsedMs =
    startAt === undefined ? 0 : (endAt ?? now) - startAt
  const complete = startKwh !== undefined && endKwh !== undefined && startAt !== undefined
  const quality = complete
    ? readingsQuality(startKwh, endKwh, elapsedMs, resolution)
    : undefined
  const recommendedMs = recommendedWaitMs(resolution)

  const instantW = parseDecimalInput(instantText, i18n.language) ?? 0
  const impulseW = wattsFromImpulses(impulses, seconds, impulsesPerKwh ?? 0)
  const watts =
    mode === 'instant'
      ? instantW
      : mode === 'impulse'
        ? impulseW
        : complete
          ? wattsFromTimed(startKwh, endKwh, elapsedMs)
          : 0

  // Die Zwei-Ablesungen-Messung bringt ihre eigene Prüfung mit; die beiden
  // Momentaufnahmen brauchen wenigstens die physikalische Schranke – ein
  // vertippter Zählerfaktor ergibt sonst genauso Megawatt wie früher eine
  // zweite Ablesung Sekunden nach der ersten.
  const canEvaluate =
    mode === 'readings' ? Boolean(quality?.usable) : plausibleWatts(watts)

  const wattsFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const kwhFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3 })
  const pctFmt = new Intl.NumberFormat(i18n.language, {
    style: 'percent',
    maximumFractionDigits: 0,
  })

  /** Dauer als „7 Std. 20 Min." bzw. „45 Min." – Sekunden sind hier bedeutungslos. */
  function fmtDuration(ms: number): string {
    const totalMin = Math.max(0, Math.round(ms / 60000))
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    if (h === 0) return t('measurements.base_load.run.duration.minutes', { m })
    if (m === 0) return t('measurements.base_load.run.duration.hours', { h })
    return t('measurements.base_load.run.duration.hoursMinutes', { h, m })
  }

  function handleEvaluate() {
    if (!canEvaluate) return
    // Mit Ablesungen im Monitoring wird am Anteil am Jahresverbrauch bewertet
    // statt an absoluten Watt – siehe rateBaseLoad.
    const totalYearKwh = stats(electricityReadings ?? []).projectedYearKwh
    const calc = calcBaseLoad(watts, workPriceCt, totalYearKwh)
    const details: Record<string, number> = {
      watts: calc.watts,
      annualKwh: calc.annualKwh,
      annualEur: calc.annualEur,
    }
    // Momentaufnahme oder gemittelt – das Ergebnis soll sagen können, worauf es beruht.
    if (mode === 'readings' && quality) {
      details.measuredMs = elapsedMs
      details.uncertainty = Math.round(quality.uncertainty * 100) / 100
    }
    onEvaluate({
      result: {
        id: 'base_load',
        rating: calc.rating,
        primaryValue: calc.watts,
        unit: 'W',
        completedAt: new Date().toISOString(),
        // Bewusst KEIN avoidableCost/yearlySaving: Grundlast ist Diagnose,
        // die € beziffern die Folge-Checks (kein Doppelzählen).
        details,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-5">
        <p className="mb-3 text-sm font-semibold text-foreground">
          {t('measurements.base_load.run.meterTitle')}
        </p>
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <SelectChip
              key={m}
              label={t(`measurements.base_load.run.modes.${m}`)}
              selected={mode === m}
              onClick={() => setMode(m)}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(`measurements.base_load.run.modeHint.${mode}`)}
        </p>
      </div>

      {mode === 'instant' && (
        <div className="glass rounded-3xl p-5">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {t('measurements.base_load.run.instantLabel')}
            </span>
            <span className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={instantText}
                onChange={(e) => setInstantText(e.target.value)}
                placeholder="0"
                className="focus-ring w-24 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
              />
              <span className="text-sm text-muted">W</span>
            </span>
          </label>
          <p className="mt-3 text-xs text-muted">
            {t('measurements.base_load.run.instantNote')}
          </p>
        </div>
      )}

      {mode === 'impulse' && (
        <>
          <div className="glass rounded-3xl p-5">
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {t('measurements.base_load.run.impulse.constantLabel')}
              </span>
              <span className="flex items-center gap-2">
                <DecimalField
                  value={impulsesPerKwh}
                  onChange={setImpulsesPerKwh}
                  placeholder="1000"
                  className="focus-ring w-28 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
                />
                <span className="text-sm text-muted">
                  {t('measurements.base_load.run.impulse.constantUnit')}
                </span>
              </span>
            </label>
            <p className="mt-3 text-xs text-muted">
              {t('measurements.base_load.run.impulse.constantHint')}
            </p>
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {t('measurements.base_load.run.impulse.countLabel')}
              </p>
              <Stepper value={impulses} min={1} max={200} onChange={setImpulses} />
            </div>
            <p className="mt-3 text-xs text-muted">
              {t('measurements.base_load.run.impulse.countHint')}
            </p>
            <div className="mt-4">
              <Stopwatch onChange={setSeconds} />
            </div>
            {seconds > 0 && (
              <label className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  {t('measurements.base_load.run.impulse.secondsManual')}
                </span>
                <span className="flex items-center gap-1.5">
                  <DecimalField
                    value={seconds}
                    onChange={(v) => setSeconds(v ?? 0)}
                    className="focus-ring w-20 rounded-xl bg-surface-2 px-3 py-1.5 text-right font-semibold tabular-nums text-foreground"
                  />
                  <span className="text-muted">
                    {t('measurements.base_load.run.impulse.secondsUnit')}
                  </span>
                </span>
              </label>
            )}
            {seconds > 0 && impulsesPerKwh !== undefined && !plausibleWatts(impulseW) && (
              <p className="mt-3 flex gap-2 text-xs text-muted">
                <AlertTriangle
                  className="mt-0.5 h-3.5 w-3.5 shrink-0"
                  style={{ color: RATING_COLOR.elevated }}
                  aria-hidden="true"
                />
                <span>{t('measurements.base_load.run.impulse.implausible')}</span>
              </p>
            )}
          </div>

          <p className="px-1 text-xs text-muted">
            {t('measurements.base_load.run.impulse.snapshotNote')}
          </p>
        </>
      )}

      {mode === 'readings' && startAt === undefined && (
        <>
          <div className="glass rounded-3xl p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">
              {t('measurements.base_load.run.resolutionTitle')}
            </p>
            <div className="flex flex-wrap gap-2">
              {METER_RESOLUTIONS.map((r) => (
                <SelectChip
                  key={r}
                  label={`${kwhFmt.format(r)} kWh`}
                  selected={resolution === r}
                  onClick={() => setResolution(r)}
                />
              ))}
            </div>
            {readableOvernight(resolution) ? (
              <p className="mt-3 text-xs text-muted">
                {t('measurements.base_load.run.resolutionHint', {
                  duration: fmtDuration(recommendedMs),
                })}
              </p>
            ) : (
              <div className="mt-3">
                <p className="flex gap-2 text-xs text-muted">
                  <AlertTriangle
                    className="mt-0.5 h-3.5 w-3.5 shrink-0"
                    style={{ color: RATING_COLOR.elevated }}
                    aria-hidden="true"
                  />
                  <span>{t('measurements.base_load.run.resolutionTooCoarse')}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setMode('impulse')}
                  className="focus-ring mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                >
                  {t('measurements.base_load.run.resolutionToImpulse')}
                </button>
              </div>
            )}
          </div>

          <div className="glass rounded-3xl p-5">
            <p className="text-sm font-semibold text-foreground">
              {t('measurements.base_load.run.firstTitle')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {t('measurements.base_load.run.firstHint')}
            </p>
            <button
              type="button"
              onClick={() => setCapturing('start')}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
            >
              <Camera className="h-4 w-4" />
              {t('measurements.base_load.run.captureFirst')}
            </button>
          </div>
        </>
      )}

      {mode === 'readings' && startAt !== undefined && (
        <div className="glass space-y-4 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">
              {t('measurements.base_load.run.startValue')}
            </span>
            <span className="text-sm font-semibold tabular-nums text-foreground">
              {kwhFmt.format(startKwh ?? 0)} kWh
            </span>
          </div>

          {endAt === undefined ? (
            <div className="rounded-2xl border border-border bg-surface/50 p-4 text-center">
              <p className="flex items-center justify-center gap-1.5 text-2xl font-bold tabular-nums text-foreground">
                <Clock className="h-5 w-5 text-muted" aria-hidden="true" />
                {fmtDuration(elapsedMs)}
              </p>
              <p className="mt-1 text-xs text-muted">
                {elapsedMs >= recommendedMs
                  ? t('measurements.base_load.run.ready')
                  : t('measurements.base_load.run.waitHint', {
                      duration: fmtDuration(recommendedMs - elapsedMs),
                    })}
              </p>
              <button
                type="button"
                onClick={() => setCapturing('end')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
              >
                <Camera className="h-4 w-4" />
                {t('measurements.base_load.run.captureSecond')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted">
                  {t('measurements.base_load.run.endValue')}
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {kwhFmt.format(endKwh ?? 0)} kWh
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted">
                  {t('measurements.base_load.run.measuredOver')}
                </span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {fmtDuration(elapsedMs)}
                </span>
              </div>
              {quality && (
                <p className="flex gap-2 text-xs text-muted">
                  {quality.usable ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={{ color: RATING_COLOR.elevated }}
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {quality.usable
                      ? t(`measurements.base_load.run.quality.${quality.level}`, {
                          pct: pctFmt.format(quality.uncertainty),
                        })
                      : t(`measurements.base_load.run.quality.${quality.problem}`, {
                          resolution: kwhFmt.format(resolution),
                          duration: fmtDuration(CYCLE_SAFE_MS),
                        })}
                  </span>
                </p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={restart}
            className="focus-ring inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-muted transition-transform active:scale-95"
          >
            <RotateCcw className="h-4 w-4" />
            {t('measurements.base_load.run.restart')}
          </button>
        </div>
      )}

      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <span className="text-sm font-medium text-muted">
          {t('measurements.base_load.run.resultLabel')}
        </span>
        <span className="text-lg font-bold tabular-nums text-foreground">
          {canEvaluate ? `${wattsFmt.format(Math.round(watts))} W` : '–'}
        </span>
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>

      {capturing && (
        <ReadingCapture
          title={t(
            capturing === 'start'
              ? 'measurements.base_load.run.firstTitle'
              : 'measurements.base_load.run.secondTitle',
          )}
          hint={t(
            capturing === 'start'
              ? 'measurements.base_load.run.capture.hintFirst'
              : 'measurements.base_load.run.capture.hintSecond',
          )}
          lastReading={capturing === 'end' ? startKwh : undefined}
          onConfirm={handleCaptured}
          onClose={() => setCapturing(undefined)}
        />
      )}
    </div>
  )
}
