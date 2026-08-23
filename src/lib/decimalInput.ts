/**
 * Robustes Einlesen von Dezimalzahlen aus Freitext-Feldern.
 *
 * Hintergrund: `<input type="number">` verwirft eine Eingabe, die es nicht
 * selbst parsen kann – ein getipptes Komma kommt im `onChange` also gar nicht
 * erst an, `value` ist dann schlicht leer. Wer „13200,4" eintippt, sieht das
 * Feld leer bleiben. Deshalb werden solche Felder als `type="text"` mit
 * `inputMode="decimal"` geführt und hier ausgewertet.
 *
 * Zusätzlich trennt diese Funktion Dezimal- von Tausendertrennern. Ohne das
 * würde aus dem deutsch getippten „13.200" die Zahl 13,2 – ein Faktor-1000-
 * Fehler, der in einer Messung unbemerkt durchginge.
 */

/** Dezimaltrenner der Oberflächensprache (Deutsch: Komma, Englisch: Punkt). */
function decimalSeparator(language: string): ',' | '.' {
  return language.toLowerCase().startsWith('en') ? '.' : ','
}

/**
 * Ob ein einzeln stehender Trenner an `index` eine Tausendergruppe abtrennt.
 *
 * Drei Ziffern dahinter sind notwendig, aber nicht hinreichend: „0,350" (ein
 * Preis) hätte sonst als 350 gelesen werden können. Vor einer Tausendergruppe
 * stehen ein bis drei Ziffern, und eine führende Null gibt es dort nicht.
 */
function looksLikeGrouping(cleaned: string, index: number): boolean {
  const before = cleaned.slice(0, index)
  const after = cleaned.slice(index + 1)
  if (after.length !== 3) return false
  if (before.length === 0 || before.length > 3) return false
  return !before.startsWith('0')
}

/**
 * Liest eine nicht-negative Dezimalzahl aus einer Nutzereingabe.
 *
 * Der Dezimaltrenner der Sprache gilt, wenn er vorkommt. Sonst wird der andere
 * Trenner gedeutet: Trennt er eine Tausendergruppe ab („13.200" → 13200, siehe
 * {@link looksLikeGrouping}), gilt er als solcher, sonst als Dezimaltrenner
 * („13200.4" → 13200,4). Mehrfach vorkommende Trenner sind immer Tausender.
 *
 * @returns Die Zahl, oder `undefined` bei leerer/unlesbarer Eingabe.
 */
export function parseDecimalInput(raw: string, language = 'de'): number | undefined {
  // Leerzeichen und Apostroph-Gruppierung (Schweizer Schreibweise) entfernen.
  const cleaned = raw.replace(/[\s'\u2019]/g, '')
  if (cleaned === '' || !/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return undefined

  const dec = decimalSeparator(language)
  const group = dec === ',' ? '.' : ','

  let decIndex = cleaned.lastIndexOf(dec)
  if (decIndex < 0) {
    const first = cleaned.indexOf(group)
    const last = cleaned.lastIndexOf(group)
    if (first >= 0 && first === last && !looksLikeGrouping(cleaned, last)) decIndex = last
  }

  const digitsOnly = (from: number, to: number) => cleaned.slice(from, to).replace(/[.,]/g, '')
  const normalized =
    decIndex < 0
      ? digitsOnly(0, cleaned.length)
      : `${digitsOnly(0, decIndex)}.${digitsOnly(decIndex + 1, cleaned.length)}`

  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}

/**
 * Gegenstück zu {@link parseDecimalInput}: eine Zahl so darstellen, wie sie in
 * einem Eingabefeld erscheinen soll.
 *
 * Wichtig für den Rundlauf. `String(1.234)` ergäbe „1.234", was auf Deutsch als
 * Tausendergruppe gelesen würde – aus 1,234 wäre beim nächsten Tippen 1234
 * geworden. Mit dem Trenner der Sprache bleibt der Wert stabil.
 */
export function formatDecimalInput(value: number | undefined, language = 'de'): string {
  if (value === undefined || !Number.isFinite(value)) return ''
  return String(value).replace('.', decimalSeparator(language))
}
