import type { MeasurementRating } from '../types'
import type { ProjectionBasis, ReadingStats } from '@/features/monitoring/readings'

/**
 * Reine Berechnungslogik für den Grundlast-Check (Diagnose am Stromzähler).
 *
 * Idee: Der Nutzer ermittelt die Dauerleistung, die sein Haushalt rund um die
 * Uhr zieht (Standby, Kühl-/Gefriergeräte, Router, Heizungspumpe …). Das Ergebnis
 * ist eine *Diagnose*: Es zeigt die Grundlast in Watt sowie eine grobe €/Jahr-
 * Orientierung, trägt aber bewusst NICHT zum Gesamt-Sparpotenzial bei – die
 * konkreten, bezifferten Einsparungen liefern die Folge-Checks (v. a. Standby,
 * Kühl-/Gefrierschrank), um Doppelzählung zu vermeiden.
 */

/**
 * Wie die Grundlast erfasst wird.
 *
 * `instant` – der Zähler zeigt die Leistung direkt in Watt an. Schnell, aber
 * eine Momentaufnahme: Der Kühlschrank taktet, je nach Zeitpunkt misst man
 * seinen Kompressor mit oder nicht.
 *
 * `impulse` – die Impulse des Zählers werden über eine Stoppuhr gezählt (die
 * blinkende LED elektronischer Zähler, die Umdrehung der Ferraris-Scheibe).
 * Ebenfalls eine Momentaufnahme, aber eine genaue – und der einzige Weg, der
 * auch auf einem Zähler ohne Nachkommastelle funktioniert.
 *
 * `readings` – zwei Zählerstände mit zeitlichem Abstand. Der einzige Weg, der
 * über mehrere Kühlschrank-Zyklen mittelt – aber nur brauchbar, solange die
 * Anzeige fein genug ist (siehe {@link readableOvernight}).
 */
export type MeterMode = 'instant' | 'impulse' | 'readings'

const HOURS_PER_YEAR = 24 * 365
const MS_PER_HOUR = 3_600_000
const SECONDS_PER_HOUR = 3600

// Rückfall-Schwellen für die Grundlast eines Haushalts (Watt). Bewusst grob –
// und zwangsläufig unfair: Eine Familie im Haus mit Gefriertruhe liegt immer
// über 70 W, egal wie sparsam sie lebt. Sie greifen nur, solange kein
// Jahresverbrauch aus dem Monitoring vorliegt.
export const GOOD_MAX = 70
export const MEDIUM_MAX = 150
export const ELEVATED_MAX = 250

// Schwellen für den Anteil der Grundlast am Jahres-Stromverbrauch. Sie messen,
// was der Haushalt verbraucht, ohne etwas zu nutzen – und sind dadurch von
// seiner Größe unabhängig, anders als jede absolute Watt-Zahl.
const GOOD_MAX_SHARE = 0.25
const MEDIUM_MAX_SHARE = 0.35
const ELEVATED_MAX_SHARE = 0.5

/**
 * Bewertet die Grundlast (vierstufig).
 *
 * Bevorzugt am **Anteil am Jahresverbrauch**: Ob 150 W viel sind, hängt davon
 * ab, wie viel Strom der Haushalt insgesamt braucht – für eine Familie im Haus
 * ist das wenig, für eine Einzelperson in der Wohnung die halbe Rechnung.
 * Ohne Ablesungen im Monitoring bleibt es bei den absoluten Watt-Schwellen.
 *
 * @param watts Gemessene Grundlast.
 * @param share Anteil am Jahres-Stromverbrauch (0…1), falls bekannt.
 */
export function rateBaseLoad(watts: number, share?: number): MeasurementRating {
  if (share !== undefined && Number.isFinite(share) && share > 0) {
    if (share <= GOOD_MAX_SHARE) return 'good'
    if (share <= MEDIUM_MAX_SHARE) return 'medium'
    if (share <= ELEVATED_MAX_SHARE) return 'elevated'
    return 'high'
  }
  if (watts <= GOOD_MAX) return 'good'
  if (watts <= MEDIUM_MAX) return 'medium'
  if (watts <= ELEVATED_MAX) return 'elevated'
  return 'high'
}

/** Leistung (W) aus einer Zeitmessung des kWh-Zählerstands. */
export function wattsFromTimed(startKwh: number, endKwh: number, elapsedMs: number): number {
  const deltaKwh = endKwh - startKwh
  const hours = elapsedMs / MS_PER_HOUR
  if (!Number.isFinite(deltaKwh) || deltaKwh <= 0 || hours <= 0) return 0
  return (deltaKwh * 1000) / hours
}

