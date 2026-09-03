/**
 * Taupunkt aus Temperatur und relativer Luftfeuchte.
 *
 * **Warum das eigene Modul.** Schimmel entsteht nicht bei einer Prozentzahl,
 * sondern wenn feuchte Luft auf eine Oberfläche trifft, die kälter ist als der
 * Taupunkt dieser Luft – dort schlägt sich das Wasser nieder. Eine reine
 * Feuchte-Bewertung übersieht deshalb den gefährlichsten Fall und meldet
 * gleichzeitig einen unauffälligen Keller als „zu feucht".
 *
 * Die Rechnung ist die eigentliche Aussage des Kellerteils und steht deshalb
 * für sich, prüfbar mit von Hand nachgerechneten Werten.
 */

/**
 * Magnus-Koeffizienten für Wasser über flüssigem Wasser, gültig etwa von
 * −45 bis +60 °C. Sonntag (1990); dieselben Werte, die auch der DWD nutzt.
 */
const MAGNUS_A = 17.62
const MAGNUS_B = 243.12

/**
 * Taupunkttemperatur in °C.
 *
 * @param temperature Lufttemperatur in °C
 * @param relativeHumidity Relative Luftfeuchte in Prozent (0–100)
 * @returns Taupunkt in °C, oder `undefined` bei unbrauchbarer Eingabe.
 *   Eine Feuchte von 0 % hat keinen Taupunkt (der Logarithmus divergiert) –
 *   das ist kein Messwert, sondern ein defektes Hygrometer.
 */
export function dewPoint(temperature: number, relativeHumidity: number): number | undefined {
  if (!Number.isFinite(temperature) || !Number.isFinite(relativeHumidity)) return undefined
  if (relativeHumidity <= 0 || relativeHumidity > 100) return undefined
  const alpha =
    Math.log(relativeHumidity / 100) + (MAGNUS_A * temperature) / (MAGNUS_B + temperature)
  return (MAGNUS_B * alpha) / (MAGNUS_A - alpha)
}

/**
 * Angenommene Wandtemperatur im Keller (°C).
 *
 * Kellerwände liegen am Erdreich und folgen dessen Temperatur, nicht der Luft:
 * In Deutschland liegt sie in 1–2 m Tiefe ganzjährig bei etwa 8–12 °C. Wir
 * rechnen mit dem oberen Rand – die vorsichtigere Annahme, weil sie seltener
 * warnt und damit keine Warnung erzeugt, die niemand ernst nimmt.
 *
 * Eine Messung wäre besser als eine Annahme; ein Infrarot-Thermometer an der
 * Wand ist aber ein Gerät, das der Fragebogen nicht voraussetzt.
 */
export const ASSUMED_BASEMENT_WALL_C = 12

/**
 * Droht Kondensat an der Kellerwand?
 *
 * Wahr, wenn der Taupunkt der Kellerluft die angenommene Wandtemperatur
 * erreicht. Das ist der Sommerfall: Warme Außenluft mit 20 °C und 70 % hat
 * einen Taupunkt von rund 14 °C und schlägt sich an einer 12 °C kalten Wand
 * nieder – ein gelüfteter Keller ist im Sommer deshalb feuchter als ein
 * geschlossener, obwohl das Lüften sich richtig anfühlt.
 */
export function condensationRisk(
  temperature: number,
  relativeHumidity: number,
  wallTemperature: number = ASSUMED_BASEMENT_WALL_C,
): boolean {
  const point = dewPoint(temperature, relativeHumidity)
  return point !== undefined && point >= wallTemperature
}
