import { useTranslation } from 'react-i18next'
import { Check, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export interface NextStepTask {
  id: string
  label: string
  done: boolean
  onClick: () => void
}

interface NextStepsProps {
  tasks: NextStepTask[]
}

/**
 * Aufgaben-Liste ("Nächste Schritte") als dezenter Engagement-Motor.
 * Erledigte Aufgaben werden durchgestrichen/gedämpft, offene sind anklickbar.
 */
export function NextSteps({ tasks }: NextStepsProps) {
  const { t } = useTranslation()
  const doneCount = tasks.filter((task) => task.done).length

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t('home.nextSteps.title')}</h3>
        <span className="text-xs font-medium text-muted tabular-nums">
          {t('home.nextSteps.progress', { done: doneCount, total: tasks.length })}
        </span>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <button
              type="button"
              onClick={task.onClick}
              disabled={task.done}
              className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                task.done
                  ? 'border-transparent bg-surface-2/60'
                  : 'border-border bg-surface/70 hover:bg-surface-2 active:scale-[0.99]'
              }`}
            >
              <span
                className={`grid place-items-center w-6 h-6 shrink-0 rounded-full border ${
                  task.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-transparent'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </span>
              <span
                className={`flex-1 text-sm ${
                  task.done ? 'text-muted line-through' : 'text-foreground'
                }`}
              >
                {task.label}
              </span>
              {task.done ? (
                <span className="text-xs font-medium text-primary">
                  {t('home.nextSteps.done')}
                </span>
              ) : (
                <ChevronRight className="w-4 h-4 text-muted transition-transform group-hover:translate-x-0.5" />
              )}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
