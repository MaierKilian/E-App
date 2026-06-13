import type { MeasurementResult } from './types'

/**
 * Durchschnittlicher CO₂-Emissionsfaktor des deutschen Strommixes
 * (~0,38 kg CO₂ je kWh, Größenordnung 2023/24). Für eine grobe Schätzung.
 */
export const CO2_PER_KWH = 0.38

/**
 * Identifiziertes jährliches Einsparpotenzial einer Messung in Euro.
 * Liest die je Messung unterschiedlich benannten Spar-Kennzahlen aus `details`.
 * Messungen ohne Sparwert (z. B. Raumklima) liefern 0.
 */
export function resultSavingsEur(result: MeasurementResult): number {
  const d = result.details ?? {}
  const value = d.avoidableCost ?? d.yearlySaving ?? 0
  return Number.isFinite(value) && value > 0 ? value : 0
}

export interface ImpactSummary {
  /** Summe des jährlichen Euro-Einsparpotenzials über alle Messungen. */
  savingsEur: number
  /** Grobe CO₂-Schätzung pro Jahr in kg (aus € über den Strompreis hochgerechnet). */
  co2Kg: number
  /** Anzahl Messungen, die zum Einsparpotenzial beitragen. */
  contributing: number
}

/**
 * Aggregiert das Einsparpotenzial über alle vorliegenden Messergebnisse.
 * @param results Ergebnis-Map aus dem Messungs-Store.
 * @param workPriceCt Strom-Arbeitspreis (ct/kWh) zur €→kWh→CO₂-Schätzung.
 */
export function impactSummary(
  results: Partial<Record<string, MeasurementResult>>,
  workPriceCt: number,
): ImpactSummary {
  let savingsEur = 0
  let contributing = 0
  for (const result of Object.values(results)) {
    if (!result) continue
    const s = resultSavingsEur(result)
    if (s > 0) {
      savingsEur += s
      contributing += 1
    }
  }
  // € → kWh über den Strompreis, dann × Emissionsfaktor (bewusst grob).
  const eurPerKwh = workPriceCt > 0 ? workPriceCt / 100 : 0
  const savedKwh = eurPerKwh > 0 ? savingsEur / eurPerKwh : 0
  const co2Kg = savedKwh * CO2_PER_KWH
  return { savingsEur, co2Kg, contributing }
}
