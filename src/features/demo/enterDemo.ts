import { useSettingsStore } from '@/store/settingsStore'
import { resetAllStores, hydrate } from '@/features/sync/stores'
import { buildDemoSnapshot } from './demoProfile'

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
