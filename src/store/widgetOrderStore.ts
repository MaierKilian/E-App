import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { EnergyType } from './readingsStore'

interface WidgetOrderState {
  /**
   * Vom Nutzer festgelegte Reihenfolge der Monitoring-Widgets.
   * Position 0 = großes Hero-Widget, danach das Kachel-Raster.
   * Leer = noch nichts angeordnet → es gilt die Standard-Reihenfolge aus dem
   * Profil (`boardEnergyTypes`). Nur bekannte, noch sichtbare Typen werden beim
   * Anzeigen berücksichtigt; neue Energieträger hängen automatisch hinten an.
   */
  order: EnergyType[]
  /**
   * Zähler, die der Nutzer entfernt hat.
   *
   * Nötig, weil `suggestedEnergyTypes` Strom, Wasser und den Wärmeerzeuger des
   * Profils vorschlägt: Ohne diese Liste stünde ein entfernter Gaszähler beim
   * nächsten Rendern wieder auf dem Board, denn das Profil legt ihn ja weiter
   * nahe. Die Ablesungen werden beim Entfernen gelöscht, diese Liste hält nur
   * den Vorschlag zurück.
   */
  hidden: EnergyType[]
  setOrder: (order: EnergyType[]) => void
  /** Blendet einen Zähler vom Board aus (löscht keine Ablesungen). */
  hideType: (type: EnergyType) => void
  /** Nimmt einen entfernten Zähler wieder auf – etwa beim erneuten Anlegen. */
  showType: (type: EnergyType) => void
  resetOrder: () => void
}

/**
 * Anordnung der Monitoring-Widgets. Gehört zum Wohnprofil und wird deshalb über
 * `features/sync/stores.ts` in den Cloud-Sync eingehängt (geräteübergreifend,
 * pro Profil). Der lokale localStorage-Eintrag dient als Cache für sofortiges
 * Anzeigen; Quelle der Wahrheit ist – wie bei den übrigen Profil-Stores – Firestore.
 */
export const useWidgetOrderStore = create<WidgetOrderState>()(
  persist(
    (set) => ({
      order: [],
      hidden: [],
      setOrder: (order) => set({ order }),
      hideType: (type) =>
        set((state) => ({
          hidden: state.hidden?.includes(type) ? state.hidden : [...(state.hidden ?? []), type],
          // Aus der Reihenfolge fällt der Typ mit heraus, sonst bestimmte er
          // nach dem Wiederanlegen unerwartet wieder die alte Position.
          order: state.order.filter((t) => t !== type),
        })),
      showType: (type) =>
        set((state) => ({ hidden: (state.hidden ?? []).filter((t) => t !== type) })),
      resetOrder: () => set({ order: [], hidden: [] }),
    }),
    {
      name: 'eapp-widget-order',
      // `hidden` kam später dazu: Ein gespeicherter Stand von vorher bringt das
      // Feld nicht mit und ließe es sonst als undefined ankommen.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WidgetOrderState>
        return {
          ...current,
          ...p,
          order: p.order ?? current.order,
          hidden: p.hidden ?? current.hidden,
        }
      },
    },
  ),
)
