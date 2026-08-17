import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  appendEntries,
  allEntries,
  entriesSince,
  loadRollups,
  loadSnapshot,
  saveRollups,
  saveSnapshot,
} from '@/lib/reviewLog'
import {
  deriveStates,
  emptySnapshot,
  type DerivedSnapshot,
} from '@/features/education/flashcards/engine/derive'
import {
  DEFAULT_PARAMS,
  normalizeParams,
  paramsFromPreset,
  type PresetId,
  type SchedulerParams,
} from '@/features/education/flashcards/engine/params'
import {
  applyToRollups,
  dailyRollups,
  streakInfo,
  type DayRollup,
  type StreakInfo,
} from '@/features/education/flashcards/engine/rollups'
import {
  buildQueue,
  doneToday,
  dueCounts,
  type DueCounts,
  type QueueCard,
} from '@/features/education/flashcards/engine/queue'
import {
  buryCurrent,
  finishSession,
  flip,
  gradeCurrent,
  startSession,
  suspendCurrent,
  undoLast,
  type SessionMode,
  type SessionResult,
  type SessionState,
} from '@/features/education/flashcards/engine/session'
import type { CardState, Grade, LogEntry } from '@/features/education/flashcards/engine/types'

/**
 * Zustand des Karteikarten-Trainers.
 *
 * Aufteilung nach Haltbarkeit:
 *
 *  • `params` und `session` liegen in localStorage („eapp-flashcards"). Die
 *    Einstellungen, weil sie klein und sofort beim Start nötig sind; die
 *    laufende Sitzung, damit ein Anruf, ein App-Wechsel oder ein leerer Akku
 *    keine Lernrunde kostet.
 *  • Kartenzustand und Tages-Aggregate liegen in IndexedDB (`lib/reviewLog`) und
 *    werden beim Start eingelesen. Sie sind abgeleitete Daten – bei Verlust
 *    entstehen sie aus dem Ereignis-Log neu.
 *
 * Der Store ist bewusst NICHT Teil von `features/sync/stores.ts`: Lernfortschritt
 * gehört zum Konto, nicht zur Wohnung (siehe docs/flashcards-trainer.md, §3.4).
 */
interface FlashcardStore {
  // ---- Einstellungen (persistiert) ----
  params: SchedulerParams
  setParams: (patch: Partial<SchedulerParams>) => void
  applyPreset: (preset: PresetId) => void

  // ---- Laufende Sitzung (persistiert) ----
  session: SessionState | null
  /**
   * Kennung des Stapels, zu dem die laufende Sitzung gehört (Set- oder
   * Modul-ID). Damit erkennt die Oberfläche, ob eine gespeicherte Sitzung zum
   * gerade geöffneten Stapel passt oder ein Rest von gestern ist.
   */
  sessionScope: string | null

  // ---- Abgeleitet (IndexedDB, nicht in localStorage) ----
  states: Record<string, CardState>
  rollups: Record<string, DayRollup>
  /** Karten, die je bewertet wurden – nötig, um „neu heute" exakt zu zählen. */
  knownCardIds: string[]
  snapshot: DerivedSnapshot
  /** Wurde der Zustand aus IndexedDB geladen? Vorher keine Zahlen anzeigen. */
  ready: boolean

  // ---- Aktionen ----
  init: () => Promise<void>
  counts: (cards: QueueCard[], now?: number) => DueCounts
  streak: (now?: number) => StreakInfo
  begin: (cards: QueueCard[], options?: BeginOptions) => void
  flipCard: () => void
  rate: (grade: Grade) => void
  undo: () => void
  suspend: () => void
  bury: () => void
  end: () => void
  discardSession: () => void
  /** Alle Lerndaten löschen (Einstellungen bleiben). */
  resetProgress: () => Promise<void>
}

export interface BeginOptions {
  mode?: SessionMode
  /** Kennung des Lernstapels – siehe `sessionScope`. */
  scope?: string
  /** Nur Problemkarten und Karten mit schwacher Quote. */
  hardOnly?: boolean
  /** Für Tests: fester Zeitpunkt. */
  now?: number
}

