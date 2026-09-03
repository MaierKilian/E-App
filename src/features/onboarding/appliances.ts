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

/**
 * Kennung eines neu angelegten Geräts.
 *
 * Die Art steht vorn, damit die Kennung im Speicher lesbar bleibt; der Rest
 * macht sie einmalig. **Bewusst nicht die kleinste freie Nummer:** Die würde
 * nach dem Löschen wieder vergeben, und das nächste Gerät erbte das Ergebnis
 * des gelöschten – genau der Fehler, den die Kennung verhindern soll.
 */
export function newApplianceId(kind: ApplianceKind): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${kind}-${unique}`
}

/** Ein weiteres Gerät dieser Art anlegen. */
export function addAppliance(
  appliances: readonly ApplianceEntry[] | undefined,
  kind: ApplianceKind,
): ApplianceEntry[] {
  return [...(appliances ?? []), { id: newApplianceId(kind), kind }]
}

/** Ein Gerät entfernen. Andere Geräte behalten ihre Kennung. */
export function removeAppliance(
  appliances: readonly ApplianceEntry[] | undefined,
  id: string,
): ApplianceEntry[] {
  return (appliances ?? []).filter((a) => a.id !== id)
}

/** Ein Feld eines Geräts ändern; alles andere bleibt, wie es war. */
export function updateAppliance(
  appliances: readonly ApplianceEntry[] | undefined,
  id: string,
  patch: Partial<Omit<ApplianceEntry, 'id' | 'kind'>>,
): ApplianceEntry[] {
  return (appliances ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a))
}

/**
 * Die Geräte, die einen Check bedienen – in der Reihenfolge der Liste.
 *
 * Gegenstück zu `roomInstances()`: Was dort der Raum ist, ist hier das Gerät.
 * Ein Kühl-Gefrier-Kombigerät erscheint in **beiden** Listen, weil es beide
 * Checks bedient – gemessen werden an ihm zwei verschiedene Fächer.
 *
 * Die Reihenfolge ist die der Geräteliste und damit stabil: Ein gelöschtes
 * Gerät verschiebt die übrigen nicht in ihrer Identität, nur in ihrer Position.
 */
export function applianceInstances(
  appliances: readonly ApplianceEntry[] | undefined,
  wanted: 'fridge' | 'freezer',
): ApplianceEntry[] {
  return (appliances ?? []).filter((a) => serves(a.kind, wanted))
}
