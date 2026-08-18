import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { useFlashcardStore } from '@/store/flashcardStore'
import { DayBars, ForecastBars, Heatmap, StatusBar } from './StatsCharts'
import { allCards } from './cardIndex'
import { dayBars, dueForecast, heatmapCells, periodStats, statusDistribution } from './engine/stats'
import { useFlashcardsReady, useNow, useStreak } from './useFlashcards'

/** Auswertbare Zeiträume für die Kennzahlen. */
const PERIODS = [7, 30, 90] as const
type Period = (typeof PERIODS)[number]

/**
 * Lern-Statistik (Phase 3).
 *
 * Reihenfolge nach Fragen, nicht nach Datenverfügbarkeit:
 *  1. Wie läuft es? (Quoten und Aufwand im gewählten Zeitraum)
 *  2. Wann habe ich gelernt? (Heatmap, Serie)
 *  3. Was habe ich gelernt? (Balken je Tag nach Reifegrad)
 *  4. Was kommt? (Fälligkeits-Prognose)
 *  5. Wie steht der Bestand? (Verteilung, Problemkarten)
 */
export function StatsView() {
  const { t } = useTranslation()
  const ready = useFlashcardsReady()
  const now = useNow()
  const [period, setPeriod] = useState<Period>(30)

  const params = useFlashcardStore((s) => s.params)
  const states = useFlashcardStore((s) => s.states)
  const rollups = useFlashcardStore((s) => s.rollups)
  const cutoff = params.dayCutoffHour

  const cards = useMemo(() => allCards(), [])
  const streak = useStreak(now)

  const stats = periodStats(rollups, now, cutoff, period)
  const cells = heatmapCells(rollups, now, cutoff, 12)
  const bars = dayBars(rollups, now, cutoff, 14)
  const forecast = dueForecast(cards, states, now, cutoff, 30)
  const distribution = statusDistribution(cards, states)

  const empty = ready && stats.reviews === 0 && distribution.new === distribution.total

  return (
    <div className="space-y-6">
      <Link
        to="/lernen"
        className="focus-ring flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('education.flashcards.todayTitle')}
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{t('education.flashcards.stats.title')}</h1>
        <p className="mt-1 text-sm text-muted">{t('education.flashcards.stats.subtitle')}</p>
      </div>

      {!ready ? (
        <p className="text-sm text-muted">{t('education.flashcards.loading')}</p>
      ) : empty ? (
        <Card>
          <p className="text-sm text-muted">{t('education.flashcards.stats.empty')}</p>
        </Card>
      ) : (
        <>
          {/* 1. Wie läuft es? */}
          <section className="space-y-3">
            <div className="flex gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  aria-pressed={p === period}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    p === period ? 'bg-primary/15 text-primary' : 'text-muted hover:text-foreground'
                  }`}
                >
                  {t('education.flashcards.stats.lastDays', { count: p })}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Stat
                label={t('education.flashcards.stats.retention')}
                value={`${Math.round(stats.retention * 100)} %`}
                hint={t('education.flashcards.stats.retentionHint')}
              />
              <Stat
                label={t('education.flashcards.stats.accuracy')}
                value={`${Math.round(stats.accuracy * 100)} %`}
                hint={t('education.flashcards.stats.accuracyHint')}
              />
              <Stat
                label={t('education.flashcards.stats.reviews')}
                value={String(stats.reviews)}
                hint={t('education.flashcards.stats.activeDays', { count: stats.activeDays })}
              />
              <Stat
                label={t('education.flashcards.stats.time')}
                value={
                  // Unter einer Minute in Sekunden – „0 Min." sieht aus wie ein Fehler.
                  stats.minutes >= 1
                    ? t('education.flashcards.stats.minutes', { count: stats.minutes })
                    : t('education.flashcards.stats.seconds', {
                        count: Math.round(stats.reviews * stats.secondsPerReview),
                      })
                }
                hint={t('education.flashcards.stats.perCard', {
                  seconds: stats.secondsPerReview.toFixed(1),
                })}
              />
            </div>
          </section>

          {/* 2. Wann habe ich gelernt? */}
          <Section
            title={t('education.flashcards.stats.heatmapTitle')}
            note={`${t('education.flashcards.streak', { count: streak.current })} · ${t(
              'education.flashcards.stats.longestStreak',
              { count: streak.longest },
            )}`}
          >
            <Heatmap cells={cells} />
          </Section>

          {/* 3. Was habe ich gelernt? */}
          <Section
            title={t('education.flashcards.stats.dayBarsTitle')}
            note={t('education.flashcards.stats.dayBarsNote')}
          >
            <DayBars bars={bars} />
          </Section>

          {/* 4. Was kommt? */}
          <Section
            title={t('education.flashcards.stats.forecastTitle')}
            note={
              forecast.overdue > 0
                ? t('education.flashcards.stats.overdue', { count: forecast.overdue })
                : t('education.flashcards.stats.forecastNote')
            }
          >
            <ForecastBars forecast={forecast} days={30} />
          </Section>

          {/* 5. Wie steht der Bestand? */}
          <Section
            title={t('education.flashcards.stats.statusTitle')}
            note={t('education.flashcards.stats.statusNote', { total: distribution.total })}
          >
            <StatusBar counts={distribution} />
            {distribution.leech > 0 && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <TriangleAlert className="h-3.5 w-3.5" />
                {t('education.flashcards.stats.leech', { count: distribution.leech })}
              </p>
            )}
          </Section>
        </>
      )}
    </div>
  )
}

/** Abschnitt mit Titel, kurzer Erklärung und Diagramm. */
function Section({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="px-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      </div>
      <Card>{children}</Card>
    </section>
  )
}

/** Kennzahl-Kachel. Zahlen tragen Textfarben, keine Diagrammfarbe. */
function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="space-y-0.5">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </Card>
  )
}
