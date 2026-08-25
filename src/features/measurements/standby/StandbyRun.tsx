import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, X, Info } from 'lucide-react'
import { useTariffStore } from '@/store/tariffStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { calcStandby, totalWatts } from './standby'
import type { StandbyDevice } from './standby'
import type { RunProps } from '../runnerTypes'
import { DecimalField } from '@/components/ui/DecimalField'
import { previouslyMeasured, duplicateIndices } from './deviceHistory'

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
  return { id: nextId++, watts: 0, name: '' }
}

/**
 * Kodiert die Geräteliste für die Persistenz: `dev{index}` → Watt in `details`,
 * die Bezeichnung unter demselben Schlüssel in `labels` (siehe
 * MeasurementResult). Namenlose Geräte bekommen keinen Eintrag in `labels` –
 * die Ergebnis-Ansicht nummeriert sie dann durch.
 */
function encodeDevices(devices: StandbyDevice[]): {
  details: Record<string, number>
  labels: Record<string, string>
} {
  const details: Record<string, number> = {}
  const labels: Record<string, string> = {}
  devices.forEach((d, i) => {
    details[`dev${i}`] = d.watts
    const name = d.name.trim()
    if (name) labels[`dev${i}`] = name
  })
  return { details, labels }
}

/**
 * Durchführungs-Phase des Standby-Checks: eine wachsende Liste von Geräten
 * (Typ-Auswahl + Watt-Eingabe), laufende Gesamtsumme und „Auswerten", sobald
 * mindestens ein Gerät mit Leistung > 0 erfasst ist.
 */
export function StandbyRun({ onEvaluate }: RunProps) {
  const { t, i18n } = useTranslation()
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)
  const tariffIsCustom = useTariffStore((s) => s.isCustom)
  // Das letzte Standby-Ergebnis dient als Gedächtnis: Wer ein Gerät erneut
  // misst, sieht den früheren Wert direkt beim Eintippen des Namens.
  const lastResult = useMeasurementsStore((s) => s.results.standby)

  const [entries, setEntries] = useState<DeviceEntry[]>(() => [makeEntry()])

  const sum = totalWatts(entries)
  const canEvaluate = entries.some((e) => e.watts > 0)

  const duplicates = useMemo(
    () => duplicateIndices(entries.map((e) => e.name)),
    [entries],
  )

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

  function handleWattsInput(id: number, value: number | undefined) {
    updateEntry(id, { watts: clampWatts(value ?? 0) })
  }

  function handleEvaluate() {
    if (!canEvaluate) return
    const calc = calcStandby({
      devices: entries.map((e) => ({ name: e.name, watts: e.watts })),
      workPriceCt,
    })
    const encoded = encodeDevices(calc.devices)
    onEvaluate({
      result: {
        id: 'standby',
        rating: calc.rating,
        // Hauptwert sind die Jahreskosten in € (Übersicht/Kachel zeigen Kosten);
        // die Bewertung bleibt jedoch leistungsbasiert (siehe rateStandby).
        primaryValue: calc.annualCost,
        unit: '€/Jahr',
        completedAt: new Date().toISOString(),
        details: {
          totalWatts: calc.totalWatts,
          annualKwh: calc.annualKwh,
          annualCost: calc.annualCost,
          avoidableCost: calc.avoidableCost,
          // 1 = Tarif vom Nutzer gesetzt, 0 = Default (Kosten sind eine Schätzung).
          tariffCustom: tariffIsCustom ? 1 : 0,
          // Geräte-Aufschlüsselung als `dev{index}` → Watt, damit die
          // Ergebnis-Ansicht die einzelnen Verbraucher anzeigen kann.
          ...encoded.details,
        },
        labels: encoded.labels,
      },
    })
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const seenBefore = previouslyMeasured(lastResult, entry.name)
        const isDuplicate = duplicates.has(index)
        return (
        <div key={entry.id} className="glass rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">
              {entry.name.trim() ||
                t('measurements.standby.run.deviceLabel', { index: index + 1 })}
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

          <input
            type="text"
            value={entry.name}
            onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
            placeholder={t('measurements.standby.run.deviceNamePlaceholder')}
            aria-label={t('measurements.standby.run.deviceName')}
            maxLength={40}
            className="focus-ring w-full rounded-xl border border-border bg-surface/70 px-3 py-2 text-sm text-foreground placeholder:text-muted"
          />

          {/* Hinweise, keine Sperren: Ein doppelter Name kann gewollt sein
              (zwei gleiche Geräte), und ein früher gemessenes Gerät soll man
              gerade erneut messen dürfen – der alte Wert ist der Vergleich. */}
          {isDuplicate && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('measurements.standby.run.duplicateHint')}
            </p>
          )}
          {!isDuplicate && seenBefore !== undefined && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t('measurements.standby.run.previouslyMeasured', {
                value: new Intl.NumberFormat(i18n.language, {
                  maximumFractionDigits: 1,
                }).format(seenBefore),
                unit: t('measurements.standby.run.wattsUnit'),
              })}
            </p>
          )}

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
              <DecimalField
                value={entry.watts > 0 ? entry.watts : undefined}
                onChange={(v) => handleWattsInput(entry.id, v)}
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
        )
      })}

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
