import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Warmwasser-Wartezeit-Check.
 *
 * Idee: Der Nutzer misst, wie lange es dauert, bis an einer Entnahmestelle
 * warmes Wasser ankommt. In dieser Zeit fließt (kaltes) Trinkwasser ungenutzt
 * ab. Aus der Wartezeit, dem Durchfluss und einer groben Häufigkeit je
 * Entnahmestelle ergibt sich eine Schätzung der ungenutzten Wassermenge und –
 * über den Wasserpreis – ein jährliches Einsparpotenzial.
 *
 * **Was gemessen ist und was nicht.** Die Wartezeit ist immer gemessen. Der
 * Durchfluss der Dusche ist es, sobald der Duschkopf-Check gelaufen ist
 * (`measuredShowerFlowLpm`) – sonst gilt der Richtwert aus {@link FIXTURES}.
 * Die Häufigkeit der Zapfungen ist nie gemessen, sondern ein typischer Wert je
 * Person. Belastbar ist deshalb vor allem die Wassermenge je Zapfung; der
 * Euro-Betrag zeigt die Größenordnung und wird unterhalb der Schwelle in
 * `../savingsDisplay` gar nicht erst ausgewiesen.
 */

export type FixtureType = 'shower' | 'bath' | 'kitchen' | 'washbasin'

export interface FixtureMeta {
  /**
   * Richtwert des Durchflusses in L/min.
   *
   * Rückfallwert: Für die Dusche schlägt ihn der im Duschkopf-Check gemessene
   * Wert, sobald einer vorliegt.
   */
  flowLpm: number
  /**
   * Grobe Anzahl Warmwasser-Zapfungen pro Tag **und Person**.
   *
   * Frueher stand hier ein Haushaltswert – ein Single und eine vierkoepfige
   * Familie bekamen damit dieselbe Jahreshochrechnung. Die Werte sind so
   * kalibriert, dass ein Zwei-Personen-Haushalt weiterhin auf die bisherigen
   * Haushaltszahlen kommt (Dusche 1,5/Tag, Wanne 0,3/Tag, Kueche 4/Tag,
   * Waschbecken 5/Tag); der Duschkopf-Check rechnet mit derselben Logik.
   */
  drawsPerPersonPerDay: number
  /**
   * Bevorzugter Messort (großer Wasserdurchsatz).
   *
   * Steuert die Reihenfolge in {@link FIXTURE_ORDER}: empfohlene Stellen
   * stehen vorn. Ein Badge an der Hälfte aller Optionen hätte nichts mehr
   * ausgesagt.
   */
  recommended: boolean
}

/** Reihenfolge = Anzeigereihenfolge der Auswahl. */
export const FIXTURES: Record<FixtureType, FixtureMeta> = {
  shower: { flowLpm: 9, drawsPerPersonPerDay: 0.75, recommended: true },
  bath: { flowLpm: 12, drawsPerPersonPerDay: 0.15, recommended: true },
  kitchen: { flowLpm: 6, drawsPerPersonPerDay: 2, recommended: false },
  washbasin: { flowLpm: 5, drawsPerPersonPerDay: 2.5, recommended: false },
}

/** Kalibrierungsbasis der Werte in {@link FIXTURES} – siehe `drawsPerPersonPerDay`. */
export const CALIBRATION_PERSONS = 2

/** Anzeigereihenfolge: empfohlene Entnahmestellen zuerst. */
export const FIXTURE_ORDER: FixtureType[] = ['shower', 'bath', 'kitchen', 'washbasin']

export interface HotWaterWaitInput {
  fixture: FixtureType
  /** Gemessene Wartezeit in Sekunden. */
  seconds: number
  /** Wasserpreis in €/m³ (aus dem Preis-Store). */
  waterPriceEurPerM3: number
  /** Personen im Haushalt (aus dem Profil) – skaliert die Zapfungen pro Tag. */
  persons: number
  /**
   * Im Duschkopf-Check **gemessener** Durchfluss in L/min.
   *
   * Gilt nur für die Entnahmestelle „Dusche" – die Messung fand dort statt.
   * Ohne Messung bleibt es beim Richtwert aus {@link FIXTURES}: Wer den einen
   * Check nicht gemacht hat, bekommt dieselbe Zahl wie bisher.
   */
  measuredShowerFlowLpm?: number
}

