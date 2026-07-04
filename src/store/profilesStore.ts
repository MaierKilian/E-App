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
  /** Aktuell geöffnetes Profil (dessen Daten in den Stores liegen). */
  activeProfileId: string | null
  status: ProfilesStatus
  setProfiles: (profiles: ProfileMeta[]) => void
  upsertProfile: (profile: ProfileMeta) => void
  removeProfile: (id: string) => void
  setActive: (id: string | null) => void
  setStatus: (status: ProfilesStatus) => void
  reset: () => void
}

/**
 * Verwaltet die Liste der Wohnprofile und das aktive Profil.
 *
 * Nur `activeProfileId` wird lokal gespeichert (Geräte-Vorliebe: welche Wohnung
 * war zuletzt offen). Die Profilliste selbst wird bei jeder Anmeldung frisch aus
 * Firestore geladen und daher nicht persistiert.
 */
export const useProfilesStore = create<ProfilesState>()(
  persist(
    (set) => ({
      profiles: [],
      activeProfileId: null,
      status: 'idle',
      setProfiles: (profiles) => set({ profiles }),
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
      reset: () => set({ profiles: [], activeProfileId: null, status: 'signedOut' }),
    }),
    {
      name: 'eapp-active-profile',
      // Nur die zuletzt geöffnete Profil-ID merken – nicht die (veränderliche) Liste.
      partialize: (state) => ({ activeProfileId: state.activeProfileId }),
    },
  ),
)
