import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MessageSquarePlus } from 'lucide-react'
import { useFeedbackStore } from '@/store/feedbackStore'

/**
 * Routen, auf denen der Entdeck-Hinweis nicht erscheint: Dort steckt der Nutzer
 * mitten im Einrichten oder Anmelden und hat für ein Nebenangebot keinen Kopf.
 */
const QUIET_ROUTES = ['/onboarding', '/login', '/join']

/** Kurz warten, damit der Hinweis nicht in den Seitenaufbau platzt. */
const HINT_DELAY_MS = 1500

/**
 * Feedback-Einstieg in der Kopfzeile, links neben dem Konto-Avatar.
 *
 * Bewusst als ruhiger Ghost-Button: Der Avatar daneben ist rund, bildhaft und
 * farbig – ein gefüllter oder akzentuierter Feedback-Button würde ihm den Blick
 * wegnehmen. Auf dem Handy bleibt nur das Symbol (Beschriftung über
 * `aria-label`), auf dem Desktop kommt der Text dazu.
 *
 * Einmalig zeigt der Knopf einen kleinen Hinweis, dass es ihn gibt – sonst
 * bleibt ein ruhiges Symbol schlicht unbemerkt.
 */
export function FeedbackButton() {
  const { t } = useTranslation()
  const location = useLocation()
  const openFeedback = useFeedbackStore((s) => s.openFeedback)
  const hintSeen = useFeedbackStore((s) => s.hintSeen)
  const markHintSeen = useFeedbackStore((s) => s.markHintSeen)
  const [showHint, setShowHint] = useState(false)

  const quietRoute = QUIET_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith(route + '/'),
  )

  useEffect(() => {
    if (hintSeen || quietRoute) return
    const timer = window.setTimeout(() => setShowHint(true), HINT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [hintSeen, quietRoute])

  function dismissHint() {
    setShowHint(false)
    markHintSeen()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!hintSeen) dismissHint()
          openFeedback('header')
        }}
        aria-label={t('feedback.open')}
        className="focus-ring flex h-9 items-center gap-1.5 rounded-full px-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:px-3"
      >
        <MessageSquarePlus className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
        <span className="hidden text-sm font-medium md:inline">{t('feedback.short')}</span>
      </button>

      {showHint && (
        <div
          role="status"
          className="glass-floating animate-step-in absolute right-0 top-11 z-30 w-60 rounded-2xl p-3 text-left shadow-xl"
        >
          {/* Kleiner Zeiger auf den Knopf darüber. */}
          <span
            aria-hidden="true"
            className="absolute -top-1.5 right-5 h-3 w-3 rotate-45 border-l border-t border-border bg-surface"
          />
          <p className="text-sm font-semibold text-foreground">{t('feedback.discover.title')}</p>
          <p className="mt-1 text-xs leading-snug text-muted">{t('feedback.discover.body')}</p>
          <button
            type="button"
            onClick={dismissHint}
            className="focus-ring mt-2.5 w-full rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            {t('feedback.discover.ack')}
          </button>
        </div>
      )}
    </div>
  )
}
