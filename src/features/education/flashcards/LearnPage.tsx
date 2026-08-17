import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight, Flame, GraduationCap, Layers, Play } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { useFlashcardStore } from '@/store/flashcardStore'
import { StudySession } from './StudySession'
import { allCards, cardsOfSubject } from './cardIndex'
import { FLASHCARD_SUBJECTS, type FlashcardSubject } from './flashcardsContent'
import type { QueueCard } from './engine/queue'
import { useDueCounts, useFlashcardsReady, useNow, useStreak, useTodayProgress } from './useFlashcards'

/** Der gerade geöffnete Lernstapel. */
interface Stack {
  scope: string
  title: string
  cards: QueueCard[]
}

/**
 * „Heute" – der tägliche Einstieg in den Karteikarten-Trainer.
 *
 * Bewusst eine eigene Route (`/lernen`) statt eines weiteren Unterpunkts im
 * Wissensbereich: Was man täglich benutzt, darf nicht fünf Ebenen tief liegen.
 * Die Seite beantwortet in dieser Reihenfolge: Wie weit bin ich heute? Was steht
 * noch an? Womit fange ich an?
 */
export function LearnPage() {
  const { t } = useTranslation()
  const ready = useFlashcardsReady()
  const now = useNow()
  const [stack, setStack] = useState<Stack | null>(null)

  const cards = useMemo(() => allCards(), [])
  const counts = useDueCounts(cards, now)
  const progress = useTodayProgress(cards, now)
  const streak = useStreak(now)

  const session = useFlashcardStore((s) => s.session)
  const sessionScope = useFlashcardStore((s) => s.sessionScope)
  const running = session != null && session.finishedAt == null

  // Bezugsgröße des Rings ist das Tagespensum: abgehakt + in Arbeit + offen.
  // So schrumpft die Gesamtzahl im Lauf des Tages nicht.
  const goal = progress.done + progress.inProgress + counts.total
  const openAll = counts.total > 0

  function resume() {
    setStack({
      scope: sessionScope ?? 'all',
      title: t('education.flashcards.resume'),
      cards,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('education.flashcards.todayTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('education.flashcards.todaySubtitle')}</p>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          <ProgressRing done={progress.done} total={Math.max(goal, 1)} size={64} stroke={7} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {ready
                ? t('education.flashcards.dueToday', { count: counts.total })
                : t('education.flashcards.loading')}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {t('education.flashcards.doneTodayLabel', { count: progress.done })}
              {progress.inProgress > 0 &&
                ` · ${t('education.flashcards.inProgress', { count: progress.inProgress })}`}
            </p>
            {streak.current > 0 && (
              <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <Flame className="h-3.5 w-3.5" />
                {t('education.flashcards.streak', { count: streak.current })}
              </p>
            )}
          </div>
        </div>

        {ready && counts.total > 0 && (
          <div className="flex flex-wrap gap-2">
            <Pill label={t('education.flashcards.dueRelearning')} value={counts.relearning} />
            <Pill label={t('education.flashcards.dueReview')} value={counts.review} />
            <Pill label={t('education.flashcards.dueNew')} value={counts.new} />
          </div>
        )}

        {running ? (
          <button
            type="button"
            onClick={resume}
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            <Play className="h-4 w-4" />
            {t('education.flashcards.resume')}
          </button>
        ) : (
          <button
            type="button"
            disabled={!ready || !openAll}
            onClick={() =>
              setStack({ scope: 'all', title: t('education.flashcards.todayTitle'), cards })
            }
            className="focus-ring flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
          >
            <GraduationCap className="h-4 w-4" />
            {t('education.flashcards.startToday')}
          </button>
        )}

        {ready && !openAll && !running && (
          <p className="text-center text-xs text-muted">{t('education.flashcards.allDone')}</p>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="px-1 text-sm font-semibold text-muted">
          {t('education.flashcards.modulesTitle')}
        </h2>
        <div className="glass overflow-hidden rounded-3xl">
          {FLASHCARD_SUBJECTS.map((subject, i) => (
            <SubjectRow
              key={subject.id}
              subject={subject}
              now={now}
              first={i === 0}
              onStart={(cardsOfIt) =>
                setStack({ scope: `subject:${subject.id}`, title: subject.title, cards: cardsOfIt })
              }
            />
          ))}
        </div>
        <Link
          to="/education"
          className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground"
        >
          <Layers className="h-4 w-4" />
          {t('education.flashcards.allSets')}
        </Link>
      </section>

      {stack && (
        <StudySession
          cards={stack.cards}
          title={stack.title}
          scope={stack.scope}
          onExit={() => setStack(null)}
        />
      )}
    </div>
  )
}

/** Ein Modul mit Fälligkeits-Zähler. */
function SubjectRow({
  subject,
  now,
  first,
  onStart,
}: {
  subject: FlashcardSubject
  now: number
  first: boolean
  onStart: (cards: QueueCard[]) => void
}) {
  const { t } = useTranslation()
  const cards = useMemo(() => cardsOfSubject(subject.id), [subject.id])
  const counts = useDueCounts(cards, now)

  return (
    <button
      type="button"
      onClick={() => onStart(cards)}
      className={`focus-ring flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2/50 ${
        first ? '' : 'border-t border-border/60'
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{subject.title}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {t('education.flashcards.semesterShort', { n: subject.semester })} ·{' '}
          {t('education.flashcards.cardCount', { count: cards.length })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {counts.total > 0 && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {counts.total}
          </span>
        )}
        <ChevronRight className="h-5 w-5 text-muted" />
      </span>
    </button>
  )
}

/** Kleine Kennzahl in der Aufschlüsselung. */
function Pill({ label, value }: { label: string; value: number }) {
  if (value === 0) return null
  return (
    <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
      {label}: <span className="font-semibold text-foreground">{value}</span>
    </span>
  )
}
