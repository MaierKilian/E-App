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
  useAuthStore.setState({ user, initializing: false })
})

/** Bequemer Zugriff auf den aktuellen Nutzer. */
export const useUser = () => useAuthStore((s) => s.user)

/** true, wenn ein Nutzer angemeldet ist. */
export const useIsAuthenticated = () => useAuthStore((s) => s.user !== null)
