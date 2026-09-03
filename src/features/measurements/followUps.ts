import type { MeasurementId, MeasurementResult } from './types'
import { remeasurePrompt } from './base_load/remeasure'
import { instanceKey } from './rooms'
import { applianceInstances } from '@/features/onboarding/appliances'
import type { ApplianceEntry } from '@/types'

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
  result: MeasurementResult | undefined,
  defrostDoneAt: string | undefined,
  now: number,
): boolean {
  const doneAt = timeOf(defrostDoneAt)
  if (doneAt === undefined) return false
  if (now - doneAt < DEFROST_RECHECK_DAYS * MS_PER_DAY) return false
  const measuredAt = timeOf(result?.completedAt)
  return measuredAt === undefined || measuredAt <= doneAt
}

/**
 * Der Ergebnis-Schlüssel eines Geräts – und damit auch die Kennung seines
 * Tipps im `tipsStore`.
 *
 * Der neue Schlüssel gewinnt; sonst zählt für das **erste** Gerät seiner Art
 * das Altergebnis unter dem nackten Schlüssel. Dieselbe Rückfallkette wie im
 * Fortschritt – ohne sie verlöre ein Bestandsnutzer seine Abtau-Erinnerung,
 * weil sein Ergebnis und sein abgehakter Tipp beide unter `freezer` liegen.
 */
function keyForAppliance(
  results: Partial<Record<string, MeasurementResult>>,
  id: string,
  device: ApplianceEntry,
  isFirst: boolean,
): string {
  const own = instanceKey(id, device.id)
  if (results[own]) return own
  return isFirst && results[id] ? id : own
}

/**
 * Ein Eintrag je Gerät, oder – solange kein Gerät bekannt ist – der eine
 * Eintrag wie vor Etappe 12c.
 */
function applianceKeys(
  results: Partial<Record<string, MeasurementResult>>,
  id: 'fridge' | 'freezer',
  appliances: readonly ApplianceEntry[],
): string[] {
  const devices = applianceInstances(appliances, id)
  if (devices.length === 0) return [id]
  return devices.map((device, i) => keyForAppliance(results, id, device, i === 0))
}

/**
 * Alle Messungen, für die gerade eine sinnvolle Folgemessung ansteht.
 *
 * @param doneAt Zeitpunkte, an denen Empfehlungen abgehakt wurden (aus dem
 *               `tipsStore`, je Tipp-Kennung). Ohne sie entfällt nur die
 *               Gefrier-Erinnerung, der Rest bleibt unberührt.
 * @param appliances Die Geräteliste aus dem Profil. Ohne sie verhält sich
 *                   alles wie vor Etappe 12c: ein Eintrag je Check.
 */
export function pendingFollowUps(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
  doneAt: Readonly<Record<string, string>> = {},
  appliances: readonly ApplianceEntry[] = [],
): FollowUp[] {
  const out: FollowUp[] = []

  if (remeasurePrompt(results, now)) {
    out.push({ key: 'base_load', id: 'base_load' })
  }

  // Kühlschrank: letztes Ergebnis nicht gut → die Stufe wurde noch nicht
  // (oder noch nicht erfolgreich) angepasst. Je Gerät einzeln: Der eine
  // Kühlschrank kann längst richtig eingestellt sein, während der andere es
  // nicht ist.
  for (const key of applianceKeys(results, 'fridge', appliances)) {
    const result = results[key]
    if (result && result.rating !== 'good') out.push({ key, id: 'fridge' })
  }

  // Gefriergerät: ein halbes Jahr nach dem abgehakten Abtauen erneut prüfen.
  // Der Zeitstempel gilt je Gerät – die Truhe im Keller ist wieder dran, das
  // Gefrierfach in der Küche noch nicht.
  for (const key of applianceKeys(results, 'freezer', appliances)) {
    if (defrostRecheckDue(results[key], doneAt[key], now)) {
      out.push({ key, id: 'freezer' })
    }
  }

  return out
}

/** Nur die Schlüssel, für schnelle Lookups in Listen (`Set.has`). */
export function pendingFollowUpKeys(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
  doneAt: Readonly<Record<string, string>> = {},
  appliances: readonly ApplianceEntry[] = [],
): Set<string> {
  return new Set(pendingFollowUps(results, now, doneAt, appliances).map((f) => f.key))
}
