/**
 * Helfer für die optionale echte Strommessung mit einem Energiekostenmessgerät.
 *
 * Kühl-/Gefriergeräte takten (Kompressor an/aus), daher ist eine momentane
 * Watt-Anzeige unbrauchbar. Belastbar ist nur die über eine Periode aufsummierte
 * Energie (kWh) samt Laufzeit (Stunden): daraus ergibt sich die mittlere
 * Leistung und – aufs Jahr hochgerechnet – der Jahresverbrauch.
 */

/** Mittlere Leistung in Watt aus aufsummierten kWh über `hours` Stunden. */
export function avgWatts(kWh: number, hours: number): number {
  if (!Number.isFinite(kWh) || !Number.isFinite(hours) || hours <= 0 || kWh < 0) return 0
  return (kWh * 1000) / hours
}

/** Jahresverbrauch (kWh) bei konstanter mittlerer Leistung `watts`. */
export function annualKwhFromW(watts: number): number {
  if (!Number.isFinite(watts) || watts < 0) return 0
  return (watts * 24 * 365) / 1000
}

/** Jahresverbrauch (kWh) direkt aus einer Mess-Periode (kWh über `hours`). */
export function annualKwhFromPeriod(kWh: number, hours: number): number {
  return annualKwhFromW(avgWatts(kWh, hours))
}
