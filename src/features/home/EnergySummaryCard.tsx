import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore, resolvePrice } from '@/store/tariffStore'
import { activeEnergyTypes, ENERGY_META } from '@/features/monitoring/energyConfig'
import { PRICE_META, isPriceable } from '@/features/monitoring/priceConfig'
import { sortByDate, stats, consumptionTrend } from '@/features/monitoring/readings'
import { TrendBadge } from '@/features/monitoring/MeterTrend'
import type { OnboardingData } from '@/types'

/**
 * Kompakte Energie-Status-Karte für die Startseite.
 *
 * Zeigt die hochgerechneten Jahreskosten des wichtigsten kostenfähigen Zählers
 * (i. d. R. Strom) mit Mini-Verlauf und Trend. Erscheint bewusst NUR, wenn dafür
 * echte Zählerstände vorliegen (mind. zwei Ablesungen → belastbarer Verbrauch);
 * andernfalls wird nichts gerendert, damit auf der Startseite keine geratene Zahl
 * steht. Antippen öffnet das Monitoring.
 */
export function EnergySummaryCard({ data }: { data: OnboardingData }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  // Wichtigster kostenfähiger Träger des Profils (Strom steht in ORDER zuerst).
  const heroType = activeEnergyTypes(data).find(isPriceable)
  const priceWork = useTariffStore((s) => (heroType ? resolvePrice(s, heroType).work : 0))

  if (!heroType) return null

  const readings = sortByDate(readingsByType[heroType] ?? [])
  const priceMeta = PRICE_META[heroType]
  const eurPerUnit = priceMeta ? priceWork * priceMeta.priceToEur : undefined
  const s = stats(readings, eurPerUnit)

  // Ohne echte Zählerstände (keine belastbare Jahreshochrechnung) nichts zeigen.
  if (s.projectedYearCostEur === undefined || s.projectedYearKwh === undefined) return null

  const meta = ENERGY_META[heroType]
  const trend = consumptionTrend(readings)

  const eurFmt = new Intl.NumberFormat(i18n.language, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
  const kwhFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })
  const typeName = t(`monitoring.energyTypes.${heroType}`)

  return (
    <button
      type="button"
      onClick={() => navigate('/monitoring')}
      className="focus-ring glass relative w-full overflow-hidden rounded-3xl p-5 text-left transition-transform active:scale-[0.99]"
    >
      {/* Dezenter Akzent-Schimmer in der Typ-Farbe */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: meta.accent, opacity: 0.16 }}
      />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('home.energy.title', { type: typeName })}
          </p>
          <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        </div>

        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold tabular-nums leading-none text-foreground">
            ≈ {eurFmt.format(s.projectedYearCostEur)}
          </p>
          {trend && <TrendBadge trend={trend} />}
        </div>

        <p className="mt-1.5 text-xs text-muted">
          {t('home.energy.perYear', { kwh: kwhFmt.format(s.projectedYearKwh) })}
        </p>
      </div>
    </button>
  )
}
