import type { TFunction } from 'i18next'
import type { HeatTransferType, RoomEntry, RoomInstanceEntry, RoomType } from '@/types'
import type { MeasurementResult } from './types'

/**
 * Kennung für einen **neuen** Raum.
 *
 * Der Typ steht vorn und `#` trennt ihn ab, damit {@link parseRoomKey} die
 * Raumart auch dann noch aus einem Schlüssel lesen kann, wenn der Raum selbst
 * gelöscht wurde – ein gespeichertes Ergebnis heißt dann immer noch
 * „Schlafzimmer" statt gar nichts.
 *
 * Der hintere Teil ist bewusst **keine laufende Nummer**: Sie würde nach dem
 * Löschen wiederverwendet, und der neue Raum erbte die Messergebnisse des
 * gelöschten.
 */
export function newRoomId(type: RoomType): string {
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  return `${type}#${unique}`
}

/** Ein konkreter Raum, aus `rooms` aufgeklappt und um seine Raumart ergänzt. */
export interface RoomInstance extends RoomInstanceEntry {
  /** Schlüssel für Messergebnisse – identisch mit `id`. */
  key: string
  type: RoomType
  /** Position innerhalb der eigenen Raumart, nur für die Beschriftung. */
  index: number
  /** Gesamtzahl dieser Raumart (für die Beschriftung „Schlafzimmer 2"). */
  total: number
}

/** Klappt die nach Raumart gruppierten Einträge in einzelne Räume auf. */
export function roomInstances(rooms: RoomEntry[]): RoomInstance[] {
  const out: RoomInstance[] = []
  for (const r of rooms) {
    const list = r.instances ?? []
    list.forEach((inst, i) => {
      out.push({ ...inst, key: inst.id, type: r.type, index: i, total: list.length })
    })
  }
  return out
}

/** Der Raum zu einem Ergebnis-Schlüssel – `undefined`, wenn es ihn nicht (mehr) gibt. */
export function findRoomInstance(rooms: RoomEntry[], roomKey: string): RoomInstance | undefined {
  return roomInstances(rooms).find((inst) => inst.key === roomKey)
}

/** Wärmeübergabe eines konkreten Raums. */
export function roomHeatTransfer(
  rooms: RoomEntry[],
  roomKey: string | undefined,
): HeatTransferType | undefined {
  return roomKey ? findRoomInstance(rooms, roomKey)?.heatTransfer : undefined
}

/**
 * Anzeigename eines Raums.
 *
 * Der eigene Name schlägt alles; sonst benennt die Raumart ihn, nummeriert nur
 * bei mehreren gleichen Räumen. Dasselbe Vorgehen wie bei den Geräten
 * (`applianceLabel`) – zwei Zeilen „Kinderzimmer" untereinander wären in einer
 * Auswahl unbrauchbar.
 */
export function roomLabel(
  t: TFunction,
  inst: { type: RoomType; index: number; total: number; name?: string },
): string {
  const own = inst.name?.trim()
  if (own) return own
  const base = t(`onboarding.step3.roomTypes.${inst.type}`)
  return inst.total > 1 ? `${base} ${inst.index + 1}` : base
}

/**
 * Beschriftung zu einem Ergebnis-Schlüssel.
 *
 * Fällt auf die blanke Raumart zurück, wenn es den Raum nicht mehr gibt: Ein
 * gelöschter Raum lässt sein Ergebnis zurück, und „Schlafzimmer" ist dort eine
 * bessere Auskunft als eine leere Zeile.
 */
export function roomLabelForKey(
  t: TFunction,
  rooms: RoomEntry[],
  roomKey: string,
): string | undefined {
  const inst = findRoomInstance(rooms, roomKey)
  if (inst) return roomLabel(t, inst)
  const parsed = parseRoomKey(roomKey)
  return parsed ? t(`onboarding.step3.roomTypes.${parsed.type}`) : undefined
}

/**
 * Ortsangabe einer Raum-Instanz für den Fließtext: „in der Küche", „im Bad",
 * „auf dem Dachboden".
 *
 * Nötig, weil {@link roomLabel} den blanken Namen liefert. In einem Satz ergibt
 * das „Fang im Küche an" – die Räume haben unterschiedliche Geschlechter, und
 * eine fest verdrahtete Präposition trifft sie nicht alle. Die vollständige
 * Wendung steht deshalb je Raumtyp in den Texten.
 */
export function roomLabelIn(
  t: TFunction,
  inst: { type: RoomType; index: number; total: number; name?: string },
): string {
  const own = inst.name?.trim()
  // Mit eigenem Namen trägt die Präposition der Raumtyp nicht mehr: „in
  // Zimmer Lena" statt „im Zimmer Lena" – ein Name ist grammatisch ein
  // Eigenname, kein Gattungswort.
  if (own) return `${t('measurements.rooms.inNamed')} ${own}`
  const base = t(`onboarding.step3.roomTypesIn.${inst.type}`)
  return inst.total > 1 ? `${base} ${inst.index + 1}` : base
}

/**
 * Liest die Raumart aus einem Raum-Schlüssel ("bedroom#0", "bedroom#a1b2c3d4").
 *
 * Nur für den Fall, dass es den Raum nicht mehr gibt – wo er existiert, liefert
 * {@link findRoomInstance} mehr. Der hintere Teil ist seit dem Instanz-Umbau
 * keine Zahl mehr, deshalb passt der Ausdruck auf beliebige Zeichen. Ein
 * Schlüssel ohne `#` (der Warmwasser-Check legt dort die Entnahmestelle ab)
 * bleibt wie bisher ohne Treffer.
 */
export function parseRoomKey(roomKey: string): { type: RoomType } | null {
  const m = /^([^#]+)#(.+)$/.exec(roomKey)
  if (!m) return null
  return { type: m[1] as RoomType }
}

/** Schlüssel eines Mess-Ergebnisses inkl. optionalem Raum (z. B. "room_temperature@bedroom#0"). */
export function instanceKey(id: string, roomKey?: string): string {
  return roomKey ? `${id}@${roomKey}` : id
}

/**
 * Liefert ein repräsentatives Ergebnis einer Messung – das direkte (ohne Raum)
 * oder, falls die Messung pro Raum läuft, das erste vorhandene Raum-Ergebnis.
 * Nützlich für Übersichten (z. B. Berichte), die nur „gemessen ja/nein" brauchen.
 */
export function anyResultFor(
  results: Partial<Record<string, MeasurementResult>>,
  id: string,
): MeasurementResult | undefined {
  if (results[id]) return results[id]
  const prefix = `${id}@`
  for (const [key, value] of Object.entries(results)) {
    if (key.startsWith(prefix) && value) return value
  }
  return undefined
}
