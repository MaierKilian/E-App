/**
 * Suche und Textaufbereitung der drei Nachschlage-Ansichten (FAQ, Glossar,
 * Hintergründe).
 *
 * Reine Funktionen ohne React: `tests/unit` läuft ohne DOM, die Suchlogik ist
 * damit prüfbar, ohne eine Komponente zu rendern. Die Ansichten in
 * `EducationPage.tsx` benutzen sie nur.
 */

/** Ein Stück Text der Trefferanzeige – `hit` markiert die Fundstelle. */
export interface HighlightPart {
  text: string
  hit: boolean
}

/**
 * Faltet ein Zeichen für den Vergleich: klein, ohne Diakritika, ß → ss.
 *
 * Damit findet „warme“ auch „Wärme“ und „strasse“ auch „Straße“. Ohne die
 * Faltung müsste der Suchende die Umlaute exakt treffen – auf einer
 * Mobiltastatur die häufigste Ursache für „nichts gefunden“.
 */
function foldChar(ch: string): string {
  const lower = ch.toLowerCase()
  if (lower === 'ß') return 'ss'
  return lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Gefaltete Fassung eines Textes samt Rückweg.
 *
 * `map[i]` nennt den Index im **Originaltext**, aus dem das gefaltete Zeichen
 * `i` stammt. Den Rückweg braucht die Hervorhebung: Gesucht wird auf dem
 * gefalteten Text, markiert wird im Original – und beide sind nicht
 * zeichengleich lang, sobald ein „ß“ im Spiel ist.
 */
export function fold(text: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i += 1) {
    for (const c of foldChar(text[i])) {
      folded += c
      map.push(i)
    }
  }
  return { folded, map }
}

/** Normalisierte Suchanfrage. Leer = keine Suche. */
export function normalizeQuery(query: string): string {
  return fold(query).folded.trim()
}

/** Prüft, ob einer der Texte die Anfrage enthält. Leere Anfrage = alles passt. */
export function matchesQuery(query: string, ...texts: (string | undefined)[]): boolean {
  const q = normalizeQuery(query)
  if (!q) return true
  return texts.some((text) => text != null && fold(text).folded.includes(q))
}

/**
 * Zerlegt einen Text in Treffer- und Zwischenstücke – Grundlage der
 * Hervorhebung. Ohne Anfrage (oder ohne Fund) ist das Ergebnis ein einziges
 * Stück ohne Treffer, die Anzeige bleibt damit unverändert.
 */
export function splitHighlight(text: string, query: string): HighlightPart[] {
  const q = normalizeQuery(query)
  if (!q) return [{ text, hit: false }]

  const { folded, map } = fold(text)
  const parts: HighlightPart[] = []
  let cursor = 0
  let at = folded.indexOf(q)

  while (at >= 0) {
    // Ende ist das erste Originalzeichen NACH dem letzten getroffenen: Ein „ß“,
    // von dem nur das erste „s“ getroffen wurde, wird trotzdem ganz markiert.
    const start = map[at]
    const end = map[at + q.length - 1] + 1
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hit: false })
    parts.push({ text: text.slice(start, end), hit: true })
    cursor = end
    at = folded.indexOf(q, at + q.length)
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false })
  return parts
}

/**
 * Abkürzungen, deren Punkt kein Satzende ist.
 *
 * Ohne diese Liste bricht `deriveTeaser` mitten in „z. B.“ ab und die
 * Vorschauzeile lautet „Schon 5 W Dauerlast bedeuten – je nach Strompreis, z.“
 */
const ABBREVIATIONS = new Set([
  'z', 'b', 'ca', 'bzw', 'd', 'h', 'u', 'a', 'ggf', 'evtl', 'inkl', 'exkl',
  'vgl', 'etc', 'max', 'min', 'nr', 'abb', 'mio', 'mrd', 'ggü', 'sog', 'usw',
])

/** Kürzeste Vorschau, die noch etwas aussagt. Darunter wird weitergesucht. */
const TEASER_MIN = 40

/**
 * Leitet die Vorschauzeile aus dem Fließtext ab: möglichst der erste ganze
 * Satz, sonst ein am Wort abgeschnittener Anfang.
 *
 * Damit bekommt **jeder** Bestandseintrag sofort eine Vorschau, ohne dass ein
 * Text angefasst werden muss. Ein ausdrücklich gepflegtes `teaser`-Feld hat
 * Vorrang (siehe {@link teaserOf}) – erst dort wird der Satz handverlesen.
 */
