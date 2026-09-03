import { goalCategoryBonus } from '@/features/tips/buildTips'
import type { MeasurementMeta } from './catalog'
import type { UserGoal } from '@/types'

/**
 * Empfohlene Reihenfolge der Messungen, gewichtet nach den genannten Zielen.
 *
 * Die Katalog-Reihenfolge (einfach zuerst) bleibt der Grundstock – sie steckt
 * die Erfahrung, in welcher Folge ein Laie am ehesten durchhält. Die Interessen
 * **verschieben** nur: Wer CO₂ senken will, sieht Wärme und Warmwasser eher.
 *
 * **Dieselbe Gewichtung wie bei den Empfehlungen** (`goalCategoryBonus`). Bis
 * September 2026 waren es zwei verschiedene Ordnungen für dieselbe Frage: Die
 * Tipps waren zielsortiert, die Messreihenfolge war es nicht – der Nutzer sah
 * seine Ziele in der einen Liste wirken und in der anderen nicht.
 *
 * Stabil: Bei gleichem Gewicht bleibt die Katalog-Reihenfolge erhalten
 * (`Array.prototype.sort` ist seit ES2019 stabil).
 */
export function orderedMeasurements(
  metas: MeasurementMeta[],
  goals: readonly UserGoal[] | undefined,
): MeasurementMeta[] {
  if (!goals || goals.length === 0) return metas
  return [...metas].sort(
    (a, b) => goalCategoryBonus(b.category, goals) - goalCategoryBonus(a.category, goals),
  )
}
