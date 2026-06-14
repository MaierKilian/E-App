import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, RotateCcw } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { SelectChip } from '@/components/ui/SelectChip'
import {
  calcBaseLoad,
  wattsFromFerraris,
  wattsFromTimed,
  type MeterMode,
} from './baseLoad'
import type { RunProps } from '../runnerTypes'

const MODES: MeterMode[] = ['instant', 'timed', 'ferraris']

function parseNum(raw: string): number {
  const v = Number(raw.replace(',', '.'))
  return Number.isFinite(v) && v >= 0 ? v : 0
}

function fmtElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Durchführung des Grundlast-Checks. Der Nutzer wählt seinen Zählertyp; je nach
 * Modus wird die Leistung direkt eingegeben (digital mit W-Anzeige), über eine
 * Zeitmessung des kWh-Stands ermittelt oder aus den Umdrehungen einer Ferraris-
 * Drehscheibe berechnet. Eine eingebaute Stoppuhr misst die Zeit selbst.
 */
export function BaseLoadRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [mode, setMode] = useState<MeterMode>('instant')

  // Direkte Eingabe (digital mit W-Anzeige).
  const [instantW, setInstantW] = useState(0)
  // Zeitmessung (kWh-Zählerstand).
  const [startKwh, setStartKwh] = useState('')
  const [endKwh, setEndKwh] = useState('')
  // Ferraris-Drehscheibe.
  const [revolutions, setRevolutions] = useState('')
  const [constant, setConstant] = useState('')

  // Gemeinsame Stoppuhr (für Zeitmessung & Ferraris).
  const [running, setRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const startRef = useRef(0)

  useEffect(() => {
    if (!running) return
    const tick = () => setElapsedMs(performance.now() - startRef.current)
    const iv = setInterval(tick, 200)
    return () => clearInterval(iv)
  }, [running])

  // Moduswechsel setzt die Stoppuhr zurück (Messung gilt nur fürs gewählte Verfahren).
  function changeMode(next: MeterMode) {
    setMode(next)
    setRunning(false)
    setElapsedMs(0)
  }

  function startWatch() {
    startRef.current = performance.now()
    setElapsedMs(0)
    setRunning(true)
  }
  function stopWatch() {
    setElapsedMs(performance.now() - startRef.current)
    setRunning(false)
  }
  function resetWatch() {
    setRunning(false)
    setElapsedMs(0)
  }

  const watts =
    mode === 'instant'
      ? instantW
      : mode === 'timed'
        ? wattsFromTimed(parseNum(startKwh), parseNum(endKwh), elapsedMs)
        : wattsFromFerraris(parseNum(revolutions), parseNum(constant), elapsedMs)

  const watchReady = !running && elapsedMs > 0
  const canEvaluate =
    mode === 'instant'
      ? instantW > 0
      : mode === 'timed'
        ? watchReady && parseNum(endKwh) > parseNum(startKwh)
        : watchReady && parseNum(revolutions) > 0 && parseNum(constant) > 0

  const wattsFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcBaseLoad(watts, workPriceCt)
    onEvaluate({
      result: {
        id: 'base_load',
        rating: calc.rating,
        primaryValue: calc.watts,
        unit: 'W',
        completedAt: new Date().toISOString(),
        // Bewusst KEIN avoidableCost/yearlySaving: Grundlast ist Diagnose,
        // die € beziffern die Folge-Checks (kein Doppelzählen).
        details: { watts: calc.watts, annualKwh: calc.annualKwh, annualEur: calc.annualEur },
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
              onClick={() => changeMode(m)}
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
                type="number"
                inputMode="decimal"
                min={0}
                value={instantW > 0 ? instantW : ''}
                onChange={(e) => setInstantW(parseNum(e.target.value))}
                placeholder="0"
                className="focus-ring w-24 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
              />
              <span className="text-sm text-muted">W</span>
            </span>
          </label>
        </div>
      )}

      {(mode === 'timed' || mode === 'ferraris') && (
        <div className="glass rounded-3xl p-5 space-y-4">
          {mode === 'timed' ? (
            <NumberField
              label={t('measurements.base_load.run.startKwh')}
              unit="kWh"
              value={startKwh}
              onChange={setStartKwh}
            />
          ) : (
            <NumberField
              label={t('measurements.base_load.run.constant')}
              unit="U/kWh"
              value={constant}
              onChange={setConstant}
            />
          )}

          <div className="rounded-2xl border border-border bg-surface/50 p-4 text-center">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {fmtElapsed(elapsedMs)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {t(`measurements.base_load.run.watchHint.${mode}`)}
            </p>
            <div className="mt-3 flex justify-center gap-2">
              {!running ? (
                <button
                  type="button"
                  onClick={startWatch}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                >
                  <Play className="h-4 w-4" />
                  {elapsedMs > 0
                    ? t('measurements.base_load.run.restart')
                    : t('measurements.base_load.run.start')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopWatch}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
                >
                  <Square className="h-4 w-4" />
                  {t('measurements.base_load.run.stop')}
                </button>
              )}
              {!running && elapsedMs > 0 && (
                <button
                  type="button"
                  onClick={resetWatch}
                  aria-label={t('measurements.base_load.run.reset')}
                  className="focus-ring glass inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-medium text-muted transition-transform active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {watchReady &&
            (mode === 'timed' ? (
              <NumberField
                label={t('measurements.base_load.run.endKwh')}
                unit="kWh"
                value={endKwh}
                onChange={setEndKwh}
              />
            ) : (
              <NumberField
                label={t('measurements.base_load.run.revolutions')}
                unit=""
                value={revolutions}
                onChange={setRevolutions}
              />
            ))}
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
    </div>
  )
}

/** Beschriftetes Zahlenfeld mit Einheit. */
function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0"
          className="focus-ring w-28 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
        />
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </span>
    </label>
  )
}
