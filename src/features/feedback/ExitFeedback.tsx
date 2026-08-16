import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { OptionChip } from '@/components/ui/OptionChip'
import { track } from '@/features/analytics/analytics'
import {
  EXIT_REASONS,
  FEEDBACK_TEXT_LIMIT,
  submitExitFeedback,
  type ExitReason,
} from './submitFeedback'

type Phase = 'ask' | 'sending' | 'done' | 'error'

/**
 * Die Frage beim Gehen – gezeigt, nachdem jemand alle Daten gelöscht hat.
 *
 * Diese Menschen haben gerade beschlossen aufzuhören, und genau sie erreicht
 * ein freiwilliger Feedback-Knopf nie. Ihre Antwort hat deshalb die höchste
 * Aussagekraft im ganzen System: Sie sagt, woran die App scheitert – nicht,
 * was den Gebliebenen noch fehlt.
 *
 * Bewusst NACH dem Löschen und überspringbar. Die Frage davorzuschalten hieße,
 * eine bereits getroffene Entscheidung als Druckmittel zu benutzen.
 */
export function ExitFeedback({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const location = useLocation()
  const [reason, setReason] = useState<ExitReason | null>(null)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState<Phase>('ask')

  async function handleSubmit() {
    if (!reason || phase === 'sending') return
    setPhase('sending')
    try {
      await submitExitFeedback({ reason, text, route: location.pathname })
      void track('feedback_exit_submitted', { reason, hasText: text.trim().length > 0 })
      setPhase('done')
    } catch {
      setPhase('error')
    }
  }

  if (phase === 'done') {
    return (
      <div className="glass animate-step-in mt-3 rounded-2xl border border-border/60 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="text-sm text-muted">{t('feedback.exit.thanks')}</p>
        </div>
        {/* Bewusst ein Knopf statt einer Zeitschaltung: Wer gerade alles
            gelöscht hat, soll nicht zusätzlich weggeschoben werden. */}
        <button
          type="button"
          onClick={onDone}
          className="mt-3 w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t('feedback.exit.continue')}
        </button>
      </div>
    )
  }

  return (
    <div className="glass animate-step-in mt-3 rounded-2xl border border-border/60 p-4">
      <p className="text-sm font-semibold text-foreground">{t('feedback.exit.title')}</p>
      <p className="mt-0.5 text-xs text-muted">{t('feedback.exit.body')}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXIT_REASONS.map((value) => (
          <OptionChip
            key={value}
            label={t(`feedback.exit.reason.${value}`)}
            selected={reason === value}
            onClick={() => setReason((prev) => (prev === value ? null : value))}
          />
        ))}
      </div>

      {reason && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, FEEDBACK_TEXT_LIMIT))}
          rows={3}
          placeholder={t('feedback.exit.placeholder')}
          aria-label={t('feedback.exit.title')}
          className="mt-3 w-full resize-none rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      )}

      {phase === 'error' && (
        <p className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
          {t('feedback.error')}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!reason || phase === 'sending'}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === 'sending' ? t('feedback.sending') : t('feedback.exit.send')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          {t('feedback.exit.skip')}
        </button>
      </div>
    </div>
  )
}
