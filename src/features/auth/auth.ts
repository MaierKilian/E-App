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

/**
 * Signalisiert: Wir laufen in einem eingebetteten In-App-Browser, in dem Google
 * die OAuth-Anmeldung grundsätzlich blockiert. Die Login-Seite übersetzt das in
 * einen verständlichen Hinweis („im echten Browser öffnen").
 */
export class InAppBrowserError extends Error {
  constructor() {
    super('in-app-browser')
    this.name = 'InAppBrowserError'
  }
}

/**
 * Erkennt eingebettete In-App-Browser (WhatsApp, Instagram, Facebook, TikTok …).
 * Google verweigert dort die Anmeldung mit „disallowed_useragent“ – der Nutzer
 * muss die Seite im System-Browser (Safari/Chrome) öffnen.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|Snapchat|Twitter|WeChat|MicroMessenger|TikTok|Pinterest/i.test(
    ua,
  )
}

/**
 * Popup-Fehler, bei denen ein Redirect als Rückfallebene sinnvoll ist – d. h. das
 * Popup konnte gar nicht geöffnet/genutzt werden. Ein vom Nutzer geschlossenes
 * Popup gehört bewusst NICHT dazu (das wäre nur nervig).
 */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
  'auth/internal-error',
])

/**
 * Anmeldung über das Google-Konto – bewusst **Popup zuerst, auch mobil**.
 *
 * Warum: `signInWithRedirect` löst das Ergebnis nach der Rückkehr in einem
 * versteckten Cross-Site-iframe auf. Safari/iOS (ITP, Storage-Partitionierung)
 * und Home-Screen-PWAs blockieren das – `getRedirectResult()` liefert dann oft
 * `null`, der Nutzer ist trotz Umleitung nicht angemeldet. Das Popup dagegen
 * meldet per `postMessage` zurück (kein Drittanbieter-Cookie nötig) und ist
 * daher deutlich zuverlässiger. Es wird durch den Button-Klick (User-Geste)
 * ausgelöst und daher auf modernen Browsern nicht blockiert.
 *
 * Nur wenn das Popup wirklich nicht geht (blockiert/nicht unterstützt), fällt es
 * auf `signInWithRedirect` zurück (Rückgabe `null`; Abschluss beim nächsten
 * App-Start über `completeGoogleRedirect()`).
 */
export async function loginWithGoogle() {
  // In eingebetteten Webviews sperrt Google OAuth komplett – gar nicht erst versuchen.
  if (isInAppBrowser()) throw new InAppBrowserError()
  try {
    const cred = await signInWithPopup(auth, googleProvider)
    void track('login', { method: 'google' })
    return cred.user
  } catch (error) {
    if (error instanceof FirebaseError && REDIRECT_FALLBACK_CODES.has(error.code)) {
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
  } catch (e) {
    // Anmeldung kann wiederholt werden – aber zur Diagnose protokollieren,
    // statt still zu scheitern (typisch bei Safari/ITP-Problemen mit Redirect).
    console.warn('[auth] Google-Redirect-Abschluss fehlgeschlagen:', e)
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
  if (error instanceof InAppBrowserError) return 'inAppBrowser'
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
