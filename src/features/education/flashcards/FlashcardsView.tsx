import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronLeft, ChevronRight, Layers, RotateCw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import {
  FLASHCARDS_PLACEHOLDER,
  FLASHCARD_SUBJECTS,
  cardCountForSubject,
  setsForSubject,
  type FlashcardSet,
  type FlashcardSubject,
} from './flashcardsContent'

/** Dezenter Hinweis, dass die aktuellen Karten Beispiele sind. */
function PlaceholderNote() {
  const { t } = useTranslation()
  if (!FLASHCARDS_PLACEHOLDER) return null
  return (
    <p className="rounded-2xl bg-amber-500/10 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
      {t('education.flashcards.placeholderNote')}
    </p>
  )
}

/** Zurück-Button im Stil der übrigen Detailansichten. */
function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className="focus-ring flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('education.quiz.back')}
    </button>
  )
}

/** Ebene 1: Fächer-Übersicht. */
function SubjectList({ onSelect }: { onSelect: (s: FlashcardSubject) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">{t('education.flashcards.title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('education.flashcards.subtitle')}</p>
      </div>
      <PlaceholderNote />
      <div className="space-y-3">
        {FLASHCARD_SUBJECTS.map((subject) => {
          const sets = setsForSubject(subject.id).length
          const cards = cardCountForSubject(subject.id)
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelect(subject)}
              className="w-full text-left"
            >
              <Card className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{subject.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
                    {subject.semester != null && (
                      <>
                        <span>{t('education.flashcards.semester', { n: subject.semester })}</span>
                        <span aria-hidden>·</span>
                      </>
                    )}
                    <span>{t('education.flashcards.setCount', { count: sets })}</span>
                    <span aria-hidden>·</span>
                    <span>{t('education.flashcards.cardCount', { count: cards })}</span>
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Ebene 2: Sets eines Fachs. */
function SetList({
  subject,
  onBack,
  onSelect,
}: {
  subject: FlashcardSubject
  onBack: () => void
  onSelect: (set: FlashcardSet) => void
}) {
  const { t } = useTranslation()
  const sets = setsForSubject(subject.id)

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <div>
        <h2 className="text-xl font-bold">{subject.title}</h2>
        {subject.description && <p className="mt-1 text-sm text-muted">{subject.description}</p>}
      </div>
      <div className="space-y-3">
        {sets.map((set) => (
          <button key={set.id} type="button" onClick={() => onSelect(set)} className="w-full text-left">
            <Card className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{set.title}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {t('education.flashcards.cardCount', { count: set.cards.length })}
                  </span>
                </span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Ebene 3: Karten durchblättern (antippen zum Umdrehen). */
function BrowseSession({ set, onBack }: { set: FlashcardSet; onBack: () => void }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const total = set.cards.length
  const card = set.cards[index]

  const go = (delta: number) => {
    setFlipped(false)
    setIndex((i) => Math.min(Math.max(i + delta, 0), total - 1))
  }

  const front = card.frontText ?? ''
  const back = card.backText ?? ''
  const showText = flipped ? back : front

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />

      <div>
        <h2 className="text-xl font-bold">{set.title}</h2>
        <p className="mt-1 text-xs text-muted">
          {t('education.flashcards.progress', { current: index + 1, total })}
        </p>
      </div>

      {/* Fortschrittsleiste der Session */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>

      {/* Karte – antippen zum Umdrehen */}
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={t('education.flashcards.flip')}
        className="focus-ring block w-full text-left"
      >
        <Card className="flex min-h-[13rem] flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              {flipped ? t('education.flashcards.back') : t('education.flashcards.front')}
            </span>
            <RotateCw className="h-4 w-4 text-muted" />
          </div>
          <p className="text-base leading-relaxed text-foreground">{showText}</p>
          {card.tags && card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {card.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[11px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Card>
      </button>

      <p className="text-center text-xs text-muted">{t('education.flashcards.tapHint')}</p>

      {/* Navigation vor/zurück */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('education.flashcards.prev')}
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40"
        >
          {t('education.flashcards.next')}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Karteikarten-Bereich (Fächer → Sets → Karten). Teil von „Hochschule". */
export function FlashcardsView() {
  const [subject, setSubject] = useState<FlashcardSubject | null>(null)
  const [set, setSet] = useState<FlashcardSet | null>(null)

  if (set) return <BrowseSession set={set} onBack={() => setSet(null)} />
  if (subject) {
    return <SetList subject={subject} onBack={() => setSubject(null)} onSelect={setSet} />
  }
  return <SubjectList onSelect={setSubject} />
}
