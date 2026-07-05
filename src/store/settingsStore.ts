import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'htw'

export const THEMES: Theme[] = ['light', 'dark', 'htw']

/** Geräte-Voreinstellung (hell/dunkel) als Standard für neue Nutzer. */
function systemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

interface SettingsState {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Wurde die Erst-Einführung (Walkthrough) bereits gesehen/abgeschlossen? */
  introSeen: boolean
  setIntroSeen: (seen: boolean) => void
  /**
   * Demo-Modus aktiv (über `?demo` geladene Beispiel-Wohnung). Erlaubt es
   * abgemeldeten Betrachtern, auch die sonst angemeldeten Bereiche (Monitoring,
   * Messungen, Berichte) anzusehen. Wird beim Datenreset zurückgesetzt.
   */
  demoMode: boolean
  setDemoMode: (on: boolean) => void
}

/**
 * Zentrale, dauerhaft gespeicherte App-Einstellungen (Theme, Einführungs-Status).
 * Persistiert in localStorage unter "eapp-settings" – wird auch vom Anti-Flicker-
 * Skript in index.html ausgelesen. Neue Nutzer starten mit dem Geräte-Theme;
 * eine manuelle Wahl überschreibt das dauerhaft.
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: systemTheme(),
      setTheme: (theme) => set({ theme }),
      introSeen: false,
      setIntroSeen: (introSeen) => set({ introSeen }),
      demoMode: false,
      setDemoMode: (demoMode) => set({ demoMode }),
    }),
    { name: 'eapp-settings' },
  ),
)
