import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LineChart } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useTariffStore } from '@/store/tariffStore'
import type { EnergyType } from '@/store/readingsStore'
import { TariffCard } from './TariffCard'
import { TariffModal } from './TariffModal'
import { EnergyTypeSwitcher } from './EnergyTypeSwitcher'
import { ElectricityMonitor } from './ElectricityMonitor'

/** Aktuell auswählbare Energieträger (nur Strom). */
const AVAILABLE_TYPES: EnergyType[] = ['electricity']

export function MonitoringPage() {
  const { t } = useTranslation()
  // Beim Erstbesuch automatisch das Tarif-Modal anzeigen (Initialwert ohne Effekt).
  const [modalOpen, setModalOpen] = useState(() => !useTariffStore.getState().promptSeen)
  const [energyType, setEnergyType] = useState<EnergyType>('electricity')

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

      <EnergyTypeSwitcher
        value={energyType}
        onChange={setEnergyType}
        available={AVAILABLE_TYPES}
      />

      <ElectricityMonitor type={energyType} />

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted mb-2">
          {t('monitoring.tariff.soonTitle')}
        </h2>
        <p className="text-sm text-muted">{t('monitoring.tariff.soonText')}</p>
      </Card>

      <TariffModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
