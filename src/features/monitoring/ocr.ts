import type { Worker } from 'tesseract.js'

/**
 * On-Device-OCR für Zählerstände (Tesseract.js, WASM). Läuft komplett im Browser
 * – das Kamerabild verlässt das Gerät nicht. Die Engine (WASM + Sprachdaten)
 * wird beim ersten Scan einmalig geladen und danach gecacht.
 *
 * Bewusst als *Assistent*: erkannte Ziffern werden nur vorgeschlagen, der Nutzer
 * bestätigt/korrigiert sie (siehe MeterScanner). Zählwerke sind schwierig
 * (helle Ziffern auf dunklem Grund, mechanische Rollen, Spiegelungen) – deshalb
 * eng auf die Ziffernzeile zuschneiden und robust nachverarbeiten.
 */

let workerPromise: Promise<Worker> | null = null

/** Lazily erstellter, wiederverwendeter Worker (Init ist teuer). */
async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import('tesseract.js')
      const worker = await createWorker('eng')
      await worker.setParameters({
        // Nur Ziffern zulassen – erhöht die Trefferquote auf Zählwerken deutlich.
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      })
      return worker
    })()
  }
  return workerPromise
}

export interface OcrResult {
  /** Beste zusammenhängende Ziffernfolge (längster Lauf). */
  digits: string
  /** Konfidenz 0–100 (grob). */
  confidence: number
}

/** Zielhöhe des aufbereiteten Ausschnitts – Tesseract mag große, klare Ziffern. */
const TARGET_HEIGHT = 160

/**
 * Schneidet aus einer Quelle (Video/Canvas) einen Bereich aus und bereitet ihn
 * für die Erkennung auf: auf Zielhöhe skalieren, Graustufen, Perzentil-Kontrast
 * (robuster als Min/Max, verträgt Glanzlichter/Schatten besser).
 */
export function cropAndPreprocess(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const scale = Math.max(1, Math.min(6, TARGET_HEIGHT / Math.max(1, sh)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  // 1) Graustufen + Helligkeits-Histogramm.
  const hist = new Array(256).fill(0)
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
    d[i] = d[i + 1] = d[i + 2] = g
    hist[g]++
  }
  // 2) Perzentil-Grenzen (3 %/97 %) für den Kontrast-Stretch bestimmen.
  const total = canvas.width * canvas.height
  const loCount = total * 0.03
  const hiCount = total * 0.97
  let acc = 0
  let lo = 0
  let hi = 255
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc <= loCount) lo = v
    if (acc <= hiCount) hi = v
  }
  const range = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) / range) * 255))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Längste zusammenhängende Ziffernfolge (verwirft Streu-Ziffern am Rand). */
function longestDigitRun(text: string): string {
  const runs = text.match(/\d+/g)
  if (!runs) return ''
  return runs.reduce((best, r) => (r.length > best.length ? r : best), '')
}

/** Erkennt Ziffern in einem vorbereiteten Canvas. */
export async function recognizeDigits(source: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(source)
  return { digits: longestDigitRun(data.text), confidence: Math.round(data.confidence) }
}

/** Worker freigeben (z. B. wenn der Scanner geschlossen wird). */
export async function terminateOcr(): Promise<void> {
  if (!workerPromise) return
  try {
    const worker = await workerPromise
    await worker.terminate()
  } finally {
    workerPromise = null
  }
}
