// Auswertungen für die Statistik-Seite (Phase 3).
//
// Alles hier ist eine reine Funktion über die Tages-Aggregate bzw. den
// Kartenzustand – keine Uhr, kein Zufall, kein Speicher. Die Oberfläche bekommt
// fertige Zahlen und muss selbst nichts rechnen.
//
// Zwei Quellen, klar getrennt:
//   Tages-Aggregate → was WAR (Heatmap, Balken je Tag, Quoten)
//   Kartenzustand   → was KOMMT (Fälligkeits-Prognose, Verteilung)

import type { CardState } from './types'
import type { QueueCard } from './queue'
import type { DayRollup, MaturityCounts } from './rollups'
import { sumRollups } from './rollups'
import { DAY_MS, dayKey, dayStart, nextDayStart } from './time'

/** Ein Tag in der Heatmap. */
export interface HeatCell {
  day: string
  /** Bewertungen an diesem Lerntag. */
  count: number
  /** Intensitätsstufe 0–4 (0 = nichts gelernt). */
  level: 0 | 1 | 2 | 3 | 4
  /** Wochentag, Montag = 0 – die Zeile im Raster. */
  weekday: number
  /** Spalte im Raster (0 = älteste Woche). */
  week: number
}

/**
 * Kalender-Heatmap der letzten `weeks` Wochen, endend am heutigen Lerntag.
 *
 * Die Stufen sind Viertel des in diesem Zeitraum stärksten Tages, nicht feste
 * Schwellen: Wer 20 Karten am Tag macht, soll dieselbe Abstufung sehen wie
 * jemand mit 200.
 */
export function heatmapCells(
  rollups: Record<string, DayRollup>,
  now: number,
  cutoffHour: number,
  weeks = 12,
): HeatCell[] {
  // Am Ende der Woche des heutigen Tages ausrichten (Montag als Wochenstart).
  const today = dayStart(now, cutoffHour)
  const weekdayToday = mondayIndex(new Date(today).getDay())
  const lastColumnStart = today - weekdayToday * DAY_MS
  const firstDay = lastColumnStart - (weeks - 1) * 7 * DAY_MS

  const cells: HeatCell[] = []
  let max = 0
  let cursor = firstDay
  for (let i = 0; i < weeks * 7; i++) {
    const day = dayKey(cursor, cutoffHour)
    const count = rollups[day]?.reviews ?? 0
    if (cursor <= today) max = Math.max(max, count)
    cells.push({
      day,
      count: cursor <= today ? count : 0,
      level: 0,
      weekday: mondayIndex(new Date(cursor).getDay()),
      week: Math.floor(i / 7),
    })
    cursor = nextDayStart(cursor, cutoffHour)
  }

  return cells.map((cell) => ({ ...cell, level: levelOf(cell.count, max) }))
}

function levelOf(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0 || max <= 0) return 0
  const share = count / max
  if (share <= 0.25) return 1
  if (share <= 0.5) return 2
  if (share <= 0.75) return 3
  return 4
}

/** Montag = 0 … Sonntag = 6 (JS liefert Sonntag = 0). */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7
}

/** Ein Balken der Tagesübersicht. */
export interface DayBar {
  day: string
  total: number
  byMaturity: MaturityCounts
}

/** Bewertungen der letzten `days` Lerntage, aufgeschlüsselt nach Reifegrad. */
export function dayBars(
  rollups: Record<string, DayRollup>,
  now: number,
  cutoffHour: number,
  days = 14,
): DayBar[] {
  const out: DayBar[] = []
  let cursor = dayStart(now, cutoffHour) - (days - 1) * DAY_MS
  for (let i = 0; i < days; i++) {
    const day = dayKey(cursor, cutoffHour)
    const rollup = rollups[day]
    out.push({
      day,
      total: rollup?.reviews ?? 0,
      byMaturity: rollup?.byMaturity ?? { new: 0, learning: 0, young: 0, mature: 0 },
    })
    cursor = nextDayStart(cursor, cutoffHour)
  }
  return out
}

