import { useTranslation } from 'react-i18next'
import { AffiliateRow } from '@/components/AffiliateCard'
import { SMART_PLUG_PRODUCT } from '@/features/onboarding/affiliateProducts'
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

/** Knapper Tipp-Chip. */
function Chip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {label}
    </span>
  )
}

/**
 * Ergebnis-Phase des Standby-Checks: großer Gesamt-Watt-Wert mit subtiler
 * Bewertungs-Tönung, Jahreskosten, Geräte-Aufschlüsselung (größter Verbraucher
 * zuerst), Tipp-Chips und bei medium/high eine Smart-Plug-Empfehlung.
 */
export function StandbyResult({ result }: ResultProps) {
  const { t } = useTranslation()
  const fmt = useNumberFormat()

  const totalW = result.primaryValue
  const annualCost = result.details?.annualCost ?? 0
  const avoidable = result.details?.avoidableCost ?? 0
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
              {fmt(totalW, 1)}
            </span>
            <span className="text-lg font-medium text-muted">
              {t('measurements.standby.result.unit')}
            </span>
          </div>
          <RatingBadge rating={result.rating} />
          <p className="mt-1 text-sm text-muted">
            {t(`measurements.standby.result.summary.${result.rating}`)}
          </p>
        </div>
      </div>

      {/* Jahreskosten */}
      <div className="glass flex items-center justify-between gap-3 rounded-3xl p-4">
        <span className="text-sm text-muted">{t('measurements.standby.result.costLabel')}</span>
        <span className="text-lg font-bold tabular-nums text-foreground">
          {t('measurements.standby.result.perYear', { value: fmt(annualCost) })}
        </span>
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
          <p className="text-sm text-muted">{t('measurements.standby.result.affiliateNote')}</p>
          <AffiliateRow products={[SMART_PLUG_PRODUCT]} />
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
