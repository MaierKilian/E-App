import type { Finding, FindingKey } from './furnitureSpacing'

/**
 * Verknüpfung des Möbel-Abstands-Checks mit dem übrigen Profil.
 *
 * Der Check allein sagt, *was* die Heizfläche blockiert. Erst zusammen mit der
 * Raumtemperatur im selben Raum und dem Wärmeerzeuger entsteht eine Aussage,
 * die keine der Messungen für sich liefern kann – etwa das typische Muster
 * „Fühler im Wärmestau und Raum trotzdem zu kühl".
 *
 * Reine Funktionen, damit die Ableitung testbar bleibt.
 */

/** Befunde, bei denen der Temperaturfühler selbst gestört ist. */
const SENSOR_KEYS: FindingKey[] = ['valve', 'thermostat']

export interface ClimateContext {
  /** Raumtemperatur aus dem Raumklima-Check im selben Raum (°C). */
  roomTempC?: number
  /** Untergrenze des Komfortbands dieses Raums (°C). */
  comfortMinC?: number
  /** true, wenn im Profil eine Wärmepumpe steht. */
  heatPump?: boolean
}

/** Zusatzhinweise, die sich erst aus der Kombination ergeben. */
export type ContextNote = 'sensorAndCold' | 'heatPump'

/** true, wenn einer der Befunde den Temperaturfühler betrifft. */
export function hasSensorFinding(findings: Finding[]): boolean {
  return findings.some((f) => SENSOR_KEYS.includes(f.key))
}

/**
 * Leitet die Zusatzhinweise ab.
 *
 * - `sensorAndCold`: Der Fühler sitzt im Wärmestau **und** der Raum wurde
 *   unterhalb seines Komfortbands gemessen. Genau das Muster, das zum
 *   Höherdrehen führt – und der Grund, warum ein verdeckter Fühler Verbrauch
 *   kostet, obwohl die Wärme im Raum ankommt.
 * - `heatPump`: Jede Blockade zwingt zu höherer Vorlauftemperatur; bei einer
 *   Wärmepumpe schlägt das direkt auf die Arbeitszahl durch.
 */
export function contextNotes(findings: Finding[], ctx: ClimateContext): ContextNote[] {
  const notes: ContextNote[] = []
  if (findings.length === 0) return notes

  const tooCold =
    ctx.roomTempC !== undefined &&
    ctx.comfortMinC !== undefined &&
    Number.isFinite(ctx.roomTempC) &&
    Number.isFinite(ctx.comfortMinC) &&
    ctx.roomTempC < ctx.comfortMinC

  if (tooCold && hasSensorFinding(findings)) notes.push('sensorAndCold')
  if (ctx.heatPump) notes.push('heatPump')

  return notes
}
