import { PiggyBank, Leaf, ThermometerSun, Gauge, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { UserGoal } from '@/types'

/**
 * Die Ziele des Fragebogens – und wohin sie führen.
 *
 * Dieselbe Bauart wie `sections.ts`: eine Registry, aus der sich Oberfläche,
 * Reihenfolge und Ziel-Navigation ableiten. Vorher stand die Zielliste als
 * Array in `Step1Profile`, die Zuordnung zu einem Bereich gab es gar nicht –
 * der Fragebogen endete für jeden im Messbereich, egal was er angekreuzt hatte.
 */

export interface GoalMeta {
  id: UserGoal
  icon: LucideIcon
}

/**
 * Reihenfolge auf dem Bildschirm.
 *
 * Die drei Ziele, die zu Messungen führen, stehen zusammen oben; darunter die
 * beiden, die woanders hinführen. Wer die Seite überfliegt, sieht so zuerst
 * das, was die App im Kern tut.
 */
export const GOALS: GoalMeta[] = [
  { id: 'save_costs', icon: PiggyBank },
  { id: 'reduce_co2', icon: Leaf },
  { id: 'improve_comfort', icon: ThermometerSun },
  { id: 'track_readings', icon: Gauge },
  { id: 'curiosity', icon: Sparkles },
]

/** Wohin der Fragebogen führt, wenn kein Ziel etwas anderes verlangt. */
export const DEFAULT_DESTINATION = '/measurements'

/**
 * Ziele, die auf einen anderen Bereich zeigen – in der Reihenfolge, in der sie
 * gewinnen.
 *
 * **Warum eine Rangfolge nötig ist:** Die Auswahl ist mehrfach. Wer „Kosten
 * senken" *und* „Zählerstände verfolgen" ankreuzt, kann nicht an zwei Orten
 * landen. Es gewinnt das speziellere Ziel: „Kosten senken", „CO₂ reduzieren"
 * und „Komfort verbessern" führen alle in denselben Messbereich, die beiden
 * hier führen jeweils an genau einen anderen Ort.
 *
 * Es geht dabei nur um den **ersten Bildschirm** nach dem Fragebogen – jeder
 * Bereich bleibt über die Navigation erreichbar. Deshalb ist die Rangfolge
 * eine Höflichkeit, keine Weiche, an der etwas verlorengeht.
 */
const SPECIFIC_DESTINATIONS: { goal: UserGoal; path: string }[] = [
  { goal: 'track_readings', path: '/monitoring' },
  { goal: 'curiosity', path: '/education' },
]

/**
 * Der Bereich, in dem der Nutzer nach „Speichern" landen soll.
 *
 * Ohne Ziel – und für die drei Mess-Ziele – ist das der Messbereich: Er ist
 * das, was die App als Nächstes von einem will.
 */
export function destinationFor(goals: readonly UserGoal[] | undefined): string {
  for (const { goal, path } of SPECIFIC_DESTINATIONS) {
    if (goals?.includes(goal)) return path
  }
  return DEFAULT_DESTINATION
}

/**
 * i18n-Schlüssel für die Zeile „danach startest du hier".
 *
 * Der Pfad ist die Wahrheit, der Schlüssel hängt daran – so kann die Anzeige
 * nicht etwas anderes behaupten als die Navigation tut.
 */
export function destinationLabelKey(path: string): string {
  if (path === '/monitoring') return 'nav.monitoring'
  if (path === '/education') return 'nav.education'
  return 'nav.measurements'
}
