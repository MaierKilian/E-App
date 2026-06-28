import { logEvent } from 'firebase/analytics'
import { analyticsReady } from '@/lib/firebase'

/** Erlaubte Werte für Analytics-Parameter. */
type EventParams = Record<string, string | number | boolean>

/**
 * Sendet ein Analytics-Ereignis – sofern Analytics verfügbar ist.
 * Schlägt nie fehl (Fehler werden geschluckt), damit die App nie davon abhängt.
 *
 * Beispiel: track('measurement_completed', { id: 'showerhead' })
 */
export async function track(name: string, params?: EventParams) {
  try {
    const analytics = await analyticsReady
    if (analytics) logEvent(analytics, name, params)
  } catch {
    // Analytics ist optional – Fehler bewusst ignorieren.
  }
}
