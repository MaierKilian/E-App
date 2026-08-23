import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Einwilligungs-Verwaltung (Consent) für einwilligungsbedürftige Dienste.
 *
 * Rechtlicher Rahmen:
 *  - § 25 Abs. 1 TDDDG: Das Speichern von Informationen auf dem Endgerät und
 *    der Zugriff darauf ist nur mit Einwilligung zulässig – Ausnahme: die
 *    Speicherung ist für den vom Nutzer ausdrücklich gewünschten Dienst
 *    unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).
 *  - Art. 6 Abs. 1 lit. a DSGVO: Einwilligung als Rechtsgrundlage der
 *    anschließenden Verarbeitung, Art. 7 Abs. 3 DSGVO: jederzeitiger Widerruf.
 *
 * Daraus folgt die Aufteilung unten: Alles, was die App zum Funktionieren
 * braucht (Theme, Sprache, Wohnungsdaten, Anmeldung, Offline-Cache), ist
 * „notwendig" und läuft ohne Einwilligung. Einwilligungsbedürftig ist derzeit
 * genau ein Zweck: die Nutzungsstatistik (Google Analytics).
 *
 * Wichtig für die Wartung: Kommt ein weiterer einwilligungsbedürftiger Dienst
 * dazu, gehört er als eigene Kategorie hierher UND in die
 * Datenschutzerklärung – und `CONSENT_VERSION` muss hoch, damit alle Nutzer
 * erneut gefragt werden.
 */

/**
 * Version der Einwilligung. Erhöhen, sobald sich Zwecke, Dienste oder
 * Kategorien ändern – eine gespeicherte Entscheidung mit älterer Version gilt
 * dann als nicht mehr gültig und der Hinweis erscheint erneut.
 */
export const CONSENT_VERSION = 1

/** localStorage-Schlüssel. Selbst technisch notwendig (speichert die Wahl). */
export const CONSENT_STORAGE_KEY = 'eapp-consent'

/** Einwilligungsbedürftige Zwecke. „necessary" ist bewusst nicht enthalten. */
export interface ConsentChoice {
  /** Anonyme Nutzungsstatistik (Google Analytics). */
  analytics: boolean
}

/** Eine dokumentierte Entscheidung – Nachweis nach Art. 7 Abs. 1 DSGVO. */
export interface ConsentDecision extends ConsentChoice {
  /** Version der Einwilligung, gegen die entschieden wurde. */
  version: number
  /** Zeitpunkt der Entscheidung (ISO 8601). */
  decidedAt: string
}

interface ConsentState {
  /** `null`, solange noch nichts entschieden wurde. */
  decision: ConsentDecision | null
  /** Ist das Fenster „Einwilligung anpassen" offen? */
  settingsOpen: boolean
  /** Alles annehmen (ein Klick im Hinweis). */
  acceptAll: () => void
  /** Alles ablehnen – gleichwertig zu `acceptAll`, siehe ConsentBanner. */
  rejectAll: () => void
  /** Feingranulare Auswahl speichern. */
  saveChoice: (choice: ConsentChoice) => void
  /** Einwilligung vollständig widerrufen und erneut fragen. */
  revoke: () => void
  openSettings: () => void
  closeSettings: () => void
}

/** Alle Zwecke aus, als Ausgangspunkt jeder Auswahl (Privacy by Default). */
const NONE: ConsentChoice = { analytics: false }

/** Baut aus einer Auswahl die zu speichernde Entscheidung. */
function decide(choice: ConsentChoice): ConsentDecision {
  return { ...choice, version: CONSENT_VERSION, decidedAt: new Date().toISOString() }
}

export const useConsentStore = create<ConsentState>()(
  persist(
    (set) => ({
      decision: null,
      settingsOpen: false,
      acceptAll: () => set({ decision: decide({ analytics: true }), settingsOpen: false }),
      rejectAll: () => set({ decision: decide(NONE), settingsOpen: false }),
      saveChoice: (choice) => set({ decision: decide(choice), settingsOpen: false }),
      revoke: () => set({ decision: null, settingsOpen: false }),
      openSettings: () => set({ settingsOpen: true }),
      closeSettings: () => set({ settingsOpen: false }),
    }),
    {
      name: CONSENT_STORAGE_KEY,
      version: CONSENT_VERSION,
      // Die Entscheidung ist an ihre Version gebunden: Ältere Fassungen decken
      // die heutigen Zwecke nicht ab und werden deshalb verworfen, statt sie
      // stillschweigend weiterzuverwenden.
      partialize: (state) => ({ decision: state.decision }),
    },
  ),
)

/**
 * Gilt die gespeicherte Entscheidung noch für die aktuelle Fassung?
 * Als Type-Guard formuliert, damit die Aufrufer danach ohne `!` auf die
 * Entscheidung zugreifen können.
 */
export function isDecisionCurrent(
  decision: ConsentDecision | null,
): decision is ConsentDecision {
  return decision !== null && decision.version === CONSENT_VERSION
}

/**
 * Muss der Einwilligungs-Hinweis gezeigt werden? Ja, solange keine gültige
 * Entscheidung vorliegt – auch nach einem Widerruf oder einer Versionserhöhung.
 */
export function needsConsentDecision(decision: ConsentDecision | null): boolean {
  return !isDecisionCurrent(decision)
}

/**
 * Liegt eine wirksame Einwilligung in die Nutzungsstatistik vor?
 * Bewusst als Funktion (nicht als Hook), damit auch Nicht-React-Code – etwa
 * `track()` – dieselbe Prüfung nutzt.
 */
export function hasAnalyticsConsent(): boolean {
  const { decision } = useConsentStore.getState()
  return isDecisionCurrent(decision) && decision.analytics
}

/** React-Hook-Variante von `hasAnalyticsConsent()`. */
export function useAnalyticsConsent(): boolean {
  return useConsentStore((s) => isDecisionCurrent(s.decision) && s.decision.analytics)
}

/** React-Hook: Muss der Hinweis derzeit gezeigt werden? */
export function useNeedsConsent(): boolean {
  return useConsentStore((s) => needsConsentDecision(s.decision))
}
