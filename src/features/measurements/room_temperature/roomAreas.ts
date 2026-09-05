import type { RoomEntry, RoomType } from '@/types'
import { parseRoomKey, roomInstances } from '../rooms'

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
  /** Effektive Fläche dieses Raums in m². */
  areaSqm: number
  /** true, wenn der Wert aus der Verteilung stammt (keine eigene Angabe). */
  estimated: boolean
}

/**
 * Effektive Fläche **eines konkreten Raums**. Hat der Nutzer für ihn eine
 * Fläche eingetragen, gilt sie direkt. Sonst wird die **verbleibende**
 * Wohnfläche (Gesamt − alle eingetragenen Räume) gewichtet nach
 * {@link TYPICAL_AREA_SQM} auf die übrigen Räume verteilt. So summieren sich
 * alle Räume auf die im Profil angegebene Wohnfläche.
 *
 * Seit dem Instanz-Umbau je Raum statt je Raumart: Vorher galt eine
 * eingetragene Fläche für alle Räume der Art gleichzeitig, und die Verteilung
 * rechnete mit `count`. Ein 9-m²- und ein 18-m²-Kinderzimmer bekamen denselben
 * Wert – und damit dieselbe Einsparung in €/Jahr, obwohl einer der beiden um
 * den Faktor zwei danebenlag (`calcRoomTempSaving` in `RoomTemperatureRun`).
 */
export function resolveRoomArea(
  rooms: RoomEntry[],
  livingArea: number,
  roomKey: string,
): ResolvedArea {
  const instances = roomInstances(rooms)
  const self = instances.find((inst) => inst.key === roomKey)
  const type = self?.type ?? parseRoomKey(roomKey)?.type

  if (self && Number.isFinite(self.areaSqm) && (self.areaSqm as number) > 0) {
    return { areaSqm: self.areaSqm as number, estimated: false }
  }

  const fallback = (type && TYPICAL_AREA_SQM[type]) || 0
  const living = Number.isFinite(livingArea) && livingArea > 0 ? livingArea : 0
  if (living <= 0) return { areaSqm: fallback, estimated: true }

  // Bereits eingetragene Flächen abziehen, Rest nach Gewichten verteilen.
  let explicitSum = 0
  let fallbackWeight = 0
  for (const inst of instances) {
    if (Number.isFinite(inst.areaSqm) && (inst.areaSqm as number) > 0) {
      explicitSum += inst.areaSqm as number
    } else {
      fallbackWeight += TYPICAL_AREA_SQM[inst.type] ?? 0
    }
  }

  const remaining = Math.max(0, living - explicitSum)
  const areaSqm = fallbackWeight > 0 ? (remaining * fallback) / fallbackWeight : fallback
  return { areaSqm, estimated: true }
}
