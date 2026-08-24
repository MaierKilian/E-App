import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { useReadingsStore } from '@/store/readingsStore'
import { ALL_ENERGY_TYPES, ENERGY_META } from '@/features/monitoring/energyConfig'
import { sortByDate, consumptionTrend, daysSinceLastReading } from '@/features/monitoring/readings'
import { TrendBadge } from '@/features/monitoring/MeterTrend'

/**
 * Kompakte Energie-Status-Karte für die Startseite.
 *
 * Zeigt je erfasstem Energieträger den zuletzt abgelesenen Zählerstand als
 * Reihe gleichwertiger, schlanker Kacheln (Strom zuerst, dann Gas/Öl/Pellets/…
 * bzw. PV/Solarthermie). Wasser wird hier bewusst ausgeblendet.
 *
 * Maßgeblich sind die Ablesungen, nicht das Profil: Ein selbst angelegter
 * Zähler gehört genauso hierher wie ein vom Fragebogen vorgeschlagener.
 *
 * Es erscheinen NUR Träger mit mindestens einer echten Ablesung; ohne eine
 * solche wird nichts gerendert, damit auf der Startseite kein Platzhalter
 * steht. Der Trend-Badge (Tagesverbrauch ggü. Vorzeitraum bzw. Vorjahr)
 * erscheint erst ab der zweiten Ablesung. Antippen öffnet den jeweiligen Zähler.
 */
export function EnergySummaryCard() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const readingsByType = useReadingsStore((s) => s.readings)

  const numFmt = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 })

  // Zuletzt abgelesener Zählerstand je Träger (Reihenfolge = ORDER, Strom
  // zuerst). Wasser bleibt außen vor; der Filter unten lässt nur Träger mit
  // mindestens einer echten Ablesung übrig – deshalb hier über alle statt über
  // die des Profils: Ein selbst angelegter Zähler zählt genauso.
  const carriers = ALL_ENERGY_TYPES
    .filter((type) => type !== 'water')
    .map((type) => {
      const readings = sortByDate(readingsByType[type] ?? [])
      const last = readings[readings.length - 1]
      return {
        type,
        meta: ENERGY_META[type],
        lastValue: last?.value,
        sinceDays: daysSinceLastReading(readings),
        // Tagesverbrauch ggü. Vorzeitraum (bzw. Vorjahr, wenn die Historie
        // reicht) – erfordert mindestens zwei Ablesungen.
        trend: consumptionTrend(readings),
      }
    })
    .filter((c) => c.lastValue !== undefined)

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
          {t('home.energy.overlineMeter')}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {/* Gleichwertige Kacheln je Träger – füllen die Breite, scrollen bei vielen */}
      <div className="relative mt-3 flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {carriers.map((c) => {
          const Icon = c.meta.icon
          const lastReadText =
            c.sinceDays === undefined
              ? null
              : c.sinceDays === 0
                ? t('monitoring.overview.readToday')
                : t('monitoring.overview.readDaysAgo', { count: c.sinceDays })
          return (
            <button
              key={c.type}
              type="button"
              onClick={() => navigate(`/monitoring/${c.type}`)}
              className="focus-ring flex min-w-[9.5rem] flex-1 flex-col gap-1.5 rounded-2xl border border-border/60 bg-surface-2/40 p-3 text-left transition-transform active:scale-[0.98]"
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
              {/* Zählerstand links, Trend rechtsbündig in derselben Zeile – der
                  Trend bewertet die Verbrauchsrichtung, nicht den Stand selbst,
                  und steht deshalb klar abgesetzt am Kachelrand. Die Einheit
                  steht bewusst unten bei „zuletzt abgelesen" statt direkt hinterm
                  Wert: Zählerstände können sechsstellig werden, dann bräuchten
                  Zahl, Einheit UND Badge nebeneinander mehr Platz, als eine
                  schmale Kachel hat – abgeschnitten wäre die Zahl unbrauchbar. */}
              <span className="flex items-baseline justify-between gap-1.5">
                <span className="truncate text-xl font-bold leading-none tabular-nums text-foreground">
                  {numFmt.format(c.lastValue ?? 0)}
                </span>
                {c.trend && <TrendBadge trend={c.trend} compact />}
              </span>
              {lastReadText && (
                <span className="text-[10px] leading-snug text-muted">
                  {c.meta.unit} · {lastReadText}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
