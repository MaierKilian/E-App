import type { ApplianceEntry, ApplianceKind, OnboardingData, RoomType } from '@/types'
import type { MeasurementId } from '@/features/measurements/types'

/**
 * Kühl- und Gefriergeräte – die einzige Angabe, die bisher nur im Check
 * existierte, und nicht einmal dort.
 *
 * Beide Checks unterstellten, dass es das Gerät gibt. Ein Haushalt ohne
 * Gefriertruhe bekam damit einen Check, den er nie abschließen konnte – und der
 * seit der Fortschrittsvereinheitlichung den Ring dauerhaft unter 100 % hielt.
 *
 * Die Antwort steht deshalb im Profil und nicht im Check: Dort ist sie sichtbar,
 * änderbar und zurücknehmbar. Wer sich ein Gefriergerät anschafft, findet die
 * Stelle wieder; eine im Check versteckte Ausblendung fände er nie.
 */

/** Reihenfolge in der Auswahl: die beiden Einzelgeräte, dann die Kombination. */
export const APPLIANCE_KINDS: ApplianceKind[] = ['fridge', 'freezer', 'fridge_freezer']

/** Räume, die für ein Kühl-/Gefriergerät zur Auswahl stehen. */
export const APPLIANCE_ROOMS: RoomType[] = ['kitchen', 'basement', 'utility_room']

/** Welche Geräteart welchen Check bedient – die Kombination bedient beide. */
function serves(kind: ApplianceKind, wanted: 'fridge' | 'freezer'): boolean {
  return kind === wanted || kind === 'fridge_freezer'
}

/** Gibt es ein Gerät für diesen Check? */
export function hasAppliance(
  appliances: readonly ApplianceEntry[] | undefined,
  wanted: 'fridge' | 'freezer',
): boolean {
  return (appliances ?? []).some((a) => serves(a.kind, wanted))
}

/** Raum des ersten passenden Geräts – Vorauswahl im Check. */
export function applianceRoom(
  appliances: readonly ApplianceEntry[] | undefined,
  wanted: 'fridge' | 'freezer',
): RoomType | undefined {
  return (appliances ?? []).find((a) => serves(a.kind, wanted))?.room
}

/**
 * Checks, die dieses Zuhause nicht betreffen.
 *
 * Abgeleitet statt in `skipped` mitgeschrieben: Eine zweite Kopie derselben
 * Antwort in einem zweiten Store könnte auseinanderlaufen – wer im Profil-Hub
 * doch ein Gefriergerät einträgt, müsste sonst daran denken, den Eintrag in der
 * Skip-Liste zu entfernen. So folgt die Zählung immer der Profilangabe.
 */
export function skippedMeasurements(data: Pick<OnboardingData, 'appliances' | 'appliancesAnswered'>): MeasurementId[] {
  if (!data.appliancesAnswered) return []
  const out: MeasurementId[] = []
  if (!hasAppliance(data.appliances, 'fridge')) out.push('fridge')
  if (!hasAppliance(data.appliances, 'freezer')) out.push('freezer')
  return out
}

/** Ein Gerät ergänzen oder – wenn schon vorhanden – wieder entfernen. */
export function toggleAppliance(
  appliances: readonly ApplianceEntry[] | undefined,
  kind: ApplianceKind,
): ApplianceEntry[] {
  const list = [...(appliances ?? [])]
  const index = list.findIndex((a) => a.kind === kind)
  if (index >= 0) return list.filter((a) => a.kind !== kind)
  return [...list, { kind }]
}
