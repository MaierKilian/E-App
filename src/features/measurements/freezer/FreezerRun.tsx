import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTariffStore } from '@/store/tariffStore'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { instanceKey } from '../rooms'
import { calcFreezerSaving } from './freezer'
import type { FrostLevel } from './freezer'
import type { RunProps } from '../runnerTypes'

const FROST_LEVELS: FrostLevel[] = ['none', 'light', 'heavy']

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
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => {
          const n = Number(e.target.value.replace(',', '.'))
          onChange(Number.isFinite(n) && e.target.value !== '' ? n : undefined)
        }}
        className="focus-ring w-20 rounded-lg border border-border bg-surface px-2 py-1.5 text-center text-sm text-foreground"
      />
      {unit}
    </label>
  )
}

/**
 * Geführter Gefriertruhen-Check: vereist? → falls ja, optional echte
 * Strommessung vor/nach dem Abtauen, sonst Schätzung über den Vereisungsgrad.
 * Eingaben werden zwischengespeichert (App schließen & später weitermachen).
 */
export function FreezerRun({ onEvaluate, roomKey }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const setDraft = useMeasurementDraftStore((s) => s.setDraft)
  const key = instanceKey('freezer', roomKey)
  const d = readDraft(key)

  const [iced, setIced] = useState<boolean | undefined>(
    d.iced === 1 ? true : d.iced === 0 ? false : undefined,
  )
  const [frost, setFrost] = useState<Exclude<FrostLevel, 'none'>>(d.frost === 2 ? 'heavy' : 'light')
  const [energyOn, setEnergyOn] = useState((d.energyOn ?? 0) === 1)
  const [beforeKwh, setBeforeKwh] = useState<number | undefined>(d.beforeKwh)
  const [beforeHours, setBeforeHours] = useState<number | undefined>(d.beforeHours)
  const [afterKwh, setAfterKwh] = useState<number | undefined>(d.afterKwh)
  const [afterHours, setAfterHours] = useState<number | undefined>(d.afterHours)
  const [labelKwh, setLabelKwh] = useState<number | undefined>(d.labelKwh)

  useEffect(() => {
    setDraft(key, {
      ...(iced !== undefined ? { iced: iced ? 1 : 0 } : {}),
      frost: frost === 'heavy' ? 2 : 1,
      energyOn: energyOn ? 1 : 0,
      ...(beforeKwh !== undefined ? { beforeKwh } : {}),
      ...(beforeHours !== undefined ? { beforeHours } : {}),
      ...(afterKwh !== undefined ? { afterKwh } : {}),
      ...(afterHours !== undefined ? { afterHours } : {}),
      ...(labelKwh !== undefined ? { labelKwh } : {}),
    })
  }, [key, setDraft, iced, frost, energyOn, beforeKwh, beforeHours, afterKwh, afterHours, labelKwh])

  const energy = energyOn ? { beforeKwh, beforeHours, afterKwh, afterHours } : undefined
  const calc = calcFreezerSaving({
    iced: iced === true,
    frost,
    labelKwh,
    energy,
    workPriceCt,
  })

  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  function handleEvaluate() {
    const frostIndex = iced ? FROST_LEVELS.indexOf(frost) : 0
    const details: Record<string, number> = {
      iced: iced ? 1 : 0,
      frost: frostIndex,
      avoidableCost: calc.avoidableCost,
      yearlySaving: calc.avoidableCost,
      method: calc.method === 'measured' ? 2 : calc.method === 'estimate' ? 1 : 0,
      savingEstimated: calc.estimated ? 1 : 0,
    }
    onEvaluate({
      result: {
        id: 'freezer',
        rating: calc.rating,
        primaryValue: calc.avoidableCost,
        unit: '€/Jahr',
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
          {/* 2 · Vereisungsgrad (für die Schätzung) */}
          <div className="glass rounded-3xl p-5">
            <span className="font-medium text-foreground">{t('measurements.freezer.run.severityLabel')}</span>
            <div className="mt-3 flex flex-wrap gap-2">
              <SelectChip label={t('measurements.freezer.run.frostOptions.light')} selected={frost === 'light'} onClick={() => setFrost('light')} />
              <SelectChip label={t('measurements.freezer.run.frostOptions.heavy')} selected={frost === 'heavy'} onClick={() => setFrost('heavy')} />
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

          {/* 4 · Label-Verbrauch (optional) */}
          <div className="glass rounded-3xl p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-medium text-foreground">{t('measurements.freezer.run.labelLabel')}</span>
              <NumField value={labelKwh} onChange={setLabelKwh} unit="kWh" placeholder="200" />
            </div>
          </div>

          {calc.avoidableCost > 0 && (
            <p className="text-center text-sm text-muted">
              {t('measurements.freezer.run.preview', { value: eurFmt.format(calc.avoidableCost) })}
            </p>
          )}
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
