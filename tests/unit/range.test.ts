// Abnahme Etappe 3 des Tank-Umbaus: Reichweite und Nachbestell-Schwelle.
import { describe, expect, it } from 'vitest'
import {
  isRefillDue,
  meterRange,
  rangeUntilEmpty,
  REFILL_WARNING_DAYS,
} from '@/features/monitoring/range'
import type { MeterReading } from '@/store/readingsStore'
import { stats } from '@/features/monitoring/readings'
import { counterSeries } from '@/features/monitoring/counterSeries'

/** Lokales Datum ohne Zeitzonen-Überraschung. */
const day = (iso: string) => new Date(`${iso}T00:00:00`)

describe('rangeUntilEmpty', () => {
  it('reicht im Oktober deutlich kürzer als im April', () => {
    // Derselbe Restvorrat, derselbe Jahresverbrauch – nur der Startmonat
    // unterscheidet sich. Das ist der ganze Punkt der saisonalen Rechnung:
    // 500 l im Herbst sind schnell verheizt, im Frühjahr halten sie lange.
    const herbst = rangeUntilEmpty(500, 3000, { seasonal: true, today: day('2026-10-01') })
    const fruehjahr = rangeUntilEmpty(500, 3000, { seasonal: true, today: day('2026-04-01') })

    expect(herbst).toBeDefined()
    expect(fruehjahr).toBeDefined()
    expect(fruehjahr!.days).toBeGreaterThan(herbst!.days * 2)
  })

  it('nennt das Leerdatum und die Grundlage', () => {
    const r = rangeUntilEmpty(500, 3000, { seasonal: true, today: day('2026-10-01') })
    expect(r?.basis).toBe('seasonal')
    // Oktober trägt 8 % des Jahres: 3000 × 0,08 = 240 l im Monat. 500 l sind
    // damit gegen Ende November aufgebraucht.
    expect(r?.emptyDate.slice(0, 7)).toBe('2026-11')
  })

  it('verteilt ohne Monatsprofil gleichmäßig', () => {
    // 3650 l im Jahr sind 10 l am Tag; 500 l reichen 50 Tage.
    const r = rangeUntilEmpty(500, 3650, { seasonal: false, today: day('2026-10-01') })
    expect(r?.days).toBe(50)
    expect(r?.basis).toBe('linear')
  })

  it('rechnet auch ohne Fassungsvermögen – dann in Prozent', () => {
    // Ohne Tankgröße stehen Füllstand und Jahresverbrauch beide in Prozent.
    // 60 % Rest bei 400 % Jahresverbrauch: gut zwei Monate im Frühjahr.
    const r = rangeUntilEmpty(60, 400, { seasonal: true, today: day('2026-04-01') })
    expect(r).toBeDefined()
    expect(r!.days).toBeGreaterThan(30)
  })

  it('liefert ohne Jahres-Hochrechnung gar nichts statt einer Null', () => {
    // Lieber keine Zahl als eine falsche – dieselbe Zurückhaltung wie bei
    // MIN_PROJECTION_DAYS in readings.ts.
    expect(rangeUntilEmpty(500, undefined, { seasonal: true })).toBeUndefined()
    expect(rangeUntilEmpty(500, 0, { seasonal: true })).toBeUndefined()
    expect(rangeUntilEmpty(500, Number.NaN, { seasonal: true })).toBeUndefined()
  })

  it('schweigt bei leerem oder unsinnigem Vorrat', () => {
    expect(rangeUntilEmpty(0, 3000, { seasonal: true })).toBeUndefined()
    expect(rangeUntilEmpty(-100, 3000, { seasonal: true })).toBeUndefined()
    expect(rangeUntilEmpty(Number.NaN, 3000, { seasonal: true })).toBeUndefined()
  })

  it('gibt jenseits von zwei Jahren auf, statt zu fantasieren', () => {
    // Riesiger Vorrat, winziger Verbrauch: Ein Datum wäre hier keine Aussage.
    expect(rangeUntilEmpty(100_000, 10, { seasonal: true })).toBeUndefined()
  })

  it('rechnet über den Jahreswechsel hinweg weiter', () => {
    const r = rangeUntilEmpty(2000, 3000, { seasonal: true, today: day('2026-11-15') })
    expect(r).toBeDefined()
    expect(r!.emptyDate > '2027-01-01').toBe(true)
  })
})

