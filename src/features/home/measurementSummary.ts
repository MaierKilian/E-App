import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { catalogProgress } from '@/features/measurements/progress'
import type { MeasurementResult } from '@/features/measurements/types'
import type { RoomEntry } from '@/types'

type Results = Partial<Record<string, MeasurementResult>>

/**
 * Auswahl-Logik der Messungs-Karte auf dem Zuhause-Einstieg.
 *
 * Getrennt von der Ansicht, weil hier die Entscheidungen stecken, die man
 * prüfen können muss: was als „erledigt" zählt und welche Ergebnisse den
 * knappen Platz bekommen.
 */

/**
 * Fortschritt über den Katalog – dieselbe Rechnung wie der Ring im Messungen-
 * Kopf und die Gewerke-Kacheln (siehe `measurements/progress.ts`).
 *
 * Früher zählte diese Karte eigenständig und großzügiger: Ein Pro-Raum-Check
 * galt hier schon mit dem ersten Raum als erledigt, im Messungen-Bereich erst
 * mit dem letzten. Beide Ringe standen damit regelmäßig auf verschiedenen
 * Zahlen, obwohl sie dasselbe beschriften.
 */
export function measurementProgress(
  results: Results,
  rooms: RoomEntry[] = [],
  skipped: readonly string[] = [],
): { done: number; total: number } {
  return catalogProgress(results, rooms, skipped)
}

/**
 * Die zuletzt erzielten Ergebnisse, höchstens `limit` – je Messung nur das
 * jüngste.
 *
 * Ohne die Bündelung je Messung füllte eine Pro-Raum-Messung mit sechs Räumen
 * die Liste allein. Ergebnisse ohne Katalog-Eintrag (Altdaten einer entfernten
 * Messung) bleiben außen vor: Für sie gäbe es weder einen Titel noch ein Ziel
 * zum Antippen.
 */
export function recentResults(results: Results, limit: number): MeasurementResult[] {
  const known = new Set<string>(MEASUREMENT_CATALOG.map((m) => m.id))
  const latest = new Map<string, MeasurementResult>()
  for (const r of Object.values(results)) {
    if (!r || !known.has(r.id)) continue
    const seen = latest.get(r.id)
    if (!seen || r.completedAt > seen.completedAt) latest.set(r.id, r)
  }
  return [...latest.values()]
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit)
}
