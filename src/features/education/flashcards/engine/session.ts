// Ablauf einer Lernsession als reiner Reducer (Phase 1).
//
// Die Oberfläche hält keinen eigenen Ablaufzustand: Sie zeigt an, was hier
// steht, und ruft `flip`, `gradeCurrent`, `undoLast` auf. Dadurch ist der
// gesamte Ablauf ohne Browser testbar – und er lässt sich vollständig
// serialisieren, was den Wiedereinstieg nach Anruf, Reload oder leerem Akku
// ermöglicht (Studierende lernen mobil, das ist der Normalfall).
//
// Umgang mit dem Log: Bewertungen wandern nicht sofort ins Ereignis-Log, sondern
// bleiben genau EINE Bewertung lang in der Session liegen. Das ist der
// „Rückgängig"-Puffer. Mit der nächsten Bewertung wird die vorherige endgültig
// geschrieben. So ist höchstens die allerletzte Bewertung flüchtig, und
// „Rückgängig" braucht keine Gegen-Einträge in einem unveränderlichen Log.

import type { Grade, LogEntry, ReviewEntry, StudyMode } from './types'
import type { SchedulerParams } from './params'
import { applyGrade } from './scheduler'
import { createAction, createReview } from './log'
import { elapsedDaysSince } from './core'
import type { QueueItem } from './queue'

/** Session-Art. „browse" hat keinen Ablauf und läuft nicht über diesen Reducer. */
export type SessionMode = Extract<StudyMode, 'study' | 'cram'>

/** Eine Karte im Sitzungsstapel. */
export type SessionCard = QueueItem

/** Gepufferte, noch nicht geschriebene Bewertung – der „Rückgängig"-Puffer. */
export interface PendingRating {
  entry: ReviewEntry
  /** Sitzung unmittelbar vor dieser Bewertung. */
  before: SessionState
}

export interface SessionState {
  mode: SessionMode
  /** Verbleibende Karten; Index 0 ist die aktuelle. */
  queue: SessionCard[]
  /** Karten zu Sitzungsbeginn – Bezugsgröße der Fortschrittsleiste. */
  total: number
  flipped: boolean
  /** Wann die aktuelle Karte erschienen ist (für die Zeitmessung). */
  shownAt: number
  /** Wann sie umgedreht wurde (null, solange verdeckt). */
  flippedAt: number | null
  /** Abgegebene Bewertungen, inklusive Wiederholungen innerhalb der Sitzung. */
  graded: number
  /** Verteilung der Noten – Grundlage des Abschluss-Screens. */
  counts: Record<Grade, number>
  startedAt: number
  finishedAt: number | null
  pending: PendingRating | null
}

/**
 * Ergebnis einer Aktion: neue Sitzung plus die Einträge, die jetzt endgültig ins
 * Ereignis-Log gehören. Den Kartenzustand leitet der Aufrufer aus diesen
 * Einträgen ab (`derive.ts`) – bewusst nicht hier noch einmal berechnet, damit
 * es nur eine Stelle gibt, die aus Ereignissen Zustand macht.
 */
export interface SessionResult {
  session: SessionState
  flushed: LogEntry[]
}

/** Startet eine Sitzung mit der gebauten Warteschlange. */
export function startSession(items: QueueItem[], mode: SessionMode, now: number): SessionState {
  return {
    mode,
    queue: [...items],
    total: items.length,
    flipped: false,
    shownAt: now,
    flippedAt: null,
    graded: 0,
    counts: { 1: 0, 2: 0, 3: 0, 4: 0 },
    startedAt: now,
    finishedAt: null,
    pending: null,
  }
}

/** Aktuelle Karte oder null, wenn die Sitzung durch ist. */
export function currentCard(session: SessionState): SessionCard | null {
  return session.queue[0] ?? null
}

/** Erledigte Karten (nicht Bewertungen – Wiederholungen zählen nicht doppelt). */
export function doneCount(session: SessionState): number {
  return session.total - session.queue.length
}

/** Ist die Sitzung abgeschlossen? */
export function isFinished(session: SessionState): boolean {
  return session.queue.length === 0
}

/** Karte umdrehen. Mehrfaches Umdrehen ändert die Zeitmessung nicht. */
export function flip(session: SessionState, now: number): SessionState {
  if (session.flipped) return { ...session, flipped: false }
  return { ...session, flipped: true, flippedAt: session.flippedAt ?? now }
}

/** Lässt sich die letzte Bewertung noch zurücknehmen? */
export function canUndo(session: SessionState): boolean {
  return session.pending !== null
}

/**
 * Bewertet die aktuelle Karte.
 *
 * Karten, die im Minutenbereich bleiben (alles unter einem Tag – „Nochmal" und
 * die Lernschritte), kehren innerhalb derselben Sitzung zurück, und zwar nach
 * `reinsertAfterCards` weiteren Karten. Genau das ist das „wieder anzeigen", das
 * ein Trainer leisten muss.
 */
