import { useTranslation } from 'react-i18next'
import type { SectionState } from './sections'

interface StepIndicatorProps {
  /** 0-basierter aktueller Schritt. */
  currentStep: number
  /** Titel des aktuellen Schritts (einzige Stelle für den Titel). */
  title: string
  /** Zustand je Schritt, in der Reihenfolge des Fragebogens. */
  states: SectionState[]
}

/**
 * Schlanke, ruhige Fortschrittsanzeige ohne horizontales Scrollen.
 * Eine segmentierte Leiste (ein Segment je Schritt) plus Meta-Zeile
 * "Schritt X von Y" und der aktuelle Schritt-Titel.
 *
 * Die Leiste kannte früher nur zwei Zustände: erreicht (`i <= currentStep`) oder
 * nicht. Ein durchgeklickter, aber unvollständiger Schritt sah damit aus wie ein
 * fertiger. Jetzt gibt es drei – und „angefangen" ist bewusst die auffälligste
 * Stufe: Ein begonnener Schritt ist eine offene Schleife, ein nie besuchter nur
 * noch nicht dran.
 */
export function StepIndicator({ currentStep, title, states }: StepIndicatorProps) {
  const { t } = useTranslation()
  const totalSteps = states.length

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {states.map((state, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 overflow-hidden rounded-full transition-all duration-300 ${
              state === 'complete' ? 'progress-glow' : 'bg-border'
            } ${i === currentStep ? 'ring-2 ring-primary/30' : ''}`}
          >
            {/* Angefangen: halb gefüllt und gestreift – klar unterscheidbar von
                „noch nicht dran" (grau) und „fertig" (voll, leuchtend). */}
            {state === 'started' && (
              <span className="progress-striped block h-full w-1/2 rounded-full" />
            )}
          </span>
        ))}
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>
        <span className="shrink-0 text-xs font-medium text-muted tabular-nums">
          {t('onboarding.stepIndicator.progress', {
            current: currentStep + 1,
            total: totalSteps,
          })}
        </span>
      </div>
    </div>
  )
}
