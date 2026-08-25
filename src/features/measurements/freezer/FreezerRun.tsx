import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTariffStore } from '@/store/tariffStore'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { instanceKey } from '../rooms'
import { DecimalField } from '@/components/ui/DecimalField'
import { calcFreezerSaving, stageCode, readFrostStage, FROST_STAGES } from './freezer'
import type { FrostStage } from './freezer'
import type { RunProps } from '../runnerTypes'

/** Kompaktes Zahlen-Eingabefeld mit Einheit. */
function NumField({
  value,
  onChange,
  unit,
  placeholder,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  unit: string
  placeholder?: string
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <DecimalField
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="focus-ring w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm text-foreground"
      />
      {unit}
    </label>
  )
}

/**
 * Geführter Gefriertruhen-Check: vereist? → falls ja, wie stark → optional eine
 * echte Strommessung vor/nach dem Abtauen.
 *
 * Der Vereisungsgrad wird in drei Stufen erhoben statt in zwei: „leicht oder
 * stark" ließ zwischen ein paar Millimetern und einer flächigen Eisschicht
 * keinen Unterschied zu, obwohl das den halben Effekt ausmacht.
 *
 * Die frühere Eingabe „Jahresverbrauch laut Label" ist entfallen – sie floss
 * nur in den geschätzten Euro-Betrag ein, den es nicht mehr gibt.
 * Eingaben werden zwischengespeichert (App schließen & später weitermachen).
 */
export function FreezerRun({ onEvaluate, roomKey }: RunProps) {
  const { t } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
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
  const [energyOn, setEnergyOn] = useState((d.energyOn ?? 0) === 1)
  const [beforeKwh, setBeforeKwh] = useState<number | undefined>(d.beforeKwh)
  const [beforeHours, setBeforeHours] = useState<number | undefined>(d.beforeHours)
  const [afterKwh, setAfterKwh] = useState<number | undefined>(d.afterKwh)
  const [afterHours, setAfterHours] = useState<number | undefined>(d.afterHours)

  useEffect(() => {
    setDraft(key, {
      ...(iced !== undefined ? { iced: iced ? 1 : 0 } : {}),
      frostStage: stageCode(stage),
      energyOn: energyOn ? 1 : 0,
      ...(beforeKwh !== undefined ? { beforeKwh } : {}),
      ...(beforeHours !== undefined ? { beforeHours } : {}),
      ...(afterKwh !== undefined ? { afterKwh } : {}),
      ...(afterHours !== undefined ? { afterHours } : {}),
    })
  }, [key, setDraft, iced, stage, energyOn, beforeKwh, beforeHours, afterKwh, afterHours])

  const effectiveStage: FrostStage = iced === true ? stage : 'none'
  const energy = energyOn ? { beforeKwh, beforeHours, afterKwh, afterHours } : undefined
  const calc = calcFreezerSaving({ stage: effectiveStage, energy, workPriceCt })

  function handleEvaluate() {
    const details: Record<string, number> = {
      iced: iced ? 1 : 0,
      frostStage: stageCode(effectiveStage),
      extraPercent: calc.extraPercent,
      method: calc.method === 'measured' ? 2 : calc.method === 'estimate' ? 1 : 0,
      // Nur eine echte Messung liefert einen Euro-Betrag; die Empfehlungsliste
      // zeigt ihn ausschließlich dann (siehe buildTips).
      savingEstimated: calc.method === 'measured' ? 0 : 1,
      ...(calc.avoidableCost !== undefined
        ? { avoidableCost: calc.avoidableCost, yearlySaving: calc.avoidableCost }
        : {}),
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
      {/* 1 · Vereist? */}
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

      {iced === true && (
        <>
          {/* 2 · Vereisungsgrad in Stufen – untereinander, weil die
                 Beschreibungen zu lang für nebeneinander liegende Chips sind. */}
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

          {/* 3 · Echte Strommessung (optional) */}
          <div className="glass rounded-3xl p-5">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="font-medium text-foreground">{t('measurements.freezer.run.energyToggle')}</span>
              <input
                type="checkbox"
                checked={energyOn}
                onChange={(e) => setEnergyOn(e.target.checked)}
                className="h-5 w-5 accent-[var(--primary)]"
              />
            </label>
            {energyOn && (
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-relaxed text-muted">{t('measurements.freezer.run.energyHint')}</p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('measurements.freezer.run.before')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <NumField value={beforeKwh} onChange={setBeforeKwh} unit="kWh" />
                    <NumField value={beforeHours} onChange={setBeforeHours} unit={t('measurements.freezer.run.hoursUnit')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {t('measurements.freezer.run.after')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <NumField value={afterKwh} onChange={setAfterKwh} unit="kWh" />
                    <NumField value={afterHours} onChange={setAfterHours} unit={t('measurements.freezer.run.hoursUnit')} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
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
