// Tages-Aggregate über das Ereignis-Log (Phase 0).
//
// Die Statistik-Seiten (Phase 3/6) dürfen nicht bei jedem Öffnen zehntausende
// Einträge durchrechnen. Deshalb werden Bewertungen einmal je Lerntag
// zusammengefasst; Heatmap, Balken pro Tag, Streak und Tagesziel lesen nur noch
// diese Aggregate.
//
// Bewusst enthalten sind AUCH die Bewertungen aus dem Klausur-Sprint: Für den
// Zeitplan sind sie ohne Wirkung, für „was habe ich getan" sind sie es nicht.
// Sie werden getrennt ausgewiesen (`cram`), damit beide Fragen beantwortbar
// bleiben.

import type { LogEntry } from './types'
import { isCorrect, isPassed } from './types'
import { DAY_MS, dayKey, dayStart } from './time'

/** Kennzahlen eines Lerntags. */
export interface DayRollup {
  /** Lerntag als `YYYY-MM-DD`. */
  day: string
  /** Alle abgegebenen Bewertungen. */
  reviews: number
  /** Bewertungen >= „Fast" (Behaltensquote). */
  passed: number
  /** Bewertungen >= „Gewusst" (strenge Trefferquote). */
  correct: number
  /** Bewertungen „Nochmal". */
  again: number
  /** Karten, die an diesem Tag erstmals bewertet wurden. */
  newCards: number
  /** Bewertungen im Klausur-Sprint (in `reviews` enthalten). */
  cram: number
  /** Aufgewendete Lernzeit in ms (Umdrehen + Bewerten). */
  msTotal: number
}

function emptyRollup(day: string): DayRollup {
  return {
    day,
    reviews: 0,
    passed: 0,
    correct: 0,
    again: 0,
    newCards: 0,
    cram: 0,
    msTotal: 0,
  }
}

/**
 * Fasst alle Bewertungen je Lerntag zusammen. Aktionen (aussetzen, vertagen)
 * bleiben unberücksichtigt – sie sind keine Lernleistung.
 */
export function dailyRollups(entries: LogEntry[], cutoffHour: number): Record<string, DayRollup> {
  const out: Record<string, DayRollup> = {}
  const seen = new Set<string>()

  for (const entry of [...entries].sort((a, b) => a.ts - b.ts)) {
    if (entry.kind !== 'review') continue
    const day = dayKey(entry.ts, cutoffHour)
    const r = (out[day] ??= emptyRollup(day))

    r.reviews++
    if (isPassed(entry.grade)) r.passed++
    if (isCorrect(entry.grade)) r.correct++
    if (entry.grade === 1) r.again++
    if (entry.mode === 'cram') r.cram++
    r.msTotal += Math.max(0, entry.msToFlip) + Math.max(0, entry.msToGrade)

    if (!seen.has(entry.cardId)) {
      seen.add(entry.cardId)
      r.newCards++
    }
  }

  return out
}

/** Serie aufeinanderfolgender Lerntage. */
export interface StreakInfo {
  current: number
  longest: number
}

/**
 * Aktuelle und längste Lernserie.
 *
 * Der heutige Tag zählt nicht gegen die Serie, solange er noch läuft: Wer
 * gestern gelernt hat und heute noch nicht, hat weiterhin eine Serie – sie
 * reißt erst, wenn der Tag ohne Bewertung endet.
 */
export function streakInfo(
  rollups: Record<string, DayRollup>,
  now: number,
  cutoffHour: number,
): StreakInfo {
  const active = (ts: number) => (rollups[dayKey(ts, cutoffHour)]?.reviews ?? 0) > 0

  let cursor = dayStart(now, cutoffHour)
  if (!active(cursor)) cursor -= DAY_MS // heute noch nichts: bei gestern beginnen

  let current = 0
  while (active(cursor)) {
    current++
    cursor -= DAY_MS
  }

  const days = Object.keys(rollups)
    .filter((d) => (rollups[d]?.reviews ?? 0) > 0)
    .sort()

  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const day of days) {
    run = prev && isNextDay(prev, day) ? run + 1 : 1
    longest = Math.max(longest, run)
    prev = day
  }

  return { current, longest: Math.max(longest, current) }
}

/** Folgt `day` unmittelbar auf `prev`? (Vergleich über die Kalenderdaten.) */
function isNextDay(prev: string, day: string): boolean {
  const a = Date.parse(`${prev}T00:00:00Z`)
  const b = Date.parse(`${day}T00:00:00Z`)
  return b - a === DAY_MS
}

/** Summiert Aggregate über einen Zeitraum (z. B. „letzte 30 Tage"). */
export function sumRollups(rollups: DayRollup[]): Omit<DayRollup, 'day'> {
  return rollups.reduce(
    (acc, r) => ({
      reviews: acc.reviews + r.reviews,
      passed: acc.passed + r.passed,
      correct: acc.correct + r.correct,
      again: acc.again + r.again,
      newCards: acc.newCards + r.newCards,
      cram: acc.cram + r.cram,
      msTotal: acc.msTotal + r.msTotal,
    }),
    { reviews: 0, passed: 0, correct: 0, again: 0, newCards: 0, cram: 0, msTotal: 0 },
  )
}
