import { useTranslation } from 'react-i18next'
import { RotateCw } from 'lucide-react'
import type { Flashcard } from './flashcardsContent'

/**
 * Die Karte selbst – 3D-Umdrehen, Vorder- und Rückseite.
 *
 * Geteilt zwischen Blätter-Modus und Trainer, damit eine Karte in beiden
 * Modi identisch aussieht und sich identisch anfühlt. Die Animationsklassen
 * (`flip-card`, `flip-inner`, `flip-face`) stehen in `src/index.css`.
 */
export function FlipCard({
  card,
  flipped,
  onFlip,
}: {
  card: Flashcard
  flipped: boolean
  onFlip: () => void
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onFlip}
      aria-label={t('education.flashcards.flip')}
      className="flip-card focus-ring block h-full max-h-[60vh] w-full max-w-xl"
    >
      <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
        <Face side="front" text={card.frontText ?? ''} tags={card.tags} />
        <Face side="back" text={card.backText ?? ''} />
      </div>
    </button>
  )
}

/** Eine Kartenseite. Text zentriert, bei Bedarf scrollbar. */
function Face({
  side,
  text,
  tags,
}: {
  side: 'front' | 'back'
  text: string
  tags?: string[]
}) {
  const { t } = useTranslation()
  return (
    <div
      className={`flip-face ${side === 'back' ? 'flip-face-back' : ''} glass flex flex-col rounded-3xl p-6`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {side === 'front' ? t('education.flashcards.front') : t('education.flashcards.back')}
        </span>
        <RotateCw className="h-4 w-4 text-muted" />
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto py-4">
        <p className="text-center text-lg font-medium leading-relaxed text-foreground">{text}</p>
      </div>
      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="h-5" aria-hidden />
      )}
    </div>
  )
}
