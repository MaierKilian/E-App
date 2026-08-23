import type { MeasurementId, MeasurementResult } from './types'
import { remeasurePrompt } from './base_load/remeasure'

/**
 * Ein anstehender Anlass, eine bereits abgeschlossene Messung erneut
 * durchzuführen – entweder weil eine Maßnahme ihre Wirkung zeigen soll
 * (Grundlast) oder weil das letzte Ergebnis noch nicht gut war und eine
 * Anpassung ansteht (Kühlschrank). Speist die kleinen Hinweispunkte in der
 * unteren Navigation und in der Messungsliste – siehe `BottomNav`,
 * `MeasurementFlow`.
 */
export interface FollowUp {
  /** Instanz-Schlüssel wie in `results` (bei diesen beiden ohne Raum). */
  key: string
  id: MeasurementId
}

/** Alle Messungen, für die gerade eine sinnvolle Folgemessung ansteht. */
export function pendingFollowUps(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
): FollowUp[] {
  const out: FollowUp[] = []

  if (remeasurePrompt(results, now)) {
    out.push({ key: 'base_load', id: 'base_load' })
  }

  // Kühlschrank: letztes Ergebnis nicht gut → die Stufe wurde noch nicht
  // (oder noch nicht erfolgreich) angepasst.
  const fridge = results['fridge']
  if (fridge && fridge.rating !== 'good') {
    out.push({ key: 'fridge', id: 'fridge' })
  }

  return out
}

/** Nur die Schlüssel, für schnelle Lookups in Listen (`Set.has`). */
export function pendingFollowUpKeys(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
): Set<string> {
  return new Set(pendingFollowUps(results, now).map((f) => f.key))
}
