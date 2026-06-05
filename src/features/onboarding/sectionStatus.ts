import type { OnboardingData } from '@/types'

/**
 * Zustand eines Profil-Abschnitts für den Profil-Hub.
 * - `total` = Anzahl der relevanten Fragen in diesem Abschnitt.
 * - `open`  = wie viele davon noch nicht (sinnvoll) beantwortet sind.
 * Ein Abschnitt gilt als vollständig, wenn `open === 0`.
 */
export interface SectionStatus {
  open: number
  total: number
}

/** Hilfsfunktion: true, wenn ein Eingabewert als „beantwortet" zählt. */
function answered(value: boolean): boolean {
  return value
}

/**
 * Liefert je Detailed-Abschnitt (Index entspricht DetailedStepContent) den
 * Beantwortungsstand. Ein Feld zählt als beantwortet, wenn es nicht leer ist,
 * nicht 'unknown' und – bei Mehrfachauswahlen – mindestens eine Wahl getroffen
 * wurde. Die Heuristik ist bewusst robust und tolerant: leere Defaults bleiben
 * „offen", ohne den Flow zu blockieren.
 */
export function sectionStatus(data: OnboardingData): SectionStatus[] {
  // 0 — Profil (Wohnprofil)
  const profile = [
    answered((data.profileName ?? '').trim().length > 0),
    answered(data.personsCount > 0),
    answered(data.goals.length > 0),
    answered(data.occupancyStatus !== null),
  ]

  // 1 — Gebäude (Basisdaten)
  const building = [
    answered(data.buildingYear > 0),
    answered(Boolean(data.buildingType)),
    answered(data.livingArea > 0),
    answered(data.floors > 0),
    answered(data.windowAge !== 'unknown'),
  ]

  // 2 — Zimmer
  const rooms = [answered(data.rooms.length > 0)]

  // 3 — Heizung (Heizsystem)
  const heating = [
    answered(data.heatGenerators.length > 0),
    answered(data.hotWaterType !== 'unknown'),
  ]

  // 4 — Hülle (Gebäudehülle & Wärmeübergabe)
  const envelope = [
    answered(data.ventilationType !== 'unknown'),
    answered(data.insulationState !== 'unknown'),
  ]

  // 5 — Geräte (Messinstrumente)
  const instruments = [
    answered(data.instruments.length > 0),
    answered(data.energyCostRange !== 'unknown'),
  ]

  // 6 — Renovierung
  const renovation = [answered(data.lastRenovationYear !== 'unknown')]

  // 7 — Standort
  const location = [answered((data.postalCode ?? '').trim().length > 0)]

  const sections = [profile, building, rooms, heating, envelope, instruments, renovation, location]

  return sections.map((checks) => ({
    total: checks.length,
    open: checks.filter((c) => !c).length,
  }))
}
