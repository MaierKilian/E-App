import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useWidgetOrderStore } from '@/store/widgetOrderStore'
import { ENERGY_META, activeEnergyTypes } from './energyConfig'
import { sortByDate } from './readings'
import { dueTypes } from './due'
import { AddReadingScreen } from './AddReadingScreen'
import { WidgetBoard } from './WidgetBoard'

/**
 * Führt die gespeicherte Wunsch-Reihenfolge mit den aktuell aktiven Zählern
 * zusammen: bekannte Typen in der gewählten Reihenfolge, danach neu
 * hinzugekommene Energieträger. Entfernte Typen fallen automatisch weg.
 */
function mergeOrder(saved: EnergyType[], active: EnergyType[]): EnergyType[] {
  const activeSet = new Set(active)
  const known = saved.filter((type) => activeSet.has(type))
  const missing = active.filter((type) => !known.includes(type))
  return [...known, ...missing]
}

/**
 * Monitoring-Übersicht (Dashboard): prägnanter Kopf, dann das anordenbare
 * Widget-Board – ein großes Hero-Widget (Position 0) und darunter das Raster
 * der übrigen Energieträger. Widgets lassen sich per Gedrückt-halten-und-ziehen
 * frei umsortieren; die Reihenfolge wird pro Wohnprofil gespeichert. Jede Karte
 * zeigt Stand, Mini-Verlauf und Trend; Tap öffnet die Detailseite.
 */
export function MonitoringPage() {
  const { t } = useTranslation()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const savedOrder = useWidgetOrderStore((s) => s.order)
  const setOrder = useWidgetOrderStore((s) => s.setOrder)
  const [now] = useState(() => Date.now())
  // Direkteingabe: ohne Umweg über die Detailseite den Zählerstand erfassen.
  const [addType, setAddType] = useState<EnergyType | null>(null)

  const types = activeEnergyTypes(data)
  const order = useMemo(() => mergeOrder(savedOrder, types), [savedOrder, types])
  const due = useMemo(
    () => new Set(dueTypes(data, readingsByType, frequency, now)),
    [data, readingsByType, frequency, now],
  )

  const addMeta = addType ? ENERGY_META[addType] : null
  const addLatest = addType ? sortByDate(readingsByType[addType] ?? []).at(-1) : undefined

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('monitoring.overview.title')}
        subtitle={t('monitoring.overview.subtitle')}
      />

      {due.size > 0 && (
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-foreground">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </span>
          {t('monitoring.overview.dueBanner', { count: due.size })}
        </div>
      )}

      {order.length > 0 && (
        <WidgetBoard
          order={order}
          due={due}
          now={now}
          onReorder={setOrder}
          onAdd={setAddType}
        />
      )}

      {order.length >= 2 && (
        <p className="text-center text-xs text-muted">{t('monitoring.overview.reorderHint')}</p>
      )}

      {addType && addMeta && (
        <AddReadingScreen
          type={addType}
          unit={addMeta.unit}
          typeLabel={t(`monitoring.energyTypes.${addType}`)}
          accent={addMeta.accent}
          icon={addMeta.icon}
          defaultValue={addLatest ? Math.trunc(addLatest.value) : 0}
          onClose={() => setAddType(null)}
        />
      )}
    </div>
  )
}
