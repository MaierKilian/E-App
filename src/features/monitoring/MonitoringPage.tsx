import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useTariffStore } from '@/store/tariffStore'
import { TariffCard } from './TariffCard'
import { TariffModal } from './TariffModal'

export function MonitoringPage() {
  const { t } = useTranslation()
  const promptSeen = useTariffStore((s) => s.promptSeen)
  const [modalOpen, setModalOpen] = useState(false)

  // Beim Erstbesuch automatisch das Tarif-Modal anzeigen.
  useEffect(() => {
    if (!promptSeen) setModalOpen(true)
  }, [promptSeen])

  const soonPoints = t('monitoring.tariff.soonPoints', { returnObjects: true }) as string[]

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span className="grid place-items-center w-12 h-12 rounded-2xl bg-primary/10 text-primary shrink-0">
          <LineChart className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">{t('pages.monitoring.title')}</h1>
          <p className="text-muted mt-1">{t('pages.monitoring.subtitle')}</p>
        </div>
      </div>

      <TariffCard onEdit={() => setModalOpen(true)} />

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-3">
          {t('monitoring.tariff.soonTitle')}
        </h2>
        <ul className="space-y-2.5">
          {soonPoints.map((point, index) => (
            <li key={index} className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </Card>

      <TariffModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
