import { useTranslation } from 'react-i18next'
import type { DayBar, Forecast, HeatCell, StatusCounts } from './engine/stats'
import type { Maturity } from './engine/rollups'

/**
 * Die Diagramme der Lern-Statistik – bewusst als schlichtes HTML/SVG, ohne
 * Diagramm-Bibliothek.
 *
 * Gemeinsame Regeln, damit alle vier gleich gelesen werden:
 *  • Die Reife einer Karte ist eine Reihenfolge (neu → reif) und bekommt deshalb
 *    EINE Farbfamilie in vier Helligkeitsstufen (`--chart-1` … `--chart-4`),
 *    keine vier bunten Farben. Wer Farben nicht unterscheiden kann, sieht die
 *    Reihenfolge trotzdem.
 *  • Zwischen gestapelten Flächen bleibt eine 2px-Lücke in Flächenfarbe, damit
 *    Segmente sich nicht optisch verbinden.
 *  • Reihen mit mehr als einer Kategorie haben immer eine Legende.
 *  • Zahlen und Beschriftungen tragen Textfarben, nie die Reihenfarbe.
 */

/** Reihenfolge der Reifegrade – von neu nach reif, wie in der Rampe. */
const MATURITY_ORDER: Maturity[] = ['new', 'learning', 'young', 'mature']

const MATURITY_COLOR: Record<Maturity, string> = {
  new: 'var(--chart-1)',
  learning: 'var(--chart-2)',
  young: 'var(--chart-3)',
  mature: 'var(--chart-4)',
}

/** Kalender-Heatmap der Lerntage: sieben Zeilen (Mo–So), eine Spalte je Woche. */
export function Heatmap({ cells }: { cells: HeatCell[] }) {
  const { t } = useTranslation()
  const weeks = Math.max(...cells.map((c) => c.week)) + 1
  const active = cells.filter((c) => c.count > 0).length

  return (
    <div className="space-y-2">
      <div
        role="img"
        aria-label={t('education.flashcards.stats.heatmapSummary', { count: active })}
        className="grid w-full gap-[3px]"
        style={{
          gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(7, minmax(0, 1fr))',
          gridAutoFlow: 'column',
        }}
      >
        {cells.map((cell) => (
          <span
            key={cell.day}
            title={`${cell.day}: ${cell.count}`}
            className="aspect-square rounded-[3px]"
            style={{
              background: cell.level === 0 ? 'var(--color-surface-2)' : levelColor(cell.level),
            }}
          />
        ))}
      </div>
      <Legend
        items={[
          { label: t('education.flashcards.stats.less'), color: 'var(--color-surface-2)' },
          { label: '', color: 'var(--chart-1)' },
          { label: '', color: 'var(--chart-2)' },
          { label: '', color: 'var(--chart-3)' },
          { label: t('education.flashcards.stats.more'), color: 'var(--chart-4)' },
        ]}
      />
    </div>
  )
}

function levelColor(level: number): string {
  return `var(--chart-${Math.min(4, Math.max(1, level))})`
}

/** Bewertungen je Tag, gestapelt nach Reifegrad der Karte. */
export function DayBars({ bars }: { bars: DayBar[] }) {
  const { t } = useTranslation()
  const max = Math.max(...bars.map((b) => b.total), 1)
  const total = bars.reduce((sum, b) => sum + b.total, 0)

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={t('education.flashcards.stats.dayBarsSummary', { count: total })}
        className="flex h-28 items-end gap-[3px]"
      >
        {bars.map((bar) => (
          <div
            key={bar.day}
            title={`${bar.day}: ${bar.total}`}
            className="flex h-full flex-1 flex-col justify-end gap-[2px]"
          >
            {/* Von reif (unten) nach neu (oben) stapeln: Der beständige Teil
                bildet das Fundament, neues Material wächst oben darauf. */}
            {[...MATURITY_ORDER].reverse().map((key) => {
              const value = bar.byMaturity[key]
              if (value === 0) return null
              return (
                <span
                  key={key}
                  className="block w-full rounded-[2px]"
                  style={{
                    height: `${(value / max) * 100}%`,
                    background: MATURITY_COLOR[key],
                    minHeight: 2,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{shortDay(bars[0]?.day)}</span>
        <span>{t('education.flashcards.stats.today')}</span>
      </div>
      <Legend
        items={MATURITY_ORDER.map((key) => ({
          label: t(`education.flashcards.stats.maturity.${key}`),
          color: MATURITY_COLOR[key],
        }))}
      />
    </div>
  )
}

/** Fälligkeits-Prognose: eine Reihe, deshalb ohne Legende. */
export function ForecastBars({ forecast, days }: { forecast: Forecast; days: number }) {
  const { t } = useTranslation()
  const bars = forecast.perDay.slice(0, days)
  const sum = bars.reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={t('education.flashcards.stats.forecastSummary', { count: sum, days })}
        className="flex h-24 items-end gap-[2px]"
      >
        {bars.map((count, i) => (
          <div
            key={i}
            title={t('education.flashcards.stats.forecastDay', { day: i, count })}
            className="flex h-full flex-1 items-end"
          >
            <span
              className="block w-full rounded-t-[3px]"
              style={{
                height: count > 0 ? `${(count / forecast.max) * 100}%` : 2,
                background: count > 0 ? 'var(--chart-2)' : 'var(--color-surface-2)',
                minHeight: 2,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted">
        <span>{t('education.flashcards.stats.today')}</span>
        <span>{t('education.flashcards.stats.inDays', { count: days })}</span>
      </div>
    </div>
  )
}

/** Verteilung der Kartenzustände als ein gestapelter Balken. */
export function StatusBar({ counts }: { counts: StatusCounts }) {
  const { t } = useTranslation()
  const segments = [
    ...MATURITY_ORDER.map((key) => ({
      key,
      label: t(`education.flashcards.stats.maturity.${key}`),
      value: counts[key],
      color: MATURITY_COLOR[key],
    })),
    {
      key: 'suspended' as const,
      label: t('education.flashcards.stats.suspended'),
      value: counts.suspended,
      color: 'var(--color-surface-2)',
    },
  ].filter((s) => s.value > 0)

  const total = Math.max(counts.total, 1)

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={t('education.flashcards.stats.statusSummary', {
          mature: counts.mature,
          total: counts.total,
        })}
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
      >
        {segments.map((s) => (
          <span
            key={s.key}
            title={`${s.label}: ${s.value}`}
            className="block h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <Legend items={segments.map((s) => ({ label: `${s.label} ${s.value}`, color: s.color }))} />
    </div>
  )
}

/** Legende – Farbe plus Text, damit Identität nie allein an der Farbe hängt. */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item, i) => (
        <li key={i} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
          <span
            aria-hidden
            className="block h-2.5 w-2.5 shrink-0 rounded-[2px]"
            style={{ background: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Tag ohne Jahr, z. B. „16.02." – nur als Achsenbeschriftung. */
function shortDay(day?: string): string {
  if (!day) return ''
  const [, month, date] = day.split('-')
  return `${date}.${month}.`
}
