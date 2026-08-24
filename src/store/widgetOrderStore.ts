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
  setOrder: (order: EnergyType[]) => void
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
      setOrder: (order) => set({ order }),
      resetOrder: () => set({ order: [] }),
    }),
    { name: 'eapp-widget-order' },
  ),
)
