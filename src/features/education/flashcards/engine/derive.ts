// Kartenzustand aus dem Ereignis-Log ableiten (Phase 0).
//
// Das hier ist der Grund, warum der Trainer ereignisbasiert gebaut ist: Der
// Zustand jeder Karte ist eine reine FUNKTION der Bewertungen. Daraus folgt:
//
//  • Der Nutzer kann Verfahren und Parameter wechseln, ohne Fortschritt zu
//    verlieren – auf Wunsch wird der Zeitplan komplett neu gerechnet.
//  • Zwei Geräte lassen sich konfliktfrei zusammenführen: Log vereinigen,
//    Zustand neu ableiten.
//  • Ein Fehler in der Ableitung ist reparierbar; ein Fehler in einem
//    fortgeschriebenen Zustand wäre dauerhaft.
//
// Damit das bezahlbar bleibt, wird nicht bei jedem Start alles neu gerechnet:
// `deriveStates` nimmt einen Schnappschuss als Basis und rechnet nur die
// Einträge danach ein (`throughTs`).

import type { ActionEntry, CardState, LogEntry, ReviewEntry } from './types'
import { MATURE_THRESHOLD_DAYS, SCHEDULING_MODES, newCardState } from './types'
import type { SchedulerParams } from './params'
import { applyGrade } from './scheduler'
import { nextDayStart } from './time'

/** Abgeleiteter Zustand aller bewerteten Karten samt Stand der Ableitung. */
export interface DerivedSnapshot {
  states: Record<string, CardState>
  /** Zeitstempel des letzten eingerechneten Eintrags (0 = leer). */
  throughTs: number
  /** Anzahl eingerechneter Einträge – reine Diagnose. */
  entryCount: number
}

export interface DeriveOptions {
  params: SchedulerParams
  /**
   * true (Standard): jede Bewertung wird mit dem Verfahren gerechnet, das damals
   * aktiv war – der Zeitplan bleibt so, wie der Nutzer ihn erlebt hat.
   * false: alles wird mit dem heute eingestellten Verfahren neu gerechnet
   * („Zeitplan neu berechnen" in den Einstellungen).
   */
  useHistoricAlgorithm?: boolean
}

/** Leerer Schnappschuss. */
export function emptySnapshot(): DerivedSnapshot {
  return { states: {}, throughTs: 0, entryCount: 0 }
}

/**
 * Rechnet Log-Einträge in den Kartenzustand ein.
 *
 * `base` ist ein zuvor gespeicherter Schnappschuss; Einträge mit `ts <=
 * base.throughTs` werden übersprungen. Ohne `base` wird von Null an gerechnet.
 * Das Ergebnis ist identisch – deshalb ist der Schnappschuss ein reiner
 * Beschleuniger und darf jederzeit verworfen werden.
 */
export function deriveStates(
  entries: LogEntry[],
  options: DeriveOptions,
  base?: DerivedSnapshot,
): DerivedSnapshot {
  const { params } = options
  const historic = options.useHistoricAlgorithm !== false

  const states: Record<string, CardState> = {}
  for (const [cardId, state] of Object.entries(base?.states ?? {})) {
    states[cardId] = { ...state }
  }

  const from = base?.throughTs ?? 0
  const relevant = entries.filter((e) => e.ts > from).sort(byTimeThenId)

  let throughTs = from
  let count = base?.entryCount ?? 0

  for (const entry of relevant) {
    const current = states[entry.cardId] ?? newCardState(entry.cardId)
    states[entry.cardId] = applyEntry(current, entry, params, historic)
    throughTs = entry.ts
    count++
  }

  return { states, throughTs, entryCount: count }
}

/** Zustand einer einzelnen Karte – Kurzform für Detailansichten. */
export function deriveCardState(
  cardId: string,
  entries: LogEntry[],
  options: DeriveOptions,
): CardState {
  const own = entries.filter((e) => e.cardId === cardId)
  return deriveStates(own, options).states[cardId] ?? newCardState(cardId)
}

/** Einen einzelnen Eintrag anwenden. */
function applyEntry(
  state: CardState,
  entry: LogEntry,
  params: SchedulerParams,
  historic: boolean,
): CardState {
  if (entry.kind === 'action') return applyAction(state, entry, params)

  // Bewertungen in nicht planungswirksamen Modi (Klausur-Sprint, Blättern)
  // zählen für die Statistik, verändern aber den Zeitplan nicht.
  if (!SCHEDULING_MODES.includes(entry.mode)) return state

  return applyGrade(
    params,
    state,
    entry.grade,
    entry.ts,
    elapsedDaysOf(entry, state),
    historic ? entry.algo : params.algorithm,
  )
}

/** Nutzer-Aktion anwenden (aussetzen, vertagen, zurücksetzen). */
function applyAction(state: CardState, entry: ActionEntry, params: SchedulerParams): CardState {
  switch (entry.action) {
    case 'suspend':
      return { ...state, status: 'suspended' }
    case 'unsuspend':
      return { ...state, status: statusFromInterval(state) }
    case 'bury':
      // Nur aus dem heutigen Stapel nehmen – Intervall und Zustand bleiben.
      return { ...state, due: Math.max(state.due, nextDayStart(entry.ts, params.dayCutoffHour)) }
    case 'reset':
      return newCardState(state.cardId)
    default:
      return state
  }
}

/**
 * Verstrichene Tage für die Bewertung. Bevorzugt der damals gemessene Wert –
 * er ist die historische Wahrheit und bleibt auch bei einer Neuberechnung mit
 * anderem Verfahren gültig.
 */
function elapsedDaysOf(entry: ReviewEntry, state: CardState): number {
  if (Number.isFinite(entry.elapsedDays) && entry.elapsedDays >= 0) return entry.elapsedDays
  if (!state.lastReviewed) return 0
  return Math.max(0, (entry.ts - state.lastReviewed) / 86_400_000)
}

/**
 * Status, der zum aktuellen Intervall passt. Wird beim Aufheben einer
 * Aussetzung gebraucht; die feinere Unterscheidung „relearning" geht dabei
 * verloren – bewusst, weil sie sich aus dem Intervall nicht rekonstruieren
 * lässt und praktisch keine Folgen hat.
 */
function statusFromInterval(state: CardState): CardState['status'] {
  if (state.reps === 0) return 'new'
  if (state.intervalDays < 1) return 'learning'
  return state.intervalDays >= MATURE_THRESHOLD_DAYS ? 'mature' : 'young'
}

/** Stabile Sortierung: nach Zeit, bei Gleichstand nach ID. */
function byTimeThenId(a: LogEntry, b: LogEntry): number {
  return a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}
