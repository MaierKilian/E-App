import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Frown, Meh, Smile, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { shouldPrompt, useFeedbackStore } from '@/store/feedbackStore'
import { track } from '@/features/analytics/analytics'
import { SENTIMENTS, type Sentiment } from './submitFeedback'

const SENTIMENT_ICONS: Record<Sentiment, LucideIcon> = {
  bad: Frown,
  neutral: Meh,
  good: Smile,
}

/**
 * Dezente Nachfrage im Erfolgsmoment – bewusst als Karte im Fluss, nicht als
 * Fenster.
 *
 * Der beste Zeitpunkt für eine Nachfrage ist direkt nach einem Erfolg: Die
 * Stimmung ist am höchsten, der Kontext frisch. Genau deshalb wäre ein Overlay
 * hier falsch – es würde exakt den Belohnungsmoment kappen, den die App gerade
 * erzeugt hat. Die Karte blockiert nichts und wird trotzdem gesehen, weil der
 * Blick ohnehin dort liegt.
 *
 * Ein Tipp auf ein Gesicht öffnet das normale Feedback-Fenster mit bereits
 * gewählter Stimmung – so bleibt der ganze Ablauf (Einordnung, passende Frage,
 * Rückfrage-Häkchen) an einer Stelle, statt hier ein zweites Formular zu bauen.
 *
 * OB überhaupt gefragt werden darf, entscheidet allein `shouldPrompt()`
 * (siehe docs/feedback-concept.md, §5.2).
 */
export function FeedbackPrompt() {
  const { t } = useTranslation()
  const location = useLocation()
  const openFeedback = useFeedbackStore((s) => s.openFeedback)
  const markPrompted = useFeedbackStore((s) => s.markPrompted)
  const markDismissed = useFeedbackStore((s) => s.markDismissed)

  // Einmal beim Einhängen entscheiden und dabei bleiben: Ein späteres Neu-
  // Bewerten ließe die Karte mitten im Blick verschwinden. `shouldPrompt` liest
  // den Store direkt (kein Abo), deshalb löst das keine Schleife aus.
  const [visible, setVisible] = useState(() => shouldPrompt(location.pathname))

  useEffect(() => {
    if (!visible) return
    markPrompted()
    void track('feedback_prompt_shown')
  }, [visible, markPrompted])

  if (!visible) return null

  function choose(sentiment: Sentiment) {
    setVisible(false)
    openFeedback('prompt', sentiment)
  }

  function dismiss() {
    setVisible(false)
    markDismissed()
    void track('feedback_dismissed', { source: 'prompt' })
  }

  return (
    <div className="glass animate-step-in relative mt-4 rounded-2xl border border-border/60 p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('common.close')}
        className="focus-ring absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <p className="pr-8 text-sm font-semibold text-foreground">{t('feedback.prompt.title')}</p>
      <p className="mt-0.5 text-xs text-muted">{t('feedback.prompt.body')}</p>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {SENTIMENTS.map((value) => {
          const Icon = SENTIMENT_ICONS[value]
          return (
            <button
              key={value}
              type="button"
              onClick={() => choose(value)}
              aria-label={t(`feedback.sentiment.${value}`)}
              className="focus-ring flex flex-col items-center gap-1 rounded-xl border border-border bg-surface/60 px-2 py-2 text-muted transition-[transform,background-color,color] duration-200 hover:bg-surface-2 hover:text-foreground active:scale-95"
            >
              <Icon className="h-6 w-6" strokeWidth={1.6} />
              <span className="text-[11px] font-medium leading-none">
                {t(`feedback.sentimentShort.${value}`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
