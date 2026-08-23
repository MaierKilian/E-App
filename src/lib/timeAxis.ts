/**
 * Positionen für eine echte Datums-Achse.
 *
 * Ablesungen kommen in unregelmäßigen Abständen – mal nach 7, mal nach 90
 * Tagen. Setzt man sie mit gleichem Abstand nebeneinander, behauptet das
 * Diagramm eine Regelmäßigkeit, die es nicht gibt: eine steile Strecke über
 * drei Monate sieht dann genauso aus wie eine über eine Woche.
 *
 * Rein zeit-proportional aufgetragen kollabieren dafür dicht beieinander
 * liegende Ablesungen zu einem Klumpen – die Punkte überdecken sich und lassen
 * sich weder unterscheiden noch einzeln antippen. Deshalb bekommt jeder
 * Abstand erst einen festen Sockel (`minGap`) und danach den Rest der Breite
 * anteilig zu seiner echten Dauer:
 *
 * ```
 * abstand_i = minGap + (restBreite × dauer_i / gesamtDauer)
 * ```
 *
 * Damit bleibt die Aussage erhalten – ein längerer Zeitraum ist immer breiter
 * als ein kürzerer –, ohne dass Punkte aufeinanderfallen.
 */

/**
 * Verteilt Zeitpunkte auf eine Strecke von 0 bis `width`.
 *
 * @param times  Zeitstempel in ms, aufsteigend sortiert.
 * @param width  Verfügbare Breite in Zeichen-Einheiten (px, pt, viewBox).
 * @param minGap Mindestabstand zwischen zwei benachbarten Punkten.
 * @returns Ein x-Offset je Zeitpunkt, immer streng aufsteigend.
 */
export function timeAxisPositions(times: number[], width: number, minGap: number): number[] {
  const n = times.length
  if (n === 0) return []
  if (n === 1) return [width / 2]

  const equidistant = (): number[] =>
    Array.from({ length: n }, (_, i) => (width * i) / (n - 1))

  // Ungültige Datumsangaben oder alles am selben Tag: die Zeitachse trägt hier
  // keine Information, gleichmäßig ist dann die ehrlichere Darstellung.
  if (times.some((t) => !Number.isFinite(t))) return equidistant()
  const totalSpan = times[n - 1] - times[0]
  if (!(totalSpan > 0)) return equidistant()

  // Passt der Mindestabstand nicht mehr in die Breite, ist gleichmäßig das
  // Beste, was geht – enger als width/(n-1) wird es dadurch nirgends.
  const required = (n - 1) * minGap
  if (required >= width) return equidistant()

  const rest = width - required
  const positions = [0]
  for (let i = 1; i < n; i++) {
    const duration = Math.max(0, times[i] - times[i - 1])
    positions.push(positions[i - 1] + minGap + (rest * duration) / totalSpan)
  }
  // Rundungsreste dürfen den letzten Punkt nicht über den Rand schieben.
  positions[n - 1] = width
  return positions
}

/** ISO-Datum (`yyyy-mm-dd`) als Zeitstempel; NaN, wenn nicht lesbar. */
export function isoToTime(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime()
}
