import { useTranslation } from 'react-i18next'

interface StepIndicatorProps {
  /** 0-basierter aktueller Schritt. */
  currentStep: number
  totalSteps: number
  /** Titel des aktuellen Schritts (einzige Stelle für den Titel). */
  title: string
}

/**
 * Schlanke, ruhige Fortschrittsanzeige ohne horizontales Scrollen.
 * Eine segmentierte Leiste (ein Segment je Schritt) plus Meta-Zeile
 * "Schritt X von Y" und der aktuelle Schritt-Titel.
 */
export function StepIndicator({ currentStep, totalSteps, title }: StepIndicatorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: totalSteps }, (_, i) => {
          const filled = i <= currentStep
          return (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                filled ? 'bg-primary' : 'bg-border'
              }`}
            />
          )
        })}
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
