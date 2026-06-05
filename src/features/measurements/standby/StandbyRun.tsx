import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { calcStandby, totalWatts } from './standby'
import type { StandbyDevice, StandbyDeviceType } from './standby'
import type { RunProps } from '../runnerTypes'

const DEVICE_TYPES: StandbyDeviceType[] = [
  'tv',
  'console',
  'pc',
  'router',
  'audio',
  'charger',
  'other',
]

const WATTS_STEP = 0.5
const WATTS_MAX = 200

interface DeviceEntry extends StandbyDevice {
  id: number
}

/** Robuste, NaN-sichere Watt-Eingabe in 0,5er-Schritten. */
function clampWatts(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.min(WATTS_MAX, Math.round(value * 10) / 10)
}

let nextId = 1
function makeEntry(): DeviceEntry {
  return { id: nextId++, type: 'tv', watts: 0 }
}

/**
 * Kodiert die Geräteliste in flache Zahl-Einträge (`dev{index}_{type}` → Watt),
 * damit sie im `details`-Record (nur Zahlen) persistiert werden kann.
 */
function encodeDevices(devices: StandbyDevice[]): Record<string, number> {
  const out: Record<string, number> = {}
  devices.forEach((d, i) => {
    out[`dev${i}_${d.type}`] = d.watts
  })
  return out
}

/**
 * Durchführungs-Phase des Standby-Checks: eine wachsende Liste von Geräten
 * (Typ-Auswahl + Watt-Eingabe), laufende Gesamtsumme und „Auswerten", sobald
 * mindestens ein Gerät mit Leistung > 0 erfasst ist.
 */
export function StandbyRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [entries, setEntries] = useState<DeviceEntry[]>(() => [makeEntry()])

  const sum = totalWatts(entries)
  const canEvaluate = entries.some((e) => e.watts > 0)

  const fmtSum = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(sum)

  function updateEntry(id: number, patch: Partial<DeviceEntry>) {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  function addEntry() {
    setEntries((list) => [...list, makeEntry()])
  }

  function removeEntry(id: number) {
    setEntries((list) => (list.length > 1 ? list.filter((e) => e.id !== id) : list))
  }

  function adjustWatts(id: number, current: number, delta: number) {
    updateEntry(id, { watts: clampWatts(current + delta) })
  }

  function handleWattsInput(id: number, raw: string) {
    const value = Number(raw.replace(',', '.'))
    updateEntry(id, { watts: clampWatts(value) })
  }

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcStandby({
      devices: entries.map((e) => ({ type: e.type, watts: e.watts })),
      workPriceCt,
    })
    onEvaluate({
      result: {
        id: 'standby',
        rating: calc.rating,
        primaryValue: calc.totalWatts,
        unit: 'W',
        completedAt: new Date().toISOString(),
        details: {
          totalWatts: calc.totalWatts,
          annualKwh: calc.annualKwh,
          annualCost: calc.annualCost,
          avoidableCost: calc.avoidableCost,
          // Geräte-Aufschlüsselung als `dev{index}_{type}` → Watt, damit die
          // Ergebnis-Ansicht die einzelnen Verbraucher anzeigen kann.
          ...encodeDevices(calc.devices),
        },
      },
    })
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => (
        <div key={entry.id} className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              {t('measurements.standby.run.deviceLabel', { index: index + 1 })}
            </span>
            <button
              type="button"
              onClick={() => removeEntry(entry.id)}
              disabled={entries.length <= 1}
              aria-label={t('measurements.standby.run.remove')}
              className="focus-ring grid h-8 w-8 place-items-center rounded-xl text-muted transition-colors hover:text-foreground disabled:opacity-30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {DEVICE_TYPES.map((type) => (
              <SelectChip
                key={type}
                label={t(`measurements.standby.deviceTypes.${type}`)}
                selected={entry.type === type}
                onClick={() => updateEntry(entry.id, { type })}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {t('measurements.standby.run.wattsLabel')}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => adjustWatts(entry.id, entry.watts, -WATTS_STEP)}
                className="focus-ring glass h-9 w-9 rounded-2xl text-lg font-bold text-foreground transition-transform active:scale-90"
                aria-label="-0.5"
              >
                −
              </button>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step={WATTS_STEP}
                value={entry.watts > 0 ? entry.watts : ''}
                onChange={(e) => handleWattsInput(entry.id, e.target.value)}
                placeholder="0"
                aria-label={t('measurements.standby.run.wattsLabel')}
                className="focus-ring w-20 rounded-xl border border-border bg-surface/70 px-3 py-2 text-right font-semibold tabular-nums text-foreground"
              />
              <button
                type="button"
                onClick={() => adjustWatts(entry.id, entry.watts, WATTS_STEP)}
                className="focus-ring glass h-9 w-9 rounded-2xl text-lg font-bold text-foreground transition-transform active:scale-90"
                aria-label="+0.5"
              >
                +
              </button>
              <span className="ml-0.5 text-sm text-muted">
                {t('measurements.standby.run.wattsUnit')}
              </span>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addEntry}
        className="focus-ring glass flex w-full items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-semibold text-primary transition-transform active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        {t('measurements.standby.run.addDevice')}
      </button>

      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <span className="text-sm font-medium text-muted">
          {t('measurements.standby.run.sum')}
        </span>
        <span className="text-lg font-bold tabular-nums text-foreground">
          {fmtSum} {t('measurements.standby.run.wattsUnit')}
        </span>
      </div>

      <button
        type="button"
        onClick={handleEvaluate}
        disabled={!canEvaluate}
        className="flex w-full items-center justify-center gap-1 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
      >
        {t('measurements.common.evaluate')}
      </button>
    </div>
  )
}