/**
 * Leistung (W) aus gezählten Zähler-Impulsen.
 *
 * `n` Impulse entsprechen `n / impulsesPerKwh` Kilowattstunden; geteilt durch
 * die dafür gestoppte Zeit ergibt das die Leistung. Der Weg ist unabhängig
 * davon, was das Display anzeigt – und damit der einzige, der auch auf einem
 * Zähler ohne Nachkommastelle in Minuten zu einer belastbaren Zahl kommt.
 *
 * @param impulses Gezählte Impulse (LED-Blinken bzw. Scheibenumdrehungen).
 * @param seconds Gestoppte Zeit für diese Impulse.
 * @param impulsesPerKwh Zählerkonstante vom Typenschild (z. B. 1000 imp/kWh).
 */
export function wattsFromImpulses(
  impulses: number,
  seconds: number,
  impulsesPerKwh: number,
): number {
  if (!(impulses > 0) || !(seconds > 0) || !(impulsesPerKwh > 0)) return 0
  return (impulses * 1000 * SECONDS_PER_HOUR) / (impulsesPerKwh * seconds)
}

/**
 * Obergrenze dessen, was ein Haushalt überhaupt ziehen kann (W).
 *
 * Ein üblicher Hausanschluss ist mit 3 × 63 A abgesichert, das sind bei 230 V
 * rund 43 kW; eine Wohnung liegt mit 3 × 35 A noch deutlich darunter. Alles
 * darüber ist keine Messung, sondern ein Vertipper im Zählerstand oder eine
 * zweite Ablesung Sekunden nach der ersten.
 *
 * Ohne diese Schranke wurde beides klaglos gespeichert – und eine Messung über
 * zwölf Sekunden landete als „145.703 W" im Vorher/Nachher-Vergleich, der
 * daraus eine Ersparnis von 381.209 € im Jahr ableitete.
 */
export const MAX_PLAUSIBLE_W = 43_000

/** Ob eine Leistung als Haushaltsmessung überhaupt in Frage kommt. */
export function plausibleWatts(watts: number): boolean {
  return Number.isFinite(watts) && watts > 0 && watts <= MAX_PLAUSIBLE_W
}

/**
 * Auflösung des Zähler-Displays in kWh – die letzte Stelle, die er anzeigt.
 * Sie entscheidet allein darüber, wie lange gemessen werden muss: Ein Zähler
 * mit 0,1 kWh springt bei 100 W Grundlast nur einmal pro Stunde weiter.
 *
 * `1` gehört dazu, weil es solche Zähler gibt: Fehlte die Stufe, wählte ihr
 * Besitzer zwangsläufig die nächstfeinere – und bekam eine zehnfach zu gute
 * Genauigkeit bescheinigt (±2 % statt ±20 %).
 */
export const METER_RESOLUTIONS = [1, 0.1, 0.01, 0.001] as const
export type MeterResolution = (typeof METER_RESOLUTIONS)[number]

/**
 * Mindestdauer, damit die Messung mehrere Kühlschrank-Zyklen abdeckt.
 *
 * Der Kompressor läuft getaktet (grob ein Drittel der Zeit, ~80 W). Eine kurze
 * Messung erwischt entweder „an" oder „aus" – der Fehler daraus ist größer als
 * jede Zähler-Ungenauigkeit und lässt sich nur durch Zeit herausmitteln.
 */
export const CYCLE_SAFE_MS = 3 * MS_PER_HOUR

/** Ab dieser Unsicherheit ist die Zahl nur noch Rauschen und wird verworfen. */
const MAX_USABLE_UNCERTAINTY = 0.5
/** Bis hierher gilt die Messung als genau. */
const GOOD_UNCERTAINTY = 0.1
/** Typische Grundlast, mit der die empfohlene Wartezeit vorab geschätzt wird. */
const ASSUMED_WATTS = 100

/**
 * Warum zwei Ablesungen nicht verwertbar sind.
 *
 * Drei verschiedene Fehler mit drei verschiedenen Abhilfen – deshalb benannt
 * und nicht bloß ein `false`: „länger warten" hilft dem Vertipper nicht, und
 * „nachrechnen" hilft dem nicht, dessen Zähler sich noch nicht bewegt hat.
 */
