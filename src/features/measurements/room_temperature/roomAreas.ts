import type { RoomEntry, RoomType } from '@/types'

/**
 * Typische **relative Größe** je Raumtyp – dient als Gewicht, nicht als feste
 * Absolutfläche. Die tatsächliche Wohnfläche (`livingArea`) wird anhand dieser
 * Gewichte auf die Räume verteilt, sodass die Flächen in Summe die im Profil
 * angegebene Gesamt-Wohnfläche ergeben.
 */
export const TYPICAL_AREA_SQM: Record<RoomType, number> = {
  living_room: 28,
  dining_room: 14,
  bedroom: 14,
  children_room: 12,
  office: 12,
  kitchen: 10,
  bathroom: 8,
  toilet: 3,
  hallway: 6,
  utility_room: 6,
  basement: 12,
  staircase: 6,
  attic: 14,
}

export interface ResolvedArea {
  /** Effektive Fläche je Raum-Instanz dieses Typs in m². */
  areaSqm: number
  /** true, wenn der Wert aus der Verteilung stammt (keine eigene Angabe). */
  estimated: boolean
}

/**
 * Effektive Fläche eines Raumtyps (je Instanz). Hat der Nutzer eine Fläche
 * eingetragen, gilt sie direkt. Sonst wird die **verbleibende** Wohnfläche
 * (Gesamt − bereits eingetragene Räume) gewichtet nach {@link TYPICAL_AREA_SQM}
 * auf die übrigen Räume verteilt. So summieren sich alle Räume auf die im Profil
 * angegebene Wohnfläche.
 */
export function resolveRoomArea(
  rooms: RoomEntry[],
  livingArea: number,
  type: RoomType,
): ResolvedArea {
  const entry = rooms.find((r) => r.type === type)
  if (entry && Number.isFinite(entry.areaSqm) && (entry.areaSqm as number) > 0) {
    return { areaSqm: entry.areaSqm as number, estimated: false }
  }

  const living = Number.isFinite(livingArea) && livingArea > 0 ? livingArea : 0
  if (living <= 0) {
    return { areaSqm: TYPICAL_AREA_SQM[type], estimated: true }
  }

  // Bereits eingetragene Flächen abziehen, Rest nach Gewichten verteilen.
  let explicitSum = 0
  let fallbackWeight = 0
  for (const r of rooms) {
    const count = Math.max(1, Math.floor(r.count ?? 1))
    if (Number.isFinite(r.areaSqm) && (r.areaSqm as number) > 0) {
      explicitSum += (r.areaSqm as number) * count
    } else {
      fallbackWeight += (TYPICAL_AREA_SQM[r.type] ?? 0) * count
    }
  }

  const remaining = Math.max(0, living - explicitSum)
  const weight = TYPICAL_AREA_SQM[type] ?? 0
  const areaSqm = fallbackWeight > 0 ? (remaining * weight) / fallbackWeight : TYPICAL_AREA_SQM[type]
  return { areaSqm, estimated: true }
}
