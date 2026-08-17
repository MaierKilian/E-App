import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, BookOpen, GraduationCap, Layers } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { BrowseMode } from './BrowseMode'
import { StudySession } from './StudySession'
import { cardsOfSet } from './cardIndex'
import {
  FLASHCARDS_PLACEHOLDER,
  SEMESTERS,
  cardCountForSubject,
  modulesForSemester,
  setsForSubject,
  type FlashcardSet,
  type FlashcardSubject,
} from './flashcardsContent'

/** Zurück-Link im Stil der übrigen Detailansichten. */
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

/** Ebene 1: Semester 1–6 als Kacheln. */
function SemesterGrid({ onSelect }: { onSelect: (semester: number) => void }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('education.flashcards.chooseSemester')}</p>
      <div className="grid grid-cols-2 gap-3">
        {SEMESTERS.map((sem) => {
          const modules = modulesForSemester(sem).length
          const empty = modules === 0
          return (
            <button
              key={sem}
              type="button"
              onClick={() => !empty && onSelect(sem)}
              disabled={empty}
              className="focus-ring text-left disabled:cursor-default"
            >
              <Card className={`flex h-full flex-col gap-3 ${empty ? 'opacity-55' : ''}`}>
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                  {sem}
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    {t('education.flashcards.semester', { n: sem })}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {empty
                      ? t('education.flashcards.comingSoon')
                      : t('education.flashcards.moduleCount', { count: modules })}
                  </span>
                </span>
              </Card>
            </button>
          )
        })}
      </div>
      {FLASHCARDS_PLACEHOLDER && (
        <p className="px-1 text-xs text-muted">{t('education.flashcards.placeholderNote')}</p>
      )}
    </div>
  )
}

/** Ebene 2: Module eines Semesters als Kacheln. */
function ModuleGrid({
  semester,
  onBack,
  onSelect,
}: {
  semester: number
  onBack: () => void
  onSelect: (m: FlashcardSubject) => void
}) {
  const { t } = useTranslation()
  const modules = modulesForSemester(semester)

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <h2 className="text-xl font-bold">{t('education.flashcards.semester', { n: semester })}</h2>
      <div className="grid grid-cols-2 gap-3">
        {modules.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onSelect(m)}
            className="focus-ring text-left"
          >
            <Card className="flex h-full flex-col gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Layers className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-snug">{m.title}</span>
                <span className="mt-1 block text-xs text-muted">
                  {t('education.flashcards.cardCount', { count: cardCountForSubject(m.id) })}
                </span>
              </span>
            </Card>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Ebene 3: Sets eines Moduls – lernen (Trainer) oder nur durchblättern. */
function ModuleDetail({
  module,
  onBack,
  onStudy,
  onBrowse,
}: {
  module: FlashcardSubject
  onBack: () => void
  onStudy: (set: FlashcardSet) => void
  onBrowse: (set: FlashcardSet) => void
}) {
  const { t } = useTranslation()
  const sets = setsForSubject(module.id)

  return (
    <div className="space-y-4">
      <BackButton onClick={onBack} />
      <div>
        <h2 className="text-xl font-bold">{module.title}</h2>
        {module.description && <p className="mt-1 text-sm text-muted">{module.description}</p>}
      </div>
      <div className="space-y-3">
        {sets.map((set) => (
          <Card key={set.id} className="space-y-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{set.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {t('education.flashcards.cardCount', { count: set.cards.length })}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onStudy(set)}
                className="focus-ring flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <GraduationCap className="h-4 w-4" />
                {t('education.flashcards.study')}
              </button>
              <button
                type="button"
                onClick={() => onBrowse(set)}
                className="focus-ring flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-foreground"
              >
                <BookOpen className="h-4 w-4" />
                {t('education.flashcards.browse')}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * Karteikarten im HTW-GEIT-Bereich mit Studien-Hierarchie:
 * Semester (Kacheln) → Module (Kacheln) → Sets → Vollbild (Trainer oder Blättern).
 */
export function FlashcardsView() {
  const [semester, setSemester] = useState<number | null>(null)
  const [module, setModule] = useState<FlashcardSubject | null>(null)
  const [studySet, setStudySet] = useState<FlashcardSet | null>(null)
  const [browseSet, setBrowseSet] = useState<FlashcardSet | null>(null)

  let content
  if (module) {
    content = (
      <ModuleDetail
        module={module}
        onBack={() => setModule(null)}
        onStudy={setStudySet}
        onBrowse={setBrowseSet}
      />
    )
  } else if (semester != null) {
    content = (
      <ModuleGrid semester={semester} onBack={() => setSemester(null)} onSelect={setModule} />
    )
  } else {
    content = <SemesterGrid onSelect={setSemester} />
  }

  return (
    <>
      {content}
      {studySet && (
        <StudySession
          cards={cardsOfSet(studySet.id)}
          title={studySet.title}
          scope={studySet.id}
          onExit={() => setStudySet(null)}
        />
      )}
      {browseSet && <BrowseMode set={browseSet} onExit={() => setBrowseSet(null)} />}
    </>
  )
}
