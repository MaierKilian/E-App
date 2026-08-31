/**
 * Themen der Nachschlage-Ansichten – ein gemeinsamer Vorrat für alle drei
 * Bereiche. Welche davon vorkommen, entscheidet der Inhalt, nicht der Typ.
 *
 * Liegt getrennt von `FilterChips.tsx`, weil eine Datei entweder Komponenten
 * oder Werte exportieren sollte (Fast Refresh, `react-refresh/only-export-components`).
 */
export type Topic =
  | 'heating'
  | 'heat_pump'
  | 'hot_water'
  | 'electricity'
  | 'ventilation'
  | 'cost'
  | 'renovation'
  | 'building'
  | 'water'
  | 'app'

/** Anzeigereihenfolge der Chips – unabhängig davon, wie der Inhalt sortiert ist. */
const TOPIC_ORDER: Topic[] = [
  'heating',
  'heat_pump',
  'hot_water',
  'ventilation',
  'electricity',
  'water',
  'building',
  'renovation',
  'cost',
  'app',
]

/**
 * Die tatsächlich belegten Themen einer Liste, in fester Reihenfolge.
 *
 * Kein Chip ohne Inhalt: Solange die Einträge kein `topic` tragen, ist das
 * Ergebnis leer und die Leiste erscheint gar nicht erst. Damit lässt sich diese
 * Oberfläche ausliefern, bevor eine Zeile Inhalt geschrieben ist – die Chips
 * gehen von selbst an, sobald die Themen gepflegt sind.
 */
export function topicsOf(items: { topic?: Topic }[]): Topic[] {
  const present = new Set(items.map((i) => i.topic).filter((x): x is Topic => Boolean(x)))
  return TOPIC_ORDER.filter((topic) => present.has(topic))
}
