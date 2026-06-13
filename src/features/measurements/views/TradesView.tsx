import { useTranslation } from 'react-i18next'
import { Flame, Droplet, Zap, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { MEASUREMENT_CATALOG } from '../catalog'
import type { MeasurementCategory } from '../catalog'
import type { MeasurementResult } from '../types'
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

/** Gewerke-Ansicht als Kachel-Grid; Tippen klappt die Messungen horizontal scrollbar auf. */
export function TradesView({ results }: ViewProps) {
  const { t } = useTranslation()

  const groups: TileGroup[] = CATEGORY_ORDER.map((category) => ({
    key: category,
    label: t(`measurements.categories.${category}`),
    icon: CATEGORY_ICON[category],
    items: MEASUREMENT_CATALOG.filter((m) => m.category === category).map<TileItem>((meta) => ({
      meta,
    })),
  })).filter((g) => g.items.length > 0)

  return <GroupTileGrid groups={groups} results={results} />
}
