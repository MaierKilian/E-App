import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ENERGY_META, activeEnergyTypes } from './energyConfig'
import { sortByDate } from './readings'

/**
 * Monitoring-Übersicht (Dashboard): schlanker Kopf und ein Kachel-Grid der
 * für das Profil aktiven Energieträger. Jede Kachel zeigt Icon, Name und den
 * letzten Stand; Tap öffnet die Detailseite `/monitoring/<type>`.
 */
export function MonitoringPage() {
  const { t } = useTranslation()
  const data = useOnboardingStore((s) => s.data)
  const types = activeEnergyTypes(data)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('monitoring.overview.title')}</h1>
        <p className="text-muted mt-1 text-sm">{t('monitoring.overview.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => (
          <MeterTile key={type} type={type} />
        ))}
      </div>
    </div>
  )
}

interface MeterTileProps {
  type: EnergyType
}

/** Kompakte Kachel eines Energieträgers mit aktuellem Stand. */
function MeterTile({ type }: MeterTileProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  const meta = ENERGY_META[type]
  const Icon = meta.icon
  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  return (
    <button
      type="button"
      onClick={() => navigate(`/monitoring/${type}`)}
      className="glass flex flex-col items-start gap-3 rounded-3xl p-4 text-left transition-[transform,background-color] duration-200 hover:bg-surface-2/60 active:scale-[0.97]"
    >
      <div className="flex w-full items-center justify-between">
        <span className="grid place-items-center w-10 h-10 rounded-2xl bg-primary/10 text-primary">
          <Icon className="w-5 h-5" />
        </span>
        <ChevronRight className="w-4 h-4 text-muted" />
      </div>
      <div className="w-full min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {t(`monitoring.energyTypes.${type}`)}
        </p>
        {latest ? (
          <p className="mt-0.5 text-sm text-muted tabular-nums truncate">
            {numFmt.format(latest.value)} {meta.unit}
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted truncate">
            {t('monitoring.overview.empty')}
          </p>
        )}
      </div>
    </button>
  )
}
