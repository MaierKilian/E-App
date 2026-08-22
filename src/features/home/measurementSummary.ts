import { MEASUREMENT_CATALOG } from '@/features/measurements/catalog'
import { anyResultFor } from '@/features/measurements/rooms'
import type { MeasurementResult } from '@/features/measurements/types'

type Results = Partial<Record<string, MeasurementResult>>

/**
 * Auswahl-Logik der Messungs-Karte auf dem Zuhause-Einstieg.
 *
 * Getrennt von der Ansicht, weil hier die Entscheidungen stecken, die man
 * prüfen können muss: was als „erledigt" zählt und welche Ergebnisse den
 * knappen Platz bekommen.
 */

/**
 * Fortschritt über den Katalog.
 *
 * Zählt nur verfügbare Messungen: „Bald"-Einträge ließen den Fortschritt
 * dauerhaft unerreichbar aussehen. Eine Pro-Raum-Messung gilt als erledigt,
 * sobald ein Raum gemessen wurde – sonst hinge der Ring an Räumen, die der
 * Nutzer bewusst ausgelassen hat.
 */
export function measurementProgress(results: Results): { done: number; total: number } {
  const available = MEASUREMENT_CATALOG.filter((m) => m.available)
  return {
    done: available.filter((m) => anyResultFor(results, m.id)).length,
    total: available.length,
  }
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
