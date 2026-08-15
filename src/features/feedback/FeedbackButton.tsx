import { useTranslation } from 'react-i18next'
import { MessageSquarePlus } from 'lucide-react'
import { useFeedbackStore } from '@/store/feedbackStore'

/**
 * Feedback-Einstieg in der Kopfzeile, links neben dem Konto-Avatar.
 *
 * Bewusst als ruhiger Ghost-Button: Der Avatar daneben ist rund, bildhaft und
 * farbig – ein gefüllter oder akzentuierter Feedback-Button würde ihm den Blick
 * wegnehmen. Auf dem Handy bleibt nur das Symbol (Beschriftung über
 * `aria-label`), auf dem Desktop kommt der Text dazu.
 */
export function FeedbackButton() {
  const { t } = useTranslation()
  const openFeedback = useFeedbackStore((s) => s.openFeedback)

  return (
    <button
      type="button"
      onClick={() => openFeedback('header')}
      aria-label={t('feedback.open')}
      className="focus-ring flex h-9 items-center gap-1.5 rounded-full px-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground md:px-3"
    >
      <MessageSquarePlus className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.75} />
      <span className="hidden text-sm font-medium md:inline">{t('feedback.short')}</span>
    </button>
  )
}
