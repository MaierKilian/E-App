import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import { InfoButton } from '@/components/ui/InfoButton'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { buildTasks } from './tasks'
import { impactSummary } from './impact'
import { MeasurementCarousel } from './views/MeasurementCarousel'
import { TradesView } from './views/TradesView'
import { ByRoomView } from './views/ByRoomView'

type View = 'recommended' | 'trades' | 'byRoom'
const VIEWS: View[] = ['recommended', 'trades', 'byRoom']

/** Kleines Ansichts-Menü (Empfohlen im Vordergrund, Rest aufklappbar). */
function ViewMenu({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="glass flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-foreground"
      >
        {t(`measurements.views.${view}`)}
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            className="glass z-20 mt-2 w-44 rounded-2xl p-1"
            style={{ position: 'absolute', right: 0 }}
          >
            {VIEWS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  onChange(v)
                  setOpen(false)
                }}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${
                  v === view ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-surface-2/70'
                }`}
              >
                {t(`measurements.views.${v}`)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Messungen-Bereich. „Empfohlen" steht im Vordergrund (durchklickbares
 * Karten-Karussell), das Einsparpotenzial sitzt kompakt mit Fortschrittsring
 * im Kopf. Gewerke/Raumweise sind über das Ansichts-Menü erreichbar.
 */
export function MeasurementsPage() {
  const { t, i18n } = useTranslation()
  const results = useMeasurementsStore((s) => s.results)
  const rooms = useOnboardingStore((s) => s.data.rooms)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const [view, setView] = useState<View>('recommended')

  const tasks = buildTasks(rooms, t)
  const available = tasks.filter((tk) => tk.meta.available)
  const done = available.filter((tk) => results[tk.key]).length
  const total = available.length

  const { savingsEur, co2Kg } = impactSummary(results, workPriceCt)
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('measurements.page.title')}</h1>
        <ViewMenu view={view} onChange={setView} />
      </div>

      {/* Kompakter Kopf: Fortschrittsring + Einsparpotenzial */}
      <div className="glass flex items-center gap-4 rounded-3xl p-4">
        <ProgressRing done={done} total={total} />
        <div className="min-w-0 flex-1">
          {savingsEur > 0 ? (
            <>
              <p className="text-xs uppercase tracking-wide text-muted">
                {t('measurements.impact.title')}
              </p>
              <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
                {eurFmt.format(savingsEur)}
                <span className="ml-1 text-sm font-medium text-muted">
                  {t('measurements.impact.perYear')}
                </span>
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                {t('measurements.impact.co2', { value: eurFmt.format(co2Kg) })}
                <InfoButton text={t('measurements.impact.info')} />
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-foreground">{t('measurements.profile.title')}</p>
              <p className="mt-0.5 text-sm text-muted">{t('measurements.impact.empty')}</p>
            </>
          )}
        </div>
      </div>

      {view === 'recommended' && <MeasurementCarousel tasks={tasks} results={results} />}
      {view === 'trades' && <TradesView results={results} />}
      {view === 'byRoom' && <ByRoomView results={results} />}
    </div>
  )
}
