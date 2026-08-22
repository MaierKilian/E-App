import { useNavigate } from 'react-router-dom'
import { logout } from './auth'

/**
 * Abmelden und danach auf der Landing Page landen.
 *
 * Ohne die Navigation blieb der Nutzer auf dem Zuhause-Tab stehen. Da beim
 * Abmelden die Wohnungsdaten lokal geleert werden (Datenschutz auf geteilten
 * Geräten, siehe `cloudSync.onUserChange`), stand dort anschließend der
 * Onboarding-Assistent mit „Los geht's" – das las sich wie ein Fehler, nicht
 * wie eine erfolgreiche Abmeldung.
 *
 * Ziel ist `/willkommen`, nicht `/`: Letzteres schickt jeden mit gesetztem
 * `introSeen` sofort zurück ins Onboarding, und `introSeen` überlebt das
 * Abmelden bewusst. `/willkommen` zeigt dieselbe Landing Page, zählt sie aber
 * nicht als echten Erstbesuch in den Conversion-Kennzahlen.
 *
 * Scheitert das Abmelden (z. B. kein Netz), wird nicht navigiert – sonst
 * behauptete die Oberfläche eine Abmeldung, die nicht stattgefunden hat.
 */
export function useLogout() {
  const navigate = useNavigate()
  return async function logoutAndLeave() {
    await logout()
    navigate('/willkommen', { replace: true })
  }
}
