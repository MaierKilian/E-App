import type { MeasurementRating } from '../types'

/**
 * Reine Berechnungslogik für den Gefriertruhen-Check.
 *
 * Ablauf: Zuerst wird gefragt, ob die Truhe vereist ist. Falls ja, wie stark.
 * Mehr fragt der Check nicht. Bis September 2026 konnte man zusätzlich mit
 * einem Energiekostenmessgerät vor und nach dem Abtauen messen; das verlangte
 * einen Vorgang über mehrere Tage in einem Bildschirm, den man in einem Zug
 * ausfüllt, und ist entfallen.
 *
 * **Die Antwort des Checks ist eine Empfehlung, keine Zahl.** Bis August 2026
 * war der Hauptwert ein geschätzter Euro-Betrag, der auf zwei Annahmen beruhte:
 * einem Fallback-Jahresverbrauch von 200 kWh, den niemand eingetragen hatte,
 * und einem Standard-Strompreis. Beim Standardpreis kamen dabei immer dieselben
 * zwei Zahlen heraus (8 € bzw. 21 €) – im Ergebnis-Schirm ohne Währungszeichen
 * dargestellt und damit vollends unverständlich. Jetzt sagt der Check, was zu
 * tun ist (siehe {@link DefrostAdvice}), und beziffert die Wirkung als Anteil
 * am Verbrauch – ohne Euro-Betrag.
 *
 * Quellen zur Vereisung: ~1 cm Eis → +10–15 %, dick/lange nicht abgetaut bis
 * +50 % Mehrverbrauch (Verivox, BUND Hessen, klimaaktiv).
 */

/**
 * Vereisungsgrad in Stufen.
 *
 * „Leicht oder stark?" war zu grob: Zwischen ein paar Millimetern an einzelnen
 * Stellen und einer flächendeckenden Eisschicht liegt der halbe Effekt, und
 * beide hätte man vorher „leicht" genannt.
 */
export type FrostStage =
  /** Eisfrei. */
  | 'none'
  /** Nur wenige Millimeter an ein paar Stellen. */
  | 'spots'
  /** Flächendeckend dünn vereist. */
  | 'thin'
  /** Vollständig durchvereist. */
  | 'thick'

/** Stufen in der Reihenfolge, in der sie abgefragt werden (ohne „eisfrei"). */
export const FROST_STAGES: Exclude<FrostStage, 'none'>[] = ['spots', 'thin', 'thick']

/** Mehrverbrauch je Stufe als Anteil des Jahresverbrauchs. */
const EXTRA_SHARE: Record<FrostStage, number> = {
  none: 0,
  spots: 0.05,
  thin: 0.12,
  thick: 0.3,
}

const RATING_BY_STAGE: Record<FrostStage, MeasurementRating> = {
  none: 'good',
  spots: 'medium',
  thin: 'elevated',
  thick: 'high',
}

/**
 * Was der Nutzer tun soll – die eigentliche Antwort des Checks.
 * Steht im Ergebnis an der Stelle, an der vorher eine nackte Zahl stand.
 */
export type DefrostAdvice =
  /** Eisfrei – nichts zu tun. */
  | 'notNeeded'
  /** Ein wenig Eis; beim nächsten Großeinkauf mitnehmen. */
  | 'canWait'
  /** Abtauen lohnt sich spürbar. */
  | 'worthwhile'
  /** Deutlicher Mehrverbrauch – jetzt abtauen. */
  | 'now'

const ADVICE_BY_STAGE: Record<FrostStage, DefrostAdvice> = {
  none: 'notNeeded',
  spots: 'canWait',
  thin: 'worthwhile',
  thick: 'now',
}

/**
 * Stabile Zahlencodes für die Persistenz.
 *
 * `details` nimmt nur Zahlen auf. Ein Index in ein Array wäre hier die falsche
 * Wahl: Sobald eine Stufe dazukommt, bedeuten alle gespeicherten Zahlen etwas
 * anderes. Diese Codes bleiben, was sie sind.
 */
const STAGE_CODE: Record<FrostStage, number> = { none: 0, spots: 1, thin: 2, thick: 3 }
const STAGE_BY_CODE: Record<number, FrostStage> = { 0: 'none', 1: 'spots', 2: 'thin', 3: 'thick' }

