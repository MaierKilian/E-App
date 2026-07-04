import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Bell, Plus } from 'lucide-react'
import { useReadingsStore, type EnergyType } from '@/store/readingsStore'
import { useOnboardingStore } from '@/store/onboardingStore'
import { ENERGY_META, activeEnergyTypes } from './energyConfig'
import { sortByDate, consumptionTrend, daysSinceLastReading } from './readings'
import { dueTypes } from './due'
import { Sparkline } from './Sparkline'
import { TrendBadge, useLastReadingText } from './MeterTrend'
import { AddReadingScreen } from './AddReadingScreen'

/**
 * Beispiel-Verlauf (monoton steigende Zählerstände) für die Ghost-Vorschau im
 * Leerzustand – rein illustrativ, klar als „Beispiel" gekennzeichnet.
 */
const EXAMPLE_SERIES = [100, 128, 151, 179, 206, 234]

/**
 * Monitoring-Übersicht (Dashboard): prägnanter Kopf, eine Hero-Karte für den
 * wichtigsten Zähler (mit Verlaufskurve und Trend) sowie ein Kachel-Grid der
 * übrigen Energieträger. Jede Karte zeigt Stand, Mini-Verlauf und Trend;
 * Tap öffnet die Detailseite `/monitoring/<type>`.
 */
export function MonitoringPage() {
  const { t } = useTranslation()
  const data = useOnboardingStore((s) => s.data)
  const readingsByType = useReadingsStore((s) => s.readings)
  const frequency = useReadingsStore((s) => s.reminderFrequency)
  const [now] = useState(() => Date.now())
  // Direkteingabe: ohne Umweg über die Detailseite den Zählerstand erfassen.
  const [addType, setAddType] = useState<EnergyType | null>(null)

  const types = activeEnergyTypes(data)
  const due = new Set(dueTypes(data, readingsByType, frequency, now))
  const [hero, ...rest] = types

  const addMeta = addType ? ENERGY_META[addType] : null
  const addLatest = addType ? sortByDate(readingsByType[addType] ?? []).at(-1) : undefined

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('monitoring.overview.title')}</h1>
          <p className="text-muted mt-1 text-sm">{t('monitoring.overview.subtitle')}</p>
        </div>
      </div>

      {due.size > 0 && (
        <div className="glass flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-foreground">
          <span className="grid place-items-center w-7 h-7 rounded-full bg-primary/10 shrink-0">
            <Bell className="w-4 h-4 text-primary" />
          </span>
          {t('monitoring.overview.dueBanner', { count: due.size })}
        </div>
      )}

      {hero && (
        <HeroMeter type={hero} due={due.has(hero)} now={now} onAdd={() => setAddType(hero)} />
      )}

      {rest.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {rest.map((type) => (
            <MeterTile key={type} type={type} due={due.has(type)} now={now} />
          ))}
        </div>
      )}

      {addType && addMeta && (
        <AddReadingScreen
          type={addType}
          unit={addMeta.unit}
          typeLabel={t(`monitoring.energyTypes.${addType}`)}
          accent={addMeta.accent}
          icon={addMeta.icon}
          defaultValue={addLatest ? Math.trunc(addLatest.value) : 0}
          onClose={() => setAddType(null)}
        />
      )}
    </div>
  )
}

interface MeterProps {
  type: EnergyType
  due: boolean
  now: number
}

