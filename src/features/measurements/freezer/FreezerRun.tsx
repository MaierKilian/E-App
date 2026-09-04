import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { instanceKey } from '../rooms'
import { calcFreezerSaving, stageCode, readFrostStage, FROST_STAGES } from './freezer'
import type { FrostStage } from './freezer'
import type { RunProps } from '../runnerTypes'

/**
 * Geführter Gefriertruhen-Check: vereist? → falls ja, wie stark.
 *
 * Der Vereisungsgrad wird in drei Stufen erhoben statt in zwei: „leicht oder
 * stark" ließ zwischen ein paar Millimetern und einer flächigen Eisschicht
 * keinen Unterschied zu, obwohl das den halben Effekt ausmacht.
 *
 * Zwei frühere Eingaben sind entfallen: „Jahresverbrauch laut Label" (floss nur
 * in den geschätzten Euro-Betrag ein, den es nicht mehr gibt) und die optionale
 * Vorher/Nachher-Messung mit dem Energiekostenmessgerät. Letztere passte nicht
 * in diesen Check: Sie verlangte, das Gerät stundenlang vor dem Abtauen laufen
 * zu lassen, abzutauen und danach erneut zu messen – ein Vorgang über Tage, der
 * in einem Bildschirm abgefragt wurde, den man in einem Zug ausfüllt.
 * Eingaben werden zwischengespeichert (App schließen & später weitermachen).
 */
export function FreezerRun({ onEvaluate, roomKey }: RunProps) {
  const { t } = useTranslation()
  const setDraft = useMeasurementDraftStore((s) => s.setDraft)
  const key = instanceKey('freezer', roomKey)
  const d = readDraft(key)

  const [iced, setIced] = useState<boolean | undefined>(
    d.iced === 1 ? true : d.iced === 0 ? false : undefined,
  )
  // Entwurf im aktuellen wie im alten Format lesen (siehe readFrostStage).
  const [stage, setStage] = useState<Exclude<FrostStage, 'none'>>(() => {
    const stored = readFrostStage(d)
    return stored === 'none' ? 'thin' : stored
  })

  useEffect(() => {
    setDraft(key, {
      ...(iced !== undefined ? { iced: iced ? 1 : 0 } : {}),
      frostStage: stageCode(stage),
    })
  }, [key, setDraft, iced, stage])

  const effectiveStage: FrostStage = iced === true ? stage : 'none'
  const calc = calcFreezerSaving({ stage: effectiveStage })

  function handleEvaluate() {
    const details: Record<string, number> = {
      iced: iced ? 1 : 0,
      frostStage: stageCode(effectiveStage),
      extraPercent: calc.extraPercent,
      method: calc.method === 'estimate' ? 1 : 0,
      // Der Anteil ist eine Schätzung aus der Stufe, kein gemessener Wert – die
      // Empfehlungsliste stellt dafür keinen Euro-Betrag hin (siehe buildTips).
      savingEstimated: 1,
    }
    onEvaluate({
      result: {
        id: 'freezer',
        rating: calc.rating,
        // Hauptwert ist der Anteil am Verbrauch, nicht mehr ein geschätzter
        // Euro-Betrag: Er braucht weder Jahresverbrauch noch Strompreis.
        primaryValue: calc.extraPercent,
        unit: '%',
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  const canEvaluate = iced !== undefined

  return (
    <div className="space-y-4">
      {/* Vereist? */}
      <div className="glass rounded-3xl p-5">
        <span className="font-medium text-foreground">{t('measurements.freezer.run.icedLabel')}</span>
        <div className="mt-3 flex flex-wrap gap-2">
          <SelectChip label={t('measurements.freezer.run.iced.yes')} selected={iced === true} onClick={() => setIced(true)} />
          <SelectChip label={t('measurements.freezer.run.iced.no')} selected={iced === false} onClick={() => setIced(false)} />
        </div>
        {iced === false && (
          <p className="mt-3 text-sm text-muted">{t('measurements.freezer.run.noFrostHint')}</p>
        )}
      </div>

      {/* Vereisungsgrad in Stufen – untereinander, weil die Beschreibungen zu
          lang für nebeneinander liegende Chips sind. */}
      {iced === true && (
        <div className="glass rounded-3xl p-5">
          <span className="font-medium text-foreground">
            {t('measurements.freezer.run.severityLabel')}
          </span>
          <div className="mt-3 space-y-2">
            {FROST_STAGES.map((s) => {
              const selected = stage === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStage(s)}
                  aria-pressed={selected}
                  className={`focus-ring block w-full rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-surface/70 hover:bg-surface-2'
                  }`}
                >
                  <span className="block text-sm font-semibold text-foreground">
                    {t(`measurements.freezer.run.frostOptions.${s}.title`)}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                    {t(`measurements.freezer.run.frostOptions.${s}.hint`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
