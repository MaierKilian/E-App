import type { MeasurementResult } from './types'
import { displaySavingEur, isMeasuredSaving } from './savingsDisplay'

/**
 * Durchschnittlicher CO₂-Emissionsfaktor des deutschen Strommixes
 * (~0,38 kg CO₂ je kWh, Größenordnung 2023/24). Für eine grobe Schätzung.
 */
export const CO2_PER_KWH = 0.38

/**
 * Identifiziertes jährliches Einsparpotenzial einer Messung in Euro – roh.
 * Liest die je Messung unterschiedlich benannten Spar-Kennzahlen aus `details`.
 * Messungen ohne Sparwert (z. B. Raumklima) liefern 0.
 *
 * **Nicht direkt anzeigen.** Der Rohwert enthält auch Beträge, die auf
 * geschätzten Nutzungshäufigkeiten beruhen, und Kleinbeträge unterhalb der
 * Anzeigeschwelle. Für die Anzeige ist {@link displayableSavingEur} zuständig.
 */
export function resultSavingsEur(result: MeasurementResult): number {
  const d = result.details ?? {}
  const value = d.avoidableCost ?? d.yearlySaving ?? 0
  return Number.isFinite(value) && value > 0 ? value : 0
}

/**
 * Anzeigbarer Euro-Betrag eines einzelnen Ergebnisses, oder `undefined`.
 *
 * Vereint beide Regeln der App an einer Stelle: Der Betrag muss aus Gemessenem
 * stammen (`isMeasuredSaving`) und über der Anzeigeschwelle liegen
 * (`displaySavingEur`). Damit zeigen Messungen, Empfehlungen und Bericht
 * dieselbe Zahl – vorher nannte die Messungs-Übersicht Beträge, die die
 * Empfehlungen bewusst nicht mehr behaupteten.
 */
export function displayableSavingEur(result: MeasurementResult): number | undefined {
  if (!isMeasuredSaving(result.details)) return undefined
  return displaySavingEur(resultSavingsEur(result))
}

export interface ImpactSummary {
  /** Summe des anzeigbaren jährlichen Euro-Einsparpotenzials. */
  savingsEur: number
  /** Grobe CO₂-Schätzung pro Jahr in kg (aus € über den Strompreis hochgerechnet). */
  co2Kg: number
  /** Anzahl Messungen, die zum Einsparpotenzial beitragen. */
  contributing: number
}

/**
 * Aggregiert das Einsparpotenzial über alle vorliegenden Messergebnisse.
 *
 * Gebündelt wird je **Messung**, nicht je Ergebnis: Pro-Raum-Messungen wie die
 * Beleuchtung liefern ein Ergebnis pro Raum, und die Anzeigeschwelle gehört auf
 * die Summe der Räume – sonst fiele eine Messung mit fünf kleinen Räumen durch,
 * obwohl sie in Summe deutlich über der Schwelle liegt. Genauso rechnen die
 * Empfehlungen und der PDF-Bericht.
 *
 * @param results Ergebnis-Map aus dem Messungs-Store.
 * @param workPriceCt Strom-Arbeitspreis (ct/kWh) zur €→kWh→CO₂-Schätzung.
 */
export function impactSummary(
  results: Partial<Record<string, MeasurementResult>>,
  workPriceCt: number,
): ImpactSummary {
  // Rohsummen je Messung sammeln – und ob jedes beitragende Ergebnis gemessen
  // ist. Eine geschätzte Teilmenge macht die ganze Summe zur Schätzung.
  const perMeasurement = new Map<string, { raw: number; measured: boolean }>()
  for (const result of Object.values(results)) {
    if (!result) continue
    const raw = resultSavingsEur(result)
    if (raw <= 0) continue
    const entry = perMeasurement.get(result.id) ?? { raw: 0, measured: true }
    entry.raw += raw
    entry.measured = entry.measured && isMeasuredSaving(result.details)
    perMeasurement.set(result.id, entry)
  }

  let savingsEur = 0
  let contributing = 0
  for (const { raw, measured } of perMeasurement.values()) {
    const shown = measured ? displaySavingEur(raw) : undefined
    if (shown === undefined) continue
    savingsEur += shown
    contributing += 1
  }

  // € → kWh über den Strompreis, dann × Emissionsfaktor (bewusst grob).
  const eurPerKwh = workPriceCt > 0 ? workPriceCt / 100 : 0
  const savedKwh = eurPerKwh > 0 ? savingsEur / eurPerKwh : 0
  const co2Kg = savedKwh * CO2_PER_KWH
  return { savingsEur, co2Kg, contributing }
}
