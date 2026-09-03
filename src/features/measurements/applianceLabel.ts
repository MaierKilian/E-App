import type { TFunction } from 'i18next'
import type { ApplianceEntry } from '@/types'

/**
 * Beschriftung eines Geräts.
 *
 * Der eigene Name schlägt alles; sonst benennt der Raum es („Kühlschrank
 * Küche"), und ohne Raum bleibt die Art plus laufende Nummer. Zwei Zeilen
 * „Kühlschrank" untereinander wären in einer Auswahl unbrauchbar.
 */
export function applianceLabel(
  t: TFunction,
  device: ApplianceEntry,
  all: readonly ApplianceEntry[],
): string {
  if (device.name?.trim()) return device.name.trim()
  const kind = t(`onboarding.appliances.kinds.${device.kind}`)
  if (device.room) return `${kind} · ${t(`onboarding.step3.roomTypes.${device.room}`)}`
  const sameKind = all.filter((a) => a.kind === device.kind)
  if (sameKind.length < 2) return kind
  return `${kind} ${sameKind.indexOf(device) + 1}`
}
