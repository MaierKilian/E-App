import type { TFunction } from 'i18next'
import type { MeasurementId, MeasurementResult } from './types'

/**
 * Einheitliche Darstellung des Hauptwerts einer Messung – Zahl plus Einheit.
 *
 * Zwei Regeln, die vorher an drei Stellen gedoppelt und uneinheitlich waren:
 *
 * 1. **Ganze Zahlen ohne Nachkommastelle.** Ein fest erzwungenes „,0" macht aus
 *    fünf Räumen „5,0 Räume" und aus 132 W „132,0 W" – eine Genauigkeit, die
 *    die Messung nicht hergibt. Gebrochene Werte (11,4 L/min) behalten ihre
 *    Stelle.
 * 2. **Wort-Einheiten folgen der Anzeigesprache.** Fast alle Messungen
 *    speichern ein sprachneutrales Zeichen (°C, W, L/min). Wo die Einheit ein
 *    Wort ist, gehört sie nicht in die gespeicherten Daten: Sie wäre nach einem
 *    Sprachwechsel falsch – und beim LED-Check hing an ihr zusätzlich eine
 *    Pluralform, die ohne Anzahl gar nicht erst aufgelöst werden konnte.
 */

/**
 * Messungen, deren Einheit ein Wort ist und deshalb erst bei der Anzeige
 * entsteht. Der Schlüssel wird mit `count` aufgelöst (Singular/Plural).
 */
const UNIT_I18N_KEY: Partial<Record<MeasurementId, string>> = {
  lighting: 'measurements.lighting.unit',
}

/** Ob die Einheit dieser Messung erst bei der Anzeige entsteht. */
export function hasWordUnit(id: string): boolean {
  return UNIT_I18N_KEY[id as MeasurementId] !== undefined
}

/** Einheit eines Ergebnisses in der Anzeigesprache. */
export function resultUnitLabel(t: TFunction, result: MeasurementResult): string {
  const key = UNIT_I18N_KEY[result.id]
  // Gespeicherte Wort-Einheiten bewusst ignorieren: Ältere Ergebnisse können
  // hier noch einen unaufgelösten Schlüssel stehen haben.
  if (key) return t(key, { count: result.primaryValue })
  return result.unit ?? ''
}

/** Hauptwert als Zahl, ganze Werte ohne „,0". */
export function formatResultValue(value: number, language: string): string {
  return new Intl.NumberFormat(language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value)
}

/** Vollständige Zeile „Zahl Einheit" für Kacheln und Listen. */
export function resultValueText(
  t: TFunction,
  language: string,
  result: MeasurementResult,
): string {
  return `${formatResultValue(result.primaryValue, language)} ${resultUnitLabel(t, result)}`.trim()
}
