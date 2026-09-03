import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, RefreshCw, ArrowRight } from 'lucide-react'
import { useMeasurementsStore, type MeasurementsView } from '@/store/measurementsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import { useTipsStore } from '@/store/tipsStore'
import { InfoButton } from '@/components/ui/InfoButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { buildSteps } from './tasks'
import { catalogProgress } from './progress'
import { impactSummary } from './impact'
import { remeasurePrompt, type RemeasurePrompt } from './base_load/remeasure'
import { pendingFollowUpKeys } from './followUps'
import { MeasurementFlow } from './views/MeasurementFlow'
import { TradesView } from './views/TradesView'
import { ByRoomView } from './views/ByRoomView'
import { useSkippedKeys } from './useSkipped'

type View = MeasurementsView
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
  const view = useMeasurementsStore((s) => s.measurementsView)
  const setView = useMeasurementsStore((s) => s.setMeasurementsView)
  const skipped = useSkippedKeys()
  const defrostDoneAt = useTipsStore((s) => s.doneAt.freezer)
  const rooms = useOnboardingStore((s) => s.data.rooms)
  // Dieselben Ziele, die auch die Empfehlungen sortieren (siehe `order.ts`).
  const goals = useOnboardingStore((s) => s.data.goals)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  // Ring und Schrittliste kommen aus derselben Rechnung wie die Zuhause-Karte
  // und die Gewerke-Kacheln (siehe `progress.ts`).
  const steps = buildSteps(rooms, results, t, skipped, goals)
  const { done, total } = catalogProgress(results, rooms, skipped)

  const { savingsEur, co2Kg } = impactSummary(results, workPriceCt)
  // Anstoß, die Grundlast nach einer Maßnahme erneut zu messen – der einzige
  // Weg, aus geschätztem Potenzial einen belegten Erfolg zu machen.
  const remeasure = remeasurePrompt(results)
  // Kleine Hinweispunkte je Check (siehe `followUps.ts`) – deckt zusätzlich zur
  // ausführlichen Grundlast-Karte auch den Kühlschrank ab, dessen Ergebnis
  // noch nicht gut war, und die Gefriertruhe ein halbes Jahr nach dem Abtauen.
  const followUpKeys = pendingFollowUpKeys(results, undefined, defrostDoneAt)
  const eurFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('measurements.page.title')}
        subtitle={t('measurements.page.subtitle')}
        actions={<ViewMenu view={view} onChange={setView} />}
      />

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
              {/* Ohne bezifferbares Potenzial nicht zum Messen auffordern, wenn
                  laengst gemessen wurde – dann zaehlt der Fortschritt. Die
                  Ergebnisse selbst stehen ohnehin in der Liste darunter. */}
              <p className="font-semibold text-foreground">{t('measurements.profile.title')}</p>
              <p className="mt-0.5 text-sm text-muted">
                {done > 0
                  ? t('measurements.impact.progress', { done, total })
                  : t('measurements.impact.empty')}
              </p>
            </>
          )}
        </div>
      </div>

      {remeasure && <RemeasureCard prompt={remeasure} />}

      {view === 'recommended' && (
        <MeasurementFlow steps={steps} savingsEur={savingsEur} followUpKeys={followUpKeys} />
      )}
      {view === 'trades' && <TradesView results={results} />}
      {view === 'byRoom' && <ByRoomView results={results} />}
    </div>
  )
}

/**
 * Aufforderung, die Grundlast nach einer umgesetzten Maßnahme erneut zu messen.
 *
 * Ohne sie schließt kaum jemand die Schleife: Der Nutzer misst einmal, handelt
 * – und erfährt nie, was es gebracht hat. Erscheint erst, wenn seit der
 * auslösenden Messung genug Zeit zum Handeln war, und verschwindet von selbst,
 * sobald neu gemessen wurde (siehe `remeasurePrompt`).
 */
function RemeasureCard({ prompt }: { prompt: RemeasurePrompt }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="glass rounded-3xl p-4">
      <div className="flex gap-2.5">
        <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t('measurements.remeasure.title')}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('measurements.remeasure.text', {
              check: t(`measurements.${prompt.trigger}.title`),
              days: prompt.daysSince,
            })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/measurements/base_load')}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.97]"
          >
            {t('measurements.remeasure.cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
