import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTariffStore } from '@/store/tariffStore'
import { useMeasurementDraftStore, readDraft } from '@/store/measurementDraftStore'
import { Stepper } from '@/components/ui/Stepper'
import { instanceKey } from '../rooms'
import { calcFridgeSaving } from './fridge'
import type { RunProps } from '../runnerTypes'

const TEMP_MIN = 0
const TEMP_MAX = 15
const TEMP_DEFAULT = 5
const TEMP_STEP = 0.5

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
 * Geführter Kühlschrank-Check: aktuelle Temperatur messen → Hinweis (6 %/°C) →
 * optional Stufe senken & erneut messen → optional echte Strommessung. Alle
 * Eingaben werden zwischengespeichert (App schließen & später weitermachen).
 */
export function FridgeRun({ onEvaluate, roomKey }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const setDraft = useMeasurementDraftStore((s) => s.setDraft)
  const key = instanceKey('fridge', roomKey)
  const d = readDraft(key)

  const [tempBefore, setTempBefore] = useState(d.tempBefore ?? TEMP_DEFAULT)
  const [afterOn, setAfterOn] = useState((d.afterOn ?? 0) === 1)
  const [tempAfter, setTempAfter] = useState(d.tempAfter ?? 7)
  const [energyOn, setEnergyOn] = useState((d.energyOn ?? 0) === 1)
  const [beforeKwh, setBeforeKwh] = useState<number | undefined>(d.beforeKwh)
  const [beforeHours, setBeforeHours] = useState<number | undefined>(d.beforeHours)
  const [afterKwh, setAfterKwh] = useState<number | undefined>(d.afterKwh)
  const [afterHours, setAfterHours] = useState<number | undefined>(d.afterHours)
  const [labelKwh, setLabelKwh] = useState<number | undefined>(d.labelKwh)

  // Eingaben fortlaufend zwischenspeichern.
  useEffect(() => {
    setDraft(key, {
      tempBefore,
      afterOn: afterOn ? 1 : 0,
      tempAfter,
      energyOn: energyOn ? 1 : 0,
      ...(beforeKwh !== undefined ? { beforeKwh } : {}),
      ...(beforeHours !== undefined ? { beforeHours } : {}),
      ...(afterKwh !== undefined ? { afterKwh } : {}),
      ...(afterHours !== undefined ? { afterHours } : {}),
      ...(labelKwh !== undefined ? { labelKwh } : {}),
    })
  }, [key, setDraft, tempBefore, afterOn, tempAfter, energyOn, beforeKwh, beforeHours, afterKwh, afterHours, labelKwh])

  const energy = energyOn ? { beforeKwh, beforeHours, afterKwh, afterHours } : undefined
  const calc = calcFridgeSaving({
    tempBefore,
    tempAfter: afterOn ? tempAfter : undefined,
    labelKwh,
    energy,
    workPriceCt,
  })

  const fmtTemp = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(tempBefore)
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  function handleEvaluate() {
    const details: Record<string, number> = {
      temperature: tempBefore,
      method: calc.method === 'measured' ? 2 : calc.method === 'delta' ? 1 : 0,
      yearlySaving: calc.yearlySaving,
      savingEstimated: calc.estimated ? 1 : 0,
    }
    if (afterOn) details.tempAfter = tempAfter
    onEvaluate({
      result: {
        id: 'fridge',
        rating: calc.rating,
        primaryValue: tempBefore,
        unit: '°C',
        completedAt: new Date().toISOString(),
        details,
      },
    })
  }

  return (
    <div className="space-y-4">
      {/* 1 · Aktuelle Temperatur */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">
            {t('measurements.fridge.run.tempLabel')}
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
        <p className="mt-3 rounded-2xl bg-primary/10 px-3 py-2 text-xs leading-relaxed text-primary">
          {t('measurements.fridge.run.hint')}
        </p>
      </div>

      {/* 2 · Nachher-Temperatur (optional) */}
      <div className="glass rounded-3xl p-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-medium text-foreground">{t('measurements.fridge.run.afterToggle')}</span>
          <input
            type="checkbox"
            checked={afterOn}
            onChange={(e) => setAfterOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        {afterOn && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <Stepper value={tempAfter} min={TEMP_MIN} max={TEMP_MAX} step={TEMP_STEP} onChange={setTempAfter} />
            <div className="flex min-w-20 items-baseline justify-center gap-1">
              <span className="text-3xl font-bold tabular-nums text-foreground">{tempAfter}</span>
              <span className="text-sm text-muted">{t('measurements.fridge.run.tempUnit')}</span>
            </div>
          </div>
        )}
      </div>

      {/* 3 · Echte Strommessung (optional) */}
      <div className="glass rounded-3xl p-5">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span className="font-medium text-foreground">{t('measurements.fridge.run.energyToggle')}</span>
          <input
            type="checkbox"
            checked={energyOn}
            onChange={(e) => setEnergyOn(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </label>
        {energyOn && (
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-relaxed text-muted">{t('measurements.fridge.run.energyHint')}</p>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('measurements.fridge.run.before')}
              </p>
              <div className="flex flex-wrap gap-2">
                <NumField value={beforeKwh} onChange={setBeforeKwh} unit="kWh" />
                <NumField value={beforeHours} onChange={setBeforeHours} unit={t('measurements.fridge.run.hoursUnit')} />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t('measurements.fridge.run.after')}
              </p>
              <div className="flex flex-wrap gap-2">
                <NumField value={afterKwh} onChange={setAfterKwh} unit="kWh" />
                <NumField value={afterHours} onChange={setAfterHours} unit={t('measurements.fridge.run.hoursUnit')} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4 · Label-Verbrauch (optional) */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-foreground">{t('measurements.fridge.run.labelLabel')}</span>
          <NumField value={labelKwh} onChange={setLabelKwh} unit="kWh" placeholder="150" />
        </div>
      </div>

      {/* Live-Vorschau */}
      {calc.yearlySaving > 0 && (
        <p className="text-center text-sm text-muted">
          {t('measurements.fridge.run.preview', { value: eurFmt.format(calc.yearlySaving) })}
        </p>
      )}

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
