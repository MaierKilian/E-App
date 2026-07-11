import type { Worker } from 'tesseract.js'

/**
 * On-Device-OCR für Zählerstände (Tesseract.js, WASM). Läuft komplett im Browser
 * – das Kamerabild verlässt das Gerät nicht. Die Engine (WASM + Sprachdaten)
 * wird beim ersten Scan einmalig geladen und danach gecacht.
 *
 * Bewusst als *Assistent*: erkannte Ziffern werden nur vorgeschlagen, der Nutzer
 * bestätigt/korrigiert sie (siehe MeterScanner). Generische OCR ist auf realen
 * Zählern nicht fehlerfrei – gerade mechanische Rollenzählwerke, Spiegelungen
 * und schräge Winkel sind schwierig.
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
  /** Zusammenhängende Ziffernfolge (alles Nicht-Ziffern entfernt). */
  digits: string
  /** Konfidenz 0–100 (grob). */
  confidence: number
}

/**
 * Schneidet aus einer Quelle (Video/Canvas) einen Bereich aus und bereitet ihn
 * für die Erkennung auf: hochskalieren, Graustufen, Kontrast strecken.
 */
export function cropAndPreprocess(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  // Schmale Ausschnitte hochskalieren – Tesseract mag ~30–50 px hohe Ziffern.
  const scale = Math.max(2, Math.min(4, 900 / Math.max(1, sw)))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const d = img.data
  // 1) Graustufen + Min/Max ermitteln.
  let min = 255
  let max = 0
  for (let i = 0; i < d.length; i += 4) {
    const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0
    d[i] = d[i + 1] = d[i + 2] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  // 2) Kontrast strecken (mit kleinem Sicherheitsabstand gegen Rauschen).
  const lo = min + (max - min) * 0.1
  const hi = max - (max - min) * 0.1
  const range = Math.max(1, hi - lo)
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.max(0, Math.min(255, ((d[i] - lo) / range) * 255))
    d[i] = d[i + 1] = d[i + 2] = v
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

/** Erkennt Ziffern in einem vorbereiteten Canvas. */
export async function recognizeDigits(source: HTMLCanvasElement): Promise<OcrResult> {
  const worker = await getWorker()
  const { data } = await worker.recognize(source)
  const digits = (data.text.match(/\d/g) ?? []).join('')
  return { digits, confidence: Math.round(data.confidence) }
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
