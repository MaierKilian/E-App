/**
 * Zeitraum-Auswahl für das Verlaufs-Diagramm.
 *
 * Reine Funktionen, damit sich die Grenzfälle prüfen lassen: vertauschte
 * Datumsgrenzen, nur eine gesetzte Grenze, ein Zeitraum ohne Ablesungen.
 */

/**
 * Auswählbare Zeiträume.
 *
 * `custom` ist der frei wählbare Zeitraum von Datum bis Datum – die festen
 * Stufen treffen selten genau das, was man vergleichen will (eine Heizperiode,
 * die Wochen vor und nach einer Maßnahme).
 */
export type RangeKey = 'd7' | 'd30' | 'all' | 'custom'

/** Feste Stufen in Tagen; `null` = alles. */
export const RANGE_DAYS: Record<Exclude<RangeKey, 'custom'>, number | null> = {
  d7: 7,
  d30: 30,
  all: null,
}

/** Reihenfolge der Auswahl in der Oberfläche. */
export const RANGE_KEYS: RangeKey[] = ['d7', 'd30', 'all', 'custom']

const MS_PER_DAY = 86_400_000

/** Ein ISO-Datum (yyyy-mm-dd), sonst undefined. */
function isoOrUndefined(value: string | undefined): string | undefined {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
}

/**
 * Filtert Diagramm-Punkte auf den gewählten Zeitraum.
 *
 * ISO-Daten (`yyyy-mm-dd`) lassen sich als Zeichenketten vergleichen – das
 * spart die Umrechnung in Zeitstempel und damit jede Zeitzonen-Frage.
 *
 * Grenzfälle bewusst nachsichtig: Sind beide Grenzen gesetzt, aber vertauscht,
 * wird die kleinere als Anfang genommen, statt ein leeres Diagramm zu zeigen.
 * Ist nur eine Grenze gesetzt, gilt sie einseitig; ist keine gesetzt, bleibt
 * alles sichtbar – so zeigt der frisch gewählte freie Zeitraum erst einmal die
 * vollständigen Daten, die man dann eingrenzt.
 */
export function filterByRange<T extends { date: string }>(
  points: T[],
  range: RangeKey,
  now: number,
  from?: string,
  to?: string,
): T[] {
  if (range === 'custom') {
    const a = isoOrUndefined(from)
    const b = isoOrUndefined(to)
    if (!a && !b) return points
    const start = a && b ? (a <= b ? a : b) : a
    const end = a && b ? (a <= b ? b : a) : b
    return points.filter((p) => (!start || p.date >= start) && (!end || p.date <= end))
  }

  const days = RANGE_DAYS[range]
  if (days === null) return points
  const cutoff = now - days * MS_PER_DAY
  return points.filter((p) => {
    const t = new Date(`${p.date}T00:00:00`).getTime()
    return Number.isFinite(t) && t >= cutoff
  })
}
