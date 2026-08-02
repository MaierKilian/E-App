import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { StudyMode } from './StudyMode'
import {
  FLASHCARDS_PLACEHOLDER,
  FLASHCARD_SUBJECTS,
  cardCountForSubject,
  setsForSubject,
  type FlashcardSet,
} from './flashcardsContent'

/**
 * Karteikarten-Übersicht: eine ruhige, flache Liste – Fächer als schlanke
 * Gruppen, ihre Sets direkt als Zeilen. Ein Tipp startet den Vollbild-Lernmodus
 * (kein Drill-down, keine gestapelte Navigation).
 */
export function FlashcardsView() {
  const { t } = useTranslation()
  const [activeSet, setActiveSet] = useState<FlashcardSet | null>(null)

  return (
    <>
      <div className="space-y-6">
        <p className="text-sm text-muted">{t('education.flashcards.subtitle')}</p>

        {FLASHCARD_SUBJECTS.map((subject) => {
          const sets = setsForSubject(subject.id)
          return (
            <section key={subject.id} className="space-y-2">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h3 className="truncate text-sm font-semibold">{subject.title}</h3>
                <span className="shrink-0 text-xs text-muted">
                  {t('education.flashcards.cardCount', { count: cardCountForSubject(subject.id) })}
                </span>
              </div>
              <div className="glass overflow-hidden rounded-3xl">
                {sets.map((set, i) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => setActiveSet(set)}
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
            </section>
          )
        })}

        {FLASHCARDS_PLACEHOLDER && (
          <p className="px-1 text-xs text-muted">{t('education.flashcards.placeholderNote')}</p>
        )}
      </div>

      {activeSet && <StudyMode set={activeSet} onExit={() => setActiveSet(null)} />}
    </>
  )
}
