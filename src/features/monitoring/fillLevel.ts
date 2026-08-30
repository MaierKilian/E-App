/**
 * Reine Umrechnungen rund um den Füllstand eines Vorrats.
 *
 * Gespeichert wird **immer** in der Einheit des Trägers (l, kg, m³), nie in
 * Prozent. Prozent ist eine Eingabe- und Anzeigeform – stünde sie im
 * Datenmodell, bräuchte jede auswertende Stelle das Fassungsvermögen. Siehe
 * `docs/tank-concept.md`, Abschnitt 4.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Ohne hinterlegtes Fassungsvermögen ist der gespeicherte Wert unmittelbar der
 * Prozentwert. Die Rechnung bleibt dieselbe, nur die Einheit ist eine andere –
 * deshalb genügt hier ein Ersatz-Nenner von 100.
 */
function effectiveCapacity(capacity?: number): number {
  return capacity !== undefined && Number.isFinite(capacity) && capacity > 0 ? capacity : 100
}

/** Füllstand → Prozent, auf 0–100 begrenzt. */
export function toPercent(value: number, capacity?: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, (value / effectiveCapacity(capacity)) * 100))
}

/** Prozent → Füllstand in der Einheit des Trägers. */
export function fromPercent(percent: number, capacity?: number): number {
  return Math.round((percent / 100) * effectiveCapacity(capacity) * 10) / 10
}

/**
 * Schätzt den Füllstand an einem späteren Tag aus dem bisherigen
 * Tagesverbrauch.
 *
 * Gebraucht wird das für die Vorbelegung des Stands nach einer Lieferung. Der
 * naheliegende Vorschlag „letzter Stand + Menge" wäre bequem und falsch: Er
 * behauptet, seit der letzten Ablesung sei nichts verbraucht worden, und genau
 * dieser Verbrauch fiele aus der Rechnung. Wer zwischen Ablesung und Lieferung
 * vier Wochen heizt, verlöre einen Monat.
 *
 * Ohne belastbare Tagesrate bleibt es beim letzten bekannten Stand – dann ist
 * die Schätzung nicht besser, aber auch nicht schlechter als nichts.
 */
export function estimateLevelAt(
  lastValue: number,
  lastDateIso: string,
  targetDateIso: string,
  perDay: number | undefined,
): number {
  if (!Number.isFinite(lastValue)) return 0
  const from = new Date(`${lastDateIso}T00:00:00`).getTime()
  const to = new Date(`${targetDateIso}T00:00:00`).getTime()
  if (!Number.isFinite(from) || !Number.isFinite(to)) return lastValue
  if (perDay === undefined || !Number.isFinite(perDay) || perDay <= 0) return lastValue
  const days = Math.max(0, (to - from) / MS_PER_DAY)
  return Math.max(0, Math.round((lastValue - perDay * days) * 10) / 10)
}
