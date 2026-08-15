import { create } from 'zustand'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'

interface AuthState {
  /** Aktuell eingeloggter Nutzer – oder null, wenn niemand angemeldet ist. */
  user: User | null
  /** true, solange Firebase den Anmeldestatus beim Start noch prüft. */
  initializing: boolean
}

/**
 * Globaler Anmeldestatus. Wird von Firebase Authentication gespeist:
 * Der Listener unten aktualisiert den Store automatisch bei Login/Logout –
 * auch über mehrere Browser-Tabs hinweg.
 */
export const useAuthStore = create<AuthState>(() => ({
  user: null,
  initializing: true,
}))

// Firebase-Listener einmalig starten (beim ersten Import dieses Moduls).
onAuthStateChanged(auth, (user) => {
  // Anonyme Konten sind bewusst KEINE angemeldeten Nutzer im Sinne der App.
  //
  // Hintergrund: Der Feedback-Kanal meldet Gäste im Hintergrund anonym an, damit
  // die Firestore-Regel an `request.auth != null` hängen kann, ohne die
  // Collection offen zu schreiben (siehe docs/feedback-concept.md, §6.3). Ohne
  // diesen Filter würde so ein Konto die ganze App umschalten: `LoginGate` gäbe
  // gesperrte Bereiche frei, `initCloudSync` legte ein Wohnprofil in der Cloud
  // an und das Konto-Menü zeigte einen Nutzer ohne E-Mail.
  //
  // Das anonyme Konto ist reine Schreibberechtigung für ein einzelnes Dokument.
  // Wer es braucht, greift direkt über `auth.currentUser` darauf zu –
  // absichtlich nur in `features/feedback/submitFeedback.ts`.
  useAuthStore.setState({
    user: user && !user.isAnonymous ? user : null,
    initializing: false,
  })
})

/** Bequemer Zugriff auf den aktuellen Nutzer. */
export const useUser = () => useAuthStore((s) => s.user)

/** true, wenn ein Nutzer angemeldet ist. */
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null)
