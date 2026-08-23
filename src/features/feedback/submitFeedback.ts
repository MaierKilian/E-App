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

/**
 * Gründe beim Löschen aller Daten. „Aufräumen" ist bewusst dabei: Nicht jeder,
 * der zurücksetzt, hört auf – wer neu anfangen will, darf nicht als Absprung
 * gezählt werden, sonst ist die ganze Auswertung wertlos.
 */
export const EXIT_REASONS = ['complex', 'noValue', 'technical', 'cleanup'] as const
export type ExitReason = (typeof EXIT_REASONS)[number]

/** Ein Austritt ist keine Stimmungsabfrage – die Stimmung folgt aus dem Grund. */
const EXIT_SENTIMENT: Record<ExitReason, Sentiment> = {
  complex: 'bad',
  noValue: 'bad',
  technical: 'bad',
  cleanup: 'neutral',
}

export interface FeedbackInput {
  sentiment: Sentiment
  category: FeedbackCategory | null
  text: string
  source: FeedbackSource
  /** Route, auf der das Fenster geöffnet wurde (vom Router, nicht aus window). */
  route: string
  /**
   * Darf für Rückfragen geantwortet werden? Nur für angemeldete Nutzer
   * anbietbar – bei Gästen gibt es keine Adresse.
   */
  contactOk: boolean
  /**
   * Screenshot des Bildschirms beim Öffnen des Fensters (Data-URL, JPEG),
   * damit sich ein gemeldetes Problem nachstellen lässt. `null`, wenn die
   * Aufnahme (noch) nicht vorlag oder der Nutzer sie abgewählt hat.
   */
  screenshot: string | null
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

    // Screenshot des Bildschirms beim Öffnen (Data-URL) – zeigt, wie die App
    // aussah, als das Problem auftrat. Firestore-Dokumente sind auf 1 MiB
    // begrenzt; die Aufnahme ist auf ~480px Breite herunterskaliert, ein
    // deutlich zu großer Wert (z. B. durch ein sehr breites Gerät) wird
    // sicherheitshalber verworfen statt den ganzen Schreibvorgang zu riskieren.
    screenshot:
      input.screenshot && input.screenshot.length < 900_000 ? input.screenshot : null,

    // Wie es zustande kam.
    kind: 'general',
    exitReason: null,
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

    // Rückfragen: Die Adresse wandert nur mit, wenn der Nutzer aktiv zustimmt.
    // Aus einer Handvoll Textmeldungen werden so ein paar echte Gespräche –
    // in der Frühphase mehr wert als jede Kennzahl.
    contactOk: input.contactOk,
    contactEmail: input.contactOk ? (user.email ?? null) : null,

    createdAt: serverTimestamp(),
  })
}

/**
 * Austritts-Feedback beim Löschen aller Daten.
 *
 * Warum eigener Weg: Wer gerade alles löscht, hat beschlossen aufzuhören – und
 * genau diese Menschen erreicht ein freiwilliger Feedback-Knopf nie. Eine
 * einzige Frage in diesem Moment sagt mehr über das Scheitern der App aus als
 * zwanzig wohlwollende Rückmeldungen von Gebliebenen.
 *
 * Bewusst NACH dem Löschen gefragt und überspringbar: Eine Frage vor die
 * Ausführung zu hängen, wäre Erpressung an einer bereits getroffenen
 * Entscheidung.
 */
export async function submitExitFeedback(input: {
  reason: ExitReason
  text: string
  route: string
}): Promise<void> {
  const user = await ensureWriteAccess()
  const settings = useSettingsStore.getState()

  await addDoc(collection(db, 'feedback'), {
    sentiment: EXIT_SENTIMENT[input.reason],
    category: null,
    text: input.text.trim().slice(0, FEEDBACK_TEXT_LIMIT),

    kind: 'exit',
    exitReason: input.reason,
    source: 'settings',
    route: input.route,

    appVersion: APP_VERSION,
    language: i18n.resolvedLanguage ?? i18n.language,
    theme: settings.theme,
    demoMode: settings.demoMode,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    userAgent: navigator.userAgent,

    uid: user.uid,
    isGuest: user.isAnonymous,

    // Beim Austritt bewusst keine Rückfrage-Abfrage: Wer gerade aufräumt oder
    // geht, soll nicht noch um seine Adresse gebeten werden.
    contactOk: false,
    contactEmail: null,

    createdAt: serverTimestamp(),
  })
}
