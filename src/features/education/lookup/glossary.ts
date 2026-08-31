/**
 * Ordnung des Glossars: Anfangsbuchstaben und Anker.
 *
 * Reine Funktionen, damit `tests/unit` sie ohne DOM prüfen kann – wie schon bei
 * `search.ts`.
 */

/**
 * Anfangsbuchstabe eines Begriffs für die A–Z-Gliederung.
 *
 * Umlaute werden auf ihren Grundbuchstaben gezogen: „Übertemperatur" steht
 * unter U, „Ölkessel" unter O. So hält es jedes deutsche Nachschlagewerk – und
 * niemand sucht ein Ü hinter dem Z.
 */
export function initialOf(term: string): string {
  const first = term.trim().charAt(0)
  if (!first) return '#'
  const folded = first
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
  return /^[A-Z]$/.test(folded) ? folded : '#'
}

/** Anker eines Begriffs: `#glossar-<slug>`. */
export function slugifyTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Gruppiert Begriffe nach Anfangsbuchstaben, alphabetisch.
 *
 * Sortiert wird ausdrücklich hier und nicht im Inhalt: Sonst entschiede die
 * Reihenfolge im Quelltext über die Anzeige, und ein nachgetragener Begriff
 * landete am Ende statt an seiner Stelle.
 */
export function groupByInitial<T extends { term: string }>(
  items: T[],
): { letter: string; items: T[] }[] {
  const sorted = [...items].sort((a, b) => a.term.localeCompare(b.term, 'de'))
  const groups: { letter: string; items: T[] }[] = []
  for (const item of sorted) {
    const letter = initialOf(item.term)
    const last = groups[groups.length - 1]
    if (last && last.letter === letter) last.items.push(item)
    else groups.push({ letter, items: [item] })
  }
  return groups
}
