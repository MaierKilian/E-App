// Auswertung der Monitoring-Berichtsdaten: Zeitfenster, Mittelungsbasis und
// Kostenhochrechnung je Energieträger.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildMonitoringReportData,
  suggestRangeDays,
  type TariffLike,
} from '@/features/reports/monitoringReportData'
import type { MeterReading } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

const NOW = new Date('2026-08-19T12:00:00Z').getTime()
const DAY = 86_400_000

/** Profil mit Strom, Wasser und Gas (Gas-Therme als Wärmeerzeuger). */
const PROFILE = { heatGenerators: ['gas_boiler'], hasPV: 'no' } as unknown as OnboardingData

/** Tarif-State mit Strom-Standardwerten und einem eigenen Gaspreis. */
const TARIFF = {
  electricityWorkPrice: 40,
  electricityBasePrice: 12,
  isCustom: true,
  prices: { gas: { work: 1.5, base: 12, custom: true } },
} as unknown as TariffLike

/** Ablesung `d` Tage vor „jetzt" mit dem gegebenen Zählerstand. */
function reading(daysAgo: number, value: number): MeterReading {
  return {
    id: `r-${daysAgo}`,
    date: new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10),
    value,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('buildMonitoringReportData', () => {
  it('mittelt über den tatsächlichen Ableseabstand, nicht über die Fensterlänge', () => {
    // 10 Tage Abstand innerhalb eines 30-Tage-Fensters: 100 kWh / 10 d.
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: { electricity: [reading(20, 1000), reading(10, 1100)] },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['electricity'],
    })

    const strom = data.entries.find((e) => e.type === 'electricity')
    expect(strom?.consumption).toBe(100)
    expect(strom?.days).toBe(10)
    expect(strom?.perDay).toBeCloseTo(10, 6)
    expect(strom?.projectedYear).toBeCloseTo(3650, 6)
  })

  it('rechnet Kosten auch für Gas, nicht nur für Strom', () => {
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: {
        electricity: [reading(20, 1000), reading(10, 1100)],
        gas: [reading(20, 500), reading(10, 520)],
      },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['electricity', 'gas'],
    })

    const strom = data.entries.find((e) => e.type === 'electricity')
    const gas = data.entries.find((e) => e.type === 'gas')

    // Strom: 3650 kWh/a × 40 ct/kWh = 1460 €
    expect(strom?.costYear).toBeCloseTo(1460, 6)
    expect(strom?.priceWork).toBe(40)
    expect(strom?.priceUnit).toBe('ct/kWh')

    // Gas: 20 m³ / 10 d → 730 m³/a × 1,50 €/m³ = 1095 €
    expect(gas?.hasCost).toBe(true)
    expect(gas?.costYear).toBeCloseTo(1095, 6)
    expect(gas?.priceWork).toBe(1.5)
    expect(gas?.priceUnit).toBe('€/m³')
  })

  it('greift für Träger ohne eigenen Preis auf den Standardwert zurück', () => {
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: { water: [reading(20, 100), reading(10, 110)] },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['water'],
    })

    // Wasser: 10 m³ / 10 d → 365 m³/a × 4,50 €/m³ (Default) = 1642,50 €
    const wasser = data.entries.find((e) => e.type === 'water')
    expect(wasser?.costYear).toBeCloseTo(1642.5, 6)
    expect(wasser?.priceWork).toBe(4.5)
  })

  it('liefert keine Hochrechnung, wenn alle Ablesungen auf denselben Tag fallen', () => {
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: { electricity: [reading(5, 1000), reading(5, 1050)] },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['electricity'],
    })

    const strom = data.entries.find((e) => e.type === 'electricity')
    expect(strom?.consumption).toBe(50)
    expect(strom?.days).toBeUndefined()
    expect(strom?.perDay).toBeUndefined()
    expect(strom?.projectedYear).toBeUndefined()
    expect(strom?.costYear).toBeUndefined()
  })

  it('meldet Fenstergrenzen und Ablesungszahl über alle Träger', () => {
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: {
        electricity: [reading(40, 900), reading(20, 1000), reading(10, 1100)],
        gas: [reading(30, 500), reading(5, 540)],
      },
      rangeDays: null,
      tariff: TARIFF,
      types: ['electricity', 'gas'],
    })

    expect(data.readingCount).toBe(5)
    expect(data.from).toBe(reading(40, 0).date)
    expect(data.to).toBe(reading(5, 0).date)
  })

  it('beschränkt das Fenster bei festem Zeitraum auf die enthaltenen Ablesungen', () => {
    const data = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: {
        electricity: [reading(200, 500), reading(20, 1000), reading(10, 1100)],
      },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['electricity'],
    })

    const strom = data.entries.find((e) => e.type === 'electricity')
    expect(strom?.readingCount).toBe(2)
    expect(strom?.windowFrom).toBe(reading(20, 0).date)
    // Der aktuelle Stand bleibt der letzte überhaupt erfasste Wert.
    expect(strom?.currentValue).toBe(1100)
  })

  it('vergleicht nur bei festem Zeitraum mit der Vorperiode', () => {
    const readings = [
      reading(50, 800),
      reading(31, 1000), // Vorperiode: 200
      reading(29, 1010),
      reading(1, 1110), // Aktuell: 100
    ]

    const fixed = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: { electricity: readings },
      rangeDays: 30,
      tariff: TARIFF,
      types: ['electricity'],
    })
    expect(fixed.entries[0].changePercent).toBeCloseTo(-50, 6)

    const all = buildMonitoringReportData({
      profile: PROFILE,
      readingsByType: { electricity: readings },
      rangeDays: null,
      tariff: TARIFF,
      types: ['electricity'],
    })
    expect(all.entries[0].changePercent).toBeUndefined()
  })
})

describe('suggestRangeDays', () => {
  it('waehlt den kuerzesten Zeitraum mit mindestens zwei Ablesungen', () => {
    expect(
      suggestRangeDays({ electricity: [reading(5, 100), reading(2, 110)] }, ['electricity']),
    ).toBe(7)
    expect(
      suggestRangeDays({ electricity: [reading(25, 100), reading(2, 110)] }, ['electricity']),
    ).toBe(30)
    expect(
      suggestRangeDays({ electricity: [reading(80, 100), reading(2, 110)] }, ['electricity']),
    ).toBe(90)
  })

  it('faellt auf „Alle" zurueck, wenn kein festes Fenster zwei Ablesungen enthaelt', () => {
    expect(
      suggestRangeDays({ electricity: [reading(400, 100), reading(200, 110)] }, ['electricity']),
    ).toBeNull()
    expect(suggestRangeDays({ electricity: [reading(2, 100)] }, ['electricity'])).toBeNull()
    expect(suggestRangeDays({}, ['electricity'])).toBeNull()
  })

  it('beruecksichtigt jeden Traeger einzeln', () => {
    // Gas allein erfuellt das 30-Tage-Fenster, Strom nicht.
    expect(
      suggestRangeDays(
        { electricity: [reading(300, 100)], gas: [reading(20, 500), reading(3, 520)] },
        ['electricity', 'gas'],
      ),
    ).toBe(30)
  })
})
