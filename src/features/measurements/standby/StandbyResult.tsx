import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import type { MeasurementResult } from '../types'
import type { LegacyStandbyDeviceType } from './standby'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Kleine Kennzahl-Kachel (Label oben, Wert unten). */
function MiniTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass flex flex-col items-center gap-1 rounded-2xl p-3 text-center">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  )
}

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Ergebnis-Phase des Standby-Checks. Hauptzahl sind die Jahreskosten in €
 * (darunter dezent die Monatskosten), zwei Mini-Kacheln zeigen Standby-Leistung
 * (W) und Jahresverbrauch (kWh). Die Bewertung bleibt leistungsbasiert. Ist der
 * Strompreis nur der Default, werden die Kosten als Schätzung gekennzeichnet.
 */
export function StandbyResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const annualCost = result.details?.annualCost ?? result.primaryValue ?? 0
  const monthlyCost = annualCost / 12
  const totalW = result.details?.totalWatts ?? 0
  const annualKwh = result.details?.annualKwh ?? 0
  const avoidable = result.details?.avoidableCost ?? 0
  const isEstimated = (result.details?.tariffCustom ?? 0) === 0
  const isGood = result.rating === 'good'

  const devices = decodeDevices(result, t).sort((a, b) => b.watts - a.watts)
  const maxWatts = devices[0]?.watts ?? 0

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={fmt(annualCost)}
        unit={t('measurements.standby.result.costPerYear')}
        summary={t(`measurements.standby.result.summary.${result.rating}`)}
      >
        <p className="text-sm text-muted">
          {t('measurements.standby.result.costPerMonth', { value: fmt(monthlyCost) })}
        </p>
        {isEstimated && (
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
            {t('measurements.standby.result.estimated')}
          </span>
        )}
      </ResultHero>

      {/* Mini-Kacheln: Standby-Leistung & Jahresverbrauch */}
      <div className="grid grid-cols-2 gap-2">
        <MiniTile
          label={t('measurements.standby.result.miniPower')}
          value={`${fmt(totalW, 1)} ${t('measurements.standby.result.unit')}`}
        />
        <MiniTile
          label={t('measurements.standby.result.miniConsumption')}
          value={`${fmt(annualKwh)} ${t('measurements.standby.result.kwhUnit')}`}
        />
      </div>

      {/* Geräte-Aufschlüsselung (Stromfresser zuerst) */}
      {devices.length > 0 && (
        <div className="glass rounded-3xl p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            {t('measurements.standby.result.breakdownTitle')}
          </h3>
          <ul className="space-y-2.5">
            {devices.map((d, i) => {
              const pct = maxWatts > 0 ? Math.max(6, (d.watts / maxWatts) * 100) : 0
              return (
                <li key={i} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-sm text-foreground" title={d.label}>
                    {d.label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className="block h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                    {fmt(d.watts, 1)} {t('measurements.standby.result.unit')}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Tipp-Chips */}
      <div className="flex flex-wrap gap-2">
        {isGood ? (
          <Chip label={t('measurements.standby.result.chips.good')} />
        ) : (
          <>
            <Chip label={t('measurements.standby.result.chips.powerStrip')} />
            <Chip label={t('measurements.standby.result.chips.smartPlug')} />
          </>
        )}
      </div>

      {!isGood && (
        <div className="space-y-2">
          {avoidable > 0 && (
            <p className="text-sm font-semibold text-primary">
              {t('measurements.standby.result.avoidable', {
                value: t('measurements.standby.result.perYear', { value: fmt(avoidable) }),
              })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

const LEGACY_TYPES: LegacyStandbyDeviceType[] = [
  'tv',
  'console',
  'pc',
  'router',
  'audio',
  'charger',
  'other',
]

interface DecodedDevice {
  /** Fertige Beschriftung: Name, Alt-Gerätetyp oder „Gerät N". */
  label: string
  watts: number
}

/**
 * Rekonstruiert die Geräteliste aus einem gespeicherten Ergebnis.
 *
 * Zwei Formate, weil `details` nur Zahlen aufnimmt:
 * - **aktuell** `dev{index}` → Watt, Beschriftung in `labels` unter demselben
 *   Schlüssel. Ohne Namen wird durchnummeriert.
 * - **alt** `dev{index}_{type}` → Watt. Dort war der Gerätetyp die einzige
 *   Beschriftung, die es gab; er bleibt für bereits gespeicherte Ergebnisse
 *   erhalten.
 */
function decodeDevices(result: MeasurementResult, t: TFunction): DecodedDevice[] {
  const details = result.details
  if (!details) return []
  const out: DecodedDevice[] = []

  for (const [key, value] of Object.entries(details)) {
    if (!Number.isFinite(value) || value <= 0) continue

    const current = /^dev(\d+)$/.exec(key)
    if (current) {
      const name = result.labels?.[key]?.trim()
      out.push({
        label:
          name ||
          t('measurements.standby.run.deviceLabel', { index: Number(current[1]) + 1 }),
        watts: value,
      })
      continue
    }

    const legacy = /^dev\d+_(\w+)$/.exec(key)
    if (legacy && LEGACY_TYPES.includes(legacy[1] as LegacyStandbyDeviceType)) {
      out.push({ label: t(`measurements.standby.deviceTypes.${legacy[1]}`), watts: value })
    }
  }
  return out
}
