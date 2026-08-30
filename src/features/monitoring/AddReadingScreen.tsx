import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Keyboard, Gauge, ScanLine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useReadingsStore, type EnergyType, type MeterReading } from '@/store/readingsStore'
import { OdometerInput } from './OdometerInput'
import { FillLevelInput } from './FillLevelInput'
import { clampInt } from './odometer'
import { parseDecimalInput, formatDecimalInput } from '@/lib/decimalInput'
import { todayIso } from '@/lib/timeAxis'

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
  /**
   * Vorratszähler: Statt des Zählwerks erscheint die Füllstands-Eingabe, der
   * Kamera-Scan entfällt. Ein Peilstab ist kein Zählwerk – und `scanMeter` ist
   * auf Zählwerke geprompted, nicht auf Schwimmeranzeigen.
   */
  level?: boolean
  /** Fassungsvermögen des Vorrats; ohne Angabe rechnet die Eingabe in Prozent. */
  capacity?: number
  /** Wenn gesetzt: bestehende Ablesung bearbeiten statt neu anlegen. */
  editReading?: MeterReading
  onClose: () => void
}

/** Anzahl Ganzzahl-Stellen des Zählwerks. */
const DIGITS = 6


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
  level = false,
  capacity,
  editReading,
  onClose,
}: AddReadingScreenProps) {
  const { t, i18n } = useTranslation()
  const addReading = useReadingsStore((s) => s.addReading)
  const updateReading = useReadingsStore((s) => s.updateReading)

  const max = 10 ** DIGITS - 1
  // Beim Bearbeiten die vorhandenen Werte vorbelegen, sonst „neu" (heute + Default).
  const initialValue = editReading ? editReading.value : defaultValue
  const [date, setDate] = useState(() => editReading?.date ?? todayIso())
  const [value, setValue] = useState(() => clampInt(Math.trunc(initialValue), max))
  // Bei Dezimalwerten direkt die Tastatur zeigen, damit die Nachkommastelle
  // sichtbar ist. Beim Vorrat übernimmt die Füllstands-Eingabe diese Rolle;
  // dort ist die Tastatur der Nebenweg für absolute Werte.
  const [keyboard, setKeyboard] = useState(
    () => !level && !Number.isInteger(initialValue),
  )
  // Der Füllstand ist nicht auf ganze Zahlen beschränkt – ein Prozentschritt
  // eines 3000-l-Tanks sind 30 l.
  const [levelValue, setLevelValue] = useState(() => (Number.isFinite(initialValue) ? initialValue : 0))
  const [scanning, setScanning] = useState(false)
  // Manuelles Tastaturfeld erlaubt auch Dezimaleingabe.
  const [text, setText] = useState(() => String(initialValue))

  /** Ergebnis aus dem Kamera-Scan übernehmen: in die Tastatureingabe füllen,
   *  damit der Nutzer es vor dem Speichern noch im Kontext sieht/korrigiert. */
  function handleScanResult(scanned: number) {
    setKeyboard(true)
    setText(String(scanned))
    setValue(clampInt(scanned, max))
    setScanning(false)
  }

  /** Aktuell gültiger numerischer Wert (Zählwerk oder Tastatur). */
  const parsedText = parseDecimalInput(text, i18n.language)
  const effectiveValue = keyboard ? (parsedText ?? NaN) : level ? levelValue : value
  const valid = date !== '' && Number.isFinite(effectiveValue) && effectiveValue >= 0

  function handleSave() {
    if (!valid) return
    if (editReading) {
      updateReading(type, editReading.id, { date, value: effectiveValue })
    } else {
      addReading(type, { date, value: effectiveValue })
    }
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
              {t(
                level
                  ? editReading
                    ? 'monitoring.tank.levelEditTitle'
                    : 'monitoring.tank.levelTitle'
                  : editReading
                    ? 'monitoring.odometer.editTitle'
                    : 'monitoring.odometer.title',
              )}
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
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-48 rounded-2xl border border-border bg-surface-2/60 px-4 py-4 text-center text-3xl font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="text-base text-muted">{unit}</span>
          </div>
        ) : level ? (
          <FillLevelInput
            value={levelValue}
            capacity={capacity}
            unit={unit}
            accent={accent}
            onChange={setLevelValue}
          />
        ) : (
          <OdometerInput digits={DIGITS} value={value} onChange={setValue} accent={accent} />
        )}

        {/* Aktionen: Scannen + Umschalter Zählwerk <-> Tastatur */}
        <div className="flex justify-center gap-2">
          {!level && (
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              <ScanLine className="w-4 h-4" />
              {t('scan.button')}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (keyboard) {
                // Tastatur -> Anzeige: den getippten Wert übernehmen.
                if (level) setLevelValue(parsedText ?? 0)
                else setValue(clampInt(parsedText ?? 0, max))
              } else {
                // Anzeige -> Tastatur: aktuellen Wert vorbelegen.
                setText(formatDecimalInput(level ? levelValue : value, i18n.language))
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

      {scanning && !level && (
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
