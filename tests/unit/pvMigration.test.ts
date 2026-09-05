// „Geplant" ist am 05.09.2026 aus der PV-Frage entfallen.
import { describe, expect, it } from 'vitest'
import { migrateOnboardingData } from '@/store/onboardingStore'
import type { OnboardingData } from '@/types'

describe('PV-Angabe „geplant"', () => {
  it('zieht ein Bestandsprofil auf „nein"', () => {
    // „Geplant" ist am 05.09.2026 aus der Frage entfallen. Bliebe der Wert
    // stehen, sähe die Frage unbeantwortet aus, obwohl `sections.ts` sie als
    // beantwortet zählt. Ziel ist „nein", nicht „ja": Es steht noch keine
    // Anlage – und den Erzeugungszähler schaltete der Wert nie frei.
    const data = migrateOnboardingData({ hasPV: 'planned' } as unknown as Partial<OnboardingData>)
    expect(data.hasPV).toBe('no')
  })

  it('lässt „ja" und „nein" unangetastet', () => {
    for (const value of ['yes', 'no'] as const) {
      expect(migrateOnboardingData({ hasPV: value }).hasPV).toBe(value)
    }
  })
})
