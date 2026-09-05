import type { HeatTransferType, RoomEntry, RoomType } from '@/types'

/**
 * Räume für Tests, in der Kurzform „Typ, Anzahl".
 *
 * Die Kennungen entstehen als `type#0`, `type#1`, … – bewusst die Form, die
 * `migrateOnboardingData` einem Altprofil gibt. So stehen in den Tests dieselben
 * Raumschlüssel wie in echten Bestandsprofilen (`room_temperature@bedroom#1`),
 * und ein Test, der einen Schlüssel wörtlich nennt, bleibt lesbar.
 */
export function room(
  type: RoomType,
  count = 1,
  extra: { heatTransfer?: HeatTransferType; areaSqm?: number } = {},
): RoomEntry {
  return {
    type,
    instances: Array.from({ length: count }, (_, i) => ({ id: `${type}#${i}`, ...extra })),
  }
}
