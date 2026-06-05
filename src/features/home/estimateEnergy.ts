import type { OnboardingData } from '@/types'

/**
 * Grobe Energie-Schätzungen für das Zuhause-Dashboard.
 *
 * WICHTIG: Alle Funktionen hier liefern bewusst nur GROBE SCHÄTZWERTE auf Basis
 * weniger Profilangaben (Personen, Wohnfläche, Tarif). Sie ersetzen keine echten
 * Messungen oder Zählerstände und dienen ausschließlich der Orientierung. Sobald
 * der Nutzer echte Verbrauchsdaten erfasst, sollten diese die Schätzungen ersetzen.
 */

/**
 * Schätzt den jährlichen Stromverbrauch in kWh.
 * Sehr einfache Heuristik: Grundbedarf + pro Person + pro m² Wohnfläche.
 */
export function estimateAnnualConsumptionKwh(persons: number, livingArea: number): number {
  const p = Number.isFinite(persons) ? Math.max(0, persons) : 0
  const area = Number.isFinite(livingArea) ? Math.max(0, livingArea) : 0
  return Math.round(900 + p * 1100 + area * 6)
}

/**
 * Schätzt die jährlichen Energiekosten in Euro.
 * @param kwh             geschätzter Jahresverbrauch in kWh
 * @param workPriceCt     Arbeitspreis in ct/kWh
 * @param basePriceEurMonth Grundpreis in €/Monat
 */
export function estimateAnnualCostEur(
  kwh: number,
  workPriceCt: number,
  basePriceEurMonth: number,
): number {
  return (kwh * workPriceCt) / 100 + basePriceEurMonth * 12
}

/**
 * Schätzt den jährlichen CO₂-Ausstoß in kg auf Basis des deutschen Strommix.
 * Faktor ~0,38 kg CO₂ je kWh (grober Mittelwert, ändert sich jährlich).
 */
export function estimateAnnualCo2Kg(kwh: number): number {
  return Math.round(kwh * 0.38)
}

/**
 * Schätzt, wie vollständig das Haushaltsprofil ausgefüllt ist (0..100).
 * Einfache, robuste Heuristik: Anteil sinnvoll befüllter / nicht-"unknown" Felder.
 */
export function profileCompleteness(data: OnboardingData): number {
  const checks: boolean[] = [
    data.profileName.trim().length > 0,
    data.personsCount > 0,
    data.livingArea > 0,
    data.buildingYear > 0,
    Boolean(data.buildingType),
    data.heatGenerators.length > 0,
    data.hotWaterType !== 'unknown',
    data.instruments.length > 0,
    data.goals.length > 0,
    data.occupancyStatus !== null,
    data.windowAge !== 'unknown',
    data.insulationState !== 'unknown',
    data.ventilationType !== 'unknown',
    data.energyCostRange !== 'unknown',
    data.lastRenovationYear !== 'unknown',
    data.postalCode.trim().length > 0,
  ]

  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}
