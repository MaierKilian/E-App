import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { FirebaseError } from 'firebase/app'
import { auth } from '@/lib/firebase'
import { track } from '@/features/analytics/analytics'

const googleProvider = new GoogleAuthProvider()

/** Neues Konto mit E-Mail + Passwort anlegen (optional mit Anzeigename). */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(cred.user, { displayName })
  }
  void track('sign_up', { method: 'password' })
  return cred.user
}

/** Mit bestehendem E-Mail-Konto anmelden. */
export async function loginWithEmail(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password)
  void track('login', { method: 'password' })
  return cred.user
}

/** Auf Mobilgeräten / In-App-Browsern ist ein Popup unzuverlässig – dort Redirect. */
function prefersRedirect(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /Android|iPhone|iPad|iPod|Mobile|WhatsApp|Instagram|FBAN|FBAV|Line\/|GSA/i.test(ua)
}

/**
 * Anmeldung über das Google-Konto.
 * - Mobil/In-App-Browser: Weiterleitung (Redirect), da Popups dort blockiert/
 *   abgebrochen werden.
 * - Desktop: Popup; scheitert es (blockiert/nicht unterstützt), Fallback auf Redirect.
 * Bei Redirect wird `null` zurückgegeben – die Seite lädt neu, der Abschluss
 * erfolgt über `completeGoogleRedirect()` beim App-Start.
 */
export async function loginWithGoogle() {
  if (prefersRedirect()) {
    await signInWithRedirect(auth, googleProvider)
    return null
  }
  try {
    const cred = await signInWithPopup(auth, googleProvider)
    void track('login', { method: 'google' })
    return cred.user
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      [
        'auth/popup-blocked',
        'auth/operation-not-supported-in-this-environment',
        'auth/web-storage-unsupported',
        'auth/internal-error',
      ].includes(error.code)
    ) {
      await signInWithRedirect(auth, googleProvider)
      return null
    }
    throw error
  }
}

/**
 * Schließt eine laufende Google-Weiterleitung nach der Rückkehr ab.
 * Einmalig beim App-Start aufrufen; den Store aktualisiert onAuthStateChanged.
 */
export async function completeGoogleRedirect(): Promise<void> {
  try {
    const result = await getRedirectResult(auth)
    if (result?.user) void track('login', { method: 'google' })
  } catch {
    // Fehler beim Abschluss ignorieren – die Anmeldung kann wiederholt werden.
  }
}

/** Passwort-Zurücksetzen-Mail anfordern. */
export function sendPasswordReset(email: string) {
  return sendPasswordResetEmail(auth, email)
}

/** Abmelden. */
export function logout() {
  return firebaseSignOut(auth)
}

/**
 * Übersetzt einen Firebase-Auth-Fehler in einen i18n-Schlüssel-Suffix.
 * Die Login-Seite zeigt darüber eine verständliche deutsche Meldung.
 */
export function authErrorKey(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'invalidEmail'
      case 'auth/missing-password':
        return 'missingPassword'
      case 'auth/weak-password':
        return 'weakPassword'
      case 'auth/email-already-in-use':
        return 'emailInUse'
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'invalidCredential'
      case 'auth/too-many-requests':
        return 'tooManyRequests'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'popupClosed'
      case 'auth/network-request-failed':
        return 'network'
      default:
        return 'generic'
    }
  }
  return 'generic'
}
