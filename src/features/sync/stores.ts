import { useOnboardingStore } from '@/store/onboardingStore'
import { useMeasurementsStore } from '@/store/measurementsStore'
import { useReadingsStore } from '@/store/readingsStore'
import { useTariffStore } from '@/store/tariffStore'
import { useProgressStore } from '@/store/progressStore'
import { useMeasurementDraftStore } from '@/store/measurementDraftStore'

/**
 * Gemeinsame Basis für die Cloud-Synchronisation und die Profilverwaltung.
 *
 * Hier liegt die Liste aller Stores, deren Inhalt zu einem Wohnprofil gehört,
 * sowie die Helfer zum Auslesen (`snapshot`), Einspielen (`hydrate`) und
 * Zurücksetzen (`resetAllStores`) dieses Zustands. So teilen sich cloudSync und
 * die Profil-Operationen exakt dieselbe Vorstellung davon, was ein Profil ist.
 *
 * Theme/Sprache (settingsStore) gehören bewusst NICHT dazu – das sind
 * gerätespezifische Vorlieben und keine Wohnungsdaten.
 */

/** Minimaler Store-Vertrag, der für die Synchronisation genügt. */
export interface SyncStore {
  getState(): object
  setState(partial: object): void
  subscribe(listener: () => void): () => void
}

/** Alle Stores, deren Inhalt ein Wohnprofil ausmacht. */
export const STORES: Record<string, SyncStore> = {
  onboarding: useOnboardingStore as unknown as SyncStore,
  measurements: useMeasurementsStore as unknown as SyncStore,
  readings: useReadingsStore as unknown as SyncStore,
  tariff: useTariffStore as unknown as SyncStore,
  progress: useProgressStore as unknown as SyncStore,
  drafts: useMeasurementDraftStore as unknown as SyncStore,
}

/** Erzeugt einen JSON-sicheren Schnappschuss aller Stores (Funktionen entfallen). */
export function snapshot(): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const [key, store] of Object.entries(STORES)) {
    data[key] = JSON.parse(JSON.stringify(store.getState()))
  }
  return data
}

/** Überträgt einen gespeicherten Zustand in die lokalen Stores. */
export function hydrate(remote: Record<string, unknown>) {
  for (const [key, store] of Object.entries(STORES)) {
    const part = remote[key]
    if (part && typeof part === 'object') store.setState(part as object)
  }
}

/**
 * Setzt alle Wohnungs-Stores auf ihre Standardwerte zurück (leeres Profil).
 * App-Einstellungen wie Theme/Sprache/Einführung bleiben unberührt.
 */
export function resetAllStores() {
  useOnboardingStore.getState().reset()
  useMeasurementsStore.getState().resetAll()
  useReadingsStore.getState().resetReadings()
  useTariffStore.getState().resetTariff()
  useProgressStore.getState().resetProgress()
  useMeasurementDraftStore.getState().resetDrafts()
}

/** Leitet die Anzeige-Metadaten (Name, Bild) eines Profils aus dem Zustand ab. */
export function metaFromState(state: Record<string, unknown>): {
  name: string
  image: string
} {
  const onboarding = (state.onboarding ?? {}) as { data?: Record<string, unknown> }
  const data = onboarding.data ?? {}
  return {
    name: typeof data.profileName === 'string' ? data.profileName : '',
    image: typeof data.profileImage === 'string' ? data.profileImage : '',
  }
}