/**
 * Vereisungsgrad älterer Ergebnisse: `frost` war ein Index in
 * ['none', 'light', 'heavy']. „Leicht" entspricht der heutigen flächigen
 * dünnen Schicht, „stark" dem Durchvereisten.
 */
const LEGACY_STAGE_BY_CODE: Record<number, FrostStage> = { 0: 'none', 1: 'thin', 2: 'thick' }

export function stageCode(stage: FrostStage): number {
  return STAGE_CODE[stage]
}

/**
 * Liest den Vereisungsgrad aus einem gespeicherten Ergebnis – neues Format
 * (`frostStage`) bevorzugt, sonst das alte (`frost`).
 */
export function readFrostStage(details: Record<string, number> | undefined): FrostStage {
  if (!details) return 'none'
  const current = details.frostStage
  if (Number.isFinite(current) && STAGE_BY_CODE[current] !== undefined) {
    return STAGE_BY_CODE[current]
  }
  const legacy = details.frost
  if (Number.isFinite(legacy) && LEGACY_STAGE_BY_CODE[legacy] !== undefined) {
    return LEGACY_STAGE_BY_CODE[legacy]
  }
  return 'none'
}

export function rateFrost(stage: FrostStage): MeasurementRating {
  return RATING_BY_STAGE[stage]
}

export function defrostAdvice(stage: FrostStage): DefrostAdvice {
  return ADVICE_BY_STAGE[stage]
}

// Schwellenwerte Temperatur (°C). Optimal ~ -18 °C.
export const TEMP_OPTIMAL = -18
export const TEMP_TOO_WARM = -16 // wärmer als -16 °C = zu warm
export const TEMP_TOO_COLD = -20 // kälter als -20 °C = zu kalt

export type FreezerTempStatus = 'optimal' | 'tooWarm' | 'tooCold'

export function freezerTempStatus(temp: number): FreezerTempStatus {
  if (temp > TEMP_TOO_WARM) return 'tooWarm'
  if (temp < TEMP_TOO_COLD) return 'tooCold'
  return 'optimal'
}

/**
 * Wie die Wirkung ermittelt wurde.
 *
 * `'measured'` gibt es nicht mehr – neue Ergebnisse tragen nur noch die
 * Schätzung. **Gespeicherte** Ergebnisse führen dafür weiter `method: 2`, und
 * die Ergebnis-Ansicht liest das auch weiterhin (siehe `FreezerResult`).
 */
export type FreezerMethod = 'estimate' | 'none'

export interface FreezerSavingInput {
  /** Vereisungsgrad; 'none' = nicht vereist. */
  stage: FrostStage
  /** Innentemperatur in °C (nur wenn erfasst). */
  temperature?: number
}

export interface FreezerSaving {
  rating: MeasurementRating
  method: FreezerMethod
  advice: DefrostAdvice
  /**
   * Wirkung des Abtauens als Anteil des Verbrauchs in Prozent, geschätzt aus
   * der Stufe. Tritt an die Stelle des früheren Euro-Betrags: ein Anteil
   * braucht weder Jahresverbrauch noch Strompreis und behauptet damit nur, was
   * der Check wirklich weiß.
   */
  extraPercent: number
  temperatureStatus?: FreezerTempStatus
}

/**
 * Wertet den Check aus: Empfehlung, Bewertung und die Wirkung des Abtauens.
 *
 * Bewusst **ohne Euro-Betrag**: Eine Schätzung über einen angenommenen
 * Jahresverbrauch mal einem angenommenen Preis ist keine Zahl, die man jemandem
 * hinstellt, und eine echte Messung erhebt der Check nicht mehr.
 */
export function calcFreezerSaving(input: FreezerSavingInput): FreezerSaving {
  const stage = input.stage
  const hasTemp = Number.isFinite(input.temperature)
  const temperatureStatus = hasTemp ? freezerTempStatus(input.temperature as number) : undefined
  const rating = RATING_BY_STAGE[stage]
  const advice = ADVICE_BY_STAGE[stage]

  if (stage === 'none') {
    return { rating, method: 'none', advice, extraPercent: 0, temperatureStatus }
  }

  return {
    rating,
    method: 'estimate',
    advice,
    extraPercent: Math.round(EXTRA_SHARE[stage] * 100),
    temperatureStatus,
  }
}
