import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { Stepper } from '@/components/ui/Stepper'
import { instanceKey } from '../rooms'
import { calcFridgeSaving, fridgeStatus } from './fridge'
import type { RunProps } from '../runnerTypes'

const TEMP_MIN = 0
const TEMP_MAX = 15
const TEMP_DEFAULT = 5
const TEMP_STEP = 0.5

/**
 * Geführter Kühlschrank-Check: aktuelle Temperatur messen, fertig. Die
 * Eingabe wird zwischengespeichert (App schließen & später weitermachen).
 *
 * War das letzte Ergebnis nicht gut (zu kalt/zu warm), zeigt diese Ansicht
 * zusätzlich einen Hinweis auf die vorherige Messung – das ist dann eine
 * Folgemessung, die zeigt, ob die angepasste Stufe etwas gebracht hat (siehe
 * `FridgeResult`, `pendingFollowUps`). Ein eigener Schalter dafür ist bewusst
 * nicht mehr nötig: derselbe Temperatur-Check dient beim ersten Mal der
 * Diagnose und danach dem Nachweis.
 */
export function FridgeRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const setDraft = useMeasurementDraftStore((s) => s.setDraft)
  const key = instanceKey('fridge')
  const d = readDraft(key)
  const lastResult = useMeasurementsStore((s) => s.results['fridge'])
  const previous = lastResult && lastResult.rating !== 'good' ? lastResult : undefined

  const [tempBefore, setTempBefore] = useState(d.tempBefore ?? TEMP_DEFAULT)

  useEffect(() => {
    setDraft(key, { tempBefore })
  }, [key, setDraft, tempBefore])

  const calc = calcFridgeSaving(tempBefore)

  const fmtTemp = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(tempBefore)

  function handleEvaluate() {
    onEvaluate({
      result: {
        id: 'fridge',
        rating: calc.rating,
        primaryValue: tempBefore,
        unit: '°C',
        completedAt: new Date().toISOString(),
        details: { savingPct: calc.savingPct },
      },
    })
  }

  return (
    <div className="space-y-4">
      {previous && (
        <div className="glass flex gap-2.5 rounded-3xl p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-sm text-muted">
            {t('measurements.fridge.run.followUpHint', {
              temp: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(
                previous.primaryValue,
              ),
              status: t(`measurements.fridge.run.statusShort.${fridgeStatus(previous.primaryValue)}`),
            })}
          </p>
        </div>
      )}

      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t(
              previous
                ? 'measurements.fridge.run.tempLabelAfter'
                : 'measurements.fridge.run.tempLabel',
            )}
          </span>
          <span className="text-xs text-muted">{t('measurements.fridge.run.tempStandard')}</span>
        </div>
        <div className="mt-4 flex items-center justify-center gap-3">
          <Stepper value={tempBefore} min={TEMP_MIN} max={TEMP_MAX} step={TEMP_STEP} onChange={setTempBefore} />
          <div className="flex min-w-20 items-baseline justify-center gap-1">
            <span className="text-3xl font-bold tabular-nums text-foreground">{fmtTemp}</span>
            <span className="text-sm text-muted">{t('measurements.fridge.run.tempUnit')}</span>
          </div>
        </div>
        {!previous && (
          <p className="mt-3 rounded-2xl bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary">
            {t('measurements.fridge.run.hint')}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97]"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