export type ReadingsProblem = 'tooLittleMovement' | 'tooShort' | 'implausible'

/** Wie belastbar eine Zwei-Ablesungen-Messung ist. */
export interface ReadingsQuality {
  /** Relative Unsicherheit aus der Zähler-Auflösung (0,06 = ±6 %). */
  uncertainty: number
  /** true, wenn der Zeitraum mehrere Kühlschrank-Zyklen abdeckt. */
  longEnough: boolean
  /** false → die Zahl sagt nichts aus; `problem` nennt den Grund. */
  usable: boolean
  level: 'good' | 'fair' | 'poor'
  /** Gesetzt, solange `usable` false ist. */
  problem?: ReadingsProblem
}

/**
 * Bewertet, wie belastbar zwei Zählerstände sind – aus der Auflösung des
 * Displays, der verstrichenen Zeit und der Leistung, die dabei herauskommt.
 *
 * Genau hier scheiterte die frühere Stoppuhr-Messung: Bei 0,1 kWh Auflösung und
 * fünf Minuten Wartezeit steht der Zähler noch auf demselben Wert. Statt eines
 * toten Buttons soll die App sagen können, dass es schlicht zu früh ist.
 *
 * Die Dauer ist seit dem 06.09. eine harte Bedingung, nicht mehr nur ein
 * Abzug in der Note: Unter {@link CYCLE_SAFE_MS} misst man, ob der
 * Kühlschrank-Kompressor gerade läuft, nicht die Grundlast – und wer eine
 * Momentaufnahme will, hat dafür zwei eigene, ehrlichere Wege
 * (`instant`, `impulse`). Vorher war eine Messung über zwölf Sekunden
 * auswertbar und speicherbar.
 */
export function readingsQuality(
  startKwh: number,
  endKwh: number,
  elapsedMs: number,
  resolutionKwh: number,
): ReadingsQuality {
  const delta = endKwh - startKwh
  if (!(delta > 0) || !(elapsedMs > 0) || !(resolutionKwh > 0)) {
    return {
      uncertainty: 1,
      longEnough: false,
      usable: false,
      level: 'poor',
      problem: 'tooLittleMovement',
    }
  }
  const uncertainty = Math.min(1, resolutionKwh / delta)
  const longEnough = elapsedMs >= CYCLE_SAFE_MS
  const problem: ReadingsProblem | undefined = !plausibleWatts(
    wattsFromTimed(startKwh, endKwh, elapsedMs),
  )
    ? 'implausible'
    : uncertainty > MAX_USABLE_UNCERTAINTY
      ? 'tooLittleMovement'
      : !longEnough
        ? 'tooShort'
        : undefined
  const usable = problem === undefined
  const level: ReadingsQuality['level'] = !usable
    ? 'poor'
    : uncertainty <= GOOD_UNCERTAINTY
      ? 'good'
      : 'fair'
  return { uncertainty, longEnough, usable, level, problem }
}

/**
 * Empfohlene Wartezeit zwischen den beiden Ablesungen (ms).
 *
 * Ziel sind zehn Anzeige-Schritte (±10 %) bei einer angenommenen Grundlast von
 * {@link ASSUMED_WATTS} – mindestens aber {@link CYCLE_SAFE_MS}, weil ein
 * feiner Zähler zwar schneller genau, die Momentaufnahme dadurch aber nicht
 * repräsentativer wird.
 */
export function recommendedWaitMs(resolutionKwh: number): number {
  if (!(resolutionKwh > 0)) return CYCLE_SAFE_MS
  const targetKwh = 10 * resolutionKwh
  const hours = targetKwh / (ASSUMED_WATTS / 1000)
  return Math.max(CYCLE_SAFE_MS, hours * MS_PER_HOUR)
}

/**
 * Längste Messdauer, die zwei Ablesungen realistisch überbrücken: eine Nacht.
 * Länger geht zwar technisch, misst aber keine Grundlast mehr – über Tage
 * laufen zwangsläufig wieder aktiv genutzte Geräte mit.
 */
const OVERNIGHT_MS = 12 * MS_PER_HOUR

/**
 * Ob zwei Ablesungen auf diesem Zähler überhaupt genau werden können.
 *
 * Ein Zähler ohne Nachkommastelle bewegt sich über Nacht um ein bis zwei
 * Stellen – das sind ±50 % und mehr. Die nötige Dauer stünde bei rund vier
 * Tagen ({@link recommendedWaitMs}), und über vier Tage misst man den
 * Haushalt, nicht seine Grundlast. Für solche Zähler ist `impulse` der
 * einzige Weg, der in Minuten zu einer belastbaren Zahl führt.
 */
