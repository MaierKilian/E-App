import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, ScanLine } from 'lucide-react'
import { ENERGY_META } from '@/features/monitoring/energyConfig'

// Der Scanner zieht Tesseract.js (WASM) nach – nur bei Bedarf laden.
const MeterScanner = lazy(() =>
  import('@/features/monitoring/MeterScanner').then((m) => ({ default: m.MeterScanner })),
)

interface ReadingCaptureProps {
  /** Überschrift, z. B. „Erste Ablesung". */
  title: string
  /** Erläuterung unter der Überschrift. */
  hint: string
  /**
   * Vorheriger Stand. Dient dem Scanner als Referenz und dem Formular als
   * Untergrenze – die zweite Ablesung muss über der ersten liegen.
   */
  lastReading?: number
  onConfirm: (value: number) => void
  onClose: () => void
}

/**
 * Erfassung eines Zählerstands für den Grundlast-Check.
 *
 * Bewusst als Freitext-Feld statt als Zählwerk (`OdometerInput`): Für die
 * Grundlast ist die Nachkommastelle die eigentliche Messgröße, und das Zählwerk
 * kennt nur ganze Zahlen. Der Kamera-Scanner aus dem Monitoring wird
 * mitbenutzt; seine On-Device-OCR liefert nur Ziffernfolgen, deshalb landet
 * sein Vorschlag – wie beim Ablesen im Monitoring – im Textfeld, wo der Nutzer
 * das Komma ergänzt und den Wert bestätigt.
 */
export function ReadingCapture({
  title,
  hint,
  lastReading,
  onConfirm,
  onClose,
}: ReadingCaptureProps) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [scanning, setScanning] = useState(false)
  const accent = ENERGY_META.electricity.accent

  const parsed = Number.parseFloat(text.replace(',', '.'))
  const finite = Number.isFinite(parsed) && parsed >= 0
  // Ein rückläufiger Zählerstand ist immer ein Tippfehler – Zähler laufen vorwärts.
  const tooLow = finite && lastReading !== undefined && parsed <= lastReading
  const valid = finite && !tooLow

  return (
    <div
      className="glass z-50 flex flex-col p-5 animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">{hint}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            min={0}
            step="any"
            inputMode="decimal"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="0,0"
            aria-label={t('measurements.base_load.run.capture.valueLabel')}
            className="w-52 rounded-2xl border border-border bg-surface-2/60 px-4 py-4 text-center text-3xl font-bold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <span className="text-base text-muted">kWh</span>
        </div>

        <p className="min-h-[1.25rem] text-center text-xs text-muted">
          {tooLow
            ? t('measurements.base_load.run.capture.tooLow')
            : t('measurements.base_load.run.capture.decimalHint')}
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            style={{ background: accent }}
          >
            <ScanLine className="h-4 w-4" />
            {t('scan.button')}
          </button>
        </div>
      </div>

      {scanning && (
        <Suspense fallback={null}>
          <MeterScanner
            unit="kWh"
            accent={accent}
            lastReading={lastReading}
            onResult={(scanned) => {
              setText(String(scanned))
              setScanning(false)
            }}
            onClose={() => setScanning(false)}
          />
        </Suspense>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => valid && onConfirm(parsed)}
          disabled={!valid}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {t('measurements.base_load.run.capture.confirm')}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('measurements.base_load.run.capture.cancel')}
        </button>
      </div>
    </div>
  )
}
