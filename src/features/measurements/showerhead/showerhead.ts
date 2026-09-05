import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Duschkopf-Test.
 *
 * Idee: Der Nutzer hält ein Gefäß bekannten Volumens unter den Duschkopf und
 * stoppt die Zeit, bis es voll ist. Aus Liter und Sekunden ergibt sich der
 * Durchfluss in L/min, daraus eine Bewertung und die Ersparnis eines
 * Sparduschkopfs.
 *
 * **Die Ersparnis steht als Prozentsatz, nicht als Euro-Betrag** (05.09.2026).
 * Der Grund ist nicht Vorsicht, sondern Mathematik: Kosten und Wassermenge
 * sind beide *linear* im Durchfluss, also kürzt sich im Verhältnis alles weg,
 * was nicht gemessen ist –
 *
 *     Ersparnis / Kosten = (Durchfluss − 8) / Durchfluss
 *
 * Personenzahl, Duschhäufigkeit, Duschdauer, Temperaturhub und Arbeitspreis
 * stehen in Zähler und Nenner gleich und verschwinden. Der Prozentsatz folgt
 * damit **allein aus der Messung**, während der Euro-Betrag über fünf
 * Annahmen lief – darunter den Warmwasser-Erzeuger, den der Check eigens
 * abfragen musste, obwohl er am Ergebnis nichts änderte.
 */

export interface ShowerheadInput {
  /** Gemessene Liter (Volumen des Gefäßes). */
  liters: number
  /** Gemessene Zeit in Sekunden, bis das Gefäß voll war. */
  seconds: number
  /** Personen im Haushalt (aus dem Onboarding). */
  persons: number
}

export interface ShowerheadResult {
  /** Durchfluss in L/min, auf eine Nachkommastelle gerundet. */
  flowLpm: number
  rating: MeasurementRating
  /**
   * Ersparnis durch einen Sparduschkopf (~8 L/min) in Prozent – an Wasser und
   * an Warmwasser-Energie zugleich, denn beide hängen linear am Durchfluss.
   * 0, wenn der aktuelle Durchfluss bereits sparsam ist (<= 9 L/min).
   */
  savingPct: number
  /** Jaehrlich eingesparte Wassermenge in Litern beim Wechsel auf ~8 L/min. */
  litersSavedPerYear: number
}

// Schwellenwerte für die Bewertung (L/min).
export const GOOD_MAX = 9
export const MEDIUM_MAX = 12

// Annahmen – **nur noch** für die Hochrechnung der Wassermenge aufs Jahr. Der
// Temperaturhub (ΔT 27 K, 11 → 38 °C) und die spezifische Wärme des Wassers
// (1,163 Wh/(l·K)) sind mit dem Euro-Betrag entfallen: Sie trugen allein die
// Kostenrechnung, und im Prozentsatz kürzen sie sich weg.
//
// Exportiert, damit der „So gerechnet"-Aufklapper sie **liest**, statt
// dieselben Zahlen im Text zu wiederholen – dieselbe Regel wie bei den
// Richtwert-Tabellen im Wissensbereich.
export const SHOWERS_PER_PERSON_PER_DAY = 1
export const MINUTES_PER_SHOWER = 5
const DAYS_PER_YEAR = 365
/** Referenz-Durchfluss eines Sparduschkopfes (L/min). */
export const EFFICIENT_FLOW_LPM = 8

export function rateFlow(flowLpm: number): MeasurementRating {
  if (flowLpm <= GOOD_MAX) return 'good'
  if (flowLpm <= MEDIUM_MAX) return 'medium'
  return 'high'
}

/**
 * Anteil, den ein Sparduschkopf einspart – an Wasser **und** an der Energie,
 * die dieses Wasser erwärmt.
 *
 * Beide Größen sind das Produkt aus der Wassermenge und einem Faktor, der vom
 * Duschkopf nicht abhängt (Preis je m³, bzw. Temperaturhub × spezifische Wärme
 * × Arbeitspreis). Im Verhältnis der beiden Durchflüsse fällt dieser Faktor
 * heraus, und mit ihm jede Annahme über Personen, Duschdauer und Tarife:
 *
 *     (Durchfluss − Referenz) / Durchfluss
 *
 * Deshalb ist dies die einzige Kennzahl des Checks, die **nichts** enthält,
 * was nicht gemessen wurde.
 */
export function savingShareForFlow(flowLpm: number): number {
  if (flowLpm <= GOOD_MAX) return 0
  return Math.max(0, (flowLpm - EFFICIENT_FLOW_LPM) / flowLpm)
}

export function calcShowerhead(input: ShowerheadInput): ShowerheadResult {
  const persons = Math.max(1, input.persons)
  const flowLpm = Math.round((input.liters / input.seconds) * 60 * 10) / 10
  const rating = rateFlow(flowLpm)

  let litersSavedPerYear = 0
  if (flowLpm > GOOD_MAX) {
    // Die Wassermenge braucht als einzige Kennzahl noch Annahmen (Personen,
    // Duschen pro Tag, Minuten je Dusche). Sie steht deshalb hinter dem
    // Prozentsatz, nicht vor ihm.
    const showerMinutesPerYear =
      persons * SHOWERS_PER_PERSON_PER_DAY * MINUTES_PER_SHOWER * DAYS_PER_YEAR
    litersSavedPerYear = (flowLpm - EFFICIENT_FLOW_LPM) * showerMinutesPerYear
  }

  return {
    flowLpm,
    rating,
    savingPct: Math.round(savingShareForFlow(flowLpm) * 100),
    litersSavedPerYear: Math.round(litersSavedPerYear),
  }
}