describe('isRefillDue', () => {
  it('greift ab sechs Wochen Reichweite', () => {
    const kurz = { emptyDate: '2026-11-01', days: REFILL_WARNING_DAYS, basis: 'seasonal' as const }
    const knapp = { ...kurz, days: REFILL_WARNING_DAYS + 1 }
    expect(isRefillDue(kurz)).toBe(true)
    expect(isRefillDue(knapp)).toBe(false)
  })

  it('warnt nicht, solange es keine Reichweite gibt', () => {
    expect(isRefillDue(undefined)).toBe(false)
  })
})

describe('meterRange', () => {
  /** Öltank: Verlauf über den Winter, damit die Hochrechnung greift. */
  const tank: MeterReading[] = [
    { id: 'a', date: '2026-01-01', value: 2800 },
    { id: 'b', date: '2026-03-01', value: 1900 },
    { id: 'c', date: '2026-04-01', value: 1600 },
  ]

  it('liefert für einen Vorrat eine Reichweite', () => {
    const r = meterRange(tank, { mode: 'level', capacity: 3000 }, {
      seasonal: true,
      today: day('2026-04-01'),
    })
    expect(r).toBeDefined()
    expect(r!.days).toBeGreaterThan(0)
  })

  it('liefert für ein Zählwerk nie eine Reichweite', () => {
    // Ein Zähler zählt, was war; über einen Vorrat weiß er nichts.
    expect(meterRange(tank, undefined, { seasonal: true })).toBeUndefined()
    expect(meterRange(tank, { mode: 'counter' }, { seasonal: true })).toBeUndefined()
  })

  it('reicht die saisonale Gewichtung auch an die Jahres-Hochrechnung durch', () => {
    // Ein nur über den Sommer gemessener Tank: Linear gestreckt käme ein
    // Bruchteil des wahren Jahresverbrauchs heraus und die Reichweite wäre um
    // ein Vielfaches zu optimistisch. Beide Schritte müssen dasselbe Profil
    // benutzen – sonst trifft eine lineare Jahreszahl auf eine saisonale Kurve.
    const sommer: MeterReading[] = [
      { id: 'a', date: '2026-06-01', value: 2600 },
      { id: 'b', date: '2026-08-25', value: 900 },
    ]
    const config = { mode: 'level' as const, capacity: 3000 }
    const today = day('2026-08-30')

    const echt = meterRange(sommer, config, { seasonal: true, today })
    const saisonalesJahr = stats(counterSeries(sommer, config), undefined, {
      seasonal: true,
    }).projectedYearKwh
    const linearesJahr = stats(counterSeries(sommer, config)).projectedYearKwh

    // Die Hochrechnungen unterscheiden sich deutlich – sonst prüft der Test
    // nichts.
    expect(saisonalesJahr).toBeGreaterThan((linearesJahr as number) * 2)
    // Und die Reichweite folgt der saisonalen, nicht der linearen.
    expect(echt!.days).toBe(
      rangeUntilEmpty(900, saisonalesJahr, { seasonal: true, today })!.days,
    )
    expect(echt!.days).toBeLessThan(
      rangeUntilEmpty(900, linearesJahr, { seasonal: true, today })!.days,
    )
  })

  it('schweigt ohne Ablesungen', () => {
    expect(meterRange([], { mode: 'level', capacity: 3000 }, { seasonal: true })).toBeUndefined()
  })

  it('verstummt nach einer eingetragenen Lieferung', () => {
    // Fast leerer Tank im Herbst: Die Warnung steht.
    const knapp: MeterReading[] = [
      { id: 'a', date: '2026-06-01', value: 2600 },
      { id: 'b', date: '2026-10-01', value: 300 },
    ]
    const config = { mode: 'level' as const, capacity: 3000 }
    const vorher = meterRange(knapp, config, { seasonal: true, today: day('2026-10-01') })
    expect(isRefillDue(vorher)).toBe(true)

    // Nach der Lieferung ist der Tank voll – und die Warnung weg.
    const nachher = meterRange(
      [...knapp, { id: 'c', date: '2026-10-02', value: 3000, refill: 2700 }],
      config,
      { seasonal: true, today: day('2026-10-02') },
    )
    expect(isRefillDue(nachher)).toBe(false)
    expect(nachher!.days).toBeGreaterThan(vorher!.days)
  })
})
