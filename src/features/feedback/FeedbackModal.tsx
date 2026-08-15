import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Frown, Meh, Smile, CheckCircle2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { OptionChip } from '@/components/ui/OptionChip'
import { useFeedbackStore, type FeedbackSource } from '@/store/feedbackStore'
import { track } from '@/features/analytics/analytics'
import {
  CATEGORIES,
  FEEDBACK_TEXT_LIMIT,
  SENTIMENTS,
  submitFeedback,
  type FeedbackCategory,
  type Sentiment,
} from './submitFeedback'

const SENTIMENT_ICONS: Record<Sentiment, LucideIcon> = {
  bad: Frown,
  neutral: Meh,
  good: Smile,
}

type Phase = 'form' | 'sending' | 'done' | 'error'

/**
 * Inhalt des Feedback-Fensters. Steckt bewusst in einer eigenen Komponente:
 * `Modal` rendert seine Kinder nur im geöffneten Zustand, dadurch startet das
 * Formular bei jedem Öffnen von selbst leer – ganz ohne Zurücksetz-Effekt.
 */
interface FeedbackFormProps {
  source: FeedbackSource
  onClose: () => void
  /** Meldet den Erfolg nach oben, damit die Überschrift mitwechselt. */
  onSubmitted: () => void
}

function FeedbackForm({ source, onClose, onSubmitted }: FeedbackFormProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const markSubmitted = useFeedbackStore((s) => s.markSubmitted)

  const [sentiment, setSentiment] = useState<Sentiment | null>(null)
  const [category, setCategory] = useState<FeedbackCategory | null>(null)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void track('feedback_opened', { source })
  }, [source])

  // Sobald eine Stimmung gewählt ist, in den Freitext springen – so kostet das
  // Schreiben keinen zweiten Tipp. Bewusst NICHT schon beim Öffnen: Auf dem
  // Handy schöbe sich sonst sofort die Tastatur über die Stimmungsauswahl, also
  // über genau den Schritt, mit dem das Fenster beginnt.
  useEffect(() => {
    if (sentiment) textRef.current?.focus()
  }, [sentiment])

  // Nach dem Abschicken von selbst schließen – die Bestätigung ist kurz, ein
  // zusätzlicher Klick wäre nur Arbeit ohne Aussage.
  useEffect(() => {
    if (phase !== 'done') return
    const timer = window.setTimeout(onClose, 1800)
    return () => window.clearTimeout(timer)
  }, [phase, onClose])

  async function handleSubmit() {
    if (!sentiment || phase === 'sending') return
    setPhase('sending')
    try {
      await submitFeedback({ sentiment, category, text, source, route: location.pathname })
      markSubmitted()
      void track('feedback_submitted', {
        sentiment,
        category: category ?? 'none',
        hasText: text.trim().length > 0,
      })
      setPhase('done')
      onSubmitted()
    } catch {
      // Der genaue Fehler hilft dem Nutzer nicht weiter – wichtig ist, dass der
      // Text erhalten bleibt und ein zweiter Versuch möglich ist.
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <p className="text-sm text-muted">{t('feedback.thanksBody')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stimmung – der einzige Pflichtschritt. */}
      <div className="flex justify-center gap-3">
        {SENTIMENTS.map((value) => {
          const Icon = SENTIMENT_ICONS[value]
          const active = sentiment === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSentiment(value)}
              aria-pressed={active}
              aria-label={t(`feedback.sentiment.${value}`)}
              className={`focus-ring grid h-14 w-14 place-items-center rounded-2xl border transition-[transform,background-color,color] duration-200 active:scale-95 ${
                active
                  ? 'scale-105 border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted hover:bg-surface-2 hover:text-foreground'
              }`}
            >
              <Icon className="h-7 w-7" strokeWidth={active ? 2.2 : 1.6} />
            </button>
          )
        })}
      </div>

      {/* Einordnung – optional, ein Klick, spart beim Auswerten viel. */}
      <div className="flex flex-wrap justify-center gap-2">
        {CATEGORIES.map((value) => (
          <OptionChip
            key={value}
            label={t(`feedback.category.${value}`)}
            selected={category === value}
            onClick={() => setCategory((prev) => (prev === value ? null : value))}
          />
        ))}
      </div>

      {/* Freitext – optional, aber das eigentlich Wertvolle. */}
      <div>
        <label htmlFor="feedback-text" className="sr-only">
          {t('feedback.textLabel')}
        </label>
        <textarea
          id="feedback-text"
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, FEEDBACK_TEXT_LIMIT))}
          rows={4}
          placeholder={t('feedback.placeholder')}
          className="w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
        <Info className="mt-px h-3.5 w-3.5 shrink-0" />
        {t('feedback.contextHint')}
      </p>

      {phase === 'error' && (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {t('feedback.error')}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!sentiment || phase === 'sending'}
        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {phase === 'sending' ? t('feedback.sending') : t('feedback.submit')}
      </button>
    </div>
  )
}

/**
 * Das Feedback-Fenster. Genau ein Exemplar hängt im `Layout`; geöffnet wird es
 * über `useFeedbackStore().openFeedback(source)` – aus der Kopfzeile, dem
 * Konto-Menü, den Einstellungen oder (Phase 2) einer automatischen Nachfrage.
 *
 * Bewusst kurz gehalten: Stimmung (ein Klick, allein schon auswertbar),
 * optionale Einordnung, optionaler Freitext. Jedes zusätzliche Pflichtfeld
 * kostet spürbar Beteiligung – siehe docs/feedback-concept.md, §1 und §3.
 */
export function FeedbackModal() {
  const { t } = useTranslation()
  const open = useFeedbackStore((s) => s.open)
  const source = useFeedbackStore((s) => s.source)
  const closeFeedback = useFeedbackStore((s) => s.closeFeedback)
  const [submitted, setSubmitted] = useState(false)

  // Beim Schließen zurücksetzen – nicht beim Öffnen. Jeder Weg aus dem Fenster
  // läuft hier durch, dadurch startet das nächste Öffnen sauber, ohne dass ein
  // Effekt Zustand zurückdrehen muss.
  function handleClose() {
    setSubmitted(false)
    closeFeedback()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={submitted ? t('feedback.thanksTitle') : t('feedback.title')}
    >
      <FeedbackForm source={source} onClose={handleClose} onSubmitted={() => setSubmitted(true)} />
    </Modal>
  )
}
