import type { StandbyDevice } from './standby'

/**
 * Kodierung des Standby-Zwischenstands für den Entwurfs-Speicher.
 *
 * Die Geräteliste entsteht über Minuten – jedes Gerät wird einzeln umgesteckt
 * und abgelesen. Sie überlebt deshalb das Verlassen des Checks, und zwar in
 * derselben Form, in der auch das fertige Ergebnis liegt: Wattzahlen als
 * `dev{index}` unter den Zahlen, die frei gewählte Bezeichnung unter demselben
 * Schlüssel in den Beschriftungen (siehe `MeasurementResult`).
 */

/**
 * Kodiert die Geräteliste als Entwurf.
 *
 * Leere Zeilen fallen weg: Ein bloß geöffneter Check soll keinen Zwischenstand
 * hinterlassen, sonst überspringt der Ablauf beim nächsten Mal die Erklärseite
 * (`hasDraft` im MeasurementRunner), obwohl nichts erfasst wurde. Eine benannte
 * Zeile ohne Wattzahl bleibt dagegen erhalten – sie ist begonnene Arbeit.
 */
export function encodeStandbyDraft(devices: StandbyDevice[]): {
  values: Record<string, number>
  labels: Record<string, string>
} {
  const values: Record<string, number> = {}
  const labels: Record<string, string> = {}

  devices
    .filter((d) => d.watts > 0 || d.name.trim() !== '')
    .forEach((d, i) => {
      values[`dev${i}`] = d.watts
      const name = d.name.trim()
      if (name) labels[`dev${i}`] = name
    })

  return { values, labels }
}

/**
 * Liest einen Entwurf zurück in die Geräteliste, in der erfassten Reihenfolge.
 *
 * Anders als die Ergebnis-Ansicht behält diese Funktion Zeilen mit 0 W: Wer den
 * Namen schon eingetippt und den Wert noch nicht abgelesen hat, soll genau das
 * wiederfinden. Fremde Felder werden übergangen – im selben Entwurf könnten
 * eines Tages andere Zahlen liegen.
 */
export function decodeStandbyDraft(
  values: Record<string, number>,
  labels: Record<string, string>,
): StandbyDevice[] {
  return Object.entries(values)
    .map(([key, watts]) => ({ index: /^dev(\d+)$/.exec(key)?.[1], key, watts }))
    .filter((e) => e.index !== undefined && Number.isFinite(e.watts))
    .sort((a, b) => Number(a.index) - Number(b.index))
    .map((e) => ({ name: labels[e.key] ?? '', watts: e.watts }))
}
