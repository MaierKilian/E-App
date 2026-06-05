import { useTranslation } from 'react-i18next'
import { Lightbulb } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * Karte mit rotierendem Energiespartipp.
 * Wählt deterministisch einen Tipp nach Kalendertag, damit er pro Tag stabil bleibt.
 */
export function TipOfTheDay() {
  const { t } = useTranslation()
  const tips = t('home.tips', { returnObjects: true })
  const list = Array.isArray(tips) ? (tips as string[]) : []
  if (list.length === 0) return null

  const tip = list[new Date().getDate() % list.length]

  return (
    <Card className="flex items-start gap-3">
      <span className="grid place-items-center w-10 h-10 shrink-0 rounded-2xl bg-primary/10 text-primary">
        <Lightbulb className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{t('home.tipTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{tip}</p>
      </div>
    </Card>
  )
}
