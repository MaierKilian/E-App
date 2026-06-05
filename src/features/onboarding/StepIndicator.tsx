import { useTranslation } from 'react-i18next'
import {
  User,
  Building2,
  LayoutGrid,
  Flame,
  Thermometer,
  Wrench,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const STEP_ICONS: LucideIcon[] = [
  User,
  Building2,
  LayoutGrid,
  Flame,
  Thermometer,
  Wrench,
  MapPin,
  CheckCircle,
]

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const { t } = useTranslation()
  const labels = t('onboarding.stepIndicator.steps', { returnObjects: true }) as string[]

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center min-w-max mx-auto px-1">
        {Array.from({ length: totalSteps }, (_, i) => {
          const Icon = STEP_ICONS[i]
          const isCompleted = i < currentStep
          const isActive = i === currentStep

          return (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isActive
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-surface border-border text-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-xs font-medium leading-none ${
                    isActive ? 'text-primary' : isCompleted ? 'text-primary/70' : 'text-muted'
                  }`}
                >
                  {labels[i]}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`w-8 h-0.5 mb-4 mx-0.5 transition-colors ${
                    i < currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
