import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Camera, RotateCcw, Check, Loader2, AlertTriangle } from 'lucide-react'
import { cropAndPreprocess, recognizeDigits } from './ocr'

interface MeterScannerProps {
  unit: string
  /** Typ-Akzentfarbe (Rahmen, Aktion). */
  accent: string
  /** Übergibt den bestätigten Wert an den Aufrufer. */
  onResult: (value: number) => void
  onClose: () => void
}

/** Anteiliger Erfassungsrahmen (mittiges Band) – für Overlay und Crop identisch. */
const GUIDE = { w: 0.86, h: 0.16 }
/** Unter diesem Konfidenzwert deutlich zur Prüfung mahnen. */
const LOW_CONFIDENCE = 70

type Phase = 'camera' | 'processing' | 'confirm' | 'error'

/**
 * Vollflächiger Zähler-Scanner: Live-Kamera mit Erfassungsrahmen, ein Auslöser
 * friert das Bild ein und liest die Ziffern per On-Device-OCR. Das Ergebnis wird
 * nur vorgeschlagen – der Nutzer prüft und übernimmt es (kein Blind-Vertrauen).
 */
export function MeterScanner({ unit, accent, onResult, onClose }: MeterScannerProps) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('camera')
  const [errorKey, setErrorKey] = useState<string>('scan.errorPermission')
  const [preview, setPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState(0)

  // Kamera starten / aufräumen.
  useEffect(() => {
    let cancelled = false
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorKey('scan.errorInsecure')
        setPhase('error')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
      } catch (err) {
        const name = (err as DOMException)?.name
        setErrorKey(
          name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'scan.errorNoCamera'
            : 'scan.errorPermission',
        )
        setPhase('error')
      }
    }
    void start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
  }, [])

  async function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    const sw = vw * GUIDE.w
    const sh = vh * GUIDE.h
    const sx = (vw - sw) / 2
    const sy = (vh - sh) / 2

    const canvas = cropAndPreprocess(video, sx, sy, sw, sh)
    setPreview(canvas.toDataURL('image/png'))
    setPhase('processing')
    try {
      const res = await recognizeDigits(canvas)
      setText(res.digits)
      setConfidence(res.confidence)
    } catch {
      setText('')
      setConfidence(0)
    }
    setPhase('confirm')
  }

  function apply() {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed >= 0) onResult(parsed)
  }

  const lowConfidence = phase === 'confirm' && (text === '' || confidence < LOW_CONFIDENCE)

  return (
    <div
      className="z-[60] flex flex-col bg-black"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Kopfzeile */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{t('scan.title')}</p>
          <p className="truncate text-xs text-white/60">{unit}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white/80 transition-colors hover:bg-white/10"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Kamera / Vorschau-Bühne */}
      <div className="relative flex-1 overflow-hidden">
        {phase === 'error' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-white/80">
            <AlertTriangle className="h-9 w-9 text-amber-400" />
            <p className="text-sm">{t(errorKey)}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${phase === 'camera' ? '' : 'opacity-0'}`}
            />
            {/* Eingefrorene Vorschau */}
            {preview && phase !== 'camera' && (
              <img
                src={preview}
                alt=""
                className="absolute left-1/2 top-1/2 w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20"
              />
            )}
            {/* Erfassungsrahmen */}
            {phase === 'camera' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div
                  className="rounded-2xl"
                  style={{
                    width: `${GUIDE.w * 100}%`,
                    aspectRatio: `${GUIDE.w} / ${GUIDE.h}`,
                    boxShadow: '0 0 0 100vmax rgba(0,0,0,0.5)',
                    outline: `3px solid ${accent}`,
                    outlineOffset: '2px',
                  }}
                />
                <p className="absolute bottom-6 left-0 right-0 px-8 text-center text-sm text-white/80">
                  {t('scan.hint')}
                </p>
              </div>
            )}
            {phase === 'processing' && (
              <div className="absolute inset-0 grid place-items-center bg-black/40">
                <div className="flex items-center gap-2 rounded-2xl bg-black/70 px-4 py-2 text-sm text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('scan.processing')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Aktionsleiste */}
      <div className="px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
        {phase === 'camera' && (
          <button
            type="button"
            onClick={capture}
            className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white"
            style={{ background: accent }}
          >
            <Camera className="h-5 w-5" />
            {t('scan.capture')}
          </button>
        )}

        {phase === 'confirm' && (
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-sm font-medium text-white">{t('scan.confirmTitle')}</p>
              <p className="mt-0.5 text-xs text-white/60">
                {lowConfidence ? t('scan.lowConfidence') : t('scan.confirmHint')}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('scan.noDigits')}
                className="w-52 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-center text-2xl font-bold tabular-nums text-white placeholder:text-xs placeholder:font-normal placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <span className="text-sm text-white/70">{unit}</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreview(null)
                  setPhase('camera')
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-white/25 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
                {t('scan.retry')}
              </button>
              <button
                type="button"
                onClick={apply}
                disabled={Number.isNaN(Number.parseFloat(text.replace(',', '.')))}
                className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ background: accent }}
              >
                <Check className="h-4 w-4" />
                {t('scan.apply')}
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-white/25 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
          >
            {t('scan.cancel')}
          </button>
        )}
      </div>
    </div>
  )
}
