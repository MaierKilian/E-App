import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Clock, PauseCircle, Undo2, X } from 'lucide-react'
import { useFlashcardStore } from '@/store/flashcardStore'
import { FlipCard } from './CardFace'
import { findCard } from './cardIndex'
import type { QueueCard } from './engine/queue'
import { canUndo, currentCard, doneCount, sessionSummary } from './engine/session'
import { schedulerFor } from './engine/scheduler'
import { GRADES_FOR_SCALE, type Grade } from './engine/types'
import { formatInterval } from './intervalText'

/** Anzeigename einer Note – die Beschriftung der Bewertungsknöpfe. */
const GRADE_KEY: Record<Grade, string> = { 1: 'again', 2: 'hard', 3: 'good', 4: 'easy' }

/** Farbwelt der Bewertung: rot = vergessen, bernstein = wackelig, grün = sitzt. */
const GRADE_STYLE: Record<Grade, string> = {
  1: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  2: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  3: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  4: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
}

/**
 * Der Trainer: Karte zeigen → umdrehen → selbst bewerten.
 *
 * Der gesamte Ablauf steckt im Reducer (`engine/session.ts`) und im Store; diese
 * Komponente zeigt nur an und leitet Eingaben weiter. Deshalb überlebt eine
 * angefangene Runde auch einen Reload – der Sitzungszustand liegt im Store.
 */
