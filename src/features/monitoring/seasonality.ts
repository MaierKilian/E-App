/**
 * Jahreszeitliches Verbrauchsprofil für Heizenergie.
 *
 * Gas, Öl und Pellets gehen fast vollständig in Raumwärme; nur ein kleiner
 * Sockel entfällt aufs Warmwasser. Der Verbrauch schwankt dadurch übers Jahr
 * etwa um den Faktor acht – im Dezember fließt rund achtmal so viel wie im
 * Juli. Wer aus einem einzelnen Ableseabstand linear aufs Jahr hochrechnet,
 * liegt deshalb je nach Jahreszeit um ein Vielfaches daneben.
 *
 * Die Anteile unten sind eine Näherung an die Charakteristik der BDEW-
 * Standardlastprofile für Haushalte mit Gasheizung (Raumwärme + Warmwasser),
 * gemittelt über die Klimazonen Deutschlands. Sie sind bewusst grob: ein
 * Modell, keine Messung. Für die Hochrechnung reicht das – der Fehler daraus
 * ist eine Größenordnung kleiner als der, den sie behebt.
 *
 * Strom und Wasser bekommen dieses Profil NICHT: ihr Jahresgang ist flach
 * genug, dass eine lineare Hochrechnung passt.
 */

/** Anteil am Jahresverbrauch je Kalendermonat (Index 0 = Januar). Summe = 1. */
const MONTH_SHARE = [
  0.155, // Januar
  0.135, // Februar
  0.115, // März
  0.08, // April
  0.045, // Mai
  0.025, // Juni
  0.02, // Juli
  0.02, // August
  0.035, // September
  0.08, // Oktober
  0.12, // November
  0.17, // Dezember
] as const

/** Tage im Monat (mit Schaltjahr), damit Tagesanteile exakt aufgehen. */
function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Anteil eines einzelnen Kalendertags am Jahresverbrauch. */
function dayShare(date: Date): number {
  const m = date.getMonth()
  return MONTH_SHARE[m] / daysInMonth(date.getFullYear(), m)
}

/**
 * Summiert die Jahresanteile aller Tage im Zeitraum [from, to) auf.
 *
 * Beispiel: ein Ableseabstand vom 15. Juli bis 15. August deckt rund 2 % des
 * Jahresverbrauchs ab. Der dort gemessene Verbrauch geteilt durch 0,02 ergibt
 * die Jahresmenge – statt ihn mit 365/31 ≈ 11,8 zu multiplizieren und damit
 * bei einem Viertel der Wahrheit zu landen.
 *
 * Über exakt ein Jahr liefert die Funktion definitionsgemäß 1.
 */
export function seasonalShareBetween(from: Date, to: Date): number {
  let share = 0
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
  // Tagesweise statt monatsweise: die Ablesedaten liegen selten auf
  // Monatsgrenzen, und bei höchstens ein paar tausend Tagen ist das billig.
  while (cursor < end) {
    share += dayShare(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
  return share
}