export function readableOvernight(resolutionKwh: number): boolean {
  return recommendedWaitMs(resolutionKwh) <= OVERNIGHT_MS
}

export interface BaseLoadResult {
  /** Grundlast in Watt (auf 1 Nachkommastelle gerundet). */
  watts: number
  rating: MeasurementRating
  /** Grober jährlicher Dauerverbrauch in kWh. */
  annualKwh: number
  /** Grobe jährliche Kosten der Grundlast in € (nur Orientierung, kein Sparwert). */
  annualEur: number
}

/**
 * Fasst eine ermittelte Grundlast (W) zu Verbrauch, Kosten und Bewertung zusammen.
 *
 * @param rawWatts Gemessene Grundlast.
 * @param workPriceCt Arbeitspreis in ct/kWh.
 * @param totalYearKwh Jahres-Stromverbrauch aus dem Monitoring, falls bekannt –
 *                     dann wird am Anteil bewertet statt an absoluten Watt.
 */
export function calcBaseLoad(
  rawWatts: number,
  workPriceCt: number,
  totalYearKwh?: number,
): BaseLoadResult {
  const watts = Number.isFinite(rawWatts) && rawWatts > 0 ? Math.round(rawWatts * 10) / 10 : 0
  const annualKwh = (watts * HOURS_PER_YEAR) / 1000
  const annualEur = (annualKwh * workPriceCt) / 100
  const share =
    totalYearKwh !== undefined && Number.isFinite(totalYearKwh) && totalYearKwh > 0
      ? annualKwh / totalYearKwh
      : undefined
  return {
    watts,
    rating: rateBaseLoad(watts, share),
    annualKwh: Math.round(annualKwh),
    annualEur: Math.round(annualEur),
  }
}

/**
 * Ab diesem Anteil am Jahresverbrauch kann die Messung nicht stimmen: Die
 * Grundlast ist per Definition eine Teilmenge des Gesamtverbrauchs. Kommt mehr
 * heraus, liefen bei der Messung noch aktiv genutzte Geräte mit (oder der
 * Zählerstand wurde vertippt). Dann lieber keine Zahl zeigen als eine falsche.
 */
const IMPLAUSIBLE_SHARE = 0.95

export interface BaseLoadShare {
  /** Anteil der Grundlast am Jahres-Stromverbrauch (0…1). */
  share: number
  /** Jahresverbrauch laut Monitoring (kWh, gerundet). */
  totalYearKwh: number
  /** Worauf dieser Jahreswert beruht – bestimmt, wie belastbar der Anteil ist. */
  basis: ProjectionBasis
  /** Zahl der tatsächlich gemessenen Tage hinter dem Jahreswert. */
  measuredDays: number
  /** true, wenn der Anteil unmöglich hoch ist (siehe {@link IMPLAUSIBLE_SHARE}). */
  implausible: boolean
}

/**
 * Setzt die gemessene Grundlast ins Verhältnis zum tatsächlichen
 * Jahres-Stromverbrauch aus den Monitoring-Ablesungen.
 *
 * „180 W" sagt niemandem etwas, „ein Drittel deiner Stromrechnung" schon – und
 * der Anteil macht die Zahl zusätzlich unabhängig von der Haushaltsgröße, für
 * die absolute Watt-Schwellen zwangsläufig unfair sind.
 *
 * Reine Funktion. Liefert `undefined`, solange kein belastbarer Jahreswert
 * vorliegt (zu kurze Ableshistorie – siehe `stats()`) – dann
 * gibt es schlicht nichts zu vergleichen.
 *
 * @param annualBaseKwh Jahres-Dauerverbrauch der Grundlast (aus {@link calcBaseLoad}).
 * @param stats Kennzahlen der Strom-Ablesungen (`stats()` aus dem Monitoring).
 */
export function baseLoadShare(
  annualBaseKwh: number,
  stats: Pick<ReadingStats, 'projectedYearKwh' | 'projectionBasis' | 'projectionDays'>,
): BaseLoadShare | undefined {
  const total = stats.projectedYearKwh
  if (!Number.isFinite(annualBaseKwh) || annualBaseKwh <= 0) return undefined
  if (total === undefined || stats.projectionBasis === undefined || !(total > 0)) return undefined
  const share = annualBaseKwh / total
  return {
    share,
    totalYearKwh: Math.round(total),
    basis: stats.projectionBasis,
    measuredDays: stats.projectionDays ?? 0,
    implausible: share > IMPLAUSIBLE_SHARE,
  }
}

