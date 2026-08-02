import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StudyMode } from './StudyMode'
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

/** Ebene 2: Sets eines Fachs – Antippen startet den Lernmodus. */
function SetList({
  subject,
  onBack,
  onStart,
}: {
  subject: FlashcardSubject
  onBack: () => void
  onStart: (set: FlashcardSet) => void
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
          <button key={set.id} type="button" onClick={() => onStart(set)} className="w-full text-left">
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
              <span className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                {t('education.flashcards.start')}
              </span>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Karteikarten-Bereich (Fächer → Sets → Lernmodus). Teil von „Hochschule". */
export function FlashcardsView() {
  const [subject, setSubject] = useState<FlashcardSubject | null>(null)
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null)

  return (
    <>
      {subject ? (
        <SetList subject={subject} onBack={() => setSubject(null)} onStart={setActiveSet} />
      ) : (
        <SubjectList onSelect={setSubject} />
      )}
      {activeSet && <StudyMode set={activeSet} onExit={() => setActiveSet(null)} />}
    </>
  )
}
