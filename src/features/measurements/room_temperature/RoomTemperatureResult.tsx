import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Thermometer, Droplets, Wind, PiggyBank, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ResultHero } from '../ResultHero'
import type { ResultProps } from '../runnerTypes'
import {
  rateTemperatureInBand,
  rateHumidity,
  DEFAULT_COMFORT_BAND,
  type DimensionStatus,
} from './roomClimate'

/** Formatiert eine Zahl in der aktuellen Sprache. */
function useNumberFormat() {
  const { i18n } = useTranslation()
  return (value: number, digits = 0) =>
    new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value)
}

/** Eine Zeile mit Icon, Dimension und kurzem Status-Hinweis. */
function StatusRow({
  Icon,
  label,
  status,
}: {
  Icon: LucideIcon
  label: string
  status: string
}) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-medium text-foreground">{status}</p>
      </div>
    </li>
  )
}

const DRAFT_LEVELS = ['none', 'noticeable', 'strong'] as const

/**
 * Ergebnis-Phase des Raumklima-Checks: Hero mit Temperatur + Bewertung, je
 * erfasster Dimension (Temperatur, Luftfeuchte, Zugluft) ein Status-Hinweis,
 * dezente Thermo-Hygrometer-Empfehlung.
 */
export function RoomTemperatureResult({ result }: ResultProps) {
  const { t, i18n } = useTranslation()
  const fmt = useNumberFormat()
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })

  const temp = result.primaryValue
  // Das Komfortband ist raumtypabhängig und wird beim Messen mitgespeichert –
  // so bleibt ein altes Ergebnis stimmig, auch wenn sich Defaults später ändern.
  const band = {
    min: result.details?.bandMin ?? DEFAULT_COMFORT_BAND.min,
    max: result.details?.bandMax ?? DEFAULT_COMFORT_BAND.max,
  }
  const tempStatus = rateTemperatureInBand(temp, band)

  // Anteilige Heiz-Einsparung (vom Runner berechnet, falls Raum zu warm war).
  const savingDeltaT = result.details?.savingDeltaT
  const savingPercent = result.details?.savingPercent
  const yearlySaving = result.details?.yearlySaving
  const savingEstimated = (result.details?.savingEstimated ?? 0) === 1
  const savingReference = result.details?.savingReference ?? band.max
  const hasSaving = Number.isFinite(savingDeltaT) && (savingDeltaT as number) > 0

  const hasHumidity = Number.isFinite(result.details?.humidity)
  const humidity = result.details?.humidity ?? 0
  const humidityStatus: DimensionStatus | undefined = hasHumidity
    ? rateHumidity(humidity)
    : undefined

  const draftIndex = result.details?.draft ?? 0
  const draftLevel = DRAFT_LEVELS[draftIndex] ?? 'none'

  return (
    <div className="space-y-4">
      <ResultHero
        rating={result.rating}
        value={fmt(temp, 1)}
        unit={t('measurements.room_temperature.run.tempUnit')}
        summary={t(`measurements.room_temperature.result.summary.${result.rating}`)}
      />

      <ul className="glass space-y-4 rounded-3xl p-5">
        <StatusRow
          Icon={Thermometer}
          label={`${t('measurements.room_temperature.result.dimensions.temperature')} · ${t(
            'measurements.room_temperature.result.targetBand',
            { min: fmt(band.min), max: fmt(band.max) },
          )}`}
          status={t(`measurements.room_temperature.result.status.${tempStatus}`)}
        />
        {hasHumidity && humidityStatus && (
          <StatusRow
            Icon={Droplets}
            label={`${t('measurements.room_temperature.result.dimensions.humidity')} · ${fmt(humidity)} ${t('measurements.room_temperature.run.humidityUnit')}`}
            status={t(`measurements.room_temperature.result.status.${humidityStatus}`)}
          />
        )}
        <StatusRow
          Icon={Wind}
          label={t('measurements.room_temperature.result.dimensions.draft')}
          status={t(`measurements.room_temperature.result.draftStatus.${draftLevel}`)}
        />
      </ul>

      {hasSaving && (
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-success/10 text-success">
              <PiggyBank className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t('measurements.room_temperature.result.saving.title')}
              </p>
              {yearlySaving !== undefined ? (
                <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                  ≈ {eurFmt.format(yearlySaving)}
                  <span className="ml-1 text-sm font-medium text-muted">
                    {t('measurements.room_temperature.result.saving.perYear')}
                  </span>
                </p>
              ) : (
                <p className="text-2xl font-bold tabular-nums leading-tight text-foreground">
                  −{savingPercent}%
                  <span className="ml-1 text-sm font-medium text-muted">
                    {t('measurements.room_temperature.result.saving.percentUnit')}
                  </span>
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            {t('measurements.room_temperature.result.saving.context', {
              percent: savingPercent,
              delta: fmt(savingDeltaT as number, 1),
              reference: fmt(savingReference, 0),
            })}
          </p>
          {yearlySaving !== undefined && savingEstimated && (
            <span className="mt-2 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {t('measurements.room_temperature.result.saving.estimated')}
            </span>
          )}
          {yearlySaving === undefined && (
            <Link
              to="/monitoring"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              {t('measurements.room_temperature.result.saving.cta')}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
