import { useTranslation } from 'react-i18next'
import { RatingBadge } from '../RatingBadge'
import { RATING_COLOR } from '../rating'
import type { ResultProps } from '../runnerTypes'
import type { StandbyDeviceType } from './standby'

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

  const devices = decodeDevices(result.details).sort((a, b) => b.watts - a.watts)
  const maxWatts = devices[0]?.watts ?? 0

  return (
    <div className="space-y-4">
      <div className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundColor: `color-mix(in srgb, ${RATING_COLOR[result.rating]} 7%, transparent)`,
          }}
        />
        <div className="relative flex flex-col items-center gap-2 py-1 text-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-bold tabular-nums text-foreground">
              {fmt(annualCost)}
            </span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.standby.result.costPerYear')}
            </span>
          </div>
          <p className="text-sm text-muted">
            {t('measurements.standby.result.costPerMonth', { value: fmt(monthlyCost) })}
          </p>
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.standby.result.summary.${result.rating}`)}
          </p>
          {isEstimated && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {t('measurements.standby.result.estimated')}
            </span>
          )}
        </div>
      </div>

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
                  <span className="w-24 shrink-0 truncate text-sm text-foreground">
                    {t(`measurements.standby.deviceTypes.${d.type}`)}
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

const KNOWN_TYPES: StandbyDeviceType[] = [
  'tv',
  'console',
  'pc',
  'router',
  'audio',
  'charger',
  'other',
]

interface DecodedDevice {
  type: StandbyDeviceType
  watts: number
}

/**
 * Rekonstruiert die Geräteliste aus den persistierten `details`. Da `details`
 * nur Zahlen aufnimmt, werden Geräte als Schlüssel `dev{index}_{type}` mit dem
 * Watt-Wert gespeichert (siehe encodeDevices). Robust gegen fehlende Werte.
 */
function decodeDevices(details?: Record<string, number>): DecodedDevice[] {
  if (!details) return []
  const out: DecodedDevice[] = []
  for (const [key, value] of Object.entries(details)) {
    const match = /^dev\d+_(\w+)$/.exec(key)
    if (!match) continue
    const type = match[1] as StandbyDeviceType
    if (KNOWN_TYPES.includes(type) && Number.isFinite(value) && value > 0) {
      out.push({ type, watts: value })
    }
  }
  return out
}
