import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Ergebnis eines bestandenen/absolvierten Vorbereitungstests. */
export interface QuizRecord {
  score: number
  total: number
  passed: boolean
  /** ISO-Datum der letzten Auswertung. */
  date: string
}

interface ProgressState {
  /** Letztes Quiz-Ergebnis je Laborversuch (experiment.id). */
  quizResults: Record<string, QuizRecord>
  recordQuiz: (experimentId: string, record: Omit<QuizRecord, 'date'>) => void
  resetProgress: () => void
}

/**
 * Lernfortschritt des Nutzers (lokal, persistiert unter "eapp-progress").
 * Aktuell: Quiz-Ergebnisse je Laborversuch. Wird in späteren Phasen um
 * XP, Streak und Badges erweitert.
 */
export const useProgressStore = create<ProgressState>()(
  persist(
    (set) => ({
      quizResults: {},
      recordQuiz: (experimentId, record) =>
        set((s) => {
          const prev = s.quizResults[experimentId]
          // Bestes Ergebnis behalten: ein einmal bestandener Test bleibt bestanden.
          const keepPrev = prev && prev.passed && !record.passed
          if (keepPrev) {
            return {
              quizResults: {
                ...s.quizResults,
                [experimentId]: { ...prev, date: new Date().toISOString() },
              },
            }
          }
          return {
            quizResults: {
              ...s.quizResults,
              [experimentId]: { ...record, date: new Date().toISOString() },
            },
          }
        }),
      resetProgress: () => set({ quizResults: {} }),
    }),
    {
      name: 'eapp-progress',
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<ProgressState>),
        quizResults: (persisted as Partial<ProgressState>)?.quizResults ?? {},
      }),
    },
  ),
)
