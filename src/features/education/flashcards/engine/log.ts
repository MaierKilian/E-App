// Ereignis-Log: Erzeugen, Zusammenführen, Aufteilen (Phase 0).
//
// Zwei Eigenschaften machen die geräteübergreifende Synchronisation später
// unspektakulär – und die sind hier verankert:
//
//  1. Einträge sind UNVERÄNDERLICH und tragen eine stabile ID. Zwei Geräte
//     zusammenführen ist damit eine Vereinigungsmenge, kein „letzter gewinnt".
//     Ein doppelt übertragener Eintrag ist harmlos.
//  2. Einträge werden in MONATSPAKETE aufgeteilt. Firestore-Dokumente sind auf
//     1 MB begrenzt; ein Monatspaket bleibt selbst bei intensivem Lernen weit
//     darunter, und alte Monate werden nie wieder geschrieben.

import type {
  ActionEntry,
  CardAction,
  Grade,
  LogEntry,
  ReviewEntry,
  Scale,
  SchedulerId,
  StudyMode,
} from './types'

/** Stabile ID eines Eintrags. */
export function makeEntryId(cardId: string, ts: number): string {
  return `${cardId}:${ts}`
}

/** Monatspaket eines Zeitstempels (`YYYY-MM`, UTC – zeitzonenunabhängig). */
export function chunkKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Einträge nach Monatspaket gruppieren – so werden sie gespeichert. */
export function groupByChunk(entries: LogEntry[]): Record<string, LogEntry[]> {
  const out: Record<string, LogEntry[]> = {}
  for (const entry of entries) {
    ;(out[chunkKey(entry.ts)] ??= []).push(entry)
  }
  for (const key of Object.keys(out)) out[key].sort(byTimeThenId)
  return out
}

/**
 * Führt beliebig viele Log-Quellen zusammen: doppelte IDs fallen weg, das
 * Ergebnis ist nach Zeit sortiert.
 *
 * Die Operation ist idempotent (`merge(a, a) === a`) und kommutativ
 * (`merge(a, b) === merge(b, a)`) – genau deshalb kann jedes Gerät blind seinen
 * Stand hochladen und den fremden Stand einmischen.
 */
export function mergeEntries(...sources: LogEntry[][]): LogEntry[] {
  const byId = new Map<string, LogEntry>()
  for (const list of sources) {
    for (const entry of list) {
      if (!byId.has(entry.id)) byId.set(entry.id, entry)
    }
  }
  return [...byId.values()].sort(byTimeThenId)
}

/** Sortierung des Logs: nach Zeit, bei Gleichstand nach ID. */
export function byTimeThenId(a: LogEntry, b: LogEntry): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

/** Eingabe für eine neue Bewertung – alles, was die Session weiß. */
export interface ReviewInput {
  cardId: string
  grade: Grade
  scale: Scale
  mode: StudyMode
  algo: SchedulerId
  msToFlip: number
  msToGrade: number
  elapsedDays: number
  scheduledDays: number
  /** Zeitpunkt der Bewertung (Standard: jetzt). */
  ts?: number
}

/**
 * Erzeugt einen Bewertungs-Eintrag. `taken` verhindert den theoretischen Fall
 * zweier Bewertungen derselben Karte in derselben Millisekunde: Der Zeitstempel
 * wird dann um 1 ms verschoben, damit die ID eindeutig bleibt.
 */
export function createReview(input: ReviewInput, taken?: Set<string>): ReviewEntry {
  const ts = freeTs(input.cardId, input.ts ?? Date.now(), taken)
  return {
    kind: 'review',
    id: makeEntryId(input.cardId, ts),
    cardId: input.cardId,
    ts,
    grade: input.grade,
    scale: input.scale,
    mode: input.mode,
    algo: input.algo,
    msToFlip: Math.max(0, Math.round(input.msToFlip)),
    msToGrade: Math.max(0, Math.round(input.msToGrade)),
    elapsedDays: Math.max(0, input.elapsedDays),
    scheduledDays: Math.max(0, input.scheduledDays),
  }
}

/** Erzeugt einen Aktions-Eintrag (aussetzen, vertagen, zurücksetzen). */
export function createAction(
  cardId: string,
  action: CardAction,
  ts = Date.now(),
  taken?: Set<string>,
): ActionEntry {
  const stamp = freeTs(cardId, ts, taken)
  return { kind: 'action', id: makeEntryId(cardId, stamp), cardId, ts: stamp, action }
}

function freeTs(cardId: string, ts: number, taken?: Set<string>): number {
  if (!taken) return ts
  let candidate = ts
  while (taken.has(makeEntryId(cardId, candidate))) candidate++
  return candidate
}

/** Alle im Log vergebenen IDs – Eingabe für `createReview`/`createAction`. */
export function idsOf(entries: LogEntry[]): Set<string> {
  return new Set(entries.map((e) => e.id))
}