export interface HotWaterWaitResult {
  rating: MeasurementRating
  /** Ungenutzt abgeflossene Wassermenge pro Zapfung in Litern. */
  litersPerDraw: number
  /** Hochgerechnete ungenutzte Menge pro Jahr in Litern. */
  litersPerYear: number
  /** Jährliches Einsparpotenzial in € (Wasserkosten der ungenutzten Menge). */
  yearlySaving: number
  /** Tatsächlich verwendeter Durchfluss in L/min. */
  flowLpm: number
  /**
   * Kam der Durchfluss aus dem Duschkopf-Check?
   *
   * Steht im Ergebnis, weil der Unterschied den Nutzer angeht: Eine Zahl aus
   * seiner eigenen Messung ist etwas anderes als ein Richtwert, und er soll
   * sehen, welche von beiden er vor sich hat.
   */
  flowMeasured: boolean
}

/**
 * Schwellen der Wartezeit-Bewertung in Sekunden.
 *
 * Benannt und exportiert, damit der Wissensbereich sie **lesen** kann, statt
 * dieselben Zahlen im Text zu wiederholen. Nackte Literale in `rateWait` waren
 * von außen nicht erreichbar – und eine zweite Fassung im Fließtext wäre genau
 * die Art Dopplung, die irgendwann auseinanderläuft.
 */
export const WAIT_GOOD_MAX_S = 15
export const WAIT_MEDIUM_MAX_S = 30
export const WAIT_ELEVATED_MAX_S = 60

/** Bewertung der Wartezeit (vierstufig). */
export function rateWait(seconds: number): MeasurementRating {
  if (seconds <= WAIT_GOOD_MAX_S) return 'good'
  if (seconds <= WAIT_MEDIUM_MAX_S) return 'medium'
  if (seconds <= WAIT_ELEVATED_MAX_S) return 'elevated'
  return 'high'
}

export function calcHotWaterWait(input: HotWaterWaitInput): HotWaterWaitResult {
  const fixture = FIXTURES[input.fixture]
  const seconds = Math.max(0, input.seconds)
  // Mindestens eine Person: ein Profil ohne Angabe darf die Hochrechnung nicht
  // auf null ziehen, sondern rechnet wie ein Ein-Personen-Haushalt.
  const persons = Number.isFinite(input.persons) ? Math.max(1, Math.floor(input.persons)) : 1

  // Der gemessene Durchfluss schlägt den Richtwert – aber nur an der Dusche,
  // denn dort wurde gemessen. Ein Waschbecken mit dem Duschkopf-Wert zu rechnen
  // wäre schlechter als der Richtwert, nicht besser.
  const measured =
    input.fixture === 'shower' &&
    Number.isFinite(input.measuredShowerFlowLpm) &&
    (input.measuredShowerFlowLpm as number) > 0
  const flowLpm = measured ? (input.measuredShowerFlowLpm as number) : fixture.flowLpm

  const litersPerDraw = (seconds / 60) * flowLpm
  const litersPerYear = litersPerDraw * fixture.drawsPerPersonPerDay * persons * 365
  const price = Number.isFinite(input.waterPriceEurPerM3) ? Math.max(0, input.waterPriceEurPerM3) : 0
  const yearlySaving = (litersPerYear / 1000) * price

  return {
    rating: rateWait(seconds),
    litersPerDraw: Math.round(litersPerDraw * 10) / 10,
    litersPerYear: Math.round(litersPerYear),
    yearlySaving: Math.round(yearlySaving),
    flowLpm,
    flowMeasured: measured,
  }
}
