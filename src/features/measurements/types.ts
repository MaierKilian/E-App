export type MeasurementId = 'showerhead' | 'fridge' | 'standby' | 'room_temperature'

export type MeasurementRating = 'good' | 'medium' | 'high'

export interface MeasurementResult {
  id: MeasurementId
  rating: MeasurementRating
  /** Hauptmesswert (z. B. Durchfluss in L/min). */
  primaryValue: number
  /** Zeitpunkt der Auswertung als ISO-String. */
  completedAt: string
  /** Optionale Roh-/Zusatzwerte der Messung (z. B. Liter, Sekunden). */
  details?: Record<string, number>
}
