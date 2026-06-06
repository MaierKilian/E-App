import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Gauge, Plus, ChevronDown, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { ReadingModal } from './ReadingModal'
import { ReadingReminder } from './ReadingReminder'
import { ConsumptionChart, type ChartDatum } from './ConsumptionChart'
import { consumptionSegments, sortByDate, stats } from './readings'

/** Strom-Sektion des Monitorings: Ablesungen, Kennzahlen, Diagramm, Erinnerung. */
export function ElectricityMonitor() {
  const { t, i18n } = useTranslation()
  const readingsByType = useReadingsStore((s) => s.readings)
  const deleteReading = useReadingsStore((s) => s.deleteReading)
  const workPriceCt = useTariffStore((s) => s.electricityWorkPrice)

  const [modalOpen, setModalOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  const readings = sortByDate(readingsByType.electricity ?? [])
  const hasEnough = readings.length >= 2

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const intFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const dateFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const shortFmt = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: '2-digit',
  })

  function formatDate(iso: string, short = false): string {
    const d = new Date(`${iso}T00:00:00`)
    if (Number.isNaN(d.getTime())) return iso
    return (short ? shortFmt : dateFmt).format(d)
  }

  const s = stats(readings, workPriceCt)
  const chartData: ChartDatum[] = consumptionSegments(readings).map((seg) => ({
    label: formatDate(seg.to, true),
    value: seg.kwh,
  }))

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
          {t('monitoring.readings.addReading')}
        </button>
      </div>

      {!hasEnough ? (
        <div className="mt-4 rounded-2xl border border-border bg-surface-2/40 p-5 text-center">
          <p className="text-sm font-medium text-foreground">
            {t('monitoring.readings.emptyTitle')}
          </p>
          <p className="mt-1 text-sm text-muted">
            {readings.length === 0
              ? t('monitoring.readings.emptyText')
              : t('monitoring.readings.needTwo')}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile
              label={t('monitoring.readings.stats.lastConsumption')}
              value={`${numFmt.format(s.lastConsumptionKwh ?? 0)} ${t('monitoring.readings.valueUnit')}`}
            />
            <StatTile
              label={t('monitoring.readings.stats.perDay')}
              value={`${numFmt.format(s.perDayKwh ?? 0)} ${t('monitoring.readings.valueUnit')}`}
            />
            <StatTile
              label={t('monitoring.readings.stats.projectedYear')}
              value={`${intFmt.format(s.projectedYearKwh ?? 0)} ${t('monitoring.readings.valueUnit')}`}
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

          <div className="mt-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">
              {t('monitoring.readings.chartTitle')}
            </h3>
            <ConsumptionChart data={chartData} unit={t('monitoring.readings.consumptionUnit')} />
          </div>
        </>
      )}

      {readings.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            aria-expanded={listOpen}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-medium text-foreground"
          >
            {t('monitoring.readings.allReadings')}
            <ChevronDown
              className={`w-4 h-4 text-muted transition-transform ${listOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {listOpen && (
            <ul className="mt-1 space-y-1">
              {[...readings].reverse().map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm"
                >
                  <span className="text-muted">{formatDate(r.date)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-foreground tabular-nums">
                      {numFmt.format(r.value)} {t('monitoring.readings.valueUnit')}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteReading('electricity', r.id)}
                      aria-label={t('monitoring.readings.delete')}
                      className="grid place-items-center w-7 h-7 rounded-lg text-muted hover:text-foreground transition-colors shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ReadingReminder readings={readings} />

      <ReadingModal open={modalOpen} onClose={() => setModalOpen(false)} type="electricity" />
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
