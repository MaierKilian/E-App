// Zähler entsperren: Das Profil schlägt vor, es sperrt nicht.
//
// Vorher entschied `activeEnergyTypes(data)`, welche Zähler es überhaupt gibt –
// wer im Schnellstart keine PV angegeben hatte, konnte seine Erzeugung nie
// erfassen. Diese Tests halten die neue Aufteilung fest: `suggestedEnergyTypes`
// für Vorbelegung und Erinnerungen, `boardEnergyTypes` für alles Sichtbare,
// `ALL_ENERGY_TYPES` für alles Erfassbare.

import { describe, expect, it } from 'vitest'
import {
  ALL_ENERGY_TYPES,
  boardEnergyTypes,
  suggestedEnergyTypes,
} from '@/features/monitoring/energyConfig'
import { dueTypes } from '@/features/monitoring/due'
import type { EnergyType, MeterReading } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

/** Minimalprofil aus dem Schnellstart: Gasheizung, keine PV. */
const PROFILE = {
  heatGenerators: ['gas_boiler'],
  hasPV: 'no',
} as unknown as OnboardingData

function reading(date: string, value: number): MeterReading {
  return { date, value } as MeterReading
}

/** Ablesung, die bei monatlicher Erinnerung längst fällig ist. */
const LONG_AGO = [reading('2026-01-01', 100)]
const NOW = new Date('2026-08-24T12:00:00Z').getTime()

describe('Vorschlag vs. Verfügbarkeit', () => {
  it('schlägt Strom, Wasser und den Wärmeerzeuger vor', () => {
    expect(suggestedEnergyTypes(PROFILE)).toEqual(['electricity', 'water', 'gas'])
  })

  it('hält jeden bekannten Träger erfassbar', () => {
    // Der eigentliche Punkt der Etappe: PV steht zur Verfügung, obwohl das
    // Profil keine Anlage nennt.
    expect(ALL_ENERGY_TYPES).toContain('pv')
    expect(suggestedEnergyTypes(PROFILE)).not.toContain('pv')
  })

  it('nimmt einen selbst angelegten Zähler dauerhaft aufs Board', () => {
    const withPv = boardEnergyTypes(PROFILE, { pv: [reading('2026-08-01', 500)] })
    expect(withPv).toContain('pv')
    // …und wirft ihn nicht wieder heraus, nur weil das Profil ihn nicht kennt.
    expect(withPv).toEqual(['electricity', 'water', 'gas', 'pv'])
  })

  it('behält die feste Anzeige-Reihenfolge bei', () => {
    const board = boardEnergyTypes(PROFILE, { pv: [reading('2026-08-01', 1)] })
    const order = ALL_ENERGY_TYPES.filter((t) => board.includes(t))
    expect(board).toEqual(order)
  })
})

describe('Erinnerungen', () => {
  it('erinnert nicht an einen Träger ohne jede Ablesung', () => {
    // Sonst mahnte die App jeden Haushalt zu Pellets, nur weil es sie gibt.
    expect(dueTypes(PROFILE, {}, 'monthly', NOW)).toEqual([])
  })

  it('erinnert an einen selbst angelegten Zähler wie an einen vorgeschlagenen', () => {
    const readings: Partial<Record<EnergyType, MeterReading[]>> = { pv: LONG_AGO }
    expect(dueTypes(PROFILE, readings, 'monthly', NOW)).toEqual(['pv'])
  })

  it('erinnert an einen vorgeschlagenen Träger mit alter Ablesung', () => {
    expect(dueTypes(PROFILE, { gas: LONG_AGO }, 'monthly', NOW)).toEqual(['gas'])
  })

  it('schweigt bei abgeschalteter Erinnerung', () => {
    expect(dueTypes(PROFILE, { gas: LONG_AGO }, 'off', NOW)).toEqual([])
  })
})
