import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { RecommendedView } from './views/RecommendedView'
import { TradesView } from './views/TradesView'
import { ByRoomView } from './views/ByRoomView'

type View = 'recommended' | 'trades' | 'byRoom'

const VIEWS: View[] = ['recommended', 'trades', 'byRoom']

/** Schlanker Ansichts-Umschalter (segmented control). */
function ViewSwitch({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { t } = useTranslation()
  return (
    <div className="glass flex gap-1 rounded-2xl p-1">
      {VIEWS.map((v) => {
        const active = v === view
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={active}
            className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {t(`measurements.views.${v}`)}
          </button>
        )
      })}
    </div>
  )
}

/** Übersicht aller Messungen mit drei Ansichten (Empfohlen / Gewerke / Raumweise). */
export function MeasurementsPage() {
  const { t } = useTranslation()
  const results = useMeasurementsStore((s) => s.results)
  const [view, setView] = useState<View>('recommended')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('measurements.page.title')}</h1>
        <p className="mt-1 text-muted">{t('measurements.page.subtitle')}</p>
      </div>

      <ViewSwitch view={view} onChange={setView} />

      {view === 'recommended' && <RecommendedView results={results} />}
      {view === 'trades' && <TradesView results={results} />}
      {view === 'byRoom' && <ByRoomView results={results} />}
    </div>
  )
}