export function StudySession({
  cards,
  title,
  scope,
  onExit,
}: {
  cards: QueueCard[]
  title: string
  /** Kennung des Lernstapels (Set-/Modul-ID) – erkennt eine fremde Altsitzung. */
  scope: string
  onExit: () => void
}) {
  const { t } = useTranslation()
  const session = useFlashcardStore((s) => s.session)
  const params = useFlashcardStore((s) => s.params)
  const ready = useFlashcardStore((s) => s.ready)

  const init = useFlashcardStore((s) => s.init)
  const begin = useFlashcardStore((s) => s.begin)
  const flipCard = useFlashcardStore((s) => s.flipCard)
  const rate = useFlashcardStore((s) => s.rate)
  const undo = useFlashcardStore((s) => s.undo)
  const suspend = useFlashcardStore((s) => s.suspend)
  const bury = useFlashcardStore((s) => s.bury)
  const end = useFlashcardStore((s) => s.end)

  // Kartenzustand aus IndexedDB laden, bevor die Warteschlange gebaut wird.
  useEffect(() => {
    void init()
  }, [init])

  // Neue Runde starten, sobald der Zustand da ist – es sei denn, für genau
  // diesen Stapel läuft noch eine (dann wird sie fortgesetzt).
  useEffect(() => {
    if (!ready) return
    const store = useFlashcardStore.getState()
    const running = store.session && !store.session.finishedAt && store.sessionScope === scope
    if (!running) begin(cards, { scope })
  }, [ready, scope, cards, begin])

  const card = session ? currentCard(session) : null
  const content = card ? findCard(card.card.cardId)?.card : undefined

  const exit = useCallback(() => {
    end()
    onExit()
  }, [end, onExit])

  const grades = GRADES_FOR_SCALE[params.scale]

  // Voraussichtliche Intervalle für die Knopf-Beschriftung. Bezugszeitpunkt ist
  // bewusst der Moment, in dem die Karte erschienen ist: Das hält das Rendern
  // frei von der Uhr und lässt die Zahlen beim Nachdenken nicht wandern.
  const shownAt = session?.shownAt ?? 0
  const previews = useMemo(() => {
    if (!card) return null
    return schedulerFor(params).preview(card.state, shownAt, params)
  }, [card, params, shownAt])

  // Tastatur: Zahlen bewerten, Leertaste dreht um, Z nimmt zurück.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        exit()
        return
      }
      if (!session || !card) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        flipCard()
        return
      }
      if (e.key.toLowerCase() === 'z' && canUndo(session)) {
        undo()
        return
      }
      if (!session.flipped) return
      const n = Number(e.key)
      if (grades.includes(n as Grade)) rate(n as Grade)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [session, card, grades, exit, flipCard, rate, undo])

  // Body-Scroll sperren, solange der Trainer offen ist.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const done = session ? doneCount(session) : 0
  const total = session?.total ?? 0
  const finished = session != null && card == null

  return (
    <div
      className="z-[70] flex flex-col bg-background text-foreground animate-step-in"
      style={{ position: 'fixed', inset: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className="flex items-center gap-3 px-4 pb-3"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
      >
        <button
          type="button"
          onClick={exit}
          aria-label={t('education.flashcards.exit')}
          className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-semibold">{title}</p>
          {!finished && total > 0 && (
            <p className="text-xs text-muted">
              {t('education.flashcards.progress', { current: Math.min(done + 1, total), total })}
            </p>
          )}
        </div>
        {finished ? (
          <span className="h-10 w-10 shrink-0" aria-hidden />
        ) : (
          <button
            type="button"
            onClick={undo}
            disabled={!session || !canUndo(session)}
            aria-label={t('education.flashcards.undo')}
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-5 w-5" />
          </button>
        )}
      </header>

      {!finished && total > 0 && (
        <div className="px-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!ready || !session ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-muted">{t('education.flashcards.loading')}</p>
        </div>
      ) : finished ? (
        <Summary onExit={onExit} />
      ) : (
        <>
          <div className="flex flex-1 items-center justify-center px-5 py-5">
            {content && (
              <FlipCard card={content} flipped={session.flipped} onFlip={flipCard} />
            )}
          </div>

          {session.flipped ? (
            <div className="px-4">
              <div className={`grid gap-2 ${grades.length === 2 ? 'grid-cols-2' : grades.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {grades.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => rate(grade)}
                    className={`focus-ring flex flex-col items-center gap-0.5 rounded-2xl px-2 py-3 text-sm font-semibold ${GRADE_STYLE[grade]}`}
                  >
                    {t(`education.flashcards.grade.${GRADE_KEY[grade]}`)}
                    {previews && (
                      <span className="text-[11px] font-medium opacity-80">
                        {formatInterval(previews[grade], t)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-muted">{t('education.flashcards.tapHint')}</p>
          )}

          <div
            className="flex items-center justify-center gap-4 px-5 pt-4"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
          >
            <button
              type="button"
              onClick={bury}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <Clock className="h-4 w-4" />
              {t('education.flashcards.bury')}
            </button>
            <button
              type="button"
              onClick={suspend}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <PauseCircle className="h-4 w-4" />
              {t('education.flashcards.suspend')}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** Abschluss-Screen mit den Kennzahlen der Runde. */
function Summary({ onExit }: { onExit: () => void }) {
  const { t } = useTranslation()
  const session = useFlashcardStore((s) => s.session)
  const end = useFlashcardStore((s) => s.end)
  // Die Runde ist hier abgeschlossen, also steht `finishedAt` – kein Blick auf
  // die Uhr während des Renderns nötig.
  const summary = useMemo(
    () => (session ? sessionSummary(session, session.finishedAt ?? session.startedAt) : null),
    [session],
  )

  const finish = useCallback(() => {
    end()
    onExit()
  }, [end, onExit])

  if (!summary) return null

  const minutes = Math.max(1, Math.round(summary.durationMs / 60_000))

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <Check className="h-10 w-10" />
      </span>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold">{t('education.flashcards.doneTitle')}</h2>
        <p className="text-sm text-muted">
          {t('education.flashcards.summarySubtitle', { count: summary.cards, minutes })}
        </p>
      </div>

      <dl className="grid w-full max-w-xs grid-cols-3 gap-3">
        <Stat label={t('education.flashcards.statRatings')} value={String(summary.ratings)} />
        <Stat
          label={t('education.flashcards.statRetention')}
          value={`${Math.round(summary.retention * 100)} %`}
        />
        <Stat label={t('education.flashcards.statAgain')} value={String(summary.again)} />
      </dl>

      <button
        type="button"
        onClick={finish}
        className="focus-ring w-full max-w-xs rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
      >
        {t('education.flashcards.finish')}
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-2 py-3">
      <dd className="text-lg font-bold">{value}</dd>
      <dt className="mt-0.5 text-[11px] text-muted">{label}</dt>
    </div>
  )
}
