import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Rolle eines Nutzers in einem Wohnprofil (Stufe 2: Teilen). */
export type ProfileRole = 'owner' | 'editor'

/** Leichtgewichtige Anzeige-Info eines Wohnprofils (ohne die vollen Daten). */
export interface ProfileMeta {
  id: string
  name: string
  image: string
  ownerUid: string
  role: ProfileRole
  /** Anzahl der Mitglieder (1 = nicht geteilt). */
  memberCount: number
  updatedAt: number
}

/** Ladezustand der Profilverwaltung. */
export type ProfilesStatus = 'idle' | 'loading' | 'ready' | 'error' | 'signedOut'

interface ProfilesState {
  /** Alle Profile, auf die der angemeldete Nutzer Zugriff hat. */
  profiles: ProfileMeta[]
  /**
   * UID, zu der die zwischengespeicherte `profiles`-Liste gehört. Nur wenn sie
   * zum gerade anmeldenden Nutzer passt, darf der Cache angezeigt werden.
   */
  cachedUid: string | null
  /** Aktuell geöffnetes Profil (dessen Daten in den Stores liegen). */
  activeProfileId: string | null
  status: ProfilesStatus
  setProfiles: (profiles: ProfileMeta[], uid?: string) => void
  upsertProfile: (profile: ProfileMeta) => void
  removeProfile: (id: string) => void
  setActive: (id: string | null) => void
  setStatus: (status: ProfilesStatus) => void
  /** Verwirft den Kachel-Cache (fremde UID) – ohne den Rest anzufassen. */
  clearCache: () => void
  reset: () => void
}

/**
 * Obergrenzen für den Kachel-Cache im localStorage. Der Store selbst kennt
 * beliebig viele Wohnungen (Business-Tarif: bis zu 100, geteilte kommen dazu) –
 * gecacht wird nur, was für den ersten Bildschirm zählt. Ohne diese Deckel
 * könnten 100 Wohnungsfotos als Data-URL die localStorage-Quota sprengen und
 * damit sämtliche Schreibvorgänge der App scheitern lassen.
 */
const CACHE_MAX_PROFILES = 12
/** Größte Bild-Data-URL (in Zeichen ≈ Bytes), die noch mitgecacht wird. */
const CACHE_MAX_IMAGE_CHARS = 80_000

/** Beschneidet die Liste auf das, was gefahrlos in den localStorage passt. */
function cacheable(profiles: ProfileMeta[]): ProfileMeta[] {
  return profiles
    .slice(0, CACHE_MAX_PROFILES)
    .map((p) => (p.image.length > CACHE_MAX_IMAGE_CHARS ? { ...p, image: '' } : p))
}

/**
 * Verwaltet die Liste der Wohnprofile und das aktive Profil.
 *
 * Persistiert werden `activeProfileId` (Geräte-Vorliebe: welche Wohnung war
 * zuletzt offen) UND die Profilliste als **Anzeige-Cache**. Der Cache sorgt
 * dafür, dass die Wohnungs-Kacheln sofort beim Start stehen, statt erst nach
 * dem Firestore-Roundtrip aufzuploppen. Er ist bewusst nur Darstellung: der
 * `status` wird NICHT persistiert, bleibt beim Start also `idle` und wird erst
 * nach einem erfolgreichen Laden `ready`. So kann nie auf veralteten Daten
 * gehandelt werden – die Kacheln sind bis dahin nur sichtbar, nicht bedienbar.
 *
 * `cachedUid` bindet den Cache an ein Konto; beim Abmelden räumt `reset()` ihn
 * weg (Datenschutz auf geteilten Geräten).
 */
export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set) => ({
      profiles: [],
      cachedUid: null,
      activeProfileId: null,
      status: 'idle',
      setProfiles: (profiles, uid) =>
        set((state) => ({ profiles, cachedUid: uid ?? state.cachedUid })),
      upsertProfile: (profile) =>
        set((state) => {
          const idx = state.profiles.findIndex((p) => p.id === profile.id)
          if (idx === -1) return { profiles: [...state.profiles, profile] }
          const next = state.profiles.slice()
          next[idx] = { ...next[idx], ...profile }
          return { profiles: next }
        }),
      removeProfile: (id) =>
        set((state) => ({ profiles: state.profiles.filter((p) => p.id !== id) })),
      setActive: (activeProfileId) => set({ activeProfileId }),
      setStatus: (status) => set({ status }),
      clearCache: () => set({ profiles: [], cachedUid: null }),
      reset: () =>
        set({ profiles: [], cachedUid: null, activeProfileId: null, status: 'signedOut' }),
    }),
    {
      name: 'eapp-active-profile',
      // Zuletzt geöffnete Profil-ID + Anzeige-Cache der Kacheln. Der `status`
      // gehört bewusst NICHT dazu (siehe Erklärung oben).
      partialize: (state) => ({
        activeProfileId: state.activeProfileId,
        profiles: cacheable(state.profiles),
        cachedUid: state.cachedUid,
      }),
    },
  ),
)
