// Reifegrade des Zuhause-Bildschirms: was zeigt die Bühne bei wie vielen Daten.

import { describe, expect, it } from 'vitest'
import { buildHomeStage, scalePosition, SCALE_MIN_KWH, SCALE_MAX_KWH } from '@/features/home/homeStage'
import type { MeterReading } from '@/store/readingsStore'
import type { OnboardingData } from '@/types'

/** 100 m², 2 Personen, Baujahr 1985, Gasheizung, Warmwasser zentral, unsaniert. */
const PROFILE = {
  livingArea: 100,
  personsCount: 2,
  buildingYear: 1985,
  hotWaterType: 'same_as_heating',
  heatGenerators: ['gas_boiler'],
  hasPV: 'no',
  renovationItems: [],
} as unknown as OnboardingData

const PRICES: Record<string, number> = { electricity: 0.35, gas: 1.2 }
const priceFor = (t: string) => PRICES[t]
const energyContentFor = (t: string) => (t === 'gas' ? 10 : 1)

/** Monatliche Ablesungen über `months` Monate ab Januar `year`. */
function monthly(year: number, months: number, perMonth: number, start = 1000): MeterReading[] {
  const out: MeterReading[] = []
  let meter = start
  for (let i = 0; i < months; i++) {
    const y = year + Math.floor(i / 12)
    const m = (i % 12) + 1
    out.push({ id: `r${i}`, date: `${y}-${String(m).padStart(2, '0')}-01`, value: meter })
    meter += perMonth
  }
  return out
}

function build(readingsByType: Record<string, MeterReading[]>, profile = PROFILE) {
  return buildHomeStage({
    profile,
    readingsByType,
    priceFor: priceFor as never,
    energyContentFor: energyContentFor as never,
  })
}

describe('Reifegrad 1 – noch keine Ablesungen', () => {
  it('zeigt den Richtwert des Gebäudes statt einer leeren Bühne', () => {
    const s = build({})
    expect(s.level).toBe('benchmarkOnly')
    expect(s.totalCostEur).toBeUndefined()
    // Baujahr 1985 (150) + Warmwasser (20), unsaniert
    expect(s.benchmarkHeat).toBe(170)
  })

  it('senkt den Richtwert bei sanierter Hülle', () => {
    const saniert = { ...PROFILE, renovationItems: ['facade'] } as unknown as OnboardingData
    const s = build({}, saniert)
    // Fassade: −20 % auf den Heizteil, Warmwasser bleibt.
    expect(s.benchmarkHeat).toBeCloseTo(150 * 0.8 + 20, 6)
    expect(s.benchmarkHeat!).toBeLessThan(170)
  })

  it('merkt sich, dass noch gar nichts abgelesen wurde', () => {
    // Am ersten Tag greift der Faelligkeits-Hinweis nicht (keine letzte
    // Ablesung) – die Buehne muss selbst zum Eintrag einladen.
    expect(build({}).hasAnyReading).toBe(false)
    expect(build({ gas: monthly(2026, 1, 30) }).hasAnyReading).toBe(true)
  })

  it('lässt den Richtwert ohne Baujahr weg', () => {
    const ohne = { ...PROFILE, buildingYear: 0 } as unknown as OnboardingData
    expect(build({}, ohne).benchmarkHeat).toBeUndefined()
  })
})

describe('Reifegrad 2 – erste Hochrechnung', () => {
  it('meldet eine Schätzung samt Monatszahl', () => {
    const s = build({ gas: monthly(2026, 4, 30), electricity: monthly(2026, 4, 250, 5000) })
    expect(s.level).toBe('estimate')
    expect(s.totalCostEur).toBeGreaterThan(0)
    expect(s.estimateMonths).toBeGreaterThanOrEqual(2)
    expect(s.estimateMonths).toBeLessThanOrEqual(4)
  })

  it('zeigt neben dem Richtwert den eigenen Kennwert', () => {
    const s = build({ gas: monthly(2026, 4, 30), electricity: monthly(2026, 4, 250, 5000) })
    expect(s.ownHeat?.basis).toBe('perAreaKwh')
    expect(s.ownHeat!.value).toBeGreaterThan(0)
    expect(s.benchmarkHeat).toBe(170)
  })

  it('führt bei unvollständigen Kosten keine Summe', () => {
    // Ohne Strompreis fehlt ein Anteil – eine Teilsumme wäre irreführend.
    const s = buildHomeStage({
      profile: PROFILE,
      readingsByType: { gas: monthly(2026, 4, 30), electricity: monthly(2026, 4, 250, 5000) },
      priceFor: ((t: string) => (t === 'gas' ? 1.2 : undefined)) as never,
      energyContentFor: energyContentFor as never,
    })
    expect(s.totalCostEur).toBeUndefined()
  })
})

describe('Reifegrad 3 – volles Jahr', () => {
  it('meldet einen echten Jahreswert', () => {
    const s = build({ gas: monthly(2025, 14, 30), electricity: monthly(2025, 14, 250, 5000) })
    expect(s.level).toBe('fullYear')
    expect(s.estimateMonths).toBeUndefined()
    expect(s.totalCostEur).toBeGreaterThan(0)
  })

  it('summiert die Träger vollständig', () => {
    const s = build({ gas: monthly(2025, 14, 30), electricity: monthly(2025, 14, 250, 5000) })
    const single = s.carriers.map((c) => c.costEur ?? 0).reduce((a, b) => a + b, 0)
    expect(s.totalCostEur).toBeCloseTo(single, 6)
    expect(s.carriers).toHaveLength(2)
  })

  it('zeigt die Jahreskurve erst mit zwölf Monaten', () => {
    const kurz = build({ gas: monthly(2026, 4, 30), electricity: monthly(2026, 4, 250, 5000) })
    expect(kurz.curve).toBeUndefined()
    const lang = build({ gas: monthly(2025, 14, 30), electricity: monthly(2025, 14, 250, 5000) })
    expect(lang.curve?.values).toHaveLength(12)
    // Heizenergie fuehrt die Kurve – nur sie hat die Jahresform.
    expect(lang.curve?.type).toBe('gas')
  })

  it('liefert erst mit zwei Jahren einen Trend', () => {
    const einJahr = build({ gas: monthly(2025, 14, 30), electricity: monthly(2025, 14, 250, 5000) })
    expect(einJahr.trend).toBeUndefined()
    const zweiJahre = build({ gas: monthly(2024, 26, 30), electricity: monthly(2024, 26, 250, 5000) })
    expect(zweiJahre.trend?.baseline).toBe('lastYear')
  })
})

describe('scalePosition', () => {
  it('bildet die Skalenenden auf 0 und 1 ab', () => {
    expect(scalePosition(SCALE_MIN_KWH)).toBe(0)
    expect(scalePosition(SCALE_MAX_KWH)).toBe(1)
  })

  it('klemmt Ausreißer an den Rand, statt aus dem Bild zu laufen', () => {
    expect(scalePosition(5)).toBe(0)
    expect(scalePosition(900)).toBe(1)
    expect(scalePosition(Number.NaN)).toBe(0)
  })

  it('setzt einen mittleren Wert in die Mitte', () => {
    expect(scalePosition((SCALE_MIN_KWH + SCALE_MAX_KWH) / 2)).toBeCloseTo(0.5, 6)
  })
})
