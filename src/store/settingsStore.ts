import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'midnight' | 'htw' | 'amber'

// Reihenfolge im Umschalter: erst die Neutralen (hell → dunkel → schwarz),
// dann die Marke HTW-Grün und der Energie-Akzent Bernstein.
export const THEMES: Theme[] = ['light', 'dark', 'midnight', 'htw', 'amber']

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
  /** Wurde die Landing Page (das Value-Intro der App) bereits gesehen/verlassen? */
  introSeen: boolean
  setIntroSeen: (seen: boolean) => void
  /**
   * Demo-Modus aktiv (über `?demo` geladene Beispiel-Wohnung). Erlaubt es
   * abgemeldeten Betrachtern, auch die sonst angemeldeten Bereiche (Monitoring,
   * Messungen, Berichte) anzusehen. Wird beim Datenreset zurückgesetzt.
   */
  demoMode: boolean
  setDemoMode: (on: boolean) => void
  /**
   * Einwilligung in die anonyme Nutzungsstatistik (Firebase Analytics).
   * Standardmäßig aktiv; über die Einstellungen abschaltbar (DSGVO-Opt-out).
   * Wird von `track()` ausgewertet, bevor ein Ereignis gesendet wird.
   */
  analyticsEnabled: boolean
  setAnalyticsEnabled: (on: boolean) => void
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
      analyticsEnabled: true,
      setAnalyticsEnabled: (analyticsEnabled) => set({ analyticsEnabled }),
    }),
    {
      name: 'eapp-settings',
      // v2: Themes Ozean/Sepia/Hoher Kontrast entfernt. Ein gespeichertes,
      // nicht mehr vorhandenes Theme würde sonst auf die Standardfarben (hell)
      // durchfallen – daher hier auf das Geräte-Theme zurücksetzen.
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<SettingsState> | undefined
        if (state && !THEMES.includes(state.theme as Theme)) {
          state.theme = systemTheme()
        }
        return state as SettingsState
      },
    },
  ),
)
