import type { MeasurementResult } from '../types'

/**
 * Wiedererkennung von Geräten über Messungen hinweg.
 *
 * Der Standby-Check wird mehrfach durchgeführt – nach einer Steckdosenleiste,
 * nach einem Neukauf. Ohne Wiedererkennung trägt man dasselbe Gerät jedes Mal
 * neu ein, ohne zu sehen, was es beim letzten Mal gezogen hat.
 *
 * Verglichen wird über den normalisierten Namen: Groß-/Kleinschreibung und
 * Leerraum sollen nicht darüber entscheiden, ob „Fernseher" und „fernseher "
 * dasselbe Gerät sind.
 */

/** Vergleichsform eines Gerätenamens (leer, wenn kein verwertbarer Name). */
export function normalizeDeviceName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Sucht ein Gerät dieses Namens in einem früheren Standby-Ergebnis.
 *
 * @returns die damals gemessene Leistung in Watt, oder undefined.
 */
export function previouslyMeasured(
  result: MeasurementResult | undefined,
  name: string,
): number | undefined {
  const needle = normalizeDeviceName(name)
  if (!needle || !result?.labels || !result.details) return undefined

  for (const [key, label] of Object.entries(result.labels)) {
    if (normalizeDeviceName(label) !== needle) continue
    const watts = result.details[key]
    if (Number.isFinite(watts) && watts > 0) return watts
  }
  return undefined
}

/**
 * Indizes der Einträge, deren Name schon weiter oben in derselben Liste steht.
 *
 * Nur der spätere Eintrag gilt als Dublette – der erste bleibt unmarkiert,
 * sonst stünde der Hinweis an beiden und keiner wäre der „richtige".
 */
export function duplicateIndices(names: string[]): Set<number> {
  const seen = new Set<string>()
  const duplicates = new Set<number>()
  names.forEach((name, i) => {
    const key = normalizeDeviceName(name)
    if (!key) return
    if (seen.has(key)) duplicates.add(i)
    else seen.add(key)
  })
  return duplicates
}
