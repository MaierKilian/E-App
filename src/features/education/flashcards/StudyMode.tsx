import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronLeft, ChevronRight, RotateCw, X } from 'lucide-react'
import type { FlashcardSet } from './flashcardsContent'

/**
 * Fokussierter Vollbild-Lernmodus für ein Karteikartenset.
 *
 * Bewusst ablenkungsfrei: eigenes Overlay über der gesamten App (kein Header,
 * keine Chips, keine Bottom-Nav). Große Karte in der Bildschirmmitte, antippen
 * zum 3D-Umdrehen, Wischen oder Pfeile zum Blättern. Phase 1 ohne Bewertung –
 * die Selbstbewertung (Nochmal/Gut …) und der Fortschritt folgen in Phase 2.
 */
export function StudyMode({ set, onExit }: { set: FlashcardSet; onExit: () => void }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(false)

  const total = set.cards.length
  const card = set.cards[index]
  const isLast = index === total - 1

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next > total - 1) return
      setFlipped(false)
      // Kurze Verzögerung, damit die Karte erst zurückklappt, dann wechselt.
      window.setTimeout(() => setIndex(next), 120)
    },
    [total],
  )

  const next = useCallback(() => {
    if (isLast) {
      setDone(true)
      return
    }
    goTo(index + 1)
  }, [isLast, goTo, index])

  const prev = useCallback(() => goTo(index - 1), [goTo, index])
  const flip = useCallback(() => setFlipped((f) => !f), [])

  const restart = useCallback(() => {
    setDone(false)
    setFlipped(false)
    setIndex(0)
  }, [])

  // Tastatursteuerung: Leertaste/Enter = umdrehen, Pfeile = blättern, Esc = raus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done) {
        if (e.key === 'Escape') onExit()
        return
      }
      if (e.key === 'Escape') onExit()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        flip()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [done, next, prev, flip, onExit])

  // Body-Scroll sperren, solange der Lernmodus offen ist.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Wischgesten (horizontal) zum Blättern.
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (Math.abs(dx) < 60) return
    if (dx < 0) next()
    else prev()
  }

  return (
    <div
      className="z-[70] flex flex-col bg-background text-foreground animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={set.title}
    >
      {/* Kopfzeile: schließen, Titel, Zähler */}
      <div
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={onExit}
          aria-label={t('education.flashcards.exit')}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold">{set.title}</p>
          {!done && (
            <p className="text-xs text-muted">
              {t('education.flashcards.progress', { current: index + 1, total })}
            </p>
          )}
        </div>
        <span className="h-10 w-10 shrink-0" aria-hidden />
      </div>

      {/* Fortschrittsleiste */}
      {!done && (
        <div className="px-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {done ? (
        // Abschluss-Screen
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Check className="h-10 w-10" />
          </span>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold">{t('education.flashcards.doneTitle')}</h2>
            <p className="text-sm text-muted">
              {t('education.flashcards.doneSubtitle', { count: total, title: set.title })}
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <button
              type="button"
              onClick={restart}
              className="focus-ring flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              <RotateCw className="h-4 w-4" />
              {t('education.flashcards.restart')}
            </button>
            <button
              type="button"
              onClick={onExit}
              className="focus-ring rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground"
            >
              {t('education.flashcards.finish')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Karte */}
          <div
            className="flex flex-1 items-center justify-center px-5 py-5"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              onClick={flip}
              aria-label={t('education.flashcards.flip')}
              className="flip-card focus-ring block h-full max-h-[60vh] w-full max-w-xl"
            >
              <div className={`flip-inner ${flipped ? 'is-flipped' : ''}`}>
                <CardFace side="front" text={card.frontText ?? ''} tags={card.tags} />
                <CardFace side="back" text={card.backText ?? ''} />
              </div>
            </button>
          </div>

          <p className="text-center text-xs text-muted">{t('education.flashcards.tapHint')}</p>

          {/* Blättern */}
          <div
            className="flex items-center gap-3 px-5 pt-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="focus-ring grid h-12 w-14 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
              aria-label={t('education.flashcards.prev')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={next}
              className="focus-ring flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground"
            >
              {isLast ? t('education.flashcards.finish') : t('education.flashcards.next')}
              {!isLast && <ChevronRight className="h-5 w-5" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Eine Kartenseite (Vorder-/Rückseite). Text zentriert, scrollbar bei Bedarf. */
function CardFace({
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
