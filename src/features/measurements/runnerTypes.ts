import type { MeasurementResult } from './types'

/** Phasen des geführten Mess-Ablaufs. */
export type RunnerPhase = 'intro' | 'run' | 'result'

/**
 * Ergebnis der Durchführungs-Phase: die fertige (noch nicht gespeicherte)
 * Auswertung plus die Roh-Eingaben, damit „Erneut messen" sie wieder anzeigen
 * kann. `null` bedeutet: noch keine gültige Auswertung möglich.
 */
export interface RunOutcome {
  result: MeasurementResult
}

/** Props der messungsspezifischen Run-Komponente. */
export interface RunProps {
  /** Wird aufgerufen, sobald eine gültige Auswertung vorliegt. */
  onEvaluate: (outcome: RunOutcome) => void
}

/** Props der messungsspezifischen Result-Komponente. */
export interface ResultProps {
  result: MeasurementResult
}

/**
 * Bündelt die drei messungsspezifischen Teil-Ansichten. Jede Messung
 * registriert ein solches Modul in der Runner-Registry (siehe registry.ts).
 */
export interface MeasurementModule {
  Intro: React.ComponentType
  Run: React.ComponentType<RunProps>
  Result: React.ComponentType<ResultProps>
}