/**
 * Angenommene Unsicherheit einer Momentaufnahme (Zähler mit Watt-Anzeige).
 *
 * Sie hat keine gemessene Genauigkeit: Der Wert hängt davon ab, ob der
 * Kühlschrank-Kompressor gerade läuft. Bewusst grob angesetzt – dadurch gilt
 * ein Unterschied zwischen zwei Momentaufnahmen fast nie als belegt, was
 * ehrlich ist: Beweisen lässt er sich damit nicht.
 */
const SNAPSHOT_UNCERTAINTY = 0.25

/** Untergrenze der Toleranz (W). Zwei Nächte sind nie exakt gleich. */
const MIN_TOLERANCE_W = 5

/** Eine Messung, wie sie für den Vorher/Nachher-Vergleich gebraucht wird. */
export interface BaseLoadPoint {
  watts: number
  /** Relative Unsicherheit (0,09 = ±9 %); fehlt bei Momentaufnahmen. */
  uncertainty?: number
}

export interface BaseLoadChange {
  /** Veränderung in Watt, positiv = gesunken. */
  deltaWatts: number
  /** Unsicherheit der Veränderung in Watt (±). */
  toleranceWatts: number
  /** true, wenn die Veränderung größer als ihre Unsicherheit ist. */
  significant: boolean
  direction: 'down' | 'up'
  /** Jährliche Ersparnis in € – nur bei belegter Senkung, sonst 0. */
  annualEur: number
}

/**
 * Vergleicht zwei Grundlast-Messungen und sagt, ob der Unterschied echt ist.
 *
 * Das ist der eine Punkt, an dem die App nicht schätzt, sondern nachweist: Wer
 * Dauerverbraucher abgeschafft hat, sieht hier, was es tatsächlich gebracht
 * hat – nicht, was es laut Modell bringen sollte.
 *
 * Entscheidend ist die Toleranz. Zwei Messungen mit je ±9 % lassen einen
 * Unterschied von 8 W nicht erkennen; ihn trotzdem als Erfolg auszuweisen wäre
 * eine Erfindung. Die Unsicherheiten werden quadratisch addiert (sie sind
 * unabhängig voneinander), mit {@link MIN_TOLERANCE_W} als Untergrenze.
 *
 * Beide Messungen müssen als Haushaltsleistung überhaupt möglich sein
 * ({@link plausibleWatts}). Das gilt der **Vergangenheit**: Ergebnisse werden
 * nicht migriert, und vor der Schranke in {@link readingsQuality} konnten
 * unmögliche Werte entstehen und wurden gespeichert. Ein solcher Altbestand
 * darf keinen Vergleich tragen – sonst steht dort „von 145.703 W auf 355 W …
 * rund 381.209 € im Jahr, gemessen statt geschätzt".
 *
 * @param previous Frühere Messung.
 * @param current Aktuelle Messung.
 * @param workPriceCt Arbeitspreis in ct/kWh.
 */
export function baseLoadChange(
  previous: BaseLoadPoint,
  current: BaseLoadPoint,
  workPriceCt: number,
): BaseLoadChange | undefined {
  if (!plausibleWatts(previous.watts) || !plausibleWatts(current.watts)) return undefined

  const err = (p: BaseLoadPoint) => p.watts * (p.uncertainty ?? SNAPSHOT_UNCERTAINTY)
  const toleranceWatts = Math.max(
    MIN_TOLERANCE_W,
    Math.sqrt(err(previous) ** 2 + err(current) ** 2),
  )

  const deltaWatts = previous.watts - current.watts
  const significant = Math.abs(deltaWatts) > toleranceWatts
  const direction: BaseLoadChange['direction'] = deltaWatts >= 0 ? 'down' : 'up'
  const annualKwh = (Math.abs(deltaWatts) * HOURS_PER_YEAR) / 1000
  const annualEur = significant && direction === 'down' ? (annualKwh * workPriceCt) / 100 : 0

  return {
    deltaWatts: Math.round(Math.abs(deltaWatts) * 10) / 10,
    toleranceWatts: Math.round(toleranceWatts * 10) / 10,
    significant,
    direction,
    annualEur: Math.round(annualEur),
  }
}
