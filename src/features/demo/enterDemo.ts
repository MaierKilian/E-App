import { useSettingsStore } from '@/store/settingsStore'
import { resetAllStores, hydrate } from '@/features/sync/stores'
import { buildDemoSnapshot } from './demoProfile'

/** Der Link-Parameter, mit dem eine Adresse die Beispiel-Wohnung anfordert. */
export const DEMO_PARAM = 'demo'

/**
 * Fragt diese Adresse die Beispiel-Wohnung an (`?demo`)?
 *
 * Zwei Stellen müssen dieselbe Antwort geben: Der Dialog, der das Laden
 * anbietet, und die Erst-Besuch-Weiche, die einen `?demo`-Aufruf durchlässt,
 * statt ihn auf die Landing Page umzuleiten. Stünde die Prüfung zweimal
 * geschrieben, könnten beide auseinanderlaufen – und ein Deep-Link verlöre
 * seinen Pfad, bevor jemand den Dialog beantwortet hat.
 *
 * `URLSearchParams.has` prüft den ganzen Schlüssel: `?demonstration=1` fragt
 * die Beispiel-Wohnung nicht an.
 */
export function wantsDemo(search: string): boolean {
  return new URLSearchParams(search).has(DEMO_PARAM)
}

/**
 * Lädt die fertig befüllte Beispiel-Wohnung in die lokalen Stores (Demo-Modus).
 *
 * Reihenfolge ist wichtig: Erst den Demo-Modus setzen, damit die Cloud-Sync den
 * folgenden Import nicht als echte Änderung hochschreibt (schützt angemeldete
 * Nutzer), dann lokale Stores leeren und den Demo-Schnappschuss einspielen.
 * Die Einführung gilt danach als gesehen, damit das Beispiel sofort erscheint.
 *
 * Rein clientseitig – kein Konto, kein Firestore. Die Navigation zur Zielseite
 * übernimmt der Aufrufer.
 */
export function enterDemo() {
  const { setDemoMode, setIntroSeen } = useSettingsStore.getState()
  setDemoMode(true)
  resetAllStores()
  hydrate(buildDemoSnapshot())
  setIntroSeen(true)
}
