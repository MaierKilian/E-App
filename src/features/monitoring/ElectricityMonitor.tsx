import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { SelectChip } from '@/components/ui/SelectChip'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { ReadingModal } from './ReadingModal'
import { ReadingReminder } from './ReadingReminder'
import { AbsoluteLineChart, type LinePoint } from './AbsoluteLineChart'
import { sortByDate, stats } from './readings'

/** Auswählbare Zeiträume für das Verlaufs-Diagramm. */
type RangeKey = 'd7' | 'd30' | 'all'
const RANGE_DAYS: Record<RangeKey, number | null> = { d7: 7, d30: 30, all: null }

interface ElectricityMonitorProps {
  /** Energieträger der Sektion. Aktuell nur 'electricity' aktiv. */
  type?: EnergyType
}

/** Strom-Sektion des Monitorings nach Prototyp: Hero, Verlauf, Bonus, Historie. */
export function ElectricityMonitor({ type = 'electricity' }: ElectricityMonitorProps) {
  const { t, i18n } = useTranslation()
  const readingsByType = useReadingsStore((s) => s.readings)
  const deleteReading = useReadingsStore((s) => s.deleteReading)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [modalOpen, setModalOpen] = useState(false)
  const [range, setRange] = useState<RangeKey>('all')
  // „Jetzt" einmalig beim Mounten festhalten, damit der Render rein bleibt
  // (kein Date.now() während des Renderns für die Zeitraum-Filterung).
  const [now] = useState(() => Date.now())

  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined
  const hasEnough = readings.length >= 2
  const unit = t('monitoring.readings.valueUnit')

  const numFmt = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const num1Fmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const intFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const dateTimeFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  /** Erfassungszeitpunkt: createdAt bevorzugt, sonst Datum ohne Uhrzeit. */
  function formatTimestamp(date: string, createdAt?: string): string {
    if (createdAt) {
      const d = new Date(createdAt)
      if (!Number.isNaN(d.getTime())) return dateTimeFmt.format(d)
    }
    const d = new Date(`${date}T00:00:00`)
    return Number.isNaN(d.getTime()) ? date : dateFmt.format(d)
  }

  const s = stats(readings, workPriceCt)

  // Punkte fürs absolute Linien-Diagramm, nach Zeitraum gefiltert.
  const allPoints: LinePoint[] = readings.map((r) => ({ date: r.date, value: r.value }))
  const days = RANGE_DAYS[range]
  const points =
    days === null
      ? allPoints
      : (() => {
          const cutoff = now - days * 24 * 60 * 60 * 1000
          return allPoints.filter((p) => new Date(`${p.date}T00:00:00`).getTime() >= cutoff)
        })()

  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary/10 text-primary shrink-0">
            <Gauge className="w-5 h-5" />
          </span>
          <h2 className="text-base font-semibold text-foreground">
            {t('monitoring.readings.title')}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline sm:inline">
            {t('monitoring.readings.newReading')}
          </span>
          <span className="xs:hidden sm:hidden">{t('monitoring.readings.addReading')}</span>
        </button>
      </div>

      {/* Hero: aktueller Zählerstand */}
      <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('monitoring.readings.currentTitle')}
        </p>
        {latest ? (
          <>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-foreground tabular-nums">
                {numFmt.format(latest.value)}
              </span>
              <span className="text-base font-medium text-muted">{unit}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatTimestamp(latest.date, latest.createdAt)}
            </p>
          </>
        ) : (
          <p className="mt-1.5 text-sm text-muted">{t('monitoring.readings.emptyText')}</p>
        )}
      </div>

      {/* Verlauf: absolutes Linien-Diagramm mit Zeitraum-Auswahl */}
      {readings.length > 0 && (
        <div className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                {t('monitoring.readings.absoluteTitle')}
              </h3>
              <p className="text-xs text-muted">
                {t('monitoring.readings.absoluteSubtitle')}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(RANGE_DAYS) as RangeKey[]).map((key) => (
              <SelectChip
                key={key}
                label={t(`monitoring.readings.range.${key}`)}
                selected={range === key}
                onClick={() => setRange(key)}
              />
            ))}
          </div>
          <div className="mt-3">
            <AbsoluteLineChart points={points} unit={unit} />
          </div>
        </div>
      )}

      {/* Bonus: Verbrauch & Kosten */}
      {hasEnough && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {t('monitoring.readings.bonusTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label={t('monitoring.readings.stats.lastConsumption')}
              value={`${num1Fmt.format(s.lastConsumptionKwh ?? 0)} ${unit}`}
            />
            <StatTile
              label={t('monitoring.readings.stats.perDay')}
              value={`${num1Fmt.format(s.perDayKwh ?? 0)} ${unit}`}
            />
            <StatTile
              label={t('monitoring.readings.stats.projectedYear')}
              value={`${intFmt.format(s.projectedYearKwh ?? 0)} ${unit}`}
            />
            <StatTile
              label={t('monitoring.readings.stats.costPerYear')}
              value={
                s.projectedYearCostEur !== undefined
                  ? eurFmt.format(s.projectedYearCostEur)
                  : '–'
              }
            />
          </div>
        </div>
      )}

      {/* Zählerhistorie */}
      {readings.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {t('monitoring.readings.historyTitle')}
          </h3>
          <ul className="space-y-1">
            {[...readings].reverse().map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-medium text-foreground tabular-nums">
                    {num1Fmt.format(r.value)} {unit}
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
        </div>
      )}

      <ReadingReminder readings={readings} />

      <ReadingModal open={modalOpen} onClose={() => setModalOpen(false)} type={type} />
    </Card>
  )
}

interface StatTileProps {
  label: string
  value: string
}

/** Kleine Kennzahl-Kachel. */
function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2/40 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  )
}
