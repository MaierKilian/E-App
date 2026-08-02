import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ChevronRight, Layers } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StudyMode } from './StudyMode'
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

/** Ebene 3: Sets eines Moduls – Antippen startet den Lernmodus. */
function ModuleDetail({
  module,
  onBack,
  onStart,
}: {
  module: FlashcardSubject
  onBack: () => void
  onStart: (set: FlashcardSet) => void
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
      <div className="glass overflow-hidden rounded-3xl">
        {sets.map((set, i) => (
          <button
            key={set.id}
            type="button"
            onClick={() => onStart(set)}
            className={`focus-ring flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-2/50 ${
              i > 0 ? 'border-t border-border/60' : ''
            }`}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{set.title}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {t('education.flashcards.cardCount', { count: set.cards.length })}
              </span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Karteikarten im HTW-GEIT-Bereich mit Studien-Hierarchie:
 * Semester (Kacheln) → Module (Kacheln) → Sets → Vollbild-Lernmodus.
 */
export function FlashcardsView() {
  const [semester, setSemester] = useState<number | null>(null)
  const [module, setModule] = useState<FlashcardSubject | null>(null)
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null)

  let content
  if (module) {
    content = (
      <ModuleDetail module={module} onBack={() => setModule(null)} onStart={setActiveSet} />
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
      {activeSet && <StudyMode set={activeSet} onExit={() => setActiveSet(null)} />}
    </>
  )
}
