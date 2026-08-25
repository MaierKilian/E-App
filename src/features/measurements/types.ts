export type MeasurementId =
  | 'showerhead'
  | 'hot_water_wait'
  | 'fridge'
  | 'standby'
  | 'base_load'
  | 'lighting'
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
  /**
   * Frei eingegebene Bezeichnungen zu Einträgen aus `details`, gleicher
   * Schlüssel (z. B. `dev0` → „Fernseher Schlafzimmer").
   *
   * `details` nimmt nur Zahlen auf. Solange es keinen Platz für Text gab,
   * brauchte der Standby-Check eine Typ-Auswahl, nur damit die Ergebnis-Ansicht
   * die Balken überhaupt beschriften konnte – obwohl der Nutzer daneben schon
   * einen Namen eingetragen hatte.
   */
  labels?: Record<string, string>
}
