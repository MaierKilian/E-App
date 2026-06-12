import { useState } from 'react'
import { useParams, useNavigate, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, Plus, Trash2, ChevronDown, Pencil } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { useTariffStore } from '@/store/tariffStore'
import { SelectChip } from '@/components/ui/SelectChip'
import { ENERGY_META, activeEnergyTypes } from './energyConfig'
import { AbsoluteLineChart, type LinePoint } from './AbsoluteLineChart'
import { AddReadingScreen } from './AddReadingScreen'
import { ReadingReminder } from './ReadingReminder'
import { TariffModal } from './TariffModal'
import { sortByDate, stats, consumptionTrend, daysSinceLastReading } from './readings'
import { TrendBadge } from './MeterTrend'

/** Auswählbare Zeiträume für das Verlaufs-Diagramm. */
type RangeKey = 'd7' | 'd30' | 'all'
const RANGE_DAYS: Record<RangeKey, number | null> = { d7: 7, d30: 30, all: null }

/**
 * Detailseite eines Energieträgers (`/monitoring/:type`).
 * Kompakt gehalten: schlanker Kopf, kleine aktuelle Stand-Zeile, großer
 * „+ Ablesung"-Button (öffnet vollflächigen Eingabe-Screen), Diagramm,
 * eingeklappte Historie und – bei Strom – Kosten + Strompreis-Chip.
 */
export function MeterDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { type: rawType } = useParams<{ type: string }>()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const deleteReading = useReadingsStore((s) => s.deleteReading)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [addOpen, setAddOpen] = useState(false)
  const [tariffOpen, setTariffOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [range, setRange] = useState<RangeKey>('all')
  const [now] = useState(() => Date.now())

  const active = activeEnergyTypes(data)
  const type = rawType as EnergyType
  // Ungültiger / nicht aktiver Träger → zurück zur Übersicht.
  if (!type || !active.includes(type)) {
    return <Navigate to="/monitoring" replace />
  }

  const meta = ENERGY_META[type]
  const Icon = meta.icon
  const unit = meta.unit
  const name = t(`monitoring.energyTypes.${type}`)

  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined
  const defaultValue = latest ? Math.trunc(latest.value) : 0

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const intFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' })
  const dateTimeFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  function formatTimestamp(date: string, createdAt?: string): string {
    if (createdAt) {
      const d = new Date(createdAt)
      if (!Number.isNaN(d.getTime())) return dateTimeFmt.format(d)
    }
    const d = new Date(`${date}T00:00:00`)
    return Number.isNaN(d.getTime()) ? date : dateFmt.format(d)
  }

  const s = stats(readings, meta.hasCost ? workPriceCt : undefined)
  const trend = consumptionTrend(readings)
  const sinceDays = daysSinceLastReading(readings, now)
  const lastText =
    sinceDays === undefined
      ? null
      : sinceDays === 0
        ? t('monitoring.overview.readToday')
        : t('monitoring.overview.readDaysAgo', { count: sinceDays })

  // Diagramm-Punkte nach Zeitraum filtern.
  const allPoints: LinePoint[] = readings.map((r) => ({ date: r.date, value: r.value }))
  const days = RANGE_DAYS[range]
  const points =
    days === null
      ? allPoints
      : allPoints.filter(
          (p) => new Date(`${p.date}T00:00:00`).getTime() >= now - days * 86400000,
        )

  return (
    <div className="space-y-4">
      {/* Kopf: Zurück + Träger-Hero + Diagramm im Stil der Übersicht */}
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="flex items-center gap-1 -ml-1 text-sm font-medium text-muted hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        {t('monitoring.detail.back')}
      </button>
      {/* Hero-Karte: gleicher Stil wie die Monitoring-Übersicht */}
      <section className="glass relative overflow-hidden rounded-3xl p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
          style={{ background: meta.accent, opacity: 0.16 }}
        />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
                style={{ background: `${meta.accent}1f`, color: meta.accent }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h1 className="text-base font-semibold leading-tight text-foreground truncate">
                  {name}
                </h1>
                {lastText && <p className="text-xs text-muted">{lastText}</p>}
              </div>
            </div>
            {trend && <TrendBadge trend={trend} />}
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted">
              {t('monitoring.detail.current')}
            </p>
            {latest ? (
              <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                {numFmt.format(latest.value)}
                <span className="ml-1 text-base font-medium text-muted">{unit}</span>
              </p>
            ) : (
              <p className="mt-0.5 text-base text-muted">{t('monitoring.detail.noReadings')}</p>
            )}
          </div>

          {/* Kosten/Verbrauch + Strompreis (nur bei kostenfähigen Trägern) */}
          {meta.hasCost && (s.lastConsumptionKwh !== undefined || type === 'electricity') && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {s.lastConsumptionKwh !== undefined && (
                <span className="text-muted">
                  {t('monitoring.detail.consumption')}:{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {numFmt.format(s.lastConsumptionKwh)} {unit}
                  </span>
                </span>
              )}
              {s.projectedYearCostEur !== undefined && (
                <span className="text-muted">
                  {t('monitoring.detail.cost')}:{' '}
                  <span className="font-medium text-foreground tabular-nums">
                    {eurFmt.format(s.projectedYearCostEur)}
                  </span>
                </span>
              )}
              {type === 'electricity' && (
                <button
                  type="button"
                  onClick={() => setTariffOpen(true)}
                  className="ml-auto flex items-center gap-1 rounded-full bg-surface-2/70 px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-2 transition-colors"
                >
                  <span className="tabular-nums">{intFmt.format(workPriceCt)} ct/kWh</span>
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            {t('monitoring.detail.addReading')}
          </button>
        </div>
      </section>

      {/* Diagramm-Karte */}
      {readings.length > 0 && (
        <section className="glass space-y-3 rounded-3xl p-4">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => (
              <SelectChip
                key={key}
                label={t(`monitoring.readings.range.${key}`)}
                selected={range === key}
                onClick={() => setRange(key)}
              />
            ))}
          </div>
          <AbsoluteLineChart points={points} unit={unit} accent={meta.accent} />
        </section>
      )}

      {/* Historie (eingeklappt) */}
      {readings.length > 0 && (
        <div className="glass rounded-2xl">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-foreground"
          >
            {t('monitoring.detail.history')}
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform ${historyOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {historyOpen && (
            <ul className="space-y-1 px-3 pb-3">
              {[...readings].reverse().map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm"
                >
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground tabular-nums">
                      {numFmt.format(r.value)} {unit}
                    </span>
                    <span className="block text-xs text-muted truncate">
                      {formatTimestamp(r.date, r.createdAt)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteReading(type, r.id)}
                    aria-label={t('monitoring.readings.delete')}
                    className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Erinnerung (kompakt) */}
      <ReadingReminder readings={readings} />

      {addOpen && (
        <AddReadingScreen
          type={type}
          unit={unit}
          typeLabel={name}
          accent={meta.accent}
          icon={Icon}
          defaultValue={defaultValue}
          onClose={() => setAddOpen(false)}
        />
      )}
      <TariffModal open={tariffOpen} onClose={() => setTariffOpen(false)} />
    </div>
  )
}
