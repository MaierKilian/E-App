import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { useSettingsStore } from '@/store/settingsStore'
import type { FeedbackSource } from '@/store/feedbackStore'
import { APP_VERSION } from '@/app/version'
import i18n from '@/i18n'

/** Stimmungsauswahl – ein Klick, schon allein auswertbar. */
export const SENTIMENTS = ['bad', 'neutral', 'good'] as const
export type Sentiment = (typeof SENTIMENTS)[number]

/** Grobe Einordnung. Optional, spart beim Auswerten aber viel Zeit. */
export const CATEGORIES = ['bug', 'idea', 'other'] as const
export type FeedbackCategory = (typeof CATEGORIES)[number]

/** Muss zur Obergrenze in `firestore.rules` passen, sonst scheitert der Write. */
export const FEEDBACK_TEXT_LIMIT = 2000

export interface FeedbackInput {
  sentiment: Sentiment
  category: FeedbackCategory | null
  text: string
  source: FeedbackSource
  /** Route, auf der das Fenster geöffnet wurde (vom Router, nicht aus window). */
  route: string
}

/**
 * Sorgt dafür, dass ein Firebase-Konto vorhanden ist – notfalls ein anonymes.
 *
 * Der anonyme Login geschieht bewusst erst hier, unmittelbar vor dem Schreiben,
 * und nicht beim App-Start: Sonst entstünde für jeden Besucher ein Konto, auch
 * für die große Mehrheit, die nie Feedback gibt.
 *
 * Voraussetzung: „Anonym" muss in der Firebase-Console als Anmeldemethode
 * aktiviert sein (siehe docs/feedback-mail-setup.md). Fehlt das, meldet Firebase
 * `auth/operation-not-allowed`.
 */
async function ensureWriteAccess() {
  if (auth.currentUser) return auth.currentUser
  const credential = await signInAnonymously(auth)
  return credential.user
}

/**
 * Schreibt ein Feedback nach Firestore (`feedback/{id}`).
 *
 * Der Kontext (Route, Version, Gerät …) wird automatisch ergänzt – ohne ihn sind
 * Rückmeldungen wie „geht nicht" wertlos, und niemand tippt so etwas freiwillig.
 * Was mitgeht, steht im Fenster als Hinweiszeile.
 *
 * Wirft bei Fehlern weiter, damit das Fenster einen echten Fehlerzustand zeigen
 * kann statt stillschweigend „Danke" zu melden.
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const user = await ensureWriteAccess()
  const settings = useSettingsStore.getState()

  await addDoc(collection(db, 'feedback'), {
    // Was der Nutzer gesagt hat.
    sentiment: input.sentiment,
    category: input.category,
    text: input.text.trim().slice(0, FEEDBACK_TEXT_LIMIT),

    // Wie es zustande kam.
    source: input.source,
    route: input.route,

    // Kontext – kostet den Nutzer nichts und entscheidet über die Auswertbarkeit.
    appVersion: APP_VERSION,
    language: i18n.resolvedLanguage ?? i18n.language,
    theme: settings.theme,
    demoMode: settings.demoMode,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,

    // Wer – bei Gästen nur die technische ID des anonymen Kontos.
    uid: user.uid,
    isGuest: user.isAnonymous,

    createdAt: serverTimestamp(),
  })
}
