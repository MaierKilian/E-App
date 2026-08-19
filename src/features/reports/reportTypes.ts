/** Kurz- oder Langfassung eines Berichts. */
export type ReportVariant = 'short' | 'long'

/**
 * Abschnitte des Berichts. Der Bericht ist die Summe der gewählten Abschnitte –
 * es gibt keine vorgelagerte Wahl eines Berichtstyps mehr.
 */
export interface ReportSections {
  profile: boolean
  measurements: boolean
  monitoring: boolean
}

/**
 * Bausteine, aus denen ein Abschnitt aufgebaut wird. Sie werden nicht mehr
 * einzeln bedient, sondern vollständig aus {@link defaultContentOptions}
 * abgeleitet – die einzige Stellschraube ist der Umfang (kurz/lang).
 */
export interface ReportContentOptions {
  // Monitoring
  /** Verbrauch je Ablesezeitraum als Balken (die aussagekräftige Darstellung). */
  charts: boolean
  /** Zusätzlich der kumulative Zählerstandsverlauf als Linie. */
  readingCurve: boolean
  kpis: boolean
  comparison: boolean
  history: boolean
  // Messungen
  savings: boolean
  tips: boolean
  openMeasurements: boolean
}

/** Bausteine je Umfang: kurz = das Wichtigste, lang = alles. */
export function defaultContentOptions(variant: ReportVariant): ReportContentOptions {
  const long = variant === 'long'
  return {
    charts: true,
    readingCurve: long,
    kpis: true,
    comparison: true,
    history: long,
    savings: true,
    tips: long,
    openMeasurements: long,
  }
}
