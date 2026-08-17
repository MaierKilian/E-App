// Bau der Lern-Warteschlange (Phase 1).
//
// Beantwortet die Frage „welche Karten heute, in welcher Reihenfolge?" – rein
// rechnerisch, ohne React und ohne Zufall aus der Umgebung. Zwei gleiche
// Eingaben ergeben dieselbe Warteschlange; das macht sie testbar und erlaubt
// später den Einstellungs-Simulator.
//
// Wichtig ist die Trennung der drei Töpfe:
//   Relearning – vergessene Karten, haben immer Vorrang
//   Wiederholungen – fällige, bereits gelernte Karten (Tageslimit)
//   Neue Karten – noch nie bewertet (eigenes, kleineres Tageslimit)
//
// Die Limits gelten pro LERNTAG, nicht pro Session: Wer morgens 20 Karten macht,
// bekommt mittags nicht noch einmal 20 neue.

import type { CardState } from './types'
import { newCardState } from './types'
import type { SchedulerParams } from './params'
import { isUnlimitedReviews } from './params'
import { dayKey } from './time'

/** Eine Karte, wie die Warteschlange sie sieht – Inhalt bleibt außen vor. */
export interface QueueCard {
  cardId: string
  /** Für die Verschachtelung über Fächer und für Fach-Filter. */
  subjectId: string
  setId: string
}

/** Woher eine Karte in der Warteschlange stammt. */
export type QueueSource = 'relearning' | 'review' | 'new'

export interface QueueItem {
  card: QueueCard
  state: CardState
  source: QueueSource
}

export interface BuildQueueInput {
  /** Alle in Frage kommenden Karten (bereits auf Fach/Set gefiltert). */
  cards: QueueCard[]
  /** Abgeleiteter Zustand je Karte; fehlende Karten gelten als neu. */
  states: Record<string, CardState>
  params: SchedulerParams
  now: number
  /** Bereits heute erledigt – begrenzt die Tagesmenge sessionübergreifend. */
  doneToday?: { reviews: number; newCards: number }
  /**
   * Klausur-Sprint: alle Karten, unabhängig von Fälligkeit und Limits. Die
   * Bewertungen werden später als `cram` protokolliert und wirken nicht auf den
   * Zeitplan.
   */
  cram?: boolean
  /** Nur Problemkarten und schwache Karten („Nur schwierige Karten"). */
  hardOnly?: boolean
}

/** Wie viele Karten heute noch offen sind – für die „Heute"-Ansicht. */
export interface DueCounts {
  relearning: number
  review: number
  new: number
  /** Summe der drei Töpfe nach Anwendung der Tageslimits. */
  total: number
  /** Fällige Wiederholungen ohne Tageslimit – zeigt aufgestauten Rückstand. */
  backlog: number
}

/** Ist die Karte jetzt fällig? Neue Karten sind nie „fällig", sie sind neu. */
function isDue(state: CardState, now: number): boolean {
  return state.status !== 'suspended' && state.reps > 0 && state.due <= now
}

function isNew(state: CardState): boolean {
  return state.status !== 'suspended' && state.reps === 0
}

/** Karten, die als „schwierig" gelten: Problemkarten oder schwache Quote. */
function isHard(state: CardState): boolean {
  if (state.leech) return true
  const total = state.reps
  if (total < 3) return false
  return state.lapses / total >= 0.3
}

function stateOf(states: Record<string, CardState>, cardId: string): CardState {
  return states[cardId] ?? newCardState(cardId)
}

/**
 * Baut die Warteschlange.
 *
 * Reihenfolge der Töpfe: Relearning zuerst (vergessene Karten sind die
 * dringendsten), dann Wiederholungen, dann neue Karten. Neue Karten zuletzt,
 * damit ein Rückstand an Wiederholungen nicht durch immer neues Material
 * überdeckt wird – der häufigste Grund, warum Karteikarten-Systeme kippen.
 */
export function buildQueue(input: BuildQueueInput): QueueItem[] {
  const { cards, states, params, now } = input
  const done = input.doneToday ?? { reviews: 0, newCards: 0 }

  const items = cards.map((card) => ({ card, state: stateOf(states, card.cardId) }))
  const usable = items.filter(({ state }) => state.status !== 'suspended')

  if (input.cram) {
    // Klausur-Sprint: alles, was nicht ausgesetzt ist – ohne Fälligkeit, ohne
    // Limits. Schwierige Karten zuerst, damit die knappe Zeit dort landet.
    return sortByDifficulty(usable).map(({ card, state }) => ({
      card,
      state,
      source: state.reps === 0 ? 'new' : 'review',
    }))
  }

  const pool = input.hardOnly ? usable.filter(({ state }) => isHard(state)) : usable

  const relearning = pool
    .filter(({ state }) => state.status === 'relearning' && state.due <= now)
    .sort((a, b) => a.state.due - b.state.due)

  const reviews = pool
    .filter(({ state }) => state.status !== 'relearning' && isDue(state, now))
    .sort((a, b) => a.state.due - b.state.due)

  const fresh = pool.filter(({ state }) => isNew(state))

  const reviewBudget = isUnlimitedReviews(params)
    ? reviews.length
    : Math.max(0, params.maxReviewsPerDay - done.reviews)
  const newBudget = Math.max(0, params.newCardsPerDay - done.newCards)

  const queue: QueueItem[] = [
    ...relearning.map((i) => ({ ...i, source: 'relearning' as const })),
    ...orderReviews(reviews, params).slice(0, reviewBudget).map((i) => ({ ...i, source: 'review' as const })),
    ...fresh.slice(0, newBudget).map((i) => ({ ...i, source: 'new' as const })),
  ]

  return params.interleaveSubjects ? interleave(queue) : queue
}

