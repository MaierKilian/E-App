import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
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

/** Anmeldung über das Google-Konto (Popup). */
export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  void track('login', { method: 'google' })
  return cred.user
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
