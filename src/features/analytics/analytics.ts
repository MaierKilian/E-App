import { logEvent, setAnalyticsCollectionEnabled } from 'firebase/analytics'
import { loadAnalytics, analyticsStarted, ANALYTICS_MEASUREMENT_ID } from '@/lib/firebase'
import { hasAnalyticsConsent } from '@/features/legal/consent'
import { clearAnalyticsCookies } from '@/features/legal/cookies'

/** Erlaubte Werte für Analytics-Parameter. */
type EventParams = Record<string, string | number | boolean>

/**
 * Sendet ein Analytics-Ereignis – ausschließlich, wenn eine wirksame
 * Einwilligung vorliegt (§ 25 Abs. 1 TDDDG, Art. 6 Abs. 1 lit. a DSGVO).
 * Schlägt nie fehl (Fehler werden geschluckt), damit die App nie davon abhängt.
 *
 * Wichtig: Die Prüfung steht VOR `loadAnalytics()`. Ohne Einwilligung wird das
 * Analytics-SDK gar nicht erst initialisiert – es würde sonst allein durch das
 * Laden Cookies setzen.
 *
 * Beispiel: track('measurement_completed', { id: 'showerhead' })
 */
export async function track(name: string, params?: EventParams) {
  if (!hasAnalyticsConsent()) return
  try {
    const analytics = await loadAnalytics()
    if (analytics) logEvent(analytics, name, params)
  } catch {
    // Analytics ist optional – Fehler bewusst ignorieren.
  }
}

/**
 * Googles offizieller Opt-out-Schalter. Wird `window['ga-disable-<MESS-ID>']`
 * auf `true` gesetzt, unterbindet das gtag-Skript jede Übertragung – auch die
 * automatisch erfassten Ereignisse. Zweite Verteidigungslinie neben dem
 * verzögerten Laden.
 */
function setGoogleOptOut(disabled: boolean) {
  if (typeof window === 'undefined' || !ANALYTICS_MEASUREMENT_ID) return
  ;(window as unknown as Record<string, boolean>)[`ga-disable-${ANALYTICS_MEASUREMENT_ID}`] =
    disabled
}

/**
 * Setzt die aktuelle Einwilligung technisch durch. Beim Start der App und nach
 * jeder Änderung der Einwilligung aufrufen.
 *
 * Mit Einwilligung: Analytics wird geladen und die Erfassung eingeschaltet.
 * Ohne Einwilligung: nichts wird geladen; war in dieser Sitzung bereits
 * eingewilligt worden (Widerruf), wird die Erfassung abgeschaltet, der
 * Google-Opt-out gesetzt und die bereits gesetzten `_ga`-Cookies werden
 * gelöscht – ein Widerruf darf keine Wiedererkennung zurücklassen
 * (Art. 7 Abs. 3 DSGVO).
 */
export async function applyAnalyticsConsent() {
  const granted = hasAnalyticsConsent()
  setGoogleOptOut(!granted)

  if (!granted) {
    try {
      if (analyticsStarted()) {
        const analytics = await loadAnalytics()
        if (analytics) setAnalyticsCollectionEnabled(analytics, false)
      }
    } catch {
      // Analytics ist optional – Fehler bewusst ignorieren.
    }
    clearAnalyticsCookies()
    return
  }

  try {
    const analytics = await loadAnalytics()
    if (analytics) setAnalyticsCollectionEnabled(analytics, true)
  } catch {
    // Analytics ist optional – Fehler bewusst ignorieren.
  }
}
