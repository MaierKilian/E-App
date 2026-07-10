import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Nutzer-Status je Empfehlung (Empfehlungsseite). Empfehlungen selbst werden
 * aus Profil + Messungen abgeleitet (siehe buildTips) und sind zustandslos –
 * hier merken wir uns nur, was der Nutzer damit gemacht hat:
 * abgehakt („erledigt") oder ausgeblendet („nicht relevant").
 *
 * Schlüssel ist die stabile Tip-id (z. B. "standby", "draft"). Persistiert in
 * localStorage unter "eapp-tips".
 */
interface TipsState {
  /** IDs als erledigt markierter Empfehlungen. */
  doneIds: string[]
  /** IDs ausgeblendeter Empfehlungen. */
  dismissedIds: string[]
  /** Erledigt-Status umschalten (hebt ein evtl. Ausblenden auf). */
  toggleDone: (id: string) => void
  /** Ausblenden (hebt ein evtl. Erledigt auf). */
  dismiss: (id: string) => void
  /** Zurück in die offene Liste (weder erledigt noch ausgeblendet). */
  restore: (id: string) => void
  resetAll: () => void
}

const without = (list: string[], id: string) => list.filter((x) => x !== id)
const withId = (list: string[], id: string) => (list.includes(id) ? list : [...list, id])

export const useTipsStore = create<TipsState>()(
  persist(
    (set) => ({
      doneIds: [],
      dismissedIds: [],
      toggleDone: (id) =>
        set((s) => ({
          doneIds: s.doneIds.includes(id) ? without(s.doneIds, id) : withId(s.doneIds, id),
          dismissedIds: without(s.dismissedIds, id),
        })),
      dismiss: (id) =>
        set((s) => ({
          dismissedIds: withId(s.dismissedIds, id),
          doneIds: without(s.doneIds, id),
        })),
      restore: (id) =>
        set((s) => ({
          dismissedIds: without(s.dismissedIds, id),
          doneIds: without(s.doneIds, id),
        })),
      resetAll: () => set({ doneIds: [], dismissedIds: [] }),
    }),
    { name: 'eapp-tips' },
  ),
)
