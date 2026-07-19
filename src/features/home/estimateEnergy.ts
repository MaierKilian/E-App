import type { OnboardingData, RenovationItem } from '@/types'

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
 * Grobe Effizienz-Einordnung der Gebäudehülle (Baustein 1 der
 * Renovierungshistorie – siehe docs/renovation-redesign.md).
 *
 * BEWUSST OHNE ABSOLUTE ZAHL/KLASSE nach außen: Der intern geschätzte
 * Heizwärmebedarf dient nur dazu, eine RELATIVE Wirkung („−X % gegenüber
 * unsaniert") und die RANGFOLGE der Hebel abzuleiten – beides ist robust, auch
 * wenn die absoluten Werte grob sind. Reine Funktionen, keine Seiteneffekte.
 */

/** Hüllen-Bauteile mit multiplikativem Abschlag, wenn saniert (grobe Richtwerte). */
const ENVELOPE_FACTORS: Partial<Record<RenovationItem, number>> = {
  facade: 0.8, // −20 % (größter Hebel)
  roof_insulation: 0.88, // −12 %
  windows: 0.88, // −12 %
  basement_ceiling: 0.94, // −6 %
}

/** Reihenfolge der Bauteile nach Wirkung (größter Hebel zuerst). */
const ENVELOPE_BY_EFFECT = (Object.entries(ENVELOPE_FACTORS) as [RenovationItem, number][]).sort(
  (a, b) => a[1] - b[1],
)

/** Spez. Heizwärmebedarf unsaniert (kWh/m²·a) je Baujahr; null, wenn unbekannt. */
function baseHeatDemand(buildingYear: number): number | null {
  if (!Number.isFinite(buildingYear) || buildingYear <= 0) return null
  if (buildingYear < 1978) return 220
  if (buildingYear <= 1994) return 150
  if (buildingYear <= 2001) return 100
  if (buildingYear <= 2015) return 70
  return 50
}

export interface EnvelopeEstimate {
  /** Position auf der Effizienz-Skala 0..1 (0 = effizient, 1 = sanierungsbedürftig); null, wenn Baujahr fehlt. */
  position: number | null
  /** Relative Einsparung der erfassten Sanierungen ggü. unsaniertem Bau (%). */
  savingsPct: number
  /** Bauteil mit dem größten noch offenen Hebel; null, wenn Hülle rundum saniert. */
  nextLever: RenovationItem | null
  /** Einsparpotenzial des nächsten Hebels (%). */
  nextLeverPct: number
}

/**
 * Leitet aus Baujahr + erfassten Sanierungen (`renovationItems`) die qualitative
 * Hüllen-Einordnung ab. Nutzt nur bestehende Felder (Baustein 1, keine
 * Modelländerung).
 */
export function estimateEnvelope(data: OnboardingData): EnvelopeEstimate {
  const items = data.renovationItems ?? []

  // Produkt der Abschläge über die sanierten Hüllen-Bauteile (Heizung zählt nicht).
  const appliedFactor = ENVELOPE_BY_EFFECT.reduce(
    (f, [item, factor]) => (items.includes(item) ? f * factor : f),
    1,
  )
  const savingsPct = Math.round((1 - appliedFactor) * 100)

  // Größter noch offener Hebel = wirkungsstärkstes, nicht saniertes Bauteil.
  const remaining = ENVELOPE_BY_EFFECT.find(([item]) => !items.includes(item))
  const nextLever = remaining ? remaining[0] : null
  const nextLeverPct = remaining ? Math.round((1 - remaining[1]) * 100) : 0

  // Position auf der Skala nur, wenn das Baujahr eine Basis liefert.
  const base = baseHeatDemand(data.buildingYear)
  const position =
    base === null ? null : Math.min(1, Math.max(0, (base * appliedFactor - 50) / (250 - 50)))

  return { position, savingsPct, nextLever, nextLeverPct }
}

/**
 * Einzel-Prüfungen für die Profil-Vollständigkeit (true = sinnvoll befüllt).
 * Gemeinsame Basis für `profileCompleteness` und `profileMissingCount`.
 */
function profileChecks(data: OnboardingData): boolean[] {
  return [
    (data.profileName ?? '').trim().length > 0,
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
    (data.postalCode ?? '').trim().length > 0,
  ]
}

/**
 * Schätzt, wie vollständig das Haushaltsprofil ausgefüllt ist (0..100).
 * Einfache, robuste Heuristik: Anteil sinnvoll befüllter / nicht-"unknown" Felder.
 */
export function profileCompleteness(data: OnboardingData): number {
  const checks = profileChecks(data)
  const filled = checks.filter(Boolean).length
  return Math.round((filled / checks.length) * 100)
}

/** Anzahl noch offener Profil-Angaben (für „Noch N Angaben"). */
export function profileMissingCount(data: OnboardingData): number {
  return profileChecks(data).filter((ok) => !ok).length
}