export function gradeCurrent(
  session: SessionState,
  grade: Grade,
  now: number,
  params: SchedulerParams,
  takenIds?: Set<string>,
): SessionResult {
  const card = currentCard(session)
  if (!card || session.finishedAt) return { session, flushed: [] }

  const cram = session.mode === 'cram'
  const mode: StudyMode = cram ? 'cram' : card.source === 'relearning' ? 'relearn' : 'study'

  const elapsedDays = elapsedDaysSince(card.state, now)
  const entry = createReview(
    {
      cardId: card.card.cardId,
      grade,
      scale: params.scale,
      mode,
      algo: params.algorithm,
      msToFlip: (session.flippedAt ?? now) - session.shownAt,
      msToGrade: now - (session.flippedAt ?? session.shownAt),
      elapsedDays,
      scheduledDays: card.state.intervalDays,
      ts: now,
    },
    takenIds,
  )

  // Im Klausur-Sprint bleibt der Zeitplan unangetastet – die Karte behält ihren
  // Zustand, die Bewertung zählt nur für die Statistik.
  const nextState = cram
    ? card.state
    : applyGrade(params, card.state, grade, now, elapsedDays)

  // Zurück in dieselbe Sitzung, solange die Karte im Minutenbereich bleibt.
  const repeatsInSession = cram ? grade === 1 : nextState.intervalDays < 1
  const rest = session.queue.slice(1)
  const queue = repeatsInSession
    ? insertAt(rest, { ...card, state: nextState, source: 'relearning' }, params.reinsertAfterCards)
    : rest

  const before: SessionState = { ...session, pending: null }
  const next: SessionState = {
    ...session,
    queue,
    flipped: false,
    shownAt: now,
    flippedAt: null,
    graded: session.graded + 1,
    counts: { ...session.counts, [grade]: session.counts[grade] + 1 },
    finishedAt: queue.length === 0 ? now : null,
    pending: { entry, before },
  }

  // Die zuvor gepufferte Bewertung ist jetzt endgültig.
  const previous = session.pending
  return { session: next, flushed: previous ? [previous.entry] : [] }
}

/**
 * Nimmt die letzte Bewertung zurück. Möglich, solange sie noch im Puffer liegt –
 * also unmittelbar danach. Fehltipper sind auf dem Handy häufig und würden sonst
 * dauerhaft in Zeitplan und Statistik stehen.
 */
export function undoLast(session: SessionState): SessionState {
  if (!session.pending) return session
  return session.pending.before
}

/** Setzt die aktuelle Karte aus – sie kommt bis auf Widerruf nicht mehr. */
export function suspendCurrent(session: SessionState, now: number): SessionResult {
  return removeCurrent(session, 'suspend', now)
}

/** Vertagt die aktuelle Karte auf den nächsten Lerntag. */
export function buryCurrent(session: SessionState, now: number): SessionResult {
  return removeCurrent(session, 'bury', now)
}

/**
 * Beendet die Sitzung und schreibt die gepufferte Bewertung endgültig.
 * Danach ist „Rückgängig" nicht mehr möglich.
 */
export function finishSession(session: SessionState, now: number): SessionResult {
  const flushed = session.pending ? [session.pending.entry] : []
  return {
    session: { ...session, pending: null, finishedAt: session.finishedAt ?? now },
    flushed,
  }
}

/** Kennzahlen für den Abschluss-Screen. */
export interface SessionSummary {
  cards: number
  ratings: number
  passed: number
  correct: number
  again: number
  /** Anteil erinnerter Karten (Note >= 2) an allen Bewertungen. */
  retention: number
  durationMs: number
  /** Karten, die noch heute erneut fällig werden. */
  dueAgainToday: number
}

export function sessionSummary(session: SessionState, now: number): SessionSummary {
  const { counts } = session
  const ratings = counts[1] + counts[2] + counts[3] + counts[4]
  const passed = counts[2] + counts[3] + counts[4]
  return {
    cards: doneCount(session),
    ratings,
    passed,
    correct: counts[3] + counts[4],
    again: counts[1],
    retention: ratings > 0 ? passed / ratings : 0,
    durationMs: (session.finishedAt ?? now) - session.startedAt,
    dueAgainToday: session.queue.length,
  }
}

/** Gemeinsamer Weg für „aussetzen" und „vertagen". */
function removeCurrent(
  session: SessionState,
  action: 'suspend' | 'bury',
  now: number,
): SessionResult {
  const card = currentCard(session)
  if (!card) return { session, flushed: [] }

  const entry = createAction(card.card.cardId, action, now)
  const queue = session.queue.filter((item) => item.card.cardId !== card.card.cardId)
  const flushed: LogEntry[] = session.pending ? [session.pending.entry, entry] : [entry]

  return {
    session: {
      ...session,
      queue,
      flipped: false,
      shownAt: now,
      flippedAt: null,
      finishedAt: queue.length === 0 ? now : null,
      // Aussetzen beendet den Rückgängig-Puffer: Die vorherige Bewertung ist
      // geschrieben, und die ausgesetzte Karte gibt es in dieser Sitzung nicht mehr.
      pending: null,
    },
    flushed,
  }
}

/** Fügt eine Karte nach `after` weiteren Karten wieder ein. */
function insertAt(queue: SessionCard[], card: SessionCard, after: number): SessionCard[] {
  const index = Math.min(Math.max(0, after), queue.length)
  return [...queue.slice(0, index), card, ...queue.slice(index)]
}
