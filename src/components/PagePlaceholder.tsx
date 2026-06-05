import type { LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from './ui/Card'

interface PagePlaceholderProps {
  icon: LucideIcon
  pageKey: string
}

/**
 * Einheitliche Platzhalter-Ansicht für die Hauptbereiche in Phase 0.
 * Zeigt Titel, Kurzbeschreibung und die für den Bereich geplanten Funktionen.
 * Wird in den folgenden Phasen pro Bereich durch echte Inhalte ersetzt.
 */
export function PagePlaceholder({ icon: Icon, pageKey }: PagePlaceholderProps) {
  const { t } = useTranslation()
  const points = t(`pages.${pageKey}.points`, { returnObjects: true }) as string[]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
          <Icon className="w-6 h-6" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{t(`pages.${pageKey}.title`)}</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-surface-2 text-muted">
              {t('common.comingSoon')}
            </span>
          </div>
          <p className="text-muted mt-1">{t(`pages.${pageKey}.subtitle`)}</p>
        </div>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('common.plannedFeatures')}
        </h2>
        <ul className="space-y-2.5">
          {points.map((point, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
