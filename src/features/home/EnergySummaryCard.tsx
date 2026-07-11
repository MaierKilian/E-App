import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { activeEnergyTypes, ENERGY_META } from '@/features/monitoring/energyConfig'
import { PRICE_META } from '@/features/monitoring/priceConfig'
import { sortByDate, stats, consumptionTrend } from '@/features/monitoring/readings'
import { TrendBadge } from '@/features/monitoring/MeterTrend'
import type { OnboardingData } from '@/types'

/**
 * Kompakte Energie-Status-Karte für die Startseite.
 *
 * Zeigt die hochgerechneten Jahreswerte der Energieträger des Profils als Reihe
 * gleichwertiger, schlanker Kacheln (Strom zuerst, dann Gas/Öl/Pellets/… bzw.
 * PV/Solarthermie). Wasser wird hier bewusst ausgeblendet.
 *
 * Es erscheinen NUR Träger mit echten Zählerständen (mind. zwei Ablesungen →
 * belastbare Jahreshochrechnung); ohne solche wird nichts gerendert, damit auf
 * der Startseite keine geratene Zahl steht. Antippen öffnet den jeweiligen Zähler.
 */
export function EnergySummaryCard({ data }: { data: OnboardingData }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)
  const tariff = useTariffStore()

  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  // Jahres-Hochrechnung je aktivem Träger (Reihenfolge = ORDER, Strom zuerst).
  // Wasser bleibt außen vor; nur Träger mit echten Zählerständen bleiben übrig.
  const carriers = activeEnergyTypes(data)
    .filter((type) => type !== 'water')
    .map((type) => {
      const readings = sortByDate(readingsByType[type] ?? [])
      const priceMeta = PRICE_META[type]
      const eurPerUnit = priceMeta ? resolvePrice(tariff, type).work * priceMeta.priceToEur : undefined
      const s = stats(readings, eurPerUnit)
      return {
        type,
        meta: ENERGY_META[type],
        costEur: s.projectedYearCostEur,
        amount: s.projectedYearKwh,
        trend: consumptionTrend(readings),
      }
    })
    .filter((c) => c.amount !== undefined)

  if (carriers.length === 0) return null

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-4">
      {/* Dezenter Akzent-Schimmer in der Farbe des ersten Trägers (i. d. R. Strom) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: carriers[0].meta.accent, opacity: 0.16 }}
      />

      {/* Kopfzeile: gemeinsamer Kontext + Sprung ins Monitoring */}
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="focus-ring relative flex w-full items-center justify-between gap-2"
      >
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          {t('home.energy.overline')}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {/* Gleichwertige Kacheln je Träger – füllen die Breite, scrollen bei vielen */}
      <div className="relative mt-3 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {carriers.map((c) => {
          const Icon = c.meta.icon
          const value =
            c.costEur !== undefined
              ? eurFmt.format(c.costEur)
              : `${numFmt.format(c.amount ?? 0)} ${c.meta.unit}`
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => navigate(`/monitoring/${c.type}`)}
              className="focus-ring flex min-w-[8.5rem] flex-1 flex-col gap-1.5 rounded-2xl border border-border/60 bg-surface-2/40 p-3 text-left transition-transform active:scale-[0.98]"
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `${c.meta.accent}1a` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: c.meta.accent }} />
                </span>
                <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted">
                  {t(`monitoring.energyTypes.${c.type}`)}
                </span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold leading-none tabular-nums text-foreground">
                  ≈ {value}
                </span>
                {c.trend && <TrendBadge trend={c.trend} compact />}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
