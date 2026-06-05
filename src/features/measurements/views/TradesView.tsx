import { useTranslation } from 'react-i18next'
import { MEASUREMENT_CATALOG } from '../catalog'
import type { MeasurementCategory } from '../catalog'
import type { MeasurementResult } from '../types'
import { MeasurementRow } from '../MeasurementRow'

interface ViewProps {
  results: Partial<Record<string, MeasurementResult>>
}

const CATEGORY_ORDER: MeasurementCategory[] = ['heating', 'hot_water', 'electricity', 'water']

/** Gewerke-Ansicht: Messungen nach Kategorie gruppiert mit erledigt/gesamt. */
export function TradesView({ results }: ViewProps) {
  const { t } = useTranslation()

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: MEASUREMENT_CATALOG.filter((m) => m.category === category),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="space-y-6">
      {groups.map(({ category, items }) => {
        const done = items.filter((m) => results[m.id]).length
        return (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="font-semibold text-foreground">
                {t(`measurements.categories.${category}`)}
              </h2>
              <span className="text-sm font-semibold tabular-nums text-muted">
                {done}/{items.length}
              </span>
            </div>
            <div className="space-y-2">
              {items.map((meta) => (
                <MeasurementRow key={meta.id} meta={meta} result={results[meta.id]} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
