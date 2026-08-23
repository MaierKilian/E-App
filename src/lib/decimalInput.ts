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
 * Liest eine nicht-negative Dezimalzahl aus einer Nutzereingabe.
 *
 * Der Dezimaltrenner der Sprache gilt, wenn er vorkommt. Sonst wird der andere
 * Trenner gedeutet: Steht er genau einmal und folgen ihm exakt drei Ziffern,
 * ist es ein Tausendertrenner („13.200" → 13200), sonst der Dezimaltrenner
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
    // Nur ein Trenner und keine saubere Dreiergruppe dahinter → Dezimaltrenner.
    if (first >= 0 && first === last && cleaned.length - last - 1 !== 3) decIndex = last
  }

  const digitsOnly = (from: number, to: number) => cleaned.slice(from, to).replace(/[.,]/g, '')
  const normalized =
    decIndex < 0
      ? digitsOnly(0, cleaned.length)
      : `${digitsOnly(0, decIndex)}.${digitsOnly(decIndex + 1, cleaned.length)}`

  const value = Number.parseFloat(normalized)
  return Number.isFinite(value) && value >= 0 ? value : undefined
}
