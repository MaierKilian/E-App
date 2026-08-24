import type { OnboardingData, RenovationItem } from '@/types'
// Eine Quelle für die Baujahrs-Staffel: dieselben Richtwerte zeigt der
// spezifische Kennwert im Monitoring als Vergleichswert an. Zwei Kopien wären
// zwei Wahrheiten, sobald jemand eine davon anpasst.
import { heatDemandBenchmark } from '@/features/monitoring/specificValues'

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
  const base = heatDemandBenchmark(data.buildingYear)
  const position =
    base === undefined ? null : Math.min(1, Math.max(0, (base * appliedFactor - 50) / (250 - 50)))

  return { position, savingsPct, nextLever, nextLeverPct }
}