/** Fälligkeits-Prognose. */
export interface Forecast {
  /** Karten je Tag, Index 0 = heute. */
  perDay: number[]
  /** Bereits jetzt fällige Karten (Rückstand) – nicht in `perDay` enthalten. */
  overdue: number
  /** Höchster Tageswert – Bezugsgröße der Balken. */
  max: number
}

/**
 * Wie viele Karten in den nächsten Tagen fällig werden.
 *
 * Zeigt Lastspitzen, bevor sie eintreten: Wer vor der Klausur an drei Tagen 90
 * Karten vor sich hat, kann den Intervall-Faktor rechtzeitig anpassen. Neue,
 * noch nie bewertete Karten sind nicht enthalten – sie haben keinen Termin.
 */
export function dueForecast(
  cards: QueueCard[],
  states: Record<string, CardState>,
  now: number,
  cutoffHour: number,
  days = 30,
): Forecast {
  const perDay = new Array<number>(days).fill(0)
  const todayStart = dayStart(now, cutoffHour)
  let overdue = 0

  for (const card of cards) {
    const state = states[card.cardId]
    if (!state || state.status === 'suspended' || state.reps === 0) continue
    if (state.due <= now) {
      overdue++
      continue
    }
    const offset = Math.floor((dayStart(state.due, cutoffHour) - todayStart) / DAY_MS)
    if (offset >= 0 && offset < days) perDay[offset]++
  }

  return { perDay, overdue, max: Math.max(...perDay, overdue, 1) }
}

/** Verteilung der Kartenzustände. */
export interface StatusCounts {
  new: number
  learning: number
  young: number
  mature: number
  suspended: number
  /** Problemkarten – in den übrigen Zahlen enthalten, separat ausgewiesen. */
  leech: number
  total: number
}

/**
 * Wie reif der Bestand ist. „learning" fasst Lernschritte und Rückfälle
 * zusammen: Für den Lernenden ist beides dasselbe – Karten, die noch nicht
 * sitzen.
 */
export function statusDistribution(
  cards: QueueCard[],
  states: Record<string, CardState>,
): StatusCounts {
  const out: StatusCounts = {
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
    suspended: 0,
    leech: 0,
    total: cards.length,
  }

  for (const card of cards) {
    const state = states[card.cardId]
    if (!state || state.reps === 0) {
      if (state?.status === 'suspended') out.suspended++
      else out.new++
      continue
    }
    if (state.leech) out.leech++
    switch (state.status) {
      case 'suspended':
        out.suspended++
        break
      case 'mature':
        out.mature++
        break
      case 'young':
        out.young++
        break
      default:
        out.learning++
    }
  }

  return out
}

/** Kennzahlen eines Zeitraums. */
export interface PeriodStats {
  reviews: number
  /** Anteil Bewertungen >= „Fast". */
  retention: number
  /** Anteil Bewertungen >= „Gewusst". */
  accuracy: number
  again: number
  newCards: number
  minutes: number
  /** Tage mit mindestens einer Bewertung. */
  activeDays: number
  /** Ø Sekunden je Bewertung. */
  secondsPerReview: number
}

/** Kennzahlen der letzten `days` Lerntage (einschließlich heute). */
export function periodStats(
  rollups: Record<string, DayRollup>,
  now: number,
  cutoffHour: number,
  days = 30,
): PeriodStats {
  const selected: DayRollup[] = []
  let cursor = dayStart(now, cutoffHour) - (days - 1) * DAY_MS
  for (let i = 0; i < days; i++) {
    const rollup = rollups[dayKey(cursor, cutoffHour)]
    if (rollup) selected.push(rollup)
    cursor = nextDayStart(cursor, cutoffHour)
  }

  const sum = sumRollups(selected)
  return {
    reviews: sum.reviews,
    retention: sum.reviews > 0 ? sum.passed / sum.reviews : 0,
    accuracy: sum.reviews > 0 ? sum.correct / sum.reviews : 0,
    again: sum.again,
    newCards: sum.newCards,
    minutes: Math.round(sum.msTotal / 60_000),
    activeDays: selected.filter((r) => r.reviews > 0).length,
    secondsPerReview: sum.reviews > 0 ? sum.msTotal / sum.reviews / 1000 : 0,
  }
}
