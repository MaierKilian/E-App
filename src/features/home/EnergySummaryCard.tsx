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
 * Zeigt die hochgerechneten Jahreskosten des wichtigsten kostenfähigen Zählers
 * (i. d. R. Strom) groß als Blickfang – und darunter eine schlanke Leiste mit den
 * übrigen Energieträgern des Profils (Gas, Pellets, Öl, Solarthermie, PV …).
 *
 * Es erscheinen bewusst NUR Träger mit echten Zählerständen (mind. zwei
 * Ablesungen → belastbare Jahreshochrechnung); für alles andere wird nichts
 * gezeigt, damit auf der Startseite keine geratene Zahl steht. Antippen öffnet
 * das Monitoring (Hauptwert) bzw. den jeweiligen Zähler (Nebenkacheln).
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

  // Für jeden aktiven Träger die Jahres-Hochrechnung bestimmen (Reihenfolge =
  // ORDER, Strom zuerst). Nur Träger mit echten Zählerständen bleiben übrig.
  const carriers = activeEnergyTypes(data)
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

  // Hauptwert: der wichtigste Träger MIT Kosten (i. d. R. Strom). Gibt es keinen
  // solchen, wird – wie bisher – nichts gezeigt (keine geratenen Zahlen).
  const hero = carriers.find((c) => c.costEur !== undefined)
  if (!hero) return null

  const secondary = carriers.filter((c) => c.type !== hero.type)
  const heroName = t(`monitoring.energyTypes.${hero.type}`)

  return (
    <div className="glass relative overflow-hidden rounded-3xl p-5">
      {/* Dezenter Akzent-Schimmer in der Typ-Farbe des Hauptwerts */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full blur-3xl"
        style={{ background: hero.meta.accent, opacity: 0.16 }}
      />

      {/* Hauptwert (i. d. R. Strom) – öffnet das Monitoring */}
      <button
        type="button"
        onClick={() => navigate('/monitoring')}
        className="focus-ring relative block w-full text-left transition-transform active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            {t('home.energy.title', { type: heroName })}
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        </div>

        <div className="mt-1 flex items-end justify-between gap-3">
          <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
            ≈ {eurFmt.format(hero.costEur ?? 0)}
          </p>
          {hero.trend && <TrendBadge trend={hero.trend} />}
        </div>

        <p className="mt-1.5 text-xs text-muted">
          {t('home.energy.perYearUnit', {
            amount: numFmt.format(hero.amount ?? 0),
            unit: hero.meta.unit,
          })}
        </p>
      </button>

      {/* Weitere Energieträger – schlanke, horizontal scrollbare Kacheln */}
      {secondary.length > 0 && (
        <div className="relative mt-4 flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secondary.map((c) => {
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
                className="focus-ring flex shrink-0 items-center gap-2 rounded-2xl border border-border/60 bg-surface-2/40 px-3 py-2 transition-transform active:scale-[0.97]"
              >
                <span
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                  style={{ backgroundColor: `${c.meta.accent}1a` }}
                >
                  <Icon className="h-4 w-4" style={{ color: c.meta.accent }} />
                </span>
                <div className="text-left">
                  <p className="text-[11px] leading-tight text-muted">
                    {t(`monitoring.energyTypes.${c.type}`)}
                  </p>
                  <p className="text-sm font-semibold leading-tight tabular-nums text-foreground">
                    ≈ {value}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
