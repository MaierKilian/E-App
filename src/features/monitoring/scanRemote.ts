import { httpsCallable, type HttpsCallableResult } from 'firebase/functions'
import { functions } from '@/lib/firebase'

/**
 * Zähler-Scan über die Firebase-Funktion `scanMeter` (Google Gemini).
 * Der API-Key liegt geschützt in der Funktion – hier wird nur das Foto
 * (JPEG als Base64, ohne data:-Präfix) hochgeladen und das Ergebnis geholt.
 *
 * Feature-Flag: Solange die Funktion nicht deployt/kein Key gesetzt ist,
 * schlägt der Aufruf fehl – der Scanner fällt dann auf On-Device-OCR zurück.
 */

/** Global (de)aktivierbar. true = zuerst Gemini versuchen, sonst On-Device. */
export const REMOTE_SCAN_ENABLED = true

export interface RemoteScanInput {
  /** JPEG als Base64 (ohne `data:image/...;base64,`-Präfix). */
  imageBase64: string
  /** Einheit des Zählers (z. B. 'm³', 'kWh') – Hinweis für die Erkennung. */
  unit?: string
  /** Letzter bekannter Zählerstand – grober Plausibilitäts-Hinweis. */
  lastReading?: number
}

export interface RemoteScanResult {
  digits: string
  confidence: 'high' | 'medium' | 'low'
}

/** Ruft die Gemini-Funktion auf. Wirft bei fehlender Funktion/Key/Netz. */
export async function recognizeMeterRemote(input: RemoteScanInput): Promise<RemoteScanResult> {
  const call = httpsCallable<RemoteScanInput, RemoteScanResult>(functions, 'scanMeter')
  const res: HttpsCallableResult<RemoteScanResult> = await call(input)
  return res.data
}
