// Abnahme Etappe 1 des Tank-Umbaus: Ein Vorrat rechnet wie ein Zähler.
import { describe, expect, it, beforeEach } from 'vitest'
import {
  counterSeries,
  defaultMeterMode,
  isTankType,
  meterMode,
} from '@/features/monitoring/counterSeries'
import { stats, consumptionSegments } from '@/features/monitoring/readings'
import { useReadingsStore, type MeterConfig, type MeterReading } from '@/store/readingsStore'

const LEVEL: MeterConfig = { mode: 'level' }

/** Baut eine Ablesung; `refill` macht daraus eine Lieferung. */
function entry(date: string, value: number, refill?: number): MeterReading {
  return { id: `${date}-${value}`, date, value, ...(refill !== undefined ? { refill } : {}) }
}

/** Die reinen Verbrauchswerte der Abschnitte – kompakt vergleichbar. */
function consumption(entries: MeterReading[], config?: MeterConfig): number[] {
  return consumptionSegments(counterSeries(entries, config)).map((s) => s.kwh)
}

describe('meterMode', () => {
  it('gilt ohne Konfiguration immer als Zählwerk', () => {
    // Der Kern der Rückwärtskompatibilität: Ein bestehender Öl-Zähler darf
    // nicht rückwirkend als Vorrat gelesen werden.
    expect(meterMode(undefined)).toBe('counter')
    expect(meterMode({ mode: 'counter' })).toBe('counter')
    expect(meterMode({ mode: 'level', capacity: 3000 })).toBe('level')
  })

  it('bietet den Vorrat nur für bevorratbare Träger an', () => {
    expect(isTankType('oil')).toBe(true)
    expect(isTankType('pellets')).toBe(true)
    expect(isTankType('gas')).toBe(true)
    expect(isTankType('electricity')).toBe(false)
    expect(isTankType('water')).toBe(false)
    expect(isTankType('heat_pump')).toBe(false)
    expect(isTankType('pv')).toBe(false)
  })

  it('schlägt für neue Öl- und Pellets-Zähler den Vorrat vor, für Gas das Zählwerk', () => {
    expect(defaultMeterMode('oil')).toBe('level')
    expect(defaultMeterMode('pellets')).toBe('level')
    // Erdgas ist der Regelfall mit Zählwerk; Flüssiggas wird umgestellt.
    expect(defaultMeterMode('gas')).toBe('counter')
    expect(defaultMeterMode('electricity')).toBe('counter')
  })
})

