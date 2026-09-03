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
   * Wurde der Anstoß, die PV-Erzeugung zu erfassen, weggeklickt?
   *
   * Er erscheint, wenn im Profil eine PV-Anlage steht, aber noch kein einziger
   * Erzeugungswert erfasst wurde. Ohne dieses Flag stünde er dort dauerhaft –
   * ein Hinweis, den man nicht loswird, ist eine Mahnung.
   */
  pvPromptDismissed: boolean
  dismissPvPrompt: () => void
  /**
   * Mit „Passt so" bestätigte Wertekombination der Plausibilitätsprüfung
   * (siehe `onboarding/plausibility.ts`).
   *
   * Bewusst der Fingerabdruck der Werte und kein blankes „nie wieder": Wer
   * später 700 statt 70 eintippt, soll den Hinweis erneut sehen.
   */
  plausibilityAccepted: string | null
  acceptPlausibility: (key: string) => void
}

/*
 * Hinweis: Die Einwilligung in die Nutzungsstatistik lag früher hier als
 * `analyticsEnabled` (Opt-out, Standard „an"). Sie ist nach
 * `features/legal/consent.ts` umgezogen und arbeitet jetzt als Opt-in – ohne
 * ausdrückliche Einwilligung wird Analytics gar nicht erst geladen
 * (§ 25 Abs. 1 TDDDG). Der alte Wert wird beim Laden verworfen (siehe
 * `migrate`), damit ein früheres, stillschweigendes „an" nicht als
 * Einwilligung weiterlebt.
 */

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
      pvPromptDismissed: false,
      dismissPvPrompt: () => set({ pvPromptDismissed: true }),
      plausibilityAccepted: null,
      acceptPlausibility: (key) => set({ plausibilityAccepted: key }),
    }),
    {
      name: 'eapp-settings',
      // v2: Themes Ozean/Sepia/Hoher Kontrast entfernt. Ein gespeichertes,
      // nicht mehr vorhandenes Theme würde sonst auf die Standardfarben (hell)
      // durchfallen – daher hier auf das Geräte-Theme zurücksetzen.
      // v3: `analyticsEnabled` entfernt – die Einwilligung liegt jetzt im
      // Consent-Store und muss aktiv erteilt werden.
      version: 3,
      migrate: (persisted) => {
        const state = persisted as (Partial<SettingsState> & Record<string, unknown>) | undefined
        if (!state) return state as unknown as SettingsState
        if (!THEMES.includes(state.theme as Theme)) {
          state.theme = systemTheme()
        }
        delete state.analyticsEnabled
        return state as SettingsState
      },
    },
  ),
)
