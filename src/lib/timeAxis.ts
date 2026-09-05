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

/**
 * Umkehrung von {@link timeAxisPositions}: Wo liegt ein beliebiger Zeitpunkt?
 *
 * Die Achse ist nicht zeit-proportional – jeder Abstand trägt erst einen
 * Sockel, dann seinen Zeitanteil. Ein Datum zwischen zwei Ablesungen lässt sich
 * deshalb nicht aus der Gesamtspanne ausrechnen, sondern nur zwischen den
 * beiden Nachbarpunkten interpolieren. Genau das tut diese Funktion, mit
 * derselben Verzerrung wie die Punkte selbst – sonst läge das
 * Heizperioden-Band neben der Linie, die es einordnen soll.
 *
 * Zeitpunkte vor dem ersten bzw. nach dem letzten Punkt werden auf den Rand
 * geklemmt: Eine Heizperiode, die vor der ersten Ablesung begonnen hat, füllt
 * den Rand aus, statt zu verschwinden.
 *
 * @param times   Zeitstempel der Punkte in ms, aufsteigend (wie oben).
 * @param offsets Die zugehörigen Offsets aus {@link timeAxisPositions}.
 * @param t       Gesuchter Zeitpunkt in ms.
 * @returns Offset auf derselben Strecke, oder `undefined` bei unbrauchbarer
 *          Eingabe (leere Liste, nicht lesbare Zeitstempel).
 */
export function offsetForTime(
  times: number[],
  offsets: number[],
  t: number,
): number | undefined {
  const n = times.length
  if (n === 0 || offsets.length !== n || !Number.isFinite(t)) return undefined
  if (times.some((v) => !Number.isFinite(v))) return undefined
  if (t <= times[0]) return offsets[0]
  if (t >= times[n - 1]) return offsets[n - 1]
  for (let i = 1; i < n; i++) {
    if (t <= times[i]) {
      const span = times[i] - times[i - 1]
      // Mehrere Ablesungen am selben Tag: kein Zwischenraum zu interpolieren.
      if (span <= 0) return offsets[i]
      return offsets[i - 1] + ((offsets[i] - offsets[i - 1]) * (t - times[i - 1])) / span
    }
  }
  return offsets[n - 1]
}

/** ISO-Datum (`yyyy-mm-dd`) als Zeitstempel; NaN, wenn nicht lesbar. */
export function isoToTime(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime()
}

/**
 * Heutiges Datum als ISO `yyyy-mm-dd` in **lokaler** Zeitzone.
 *
 * Bewusst nicht `toISOString().slice(0, 10)`: Das liefert UTC. Östlich von
 * Greenwich ist dort abends bereits der Vortag zu Ende – als `max` eines
 * Datumsfelds ließe sich „heute" dann nicht auswählen.
 */
export function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10)
}