/** Zählt, was heute offen ist – ohne die Warteschlange komplett zu bauen. */
export function dueCounts(input: BuildQueueInput): DueCounts {
  const queue = buildQueue(input)
  const count = (source: QueueSource) => queue.filter((i) => i.source === source).length

  const backlog = input.cards.filter((card) => {
    const state = stateOf(input.states, card.cardId)
    return isDue(state, input.now)
  }).length

  const relearning = count('relearning')
  const review = count('review')
  const fresh = count('new')

  return {
    relearning,
    review,
    new: fresh,
    total: relearning + review + fresh,
    backlog,
  }
}

/** Reihenfolge der fälligen Wiederholungen gemäß Einstellung. */
function orderReviews(items: { card: QueueCard; state: CardState }[], p: SchedulerParams) {
  if (p.order === 'hardestFirst') return sortByDifficulty(items)
  if (p.order === 'mixed') return shuffleStable(items)
  return items // 'dueFirst': bereits nach Fälligkeit sortiert
}

/** Schwierigste zuerst: Problemkarten, dann viele Rückfälle, dann kurze Intervalle. */
function sortByDifficulty<T extends { state: CardState }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.state.leech !== b.state.leech) return a.state.leech ? -1 : 1
    if (a.state.lapses !== b.state.lapses) return b.state.lapses - a.state.lapses
    return a.state.intervalDays - b.state.intervalDays
  })
}

/**
 * Verschachtelt die Warteschlange über Fächer: nie zwei Karten desselben Fachs
 * hintereinander, solange ein anderes Fach übrig ist. Verschachteltes Üben ist
 * nachweislich wirksamer als blockweises – und nebenbei weniger monoton.
 *
 * Die Töpfe bleiben dabei erhalten: Es wird innerhalb von Relearning,
 * Wiederholungen und neuen Karten verschachtelt, nicht darüber hinweg.
 */
function interleave(queue: QueueItem[]): QueueItem[] {
  const bySource: Record<QueueSource, QueueItem[]> = { relearning: [], review: [], new: [] }
  for (const item of queue) bySource[item.source].push(item)

  const out: QueueItem[] = []
  for (const source of ['relearning', 'review', 'new'] as QueueSource[]) {
    out.push(...roundRobin(bySource[source]))
  }
  return out
}

/** Reihum über die Fächer, Reihenfolge innerhalb eines Fachs bleibt erhalten. */
function roundRobin(items: QueueItem[]): QueueItem[] {
  const groups = new Map<string, QueueItem[]>()
  for (const item of items) {
    const key = item.card.subjectId
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)?.push(item)
  }
  if (groups.size <= 1) return items

  const lists = [...groups.values()]
  const out: QueueItem[] = []
  let index = 0
  while (out.length < items.length) {
    const list = lists[index % lists.length]
    const next = list.shift()
    if (next) out.push(next)
    index++
    if (lists.every((l) => l.length === 0)) break
  }
  return out
}

/**
 * Deterministisches Mischen ohne Math.random: Die Reihenfolge ergibt sich aus
 * der Karten-ID. Gleiche Eingabe, gleiche Ausgabe – reproduzierbar in Tests,
 * und die Reihenfolge springt nicht bei jedem Rendern.
 */
function shuffleStable<T extends { card: QueueCard }>(items: T[]): T[] {
  return [...items].sort((a, b) => hash(a.card.cardId) - hash(b.card.cardId))
}

function hash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Heute bereits erledigte Karten aus den Tages-Aggregaten. Getrennt nach neuen
 * Karten und Wiederholungen, weil beide ein eigenes Tageslimit haben.
 */
export function doneToday(
  rollups: Record<string, { reviews: number; newCards: number }>,
  now: number,
  cutoffHour: number,
): { reviews: number; newCards: number } {
  const today = rollups[dayKey(now, cutoffHour)]
  if (!today) return { reviews: 0, newCards: 0 }
  return {
    reviews: Math.max(0, today.reviews - today.newCards),
    newCards: today.newCards,
  }
}
