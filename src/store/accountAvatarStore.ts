import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useUser } from '@/store/authStore'

interface AccountAvatarState {
  /**
   * Selbst gewählte Konto-Profilbilder, je Firebase-Nutzer-UID als Data-URL.
   * Bewusst pro UID abgelegt, damit bei einem Konto-Wechsel auf demselben Gerät
   * nicht das falsche Bild erscheint.
   */
  avatars: Record<string, string>
  /** Profilbild für einen Nutzer setzen/ersetzen. */
  setAvatar: (uid: string, dataUrl: string) => void
  /** Selbst gewähltes Profilbild wieder entfernen (Fallback greift dann). */
  removeAvatar: (uid: string) => void
}

/**
 * Dauerhaft gespeicherte Konto-Profilbilder (localStorage „eapp-account-avatar").
 *
 * Das Bild wird bewusst lokal und nicht als Firebase-`photoURL` abgelegt: Ein
 * Data-URL im Auth-Token würde dieses unnötig aufblähen. Das Google-Profilbild
 * (`user.photoURL`) dient trotzdem als automatischer Fallback – siehe
 * `useAccountAvatarSrc()`.
 */
export const useAccountAvatarStore = create<AccountAvatarState>()(
  persist(
    (set) => ({
      avatars: {},
      setAvatar: (uid, dataUrl) =>
        set((s) => ({ avatars: { ...s.avatars, [uid]: dataUrl } })),
      removeAvatar: (uid) =>
        set((s) => {
          if (!(uid in s.avatars)) return s
          const next = { ...s.avatars }
          delete next[uid]
          return { avatars: next }
        }),
    }),
    { name: 'eapp-account-avatar' },
  ),
)

/**
 * Aufgelöste Bildquelle für den aktuell angemeldeten Nutzer:
 * zuerst das selbst gewählte Bild, sonst das Firebase-Profilbild (z. B. Google),
 * sonst `undefined` (dann zeigt der Avatar Initialen/Icon).
 */
export function useAccountAvatarSrc(): string | undefined {
  const user = useUser()
  const custom = useAccountAvatarStore((s) => (user ? s.avatars[user.uid] : undefined))
  return custom || user?.photoURL || undefined
}