export function deriveTeaser(text: string, max = 84): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ''

  // Satzende suchen: Punkt/Ausrufe-/Fragezeichen, gefolgt von Leerzeichen.
  for (let i = TEASER_MIN; i < clean.length && i <= max; i += 1) {
    if (!'.!?'.includes(clean[i]) || clean[i + 1] !== ' ') continue
    const word = clean.slice(0, i).split(/[\s(]/).pop()?.toLowerCase() ?? ''
    if (clean[i] === '.' && ABBREVIATIONS.has(word)) continue
    return clean.slice(0, i + 1)
  }

  if (clean.length <= max) return clean
  const cut = clean.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  const head = lastSpace > TEASER_MIN ? cut.slice(0, lastSpace) : cut
  return `${trimDanglingTail(head)} …`
}

/**
 * Entfernt einen angebrochenen Schluss: eine halbe Abkürzung, eine offene
 * Klammer, ein Satzzeichen.
 *
 * Ohne das endet die Vorschau von „Endenergie" bei „… genutzt wird (z. B …" –
 * die Klammer ist auf, die Abkürzung halb, und beides liest sich wie ein
 * Fehler statt wie eine Kürzung.
 */
function trimDanglingTail(text: string): string {
  let out = text.replace(/[.,;:–-]+$/, '').trimEnd()
  // Höchstens zwei Schritte: „(z. B" braucht zwei, mehr ist kein Anbruch mehr.
  for (let step = 0; step < 2; step += 1) {
    const token = out.split(' ').pop() ?? ''
    const bare = token.replace(/^[(„"']+/, '')
    const dangling = bare.length <= 2 || bare.endsWith('.')
    if (!dangling || !out.includes(' ')) break
    out = out.slice(0, out.length - token.length).trimEnd()
  }
  return out.replace(/[(„"'\s,;:–-]+$/, '')
}

/** Gepflegte Vorschau, sonst die aus dem Fließtext abgeleitete. */
export function teaserOf(item: { teaser?: string }, body: string): string {
  return item.teaser?.trim() || deriveTeaser(body)
}

/**
 * Textausschnitt rund um die Fundstelle – die Antwort auf „warum ist das ein
 * Treffer?“.
 *
 * Ohne ihn zeigt ein Suchergebnis nur Titel und Vorschau, und wer nach „Wärme“
 * sucht, sieht als Treffer „Lohnt sich ein hydraulischer Abgleich?“ ohne jeden
 * sichtbaren Grund – das gesuchte Wort steht im zugeklappten Fließtext. Der
 * Ausschnitt holt es nach vorn.
 */
export function snippetAround(text: string, query: string, len = 96): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const q = normalizeQuery(query)
  if (!q) return ''

  const { folded, map } = fold(clean)
  const at = folded.indexOf(q)
  if (at < 0) return ''

  const hitStart = map[at]
  const hitEnd = map[at + q.length - 1] + 1

  // Etwas Vorlauf, damit die Fundstelle nicht am linken Rand klebt.
  let start = Math.max(0, hitStart - Math.floor(len / 3))
  if (start > 0) {
    const space = clean.indexOf(' ', start)
    start = space >= 0 && space < hitStart ? space + 1 : start
  }
  let end = Math.min(clean.length, Math.max(hitEnd, start + len))
  if (end < clean.length) {
    const space = clean.lastIndexOf(' ', end)
    end = space > hitEnd ? space : end
  }

  return `${start > 0 ? '… ' : ''}${clean.slice(start, end)}${end < clean.length ? ' …' : ''}`
}

/**
 * Die Zeile unter dem Titel – im Ruhezustand die Vorschau, während einer Suche
 * der Ausschnitt mit der Fundstelle.
 *
 * Steht das Gesuchte schon in Titel oder Vorschau, bleibt es bei der Vorschau:
 * Ein Ausschnitt, der dasselbe noch einmal zeigt, wäre nur Unruhe.
 */
export function searchPreview(
  title: string,
  teaser: string,
  body: string,
  query: string,
): string {
  if (!normalizeQuery(query)) return teaser
  if (matchesQuery(query, title, teaser)) return teaser
  return snippetAround(body, query) || teaser
}