/** Große Hero-Karte des wichtigsten Zählers: Stand, Verlaufskurve, Trend. */
function HeroMeter({ type, due, now, onAdd }: MeterProps & { onAdd: () => void }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  const meta = ENERGY_META[type]
  const Icon = meta.icon
  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings[readings.length - 1]
  // Gleiche Datengrundlage wie das Detail-Diagramm (absoluter Zählerstand),
  // damit Mini- und Detailkurve übereinstimmen.
  const series = readings.map((r) => r.value)
  const trend = consumptionTrend(readings)
  const days = daysSinceLastReading(readings, now)
  const lastText = useLastReadingText(days)

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })
  const go = () => navigate(`/monitoring/${type}`)

  return (
    <section className="glass relative overflow-hidden rounded-3xl p-5">
      {/* Akzent-Schimmer in der Typ-Farbe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: meta.accent, opacity: 0.16 }}
      />
      <div className="relative">
        {/* Antippen öffnet die Detailseite (Diagramm & Historie). */}
        <button type="button" onClick={go} className="block w-full text-left">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="grid place-items-center w-11 h-11 rounded-2xl shrink-0"
                style={{ background: `${meta.accent}1f`, color: meta.accent }}
              >
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {t(`monitoring.energyTypes.${type}`)}
                </p>
                {lastText && <p className="text-xs text-muted">{lastText}</p>}
              </div>
            </div>
            {due ? (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary shrink-0">
                {t('monitoring.reminder.due')}
              </span>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted shrink-0" />
            )}
          </div>

          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted">
                {t('monitoring.detail.current')}
              </p>
              {latest ? (
                <p className="mt-0.5 text-3xl font-bold tabular-nums leading-none">
                  {numFmt.format(latest.value)}
                  <span className="ml-1 text-base font-medium text-muted">{meta.unit}</span>
                </p>
              ) : (
                <p className="mt-0.5 text-base text-muted">{t('monitoring.overview.empty')}</p>
              )}
            </div>
            {trend && <TrendBadge trend={trend} />}
          </div>

          <div className="mt-4">
            {series.length >= 2 ? (
              <Sparkline values={series} color={meta.accent} height={48} />
            ) : (
              // Ghost-Vorschau: dezente Beispiel-Kurve zeigt, wie der Verlauf
              // aussehen wird, sobald zwei echte Ablesungen vorliegen.
              <div className="relative overflow-hidden rounded-2xl bg-surface-2/40 px-3.5 py-3">
                <span className="absolute right-2.5 top-2.5 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {t('monitoring.overview.exampleBadge')}
                </span>
                <div className="pointer-events-none opacity-40">
                  <Sparkline values={EXAMPLE_SERIES} color={meta.accent} height={44} />
                </div>
                <p className="mt-2 text-xs text-muted">{t('monitoring.overview.ghostHint')}</p>
              </div>
            )}
          </div>
        </button>

        <button
          type="button"
          onClick={onAdd}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          {t('monitoring.overview.add')}
        </button>
      </div>
    </section>
  )
}

/** Kompakte, aber lebendige Kachel eines Energieträgers. */
function MeterTile({ type, due }: MeterProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  const meta = ENERGY_META[type]
  const Icon = meta.icon
  const readings = sortByDate(readingsByType[type] ?? [])
  const latest = readings[readings.length - 1]
  const series = readings.map((r) => r.value)
  const trend = consumptionTrend(readings)

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 })

  return (
    <button
      type="button"
      onClick={() => navigate(`/monitoring/${type}`)}
      className="glass relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl p-4 text-left transition-[transform,background-color] duration-200 hover:bg-surface-2/60 active:scale-[0.97]"
    >
      <div className="flex w-full items-center justify-between">
        <span
          className="grid place-items-center w-10 h-10 rounded-2xl"
          style={{ background: `${meta.accent}1f`, color: meta.accent }}
        >
          <Icon className="w-5 h-5" />
        </span>
        {due ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {t('monitoring.reminder.due')}
          </span>
        ) : trend ? (
          <TrendBadge trend={trend} compact />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted" />
        )}
      </div>

      <div className="w-full min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {t(`monitoring.energyTypes.${type}`)}
        </p>
        {latest ? (
          <p className="mt-0.5 text-base font-bold tabular-nums truncate">
            {numFmt.format(latest.value)}
            <span className="ml-1 text-xs font-medium text-muted">{meta.unit}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-sm text-muted truncate">{t('monitoring.overview.empty')}</p>
        )}
      </div>

      {series.length > 0 && (
        <div className="-mb-1 w-full">
          <Sparkline values={series} color={meta.accent} height={28} />
        </div>
      )}
    </button>
  )
}
