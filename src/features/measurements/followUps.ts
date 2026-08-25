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

/**
 * Wartezeit nach dem Abtauen, bis der Gefrier-Check erneut lohnt.
 *
 * Ein halbes Jahr: Direkt nach dem Abtauen ist die Truhe erwartbar eisfrei –
 * eine Messung am nächsten Tag bestätigt nur die eigene Arbeit. Erst wenn sich
 * wieder Eis bilden konnte, sagt das Ergebnis etwas Neues.
 */
export const DEFROST_RECHECK_DAYS = 182
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Zeitpunkt aus einem ISO-String, oder undefined bei Unsinn. */
function timeOf(iso: string | undefined): number | undefined {
  if (!iso) return undefined
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : undefined
}

/**
 * Steht der Gefrier-Check nach einem abgehakten Abtauen wieder an?
 *
 * Bedingungen: Das Abtauen wurde als erledigt markiert, seither ist ein halbes
 * Jahr vergangen, und es gab seitdem keine neue Messung. Die letzte Bedingung
 * räumt den Hinweis von selbst wieder ab.
 */
function defrostRecheckDue(
  results: Partial<Record<string, MeasurementResult>>,
  defrostDoneAt: string | undefined,
  now: number,
): boolean {
  const doneAt = timeOf(defrostDoneAt)
  if (doneAt === undefined) return false
  if (now - doneAt < DEFROST_RECHECK_DAYS * MS_PER_DAY) return false
  const measuredAt = timeOf(results['freezer']?.completedAt)
  return measuredAt === undefined || measuredAt <= doneAt
}

/**
 * Alle Messungen, für die gerade eine sinnvolle Folgemessung ansteht.
 *
 * @param defrostDoneAt Zeitpunkt, an dem die Abtau-Empfehlung abgehakt wurde
 *                      (aus dem `tipsStore`). Ohne ihn entfällt nur die
 *                      Gefrier-Erinnerung, der Rest bleibt unberührt.
 */
export function pendingFollowUps(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
  defrostDoneAt?: string,
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

  // Gefriertruhe: ein halbes Jahr nach dem abgehakten Abtauen erneut prüfen.
  if (defrostRecheckDue(results, defrostDoneAt, now)) {
    out.push({ key: 'freezer', id: 'freezer' })
  }

  return out
}

/** Nur die Schlüssel, für schnelle Lookups in Listen (`Set.has`). */
export function pendingFollowUpKeys(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
  defrostDoneAt?: string,
): Set<string> {
  return new Set(pendingFollowUps(results, now, defrostDoneAt).map((f) => f.key))
}
