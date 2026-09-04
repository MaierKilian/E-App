// Woher der Duschkopf-Check seinen €/kWh-Preis nimmt.
//
// Die Frage „Wie wird das Warmwasser erzeugt?" ist die folgenreichste Angabe des
// Fragebogens, die man ihr nicht ansieht: Zwischen elektrisch und Gas liegt je
// nutzbarer Kilowattstunde ist elektrisch die teuerste der fünf Quellen, und
// die Ersparnis des
// Duschkopf-Tests hängt direkt daran.
//
// Bis September 2026 landete „Nicht bekannt" pauschal bei „elektrisch" – auch
// bei einem Gaskessel im Profil. Wer die Frage nicht beantworten konnte, bekam
// also die teuerste aller Quellen unterstellt.

import { describe, expect, it } from 'vitest'
import {
  defaultHotWaterSource,
  hotWaterSourceFromProfile,
  eurPerKwhHeat,
  HOT_WATER_SOURCES,
} from '@/features/measurements/showerhead/hotWaterEnergy'
import { DEFAULT_WORK_PRICE } from '@/store/tariffStore'
import type { HeatGeneratorType } from '@/types'

const GAS: HeatGeneratorType[] = ['gas_boiler']
const NONE: HeatGeneratorType[] = []

describe('Vorbelegte Warmwasserquelle', () => {
  it('folgt bei „wie Heizung" dem Wärmeerzeuger', () => {
    expect(defaultHotWaterSource('same_as_heating', GAS)).toBe('gas')
    expect(defaultHotWaterSource('partially_combined', ['heat_pump'])).toBe('heat_pump')
  })

  it('rät bei „nicht bekannt" auf den Wärmeerzeuger statt auf Strom', () => {
    // Der eigentliche Grund für diese Datei: Ein Haus mit Gaskessel macht sein
    // Warmwasser weit überwiegend damit. „Elektrisch" zu unterstellen war die
    // unwahrscheinlichste Annahme – und zugleich die teuerste.
    expect(defaultHotWaterSource('unknown', GAS)).toBe('gas')
  })

  it('bleibt bei „separates System" elektrisch – auch mit Kessel im Haus', () => {
    // Ein eigenes Gerät ist der Fall, für den die Antwort steht; der Kessel im
    // Keller ändert daran nichts.
    expect(defaultHotWaterSource('separate_system', GAS)).toBe('electric')
  })

  it('fällt ohne brauchbaren Wärmeerzeuger auf elektrisch zurück', () => {
    expect(defaultHotWaterSource('same_as_heating', NONE)).toBe('electric')
    expect(defaultHotWaterSource('unknown', NONE)).toBe('electric')
    // Solarthermie und Holzofen liefern keinen abrechenbaren Preis je kWh.
    expect(defaultHotWaterSource('same_as_heating', ['solar_thermal'])).toBe('electric')
  })
})

describe('Herkunft der Vorbelegung', () => {
  // Der Duschkopf-Check schreibt „aus deinem Profil" nur dort, wo das stimmt.
  it('nennt eine echte Angabe als solche', () => {
    expect(hotWaterSourceFromProfile('same_as_heating', GAS)).toBe(true)
    expect(hotWaterSourceFromProfile('separate_system', NONE)).toBe(true)
  })

  it('schweigt, wo geraten wurde', () => {
    expect(hotWaterSourceFromProfile('unknown', GAS)).toBe(false)
    // „Wie Heizung" ohne verwertbaren Erzeuger ist ebenfalls ein Rückfall.
    expect(hotWaterSourceFromProfile('same_as_heating', NONE)).toBe(false)
  })
})

describe('Preis je nutzbarer Kilowattstunde', () => {
  it('macht elektrisch zur teuersten Quelle', () => {
    // Mit den Standardtarifen des Preis-Stores. Die Aussage der App –
    // „elektrisch ist die teuerste Quelle" – muss aus der Rechnung folgen und
    // nicht nur im Text stehen.
    const tariff = {
      prices: {},
      electricityWorkPrice: DEFAULT_WORK_PRICE,
      electricityBasePrice: 0,
      isCustom: false,
    } as unknown as Parameters<typeof eurPerKwhHeat>[1]
    const strom = eurPerKwhHeat('electric', tariff)
    const andere = HOT_WATER_SOURCES.filter((s) => s !== 'electric').map((s) =>
      eurPerKwhHeat(s, tariff),
    )
    expect(strom).toBeGreaterThan(Math.max(...andere))
  })

  it('trägt die Zahl, die der Tipp behauptet', () => {
    // Der Tipp sagt „gut zweieinhalbmal so teuer wie Gas". Eine Aussage im Text,
    // die die Rechnung nicht hergibt, ist genau der Fehler, den diese Datei
    // verhindern soll – die erste Fassung behauptete das Vierfache.
    const tariff = {
      prices: {},
      electricityWorkPrice: DEFAULT_WORK_PRICE,
      electricityBasePrice: 0,
      isCustom: false,
    } as unknown as Parameters<typeof eurPerKwhHeat>[1]
    const verhaeltnis = eurPerKwhHeat('electric', tariff) / eurPerKwhHeat('gas', tariff)
    expect(verhaeltnis).toBeGreaterThan(2.5)
    expect(verhaeltnis).toBeLessThan(3)
  })
})
