import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Bell } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ENERGY_META, activeEnergyTypes } from './energyConfig'
import { sortByDate } from './readings'
import { dueTypes } from './due'

/**
 * Monitoring-Übersicht (Dashboard): schlanker Kopf und ein Kachel-Grid der
 * für das Profil aktiven Energieträger. Jede Kachel zeigt Icon, Name und den
 * letzten Stand; Tap öffnet die Detailseite `/monitoring/<type>`.
 */
export function MonitoringPage() {
  const { t } = useTranslation()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const [now] = useState(() => Date.now())

  const types = activeEnergyTypes(data)
  const due = new Set(dueTypes(data, readingsByType, frequency, now))

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('monitoring.overview.title')}</h1>
        <p className="text-muted mt-1 text-sm">{t('monitoring.overview.subtitle')}</p>
      </div>

      {due.size > 0 && (
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-foreground">
          <Bell className="w-4 h-4 text-primary shrink-0" />
          {t('monitoring.overview.dueBanner', { count: due.size })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => (
          <MeterTile key={type} type={type} due={due.has(type)} />
        ))}
      </div>
    </div>
  )
}

interface MeterTileProps {
  type: EnergyType
  due: boolean
}

/** Kompakte Kachel eines Energieträgers mit aktuellem Stand. */
function MeterTile({ type, due }: MeterTileProps) {
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
        {due ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {t('monitoring.reminder.due')}
          </span>
        ) : (
          <ChevronRight className="w-4 h-4 text-muted" />
        )}
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