describe('counterSeries', () => {
  it('lässt eine Zählerreihe unangetastet – identisch, nicht nur gleich', () => {
    const entries = [entry('2026-01-01', 100), entry('2026-02-01', 180)]
    expect(counterSeries(entries, undefined)).toBe(entries)
    expect(counterSeries(entries, { mode: 'counter' })).toBe(entries)
  })

  it('übersetzt einen fallenden Vorrat in kumulierten Verbrauch', () => {
    const entries = [
      entry('2026-01-01', 2600),
      entry('2026-02-01', 2100),
      entry('2026-03-01', 1500),
    ]
    expect(counterSeries(entries, LEVEL).map((r) => r.value)).toEqual([0, 500, 1100])
    expect(consumption(entries, LEVEL)).toEqual([500, 600])
  })

  it('rechnet die Lieferung heraus, statt sie als Verbrauch zu zählen', () => {
    // Beispiel aus dem Konzept, Abschnitt 2.
    const entries = [
      entry('2026-10-01', 2600),
      entry('2026-11-01', 2100),
      entry('2026-11-15', 5100, 3000),
      entry('2026-12-01', 4300),
    ]
    expect(counterSeries(entries, LEVEL).map((r) => r.value)).toEqual([0, 500, 500, 1300])
  })

  it('summiert zwei Lieferungen zwischen zwei Füllständen auf', () => {
    const entries = [
      entry('2026-01-01', 2000),
      entry('2026-01-10', 3500, 2000), // Stand davor: 1500 → 500 verbraucht
      entry('2026-01-20', 5000, 2000), // Stand davor: 3000 → 500 verbraucht
      entry('2026-02-01', 4200), //        → 800 verbraucht
    ]
    expect(consumption(entries, LEVEL)).toEqual([500, 500, 800])
  })

  it('ergibt denselben Jahresverbrauch wie die gleichwertige Zählerreihe', () => {
    // Derselbe Haushalt, einmal mit Ölzähler, einmal mit Peilstab und
    // Lieferschein. Beide Modelle müssen dieselbe Zahl liefern – sonst gäbe es
    // doch zwei Rechenketten.
    const counter = [
      entry('2026-01-01', 10_000),
      entry('2026-04-01', 11_800),
      entry('2026-07-01', 12_300),
      entry('2026-10-01', 12_900),
      entry('2027-01-01', 14_600),
    ]
    const level = [
      entry('2026-01-01', 2400),
      entry('2026-04-01', 600),
      entry('2026-04-02', 3600, 3000),
      entry('2026-07-01', 3100),
      entry('2026-10-01', 2500),
      entry('2027-01-01', 800),
    ]
    const a = stats(counterSeries(counter, undefined), 1.1, { seasonal: true })
    const b = stats(counterSeries(level, LEVEL), 1.1, { seasonal: true })
    expect(b.projectedYearKwh).toBeCloseTo(a.projectedYearKwh as number, 6)
    expect(b.projectionBasis).toBe(a.projectionBasis)
    expect(b.projectedYearCostEur).toBeCloseTo(a.projectedYearCostEur as number, 6)
  })

  it('überspringt einen Anstieg ohne Lieferung, statt Verbrauch zu erfinden', () => {
    // Der Vorrat ist gestiegen, ohne dass eine Lieferung eingetragen wurde –
    // wie viel dazwischen verbraucht wurde, weiß niemand. Derselbe Fall wie
    // ein zurückgesetztes Zählwerk: Abschnitt gilt als nicht auswertbar.
    const entries = [
      entry('2026-01-01', 2000),
      entry('2026-02-01', 1500),
      entry('2026-03-01', 2800), // unerklärter Anstieg
      entry('2026-04-01', 2300),
    ]
    expect(consumption(entries, LEVEL)).toEqual([500, 500])
  })

  it('bleibt bei unbrauchbaren Werten NaN-frei und läuft danach weiter', () => {
    const entries = [
      entry('2026-01-01', 2000),
      entry('2026-02-01', Number.NaN),
      entry('2026-03-01', 1200),
      entry('2026-04-01', 900),
    ]
    const values = consumption(entries, LEVEL)
    expect(values.every((v) => Number.isFinite(v))).toBe(true)
    // Der kaputte Eintrag entwertet nur die angrenzenden Abschnitte; der
    // letzte Abstand wird wieder sauber gemessen.
    expect(values).toEqual([300])
  })

  it('kommt mit einer Lieferung als erstem Eintrag und mit leerer Liste zurecht', () => {
    expect(counterSeries([], LEVEL)).toEqual([])
    const entries = [entry('2026-01-01', 3000, 3000), entry('2026-02-01', 2400)]
    expect(consumption(entries, LEVEL)).toEqual([600])
  })

  it('verliert nichts, wenn Ablesung und Lieferung auf denselben Tag fallen', () => {
    // Der Tankwagen kommt am Ablesetag: Der Abschnitt mit null Tagen fällt
    // nachgelagert weg, der Verbrauch danach muss trotzdem stimmen.
    const entries = [
      entry('2025-12-01', 2600),
      entry('2026-01-01', 2100),
      entry('2026-01-01', 5100, 3000),
      entry('2026-02-01', 4300),
    ]
    expect(consumption(entries, LEVEL)).toEqual([500, 800])
  })

  it('lässt Datum, ID und Liefermenge unverändert', () => {
    const entries = [entry('2026-01-01', 2000), entry('2026-02-01', 4500, 3000)]
    const out = counterSeries(entries, LEVEL)
    expect(out.map((r) => r.date)).toEqual(entries.map((r) => r.date))
    expect(out.map((r) => r.id)).toEqual(entries.map((r) => r.id))
    expect(out[1].refill).toBe(3000)
  })
})

describe('readingsStore – Lieferungen und Zähler-Konfiguration', () => {
  beforeEach(() => {
    useReadingsStore.setState({ readings: {}, meters: {} })
  })

  it('trägt eine Lieferung mit Menge und Betrag ein', () => {
    const store = useReadingsStore.getState()
    store.addReading('oil', { date: '2026-01-01', value: 2000 })
    store.addRefill('oil', { date: '2026-01-15', amount: 3000, value: 4500, costEur: 2940 })

    const list = useReadingsStore.getState().readings.oil ?? []
    expect(list).toHaveLength(2)
    expect(list[1]).toMatchObject({ refill: 3000, refillCostEur: 2940, value: 4500 })
    // Ohne Lieferung bleibt der Eintrag eine gewöhnliche Ablesung.
    expect(list[0].refill).toBeUndefined()
  })

  it('macht einen Träger nicht allein durch eine Kapazität zum Tank', () => {
    useReadingsStore.getState().setCapacity('oil', 3000)
    expect(meterMode(useReadingsStore.getState().meters.oil)).toBe('counter')

    useReadingsStore.getState().setMeterMode('oil', 'level')
    expect(useReadingsStore.getState().meters.oil).toEqual({ mode: 'level', capacity: 3000 })
  })

  it('nimmt die Konfiguration mit, wenn der Zähler entfernt wird', () => {
    const store = useReadingsStore.getState()
    store.setMeterMode('oil', 'level')
    store.setCapacity('oil', 3000)
    store.addReading('oil', { date: '2026-01-01', value: 2000 })

    useReadingsStore.getState().removeType('oil')
    // Sonst käme ein später neu angelegter Öl-Zähler mit Modus und Tankgröße
    // seines Vorgängers zurück.
    expect(useReadingsStore.getState().meters.oil).toBeUndefined()
    expect(useReadingsStore.getState().readings.oil).toBeUndefined()
  })
})
