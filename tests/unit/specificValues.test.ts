// Spezifische Kennwerte: Verbrauch bezogen auf Fläche bzw. Personen.

import { describe, expect, it } from 'vitest'
import {
  specificValue,
  heatDemandBenchmark,
  hasEnergyContent,
  DEFAULT_KWH_PER_UNIT,
  HOT_WATER_SURCHARGE_KWH_PER_SQM,
} from '@/features/monitoring/specificValues'
import type { OnboardingData } from '@/types'

/** Wohnung: 100 m², 2 Personen, Baujahr 1985, Warmwasser über die Heizung. */
const PROFILE = {
  livingArea: 100,
  personsCount: 2,
  buildingYear: 1985,
  hotWaterType: 'same_as_heating',
} as unknown as OnboardingData

describe('heatDemandBenchmark', () => {
  it('staffelt nach Baujahr', () => {
    expect(heatDemandBenchmark(1960)).toBe(220)
    expect(heatDemandBenchmark(1985)).toBe(150)
    expect(heatDemandBenchmark(2000)).toBe(100)
    expect(heatDemandBenchmark(2010)).toBe(70)
    expect(heatDemandBenchmark(2020)).toBe(50)
  })

  it('liefert ohne Baujahr keinen Vergleichswert', () => {
    expect(heatDemandBenchmark(0)).toBeUndefined()
    expect(heatDemandBenchmark(Number.NaN)).toBeUndefined()
  })
})

describe('specificValue – Wärme', () => {
  it('rechnet Gas-m³ über den Energieinhalt in kWh/m²·a um', () => {
    // 1400 m³ × 10 kWh/m³ = 14 000 kWh, auf 100 m² -> 140 kWh/m²·a
    const s = specificValue('gas', 1400, PROFILE)
    expect(s?.basis).toBe('perAreaKwh')
    expect(s?.value).toBeCloseTo(140, 6)
  })

  it('nutzt einen hinterlegten Energieinhalt statt des Standards', () => {
    // Gas mit 11,2 kWh/m³ von der Jahresrechnung.
    const s = specificValue('gas', 1400, PROFILE, 11.2)
    expect(s?.value).toBeCloseTo(156.8, 6)
  })

  it('schlägt Warmwasser auf den Vergleichswert auf, wenn es mitläuft', () => {
    const s = specificValue('gas', 1400, PROFILE)
    expect(s?.benchmark).toBe(150 + HOT_WATER_SURCHARGE_KWH_PER_SQM)
  })

  it('lässt den Aufschlag bei eigenem Warmwassersystem weg', () => {
    const profile = { ...PROFILE, hotWaterType: 'separate_system' } as OnboardingData
    expect(specificValue('gas', 1400, profile)?.benchmark).toBe(150)
  })

  it('schlägt bei teilweise kombiniertem Warmwasser die Hälfte auf', () => {
    const profile = { ...PROFILE, hotWaterType: 'partially_combined' } as OnboardingData
    expect(specificValue('gas', 1400, profile)?.benchmark).toBe(150 + 10)
  })

  it('rechnet Pellets über ihren eigenen Energieinhalt', () => {
    // 3000 kg × 4,8 kWh/kg = 14 400 kWh auf 100 m²
    const s = specificValue('pellets', 3000, PROFILE)
    expect(s?.value).toBeCloseTo(144, 6)
  })

  it('liefert ohne Wohnfläche nichts', () => {
    const profile = { ...PROFILE, livingArea: 0 } as OnboardingData
    expect(specificValue('gas', 1400, profile)).toBeUndefined()
  })
})

describe('specificValue – Strom und Wasser', () => {
  it('bezieht Strom auf Personen, nicht auf die Fläche', () => {
    // 3000 kWh bei 2 Personen -> 1500 kWh/Person·a
    const s = specificValue('electricity', 3000, PROFILE)
    expect(s?.basis).toBe('perPersonKwh')
    expect(s?.value).toBeCloseTo(1500, 6)
  })

  it('rechnet Wasser in Liter pro Person und Tag', () => {
    // 91,25 m³/a = 91 250 l, bei 2 Personen und 365 Tagen -> 125 l/P·d
    const s = specificValue('water', 91.25, PROFILE)
    expect(s?.basis).toBe('perPersonLiterDay')
    expect(s?.value).toBeCloseTo(125, 6)
    expect(s?.benchmark).toBe(125)
  })

  it('liefert ohne Personenzahl nichts', () => {
    const profile = { ...PROFILE, personsCount: 0 } as OnboardingData
    expect(specificValue('electricity', 3000, profile)).toBeUndefined()
  })
})

describe('specificValue – Randfälle', () => {
  it('liefert ohne Jahresverbrauch nichts', () => {
    expect(specificValue('gas', undefined, PROFILE)).toBeUndefined()
    expect(specificValue('gas', 0, PROFILE)).toBeUndefined()
  })

  it('kennt für Erzeuger wie PV keine Bezugsgröße', () => {
    expect(specificValue('pv', 4000, PROFILE)).toBeUndefined()
  })
})

describe('hasEnergyContent', () => {
  it('gilt nur für Träger, deren Zähler Volumen oder Masse misst', () => {
    expect(hasEnergyContent('gas')).toBe(true)
    expect(hasEnergyContent('oil')).toBe(true)
    expect(hasEnergyContent('pellets')).toBe(true)
    expect(hasEnergyContent('electricity')).toBe(false)
    expect(hasEnergyContent('water')).toBe(false)
  })

  it('hat für Strom und Wärmepumpe den Faktor 1 (zählen schon in kWh)', () => {
    expect(DEFAULT_KWH_PER_UNIT.electricity).toBe(1)
    expect(DEFAULT_KWH_PER_UNIT.heat_pump).toBe(1)
  })
})
