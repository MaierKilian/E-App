// Zurückgezogene Ziele: Was aus dem Fragebogen verschwindet, muss aus
// gespeicherten Profilen verschwinden – auf beiden Ladewegen.
//
// `htw_study` war eines von fünf Zielen, solange der Fragebogen die HTW
// erwähnte. Der Wert ist aus `UserGoal` heraus, in Bestandsprofilen steht er
// aber weiter. Diese Tests halten fest, dass er beim Laden gefiltert wird –
// beim Start über den `persist`-Merge und beim Cloud-Sync, der `setState`
// direkt aufruft und am Merge vorbeigeht.

import { describe, expect, it } from 'vitest'
import { buildTips } from '@/features/tips/buildTips'
import { hydrate } from '@/features/sync/stores'
import { migrateOnboardingData, useOnboardingStore } from '@/store/onboardingStore'
import type { OnboardingData } from '@/types'

/** Ein Bestandsprofil, wie es vor dem Rückbau gespeichert wurde. */
function legacyProfile(goals: string[]): Partial<OnboardingData> {
  return { goals: goals as OnboardingData['goals'], livingArea: 80, persons: 2 }
}

describe('zurückgezogene Ziele', () => {
  it('entfernt htw_study, behält die übrigen Ziele', () => {
    const data = migrateOnboardingData(legacyProfile(['save_costs', 'htw_study']))
    expect(data.goals).toEqual(['save_costs'])
  })

  it('lässt eine leere Liste zu, wenn htw_study das einzige Ziel war', () => {
    const data = migrateOnboardingData(legacyProfile(['htw_study']))
    expect(data.goals).toEqual([])
  })

  it('kommt mit einem Profil ohne goals-Feld zurecht', () => {
    expect(migrateOnboardingData({}).goals).toEqual([])
  })

  it('filtert auch auf dem Cloud-Weg, der am persist-Merge vorbeigeht', () => {
    hydrate({ onboarding: { data: legacyProfile(['reduce_co2', 'htw_study']) } })
    expect(useOnboardingStore.getState().data.goals).toEqual(['reduce_co2'])
  })

  it('lässt die Tipp-Reihenfolge unverändert', () => {
    const before = migrateOnboardingData(legacyProfile(['save_costs', 'htw_study']))
    const after = migrateOnboardingData(legacyProfile(['save_costs']))
    const ids = (data: OnboardingData) => buildTips(data, []).map((tip) => tip.id)
    expect(ids(before)).toEqual(ids(after))
  })
})
