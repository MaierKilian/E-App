import { useTranslation } from 'react-i18next'
import { BarChart3, FileText, Lightbulb, Ruler, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { fieldsFor, usageOf, type FieldConsumer } from './fieldUsage'

const CONSUMER_ICONS: Record<FieldConsumer, LucideIcon> = {
  measurements: Ruler,
  monitoring: BarChart3,
  report: FileText,
  tips: Lightbulb,
}

/** Reihenfolge nach Nähe zum Nutzer: erst was er tut, dann was er bekommt. */
const CONSUMERS: FieldConsumer[] = ['measurements', 'monitoring', 'tips', 'report']

/**
 * „Wofür wir das nutzen" – welche Angabe an welcher Stelle etwas bewirkt.
 *
 * Gespeist aus derselben Tabelle wie der Test (`fieldUsage.ts`), damit die
 * Aussage nicht auseinanderlaufen kann: Was hier steht, ist genau das, was der
 * Code auch liest.
 *
 * **Bewusst kein Abzeichen an jeder einzelnen Frage.** Für einen neuen Nutzer,
 * der noch nichts gemessen hat, sagt „Monitoring" neben einer Frage nichts. Als
 * Aufstellung am Ende – und später in der Profil-Übersicht, wo sie nach ein
 * paar Wochen tatsächlich etwas erklärt – sagt sie etwas.
 *
 * Felder ohne `labelKey` fehlen hier absichtlich: `completed` und `mode` sind
 * innerer Zustand, keine beantwortete Frage.
 */
export function FieldUsageSummary() {
  const { t } = useTranslation()

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-primary">
          {t('onboarding.fieldUsage.title')}
        </h3>
        <p className="mt-1 text-sm text-muted">{t('onboarding.fieldUsage.intro')}</p>
      </div>

      <ul className="space-y-3">
        {CONSUMERS.map((consumer) => {
          const labels = fieldsFor(consumer)
            .map((key) => usageOf(key).labelKey)
            .filter((key): key is string => Boolean(key))
            .map((key) => t(key))
          if (labels.length === 0) return null
          const Icon = CONSUMER_ICONS[consumer]

          return (
            <li key={consumer} className="flex items-start gap-2.5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {t(`onboarding.fieldUsage.consumers.${consumer}`)}
                </p>
                <p className="text-sm text-muted">{labels.join(' · ')}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