let initStarted = false

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      params: DEFAULT_PARAMS,
      session: null,
      sessionScope: null,
      states: {},
      rollups: {},
      knownCardIds: [],
      snapshot: emptySnapshot(),
      ready: false,

      setParams: (patch) => set((s) => ({ params: normalizeParams({ ...s.params, ...patch }) })),

      applyPreset: (preset) => set({ params: paramsFromPreset(preset) }),

      /**
       * Liest Log und Schnappschuss aus IndexedDB. Läuft nur einmal pro
       * Sitzung; ein zweiter Aufruf ist ein harmloser No-op.
       */
      init: async () => {
        if (initStarted) return
        initStarted = true
        const { params } = get()

        const [storedSnapshot, storedRollups] = await Promise.all([loadSnapshot(), loadRollups()])

        // Nur die Einträge nachrechnen, die im Schnappschuss fehlen.
        const base = storedSnapshot ?? emptySnapshot()
        const pending = await entriesSince(base.throughTs)
        const snapshot = deriveStates(pending, { params }, base)

        // Aggregate: entweder fortschreiben oder – falls sie fehlen – neu bauen.
        const knownCardIds = new Set(Object.keys(base.states))
        let rollups: Record<string, DayRollup>
        if (storedRollups) {
          rollups = applyToRollups(storedRollups, pending, knownCardIds, params.dayCutoffHour)
        } else {
          const everything = await allEntries()
          rollups = dailyRollups(everything, params.dayCutoffHour)
          for (const entry of everything) knownCardIds.add(entry.cardId)
        }

        set({
          snapshot,
          states: snapshot.states,
          rollups,
          knownCardIds: [...knownCardIds],
          ready: true,
        })

        if (pending.length > 0 || !storedRollups) {
          void saveSnapshot(snapshot)
          void saveRollups(rollups)
        }
      },

      counts: (cards, now = Date.now()) => {
        const { params, states, rollups } = get()
        return dueCounts({
          cards,
          states,
          params,
          now,
          doneToday: doneToday(rollups, now, params.dayCutoffHour),
        })
      },

      streak: (now = Date.now()) => streakInfo(get().rollups, now, get().params.dayCutoffHour),

      begin: (cards, options = {}) => {
        const { params, states, rollups } = get()
        const now = options.now ?? Date.now()
        const mode = options.mode ?? 'study'
        const queue = buildQueue({
          cards,
          states,
          params,
          now,
          cram: mode === 'cram',
          hardOnly: options.hardOnly,
          doneToday: doneToday(rollups, now, params.dayCutoffHour),
        })
        set({ session: startSession(queue, mode, now), sessionScope: options.scope ?? null })
      },

      flipCard: () =>
        set((s) => (s.session ? { session: flip(s.session, Date.now()) } : s)),

      rate: (grade) => {
        const { session, params } = get()
        if (!session) return
        applyResult(set, get, gradeCurrent(session, grade, Date.now(), params))
      },

      undo: () => set((s) => (s.session ? { session: undoLast(s.session) } : s)),

      suspend: () => {
        const { session } = get()
        if (!session) return
        applyResult(set, get, suspendCurrent(session, Date.now()))
      },

      bury: () => {
        const { session } = get()
        if (!session) return
        applyResult(set, get, buryCurrent(session, Date.now()))
      },

      end: () => {
        const { session } = get()
        if (!session) return
        const result = finishSession(session, Date.now())
        applyResult(set, get, result)
        set({ session: null, sessionScope: null })
      },

      discardSession: () => set({ session: null, sessionScope: null }),

      resetProgress: async () => {
        const { clearReviewLog } = await import('@/lib/reviewLog')
        await clearReviewLog()
        set({
          states: {},
          rollups: {},
          knownCardIds: [],
          snapshot: emptySnapshot(),
          session: null,
          sessionScope: null,
        })
      },
    }),
    {
      name: 'eapp-flashcards',
      // Nur Einstellungen und laufende Sitzung; abgeleitete Daten liegen in
      // IndexedDB und würden localStorage unnötig füllen.
      partialize: (s) => ({ params: s.params, session: s.session, sessionScope: s.sessionScope }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FlashcardStore>
        return {
          ...current,
          ...p,
          // Fremde/veraltete Einstellungen absichern, statt der Engine
          // unsinnige Werte zu übergeben.
          params: normalizeParams(p.params),
        }
      },
    },
  ),
)

/**
 * Übernimmt das Ergebnis einer Sitzungs-Aktion: Sitzung setzen, endgültige
 * Einträge ins Log schreiben und den abgeleiteten Zustand fortschreiben.
 *
 * Der abgeleitete Zustand entsteht ausschließlich über `deriveStates` – auch
 * hier. Sonst gäbe es zwei Stellen, die aus Ereignissen Zustand machen, und sie
 * würden auseinanderlaufen.
 */
function applyResult(
  set: (partial: Partial<FlashcardStore>) => void,
  get: () => FlashcardStore,
  result: SessionResult,
): void {
  set({ session: result.session })
  if (result.flushed.length === 0) return
  commit(set, get, result.flushed)
}

function commit(
  set: (partial: Partial<FlashcardStore>) => void,
  get: () => FlashcardStore,
  flushed: LogEntry[],
): void {
  const { params, snapshot, rollups, knownCardIds } = get()

  const known = new Set(knownCardIds)
  const nextRollups = applyToRollups(rollups, flushed, known, params.dayCutoffHour)
  const nextSnapshot = deriveStates(flushed, { params }, snapshot)

  set({
    snapshot: nextSnapshot,
    states: nextSnapshot.states,
    rollups: nextRollups,
    knownCardIds: [...known],
  })

  void appendEntries(flushed)
  void saveSnapshot(nextSnapshot)
  void saveRollups(nextRollups)
}
