import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// Nur der Typ – zur Laufzeit erzeugt das keine Abhängigkeit auf das Feature und
// damit keinen Zyklus (`submitFeedback.ts` importiert `FeedbackSource` von hier).
import type { Sentiment } from '@/features/feedback/submitFeedback'

/** Woher wurde das Feedback-Fenster geöffnet? Wandert als `source` mit. */
export type FeedbackSource = 'header' | 'menu' | 'settings' | 'prompt'

const DAY_MS = 24 * 60 * 60 * 1000

/** Ruhezeit, nachdem eine Nachfrage weggeklickt wurde. */
const QUIET_AFTER_DISMISS_MS = 30 * DAY_MS
/** Ruhezeit, nachdem tatsächlich Feedback abgeschickt wurde. */
const QUIET_AFTER_SUBMIT_MS = 90 * DAY_MS
/** Nach so vielen Wegklicks wird nie wieder von selbst gefragt. */
const MAX_DISMISSALS = 2

/**
 * Routen, auf denen nie von selbst gefragt wird: Der Nutzer steckt dort mitten
 * in einer Aufgabe (Onboarding) oder in einem Ablauf, den eine Nachfrage kaputt
 * machen würde (Anmeldung, Einladungs-Beitritt, Landing Page).
 *
 * Der laufende Messversuch und das laufende Quiz stehen bewusst NICHT hier:
 * Die Nachfrage wird dort erst in der Ergebnis-Phase eingehängt, also nach dem
 * Abschluss. Ein Routen-Verbot würde genau den gewünschten Auslöser blockieren.
 */
const QUIET_ROUTES = ['/onboarding', '/login', '/join', '/willkommen']

interface FeedbackState {
  /** Zeitpunkt der letzten automatischen Nachfrage (ms). */
  lastPromptedAt: number | null
  /** Zeitpunkt des letzten abgeschickten Feedbacks (ms). */
  lastSubmittedAt: number | null
  /** Wie oft wurde eine automatische Nachfrage weggeklickt? */
  dismissCount: number
  /** Wie oft wurde insgesamt Feedback abgeschickt? */
  submitCount: number
  /** Wurde der einmalige Hinweis auf den Feedback-Knopf schon gezeigt? */
  hintSeen: boolean

  /** Wurde in dieser Sitzung schon von selbst gefragt? (nicht gespeichert) */
  promptedThisSession: boolean
  /** Ist das Feedback-Fenster offen? (nicht gespeichert) */
  open: boolean
  /** Auslöser des offenen Fensters. (nicht gespeichert) */
  source: FeedbackSource
  /**
   * Vorgewählte Stimmung beim Öffnen. Kommt von der Nachfrage-Karte: Wer dort
   * schon auf ein Gesicht getippt hat, soll die Auswahl nicht wiederholen.
   */
  presetSentiment: Sentiment | null

  openFeedback: (source: FeedbackSource, presetSentiment?: Sentiment) => void
  closeFeedback: () => void
  /** Eine automatische Nachfrage wurde angezeigt. */
  markPrompted: () => void
  /** Eine automatische Nachfrage wurde weggeklickt. */
  markDismissed: () => void
  /** Feedback wurde erfolgreich abgeschickt. */
  markSubmitted: () => void
  /** Der einmalige Hinweis auf den Knopf wurde gesehen. */
  markHintSeen: () => void
  resetFeedbackHistory: () => void
}

/**
 * Zustand rund um den Feedback-Kanal: die Historie (wann zuletzt gefragt,
 * abgeschickt, weggeklickt) und der Öffnungszustand des Fensters.
 *
 * Die Historie liegt dauerhaft in localStorage (`eapp-feedback`), der
 * Öffnungszustand bewusst nicht – ein Neuladen soll kein Fenster aufreißen.
 *
 * Wichtig: Ob von selbst gefragt werden darf, entscheidet ausschließlich
 * `shouldPrompt()` weiter unten. Keine verstreuten Zeitvergleiche in einzelnen
 * Bildschirmen – sonst widersprechen sich die Regeln nach ein paar Monaten.
 */
export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set) => ({
      lastPromptedAt: null,
      lastSubmittedAt: null,
      dismissCount: 0,
      submitCount: 0,
      hintSeen: false,

      promptedThisSession: false,
      open: false,
      source: 'header',
      presetSentiment: null,

      openFeedback: (source, presetSentiment = undefined) =>
        set({ open: true, source, presetSentiment: presetSentiment ?? null }),
      closeFeedback: () => set({ open: false }),
      markPrompted: () => set({ lastPromptedAt: Date.now(), promptedThisSession: true }),
      markDismissed: () =>
        set((s) => ({ dismissCount: s.dismissCount + 1, lastPromptedAt: Date.now() })),
      markSubmitted: () =>
        set((s) => ({ lastSubmittedAt: Date.now(), submitCount: s.submitCount + 1 })),
      markHintSeen: () => set({ hintSeen: true }),
      resetFeedbackHistory: () =>
        set({
          lastPromptedAt: null,
          lastSubmittedAt: null,
          dismissCount: 0,
          submitCount: 0,
          hintSeen: false,
        }),
    }),
    {
      name: 'eapp-feedback',
      // Nur die Historie überdauert einen Neustart – Fensterzustand und der
      // Sitzungs-Merker starten absichtlich jedes Mal frisch.
      partialize: (s) => ({
        lastPromptedAt: s.lastPromptedAt,
        lastSubmittedAt: s.lastSubmittedAt,
        dismissCount: s.dismissCount,
        submitCount: s.submitCount,
        hintSeen: s.hintSeen,
      }),
    },
  ),
)

/** Liegt die Route in einem Ablauf, den eine Nachfrage stören würde? */
function isQuietRoute(pathname: string): boolean {
  return QUIET_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

/**
 * Die eine Stelle, die entscheidet, ob von selbst nach Feedback gefragt werden
 * darf. Regeln (siehe `docs/feedback-concept.md`, §5.2):
 *
 *   - höchstens eine Nachfrage pro Sitzung
 *   - nach dem Wegklicken 30 Tage Ruhe
 *   - nach zweimaligem Wegklicken nie wieder von selbst
 *   - nach dem Abschicken 90 Tage Ruhe
 *   - nie in Onboarding, Anmeldung, Beitritt oder auf der Landing Page
 *
 * Der Aufrufer entscheidet zusätzlich, WO gefragt wird (z. B. nur in der
 * Ergebnis-Phase eines Versuchs) – diese Funktion beantwortet nur das OB.
 */
export function shouldPrompt(pathname: string, now = Date.now()): boolean {
  const s = useFeedbackStore.getState()

  if (s.promptedThisSession) return false
  if (s.dismissCount >= MAX_DISMISSALS) return false
  if (isQuietRoute(pathname)) return false
  if (s.lastSubmittedAt !== null && now - s.lastSubmittedAt < QUIET_AFTER_SUBMIT_MS) return false
  if (s.lastPromptedAt !== null && now - s.lastPromptedAt < QUIET_AFTER_DISMISS_MS) return false

  return true
}
