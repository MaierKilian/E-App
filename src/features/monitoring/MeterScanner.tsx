import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Camera, RotateCcw, Check, Loader2, AlertTriangle, Flashlight, FlashlightOff } from 'lucide-react'
import { cropAndPreprocess, recognizeDigits } from './ocr'
import { recognizeMeterRemote, REMOTE_SCAN_ENABLED } from './scanRemote'

interface MeterScannerProps {
  unit: string
  /** Typ-Akzentfarbe (Rahmen, Aktion). */
  accent: string
  /** Letzter bekannter Zählerstand – als Referenz im Prüf-Schritt. */
  lastReading?: number
  /** Übergibt den bestätigten Wert an den Aufrufer. */
  onResult: (value: number) => void
  onClose: () => void
}

/** Erfassungsrahmen: breite, flache Ziffernzeile (Anteil der Videobreite + Aspekt). */
const GUIDE_W = 0.9
const GUIDE_ASPECT = 5
/** Unter diesem Konfidenzwert deutlich zur Prüfung mahnen. */
const LOW_CONFIDENCE = 75

type Phase = 'camera' | 'processing' | 'confirm' | 'error'

/**
 * Vollflächiger Zähler-Scanner: Live-Kamera mit flachem Ziffernzeilen-Rahmen.
 * Ein Auslöser friert das Bild ein, schneidet exakt den Rahmen aus der echten
 * Kameraauflösung aus (object-fit-korrekt) und liest die Ziffern per On-Device-
 * OCR. Das Ergebnis wird nur vorgeschlagen – der Nutzer prüft und übernimmt es.
 */
export function MeterScanner({ unit, accent, lastReading, onResult, onClose }: MeterScannerProps) {
  const { t, i18n } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<Phase>('camera')
  const [errorKey, setErrorKey] = useState<string>('scan.errorPermission')
  const [preview, setPreview] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [confidence, setConfidence] = useState(0)
  // Taschenlampe: nur anbieten, wenn das Gerät die `torch`-Fähigkeit meldet
  // (v. a. Android-Chrome). iOS-Safari kann das derzeit nicht – dort bleibt der
  // Schalter aus, statt einen wirkungslosen Knopf zu zeigen.
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

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
        // Taschenlampen-Fähigkeit des Kamera-Tracks abfragen (nicht überall verfügbar).
        const track = stream.getVideoTracks()[0]
        const caps = (track?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean }
        if (caps.torch) setTorchSupported(true)
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

  /** Taschenlampe des Kamera-Tracks an-/ausschalten (Live-Constraint). */
  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      // `torch` ist (noch) nicht Teil der DOM-Typen → bewusst über unknown casten.
      await track.applyConstraints({ advanced: [{ torch: next }] } as unknown as MediaTrackConstraints)
      setTorchOn(next)
    } catch {
      // Gerät lehnt die Steuerung ab → Schalter zurückziehen.
      setTorchSupported(false)
      setTorchOn(false)
    }
  }

  async function capture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const vw = video.videoWidth
    const vh = video.videoHeight
    const rect = video.getBoundingClientRect()

    // object-fit: cover → Skalierung und Versatz des sichtbaren Ausschnitts.
    const scale = Math.max(rect.width / vw, rect.height / vh)
    const offX = (vw * scale - rect.width) / 2
    const offY = (vh * scale - rect.height) / 2

    // Rahmen (in CSS-Pixeln, mittig) → echte Kamerapixel.
    const gw = rect.width * GUIDE_W
    const gh = gw / GUIDE_ASPECT
    const gx = (rect.width - gw) / 2
    const gy = (rect.height - gh) / 2
    const sx = (offX + gx) / scale
    const sy = (offY + gy) / scale
    const sw = gw / scale
    const sh = gh / scale

    // Farb-Ausschnitt (JPEG) für Gemini – moderat verkleinert, kleine Payload.
    const maxW = 1000
    const cscale = Math.min(1, maxW / Math.max(1, sw))
    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = Math.round(sw * cscale)
    colorCanvas.height = Math.round(sh * cscale)
    colorCanvas
      .getContext('2d')
      ?.drawImage(video, sx, sy, sw, sh, 0, 0, colorCanvas.width, colorCanvas.height)
    const jpeg = colorCanvas.toDataURL('image/jpeg', 0.75)
    setPreview(jpeg)
    setPhase('processing')

    let digits = ''
    let conf = 0

    // 1) Gemini (Firebase-Funktion) – deutlich zuverlässiger auf echten Zählern.
    if (REMOTE_SCAN_ENABLED) {
      try {
        const res = await recognizeMeterRemote({
          imageBase64: jpeg.split(',')[1] ?? '',
          unit,
          lastReading,
        })
        digits = res.digits
        conf = res.confidence === 'high' ? 95 : res.confidence === 'medium' ? 70 : 40
      } catch {
        // Funktion nicht deployt / kein Key / Netz → On-Device-Fallback unten.
      }
    }

    // 2) Fallback: On-Device-OCR (Tesseract), wenn Gemini nichts lieferte.
    if (!digits) {
      try {
        const canvas = cropAndPreprocess(video, sx, sy, sw, sh)
        const res = await recognizeDigits(canvas)
        digits = res.digits
        conf = res.confidence
      } catch {
        // beides leer → Nutzer tippt manuell ein
      }
    }

    setText(digits)
    setConfidence(conf)
    setPhase('confirm')
  }

  function apply() {
    const parsed = Number.parseFloat(text.replace(',', '.'))
    if (Number.isFinite(parsed) && parsed >= 0) onResult(parsed)
  }

  const parsedValue = Number.parseFloat(text.replace(',', '.'))
  const lowConfidence = phase === 'confirm' && (text === '' || confidence < LOW_CONFIDENCE)
  const lastLabel =
    lastReading !== undefined && lastReading > 0
      ? new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(lastReading)
      : null

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
            {/* Eingefrorene Vorschau des ausgewerteten Ausschnitts */}
            {preview && phase !== 'camera' && (
              <img
                src={preview}
                alt=""
                className="absolute left-1/2 top-1/2 w-[90%] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/20"
              />
            )}
            {/* Erfassungsrahmen (flache Ziffernzeile) */}
            {phase === 'camera' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div
                  className="rounded-2xl"
                  style={{
                    width: `${GUIDE_W * 100}%`,
                    aspectRatio: `${GUIDE_ASPECT}`,
                    boxShadow: '0 0 0 100vmax rgba(0,0,0,0.55)',
                    outline: `3px solid ${accent}`,
                    outlineOffset: '2px',
                  }}
                />
                <p className="absolute bottom-6 left-0 right-0 px-8 text-center text-sm text-white/80">
                  {t('scan.hint')}
                </p>
              </div>
            )}
            {/* Taschenlampe – nur wenn das Gerät sie unterstützt und die Kamera live ist. */}
            {phase === 'camera' && torchSupported && (
              <button
                type="button"
                onClick={toggleTorch}
                aria-label={t('scan.torch')}
                aria-pressed={torchOn}
                className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full backdrop-blur-sm transition-colors"
                style={{
                  background: torchOn ? accent : 'rgba(0,0,0,0.45)',
                  color: torchOn ? '#fff' : 'rgba(255,255,255,0.85)',
                }}
              >
                {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
              </button>
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
            {lastLabel && (
              <p className="text-center text-xs text-white/50">
                {t('scan.lastReading', { value: lastLabel, unit })}
              </p>
            )}
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
                disabled={!Number.isFinite(parsedValue) || parsedValue < 0}
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
