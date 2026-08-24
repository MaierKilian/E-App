import { useTranslation } from 'react-i18next'
import { Flame, Droplet, Zap, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { MEASUREMENT_CATALOG } from '../catalog'
import type { MeasurementCategory } from '../catalog'
import type { MeasurementResult } from '../types'
import { anyResultFor } from '../rooms'
import { countingRooms, isMeasurementDone, measurementProgress } from '../progress'
import { GroupTileGrid, type TileGroup, type TileItem } from './GroupTileGrid'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

const CATEGORY_ORDER: MeasurementCategory[] = ['heating', 'hot_water', 'electricity', 'water']

const CATEGORY_ICON: Record<MeasurementCategory, LucideIcon> = {
  heating: Flame,
  hot_water: Droplet,
  electricity: Zap,
  water: Waves,
}

const CATEGORY_COLOR: Record<MeasurementCategory, string> = {
  heating: '#f97316',
  hot_water: '#3b82f6',
  electricity: '#eab308',
  water: '#06b6d4',
}

/**
 * Gewerke-Ansicht als Kachel-Grid; Tippen klappt die Messungen horizontal
 * scrollbar auf.
 *
 * Eine Kachel steht hier für die Messung im Ganzen – ein Pro-Raum-Check gilt
 * also erst mit allen (nicht ausgenommenen) Räumen als erledigt, genau wie im
 * Ring darüber. Damit ist die Summe der Gewerke-Zähler zwangsläufig die Zahl
 * des Rings.
 */
export function TradesView({ results }: ViewProps) {
  const { t } = useTranslation()
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const skippedRooms = useMeasurementsStore((s) => s.skippedRooms)
  const instances = countingRooms(rooms, skippedRooms)

  const groups: TileGroup[] = CATEGORY_ORDER.map((category) => ({
    key: category,
    label: t(`measurements.categories.${category}`),
    icon: CATEGORY_ICON[category],
    color: CATEGORY_COLOR[category],
    items: MEASUREMENT_CATALOG.filter((m) => m.category === category).map<TileItem>((meta) => ({
      meta,
      // Repräsentatives Ergebnis: das direkte oder das erste Raum-/Stellen-
      // Ergebnis – sonst bliebe die Kachel eines Pro-Raum-Checks leer.
      result: anyResultFor(results, meta.id),
      done: isMeasurementDone(results, meta, instances),
      rooms: meta.perRoom ? measurementProgress(results, meta, instances) : undefined,
    })),
  })).filter((g) => g.items.length > 0)

  return <GroupTileGrid groups={groups} />
}
