import { logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics'
import { analyticsReady } from '@/lib/firebase'
import { useSettingsStore } from '@/store/settingsStore'

/** Erlaubte Werte für Analytics-Parameter. */
type EventParams = Record<string, string | number | boolean>

/**
 * Sendet ein Analytics-Ereignis – sofern Analytics verfügbar ist und der Nutzer
 * der anonymen Nutzungsstatistik nicht widersprochen hat (`analyticsEnabled`).
 * Schlägt nie fehl (Fehler werden geschluckt), damit die App nie davon abhängt.
 *
 * Beispiel: track('measurement_completed', { id: 'showerhead' })
 */
export async function track(name: string, params?: EventParams) {
  // Opt-out respektieren: kein Ereignis senden, wenn abgeschaltet.
  if (!useSettingsStore.getState().analyticsEnabled) return
  try {
    const analytics = await analyticsReady
    if (analytics) logEvent(analytics, name, params)
  } catch {
    // Analytics ist optional – Fehler bewusst ignorieren.
  }
}

/**
 * Überträgt die aktuelle Analytics-Einwilligung auf Firebase Analytics, sodass
 * auch die automatisch erfassten Ereignisse (z. B. Sitzungsstart) der Wahl des
 * Nutzers folgen. Beim Start und nach jeder Änderung des Schalters aufrufen.
 */
export async function syncAnalyticsConsent() {
  try {
    const analytics = await analyticsReady
    if (analytics) {
      setAnalyticsCollectionEnabled(analytics, useSettingsStore.getState().analyticsEnabled)
    }
  } catch {
    // Analytics ist optional – Fehler bewusst ignorieren.
  }
}
