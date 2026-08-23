import type { MeasurementId, MeasurementResult } from '../types'

/**
 * Messungen, deren Umsetzung die Grundlast tatsächlich senkt.
 *
 * Nur diese lösen den Anstoß zum Nachmessen aus. Der Duschkopf spart Warmwasser
 * und der LED-Check Strom beim Leuchten – beides taucht in der Grundlast nicht
 * auf, ein Nachmessen würde dort nichts zeigen.
 */
const LOWERING_MEASUREMENTS: readonly MeasurementId[] = ['standby', 'fridge', 'freezer']

/**
 * Wartezeit nach der auslösenden Messung, bevor zum Nachmessen aufgefordert
 * wird. Wer den Standby-Check gerade erst beendet hat, hat noch keinen Stecker
 * gezogen – ein sofortiger Anstoß liefe ins Leere.
 */
const SETTLE_DAYS = 2

const MS_PER_DAY = 86_400_000

export interface RemeasurePrompt {
  /** Messung, die den Anstoß ausgelöst hat. */
  trigger: MeasurementId
  /** Tage seit dieser Messung. */
  daysSince: number
}

/**
 * Ob es sich lohnt, die Grundlast erneut zu messen.
 *
 * Der Grundlast-Check ist die einzige Messung, deren Wirkung der Nutzer selbst
 * nachprüfen kann – aber nur, wenn er ein zweites Mal misst. Von allein kommt
 * darauf niemand, deshalb dieser Anstoß.
 *
 * Bedingungen: Es gibt eine Grundlast-Messung, danach wurde eine Messung
 * abgeschlossen, die die Grundlast senken kann, und seither sind mindestens
 * {@link SETTLE_DAYS} Tage vergangen.
 *
 * Der Anstoß verschwindet von selbst, sobald neu gemessen wurde – dann ist die
 * Grundlast wieder die jüngste Messung.
 *
 * @param results Ergebnis-Map aus dem Messungs-Store.
 */
export function remeasurePrompt(
  results: Partial<Record<string, MeasurementResult>>,
  now = Date.now(),
): RemeasurePrompt | undefined {
  const baseAt = time(results['base_load']?.completedAt)
  if (baseAt === undefined) return undefined

  let trigger: MeasurementId | undefined
  let triggerAt = baseAt
  for (const result of Object.values(results)) {
    if (!result || !LOWERING_MEASUREMENTS.includes(result.id)) continue
    const at = time(result.completedAt)
    // Nur Messungen *nach* der Grundlast zählen; ältere hat sie schon erfasst.
    if (at === undefined || at <= triggerAt) continue
    trigger = result.id
    triggerAt = at
  }
  if (trigger === undefined) return undefined

  const daysSince = Math.floor((now - triggerAt) / MS_PER_DAY)
  if (daysSince < SETTLE_DAYS) return undefined
  return { trigger, daysSince }
}

/** ISO-Zeitstempel als Millisekunden, oder undefined bei Unsinn. */
function time(iso: string | undefined): number | undefined {
  if (!iso) return undefined
  const ms = new Date(iso).getTime()
  return Number.isFinite(ms) ? ms : undefined
}
