import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'htw'

export const THEMES: Theme[] = ['light', 'dark', 'htw']

interface SettingsState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * Zentrale, dauerhaft gespeicherte App-Einstellungen (z. B. Theme).
 * Persistiert in localStorage unter dem Schlüssel "eapp-settings"
 * – wird auch vom Anti-Flicker-Skript in index.html ausgelesen.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'eapp-settings' },
  ),
)
