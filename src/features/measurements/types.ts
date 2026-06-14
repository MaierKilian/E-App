export type MeasurementId =
  | 'showerhead'
  | 'hot_water_wait'
  | 'fridge'
  | 'standby'
  | 'room_temperature'
  | 'furniture_spacing'
  | 'freezer'

/** Bewertungsstufen (vierstufig): gut → mittel → erhöht → hoch. */
export type MeasurementRating = 'good' | 'medium' | 'elevated' | 'high'

export interface MeasurementResult {
  id: MeasurementId
  rating: MeasurementRating
  /** Hauptmesswert (z. B. Durchfluss in L/min). */
  primaryValue: number
  /** Einheit des Hauptmesswerts (z. B. 'L/min', 'W'). Für die Anzeige. */
  unit: string
  /** Zeitpunkt der Auswertung als ISO-String. */
  completedAt: string
  /** Raum-Schlüssel bei raumbezogenen Messungen (z. B. "bedroom#0"). */
  roomKey?: string
  /** Optionale Roh-/Zusatzwerte der Messung (z. B. Liter, Sekunden). */
  details?: Record<string, number>
}
