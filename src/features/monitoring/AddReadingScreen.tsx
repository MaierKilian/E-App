import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Keyboard, Gauge, ScanLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { OdometerInput } from './OdometerInput'
import { clampInt } from './odometer'

// Der Scanner zieht Tesseract.js (WASM) nach – nur bei Bedarf laden.
const MeterScanner = lazy(() =>
  import('./MeterScanner').then((m) => ({ default: m.MeterScanner })),
)

interface AddReadingScreenProps {
  type: EnergyType
  unit: string
  /** Name des Energieträgers (übersetzt). */
  typeLabel: string
  /** Typ-eigener Akzent (Icon-Tönung, Fokus, aktives Zählwerk). */
  accent: string
  /** Icon des Energieträgers. */
  icon: LucideIcon
  /** Letzter bekannter Stand als Default für das Zählwerk (Ganzzahl-Anteil). */
  defaultValue: number
  onClose: () => void
}

/** Anzahl Ganzzahl-Stellen des Zählwerks. */
const DIGITS = 6

/** Heutiges Datum als ISO yyyy-mm-dd in lokaler Zeitzone. */
function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

/**
 * Vollflächiger, ruhiger Eingabe-Screen für eine neue Ablesung.
 * Liquid-Glass-Hintergrund (position: fixed per Inline-Style, da `.glass`
 * sonst position:relative erzwingt). Zählwerk-Optik mit optionaler manueller
 * Tastatureingabe. Bereich-/NaN-sicher.
 */
export function AddReadingScreen({
  type,
  unit,
  typeLabel,
  accent,
  icon: Icon,
  defaultValue,
  onClose,
}: AddReadingScreenProps) {
  const { t } = useTranslation()
  const addReading = useReadingsStore((s) => s.addReading)

  const max = 10 ** DIGITS - 1
  const [date, setDate] = useState(todayIso)
  const [value, setValue] = useState(() => clampInt(defaultValue, max))
  const [keyboard, setKeyboard] = useState(false)
  const [scanning, setScanning] = useState(false)
  // Manuelles Tastaturfeld erlaubt auch Dezimaleingabe.
  const [text, setText] = useState(() => String(clampInt(defaultValue, max)))

  /** Ergebnis aus dem Kamera-Scan übernehmen: in die Tastatureingabe füllen,
   *  damit der Nutzer es vor dem Speichern noch im Kontext sieht/korrigiert. */
  function handleScanResult(scanned: number) {
    setKeyboard(true)
    setText(String(scanned))
    setValue(clampInt(scanned, max))
    setScanning(false)
  }

  /** Aktuell gültiger numerischer Wert (Zählwerk oder Tastatur). */
  const parsedText = Number.parseFloat(text.replace(',', '.'))
  const effectiveValue = keyboard
    ? Number.isFinite(parsedText) && parsedText >= 0
      ? parsedText
      : NaN
    : value
  const valid = date !== '' && Number.isFinite(effectiveValue) && effectiveValue >= 0

  function handleSave() {
    if (!valid) return
    addReading(type, { date, value: effectiveValue })
    onClose()
  }

  return (
    <div
      className="glass z-50 flex flex-col p-5 animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              {t('monitoring.odometer.title')}
            </h2>
            <p className="text-sm text-muted truncate">
              {typeLabel} · {unit}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="grid place-items-center w-9 h-9 rounded-xl text-muted hover:text-foreground transition-colors shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center gap-6">
        {/* Datum */}
        <div className="space-y-1.5">
          <label htmlFor="add-reading-date" className="text-sm font-medium text-foreground">
            {t('monitoring.odometer.date')}
          </label>
          <input
            id="add-reading-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Eingabe: Zählwerk oder Tastatur */}
        {keyboard ? (
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-48 rounded-2xl border border-border bg-surface-2/60 px-4 py-4 text-center text-3xl font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-base text-muted">{unit}</span>
          </div>
        ) : (
          <OdometerInput digits={DIGITS} value={value} onChange={setValue} accent={accent} />
        )}

        {/* Aktionen: Scannen + Umschalter Zählwerk <-> Tastatur */}
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            style={{ background: accent }}
          >
            <ScanLine className="w-4 h-4" />
            {t('scan.button')}
            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">
              {t('scan.beta')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (keyboard) {
                // Tastatur -> Zählwerk: ganzzahligen Anteil übernehmen.
                setValue(clampInt(Number.isFinite(parsedText) ? parsedText : 0, max))
              } else {
                // Zählwerk -> Tastatur: aktuellen Wert vorbelegen.
                setText(String(value))
              }
              setKeyboard((v) => !v)
            }}
            className="glass flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2/70 transition-colors"
          >
            {keyboard ? <Gauge className="w-4 h-4" /> : <Keyboard className="w-4 h-4" />}
            {keyboard ? t('monitoring.odometer.wheel') : t('monitoring.odometer.keyboard')}
          </button>
        </div>
      </div>

      {scanning && (
        <Suspense fallback={null}>
          <MeterScanner
            unit={unit}
            accent={accent}
            lastReading={clampInt(defaultValue, max)}
            onResult={handleScanResult}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!valid}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {t('monitoring.odometer.save')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          {t('monitoring.odometer.cancel')}
        </button>
      </div>
    </div>
  )
}
