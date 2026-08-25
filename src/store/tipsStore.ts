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
  /**
   * Wann eine Empfehlung abgehakt wurde (id → ISO-Zeitpunkt).
   *
   * Nötig für Folgemessungen, die erst nach einer Weile Sinn ergeben: Nach dem
   * Abtauen lohnt der Gefrier-Check erst wieder, wenn sich erneut Eis bilden
   * konnte (siehe `pendingFollowUps`). Ohne Zeitpunkt ließe sich „ein halbes
   * Jahr später" nicht bestimmen.
   *
   * Vor August 2026 abgehakte Empfehlungen haben keinen Eintrag – für sie
   * unterbleibt die zeitbasierte Erinnerung, statt sie sofort auszulösen.
   */
  doneAt: Record<string, string>
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
const withoutKey = (map: Record<string, string>, id: string) => {
  if (!(id in map)) return map
  const rest = { ...map }
  delete rest[id]
  return rest
}

export const useTipsStore = create<TipsState>()(
  persist(
    (set) => ({
      doneIds: [],
      dismissedIds: [],
      doneAt: {},
      toggleDone: (id) =>
        set((s) => {
          const wasDone = s.doneIds.includes(id)
          return {
            doneIds: wasDone ? without(s.doneIds, id) : withId(s.doneIds, id),
            dismissedIds: without(s.dismissedIds, id),
            doneAt: wasDone
              ? withoutKey(s.doneAt, id)
              : { ...s.doneAt, [id]: new Date().toISOString() },
          }
        }),
      dismiss: (id) =>
        set((s) => ({
          dismissedIds: withId(s.dismissedIds, id),
          doneIds: without(s.doneIds, id),
          doneAt: withoutKey(s.doneAt, id),
        })),
      restore: (id) =>
        set((s) => ({
          dismissedIds: without(s.dismissedIds, id),
          doneIds: without(s.doneIds, id),
          doneAt: withoutKey(s.doneAt, id),
        })),
      resetAll: () => set({ doneIds: [], dismissedIds: [], doneAt: {} }),
    }),
    {
      name: 'eapp-tips',
      // Ältere Stände kennen `doneAt` nicht – ohne Default wäre es undefined
      // und jeder Zugriff ein Laufzeitfehler.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<TipsState>
        return { ...current, ...p, doneAt: p.doneAt ?? {} }
      },
    },
  ),
)
