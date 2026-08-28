// Zeitraum-Auswahl des Verlaufs-Diagramms, inklusive des frei wählbaren
// Zeitraums von Datum bis Datum.

import { describe, expect, it } from 'vitest'
import { filterByRange, fullSpan, RANGE_DAYS, RANGE_KEYS } from '@/features/monitoring/rangeFilter'
import { todayIso } from '@/lib/timeAxis'

const NOW = Date.parse('2026-08-25T12:00:00.000Z')
const P = (date: string) => ({ date, value: 1 })

const POINTS = [
  P('2026-05-01'),
  P('2026-07-01'),
  P('2026-08-01'),
  P('2026-08-20'),
  P('2026-08-24'),
]
const dates = (list: { date: string }[]) => list.map((p) => p.date)

describe('feste Stufen', () => {
  it('zeigt bei „Alle" jeden Punkt', () => {
    expect(filterByRange(POINTS, 'all', NOW)).toHaveLength(POINTS.length)
  })

  it('grenzt auf die letzten 7 bzw. 30 Tage ein', () => {
    expect(dates(filterByRange(POINTS, 'd7', NOW))).toEqual(['2026-08-20', '2026-08-24'])
    expect(dates(filterByRange(POINTS, 'd30', NOW))).toEqual([
      '2026-08-01',
      '2026-08-20',
      '2026-08-24',
    ])
  })

  it('bleibt bei unlesbaren Daten stabil', () => {
    const mixed = [...POINTS, P('kein-datum')]
    expect(() => filterByRange(mixed, 'd7', NOW)).not.toThrow()
    expect(dates(filterByRange(mixed, 'd7', NOW))).not.toContain('kein-datum')
  })
})

describe('frei wählbarer Zeitraum', () => {
  it('zeigt ohne gesetzte Grenzen zunächst alles', () => {
    // Frisch gewählt soll der Nutzer die vollständigen Daten sehen und dann
    // eingrenzen – nicht ein leeres Diagramm.
    expect(filterByRange(POINTS, 'custom', NOW)).toHaveLength(POINTS.length)
    expect(filterByRange(POINTS, 'custom', NOW, '', '')).toHaveLength(POINTS.length)
  })

  it('grenzt beidseitig ein, Grenzen eingeschlossen', () => {
    expect(dates(filterByRange(POINTS, 'custom', NOW, '2026-07-01', '2026-08-20'))).toEqual([
      '2026-07-01',
      '2026-08-01',
      '2026-08-20',
    ])
  })

  it('lässt eine einzelne Grenze einseitig wirken', () => {
    expect(dates(filterByRange(POINTS, 'custom', NOW, '2026-08-01', ''))).toEqual([
      '2026-08-01',
      '2026-08-20',
      '2026-08-24',
    ])
    expect(dates(filterByRange(POINTS, 'custom', NOW, '', '2026-07-01'))).toEqual([
      '2026-05-01',
      '2026-07-01',
    ])
  })

  it('verzeiht vertauschte Grenzen', () => {
    // Sonst zeigte ein versehentlich falsch herum gesetzter Zeitraum ein leeres
    // Diagramm, ohne dass erkennbar wäre warum.
    const swapped = filterByRange(POINTS, 'custom', NOW, '2026-08-20', '2026-07-01')
    const ordered = filterByRange(POINTS, 'custom', NOW, '2026-07-01', '2026-08-20')
    expect(dates(swapped)).toEqual(dates(ordered))
  })

  it('liefert leer, wenn im Zeitraum nichts liegt', () => {
    expect(filterByRange(POINTS, 'custom', NOW, '2026-06-01', '2026-06-30')).toEqual([])
  })

  it('ignoriert unvollständige Eingaben, statt alles auszublenden', () => {
    // Ein Datumsfeld liefert waehrend der Eingabe Zwischenstände wie "2026-08".
    expect(filterByRange(POINTS, 'custom', NOW, '2026-08', '')).toHaveLength(POINTS.length)
  })

  it('funktioniert auch bei gleichem Anfangs- und Enddatum', () => {
    expect(dates(filterByRange(POINTS, 'custom', NOW, '2026-08-01', '2026-08-01'))).toEqual([
      '2026-08-01',
    ])
  })
})

describe('Auswahl-Liste', () => {
  it('enthält die festen Stufen und den freien Zeitraum', () => {
    expect(RANGE_KEYS).toEqual(['d7', 'd30', 'all', 'custom'])
    for (const key of RANGE_KEYS) {
      if (key !== 'custom') expect(RANGE_DAYS).toHaveProperty(key)
    }
  })
})

describe('todayIso', () => {
  it('liefert das lokale Datum, nicht das UTC-Datum', () => {
    // toISOString() waere UTC: oestlich von Greenwich ist dort abends schon der
    // Vortag zu Ende, und „heute" liesse sich im Datumsfeld nicht waehlen.
    const now = new Date()
    const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')}`
    expect(todayIso()).toBe(local)
  })
})

describe('fullSpan', () => {
  it('nennt früheste und späteste Ablesung', () => {
    expect(fullSpan(POINTS)).toEqual({ from: POINTS[0].date, to: POINTS[POINTS.length - 1].date })
  })

  it('zeigt vorbelegt dieselben Punkte wie zwei leere Felder', () => {
    // Der Grund, warum die Vorbelegung nichts kaputt macht: Sie grenzt nichts
    // ein, sie schreibt nur hin, was ohnehin gilt.
    const { from, to } = fullSpan(POINTS)
    expect(filterByRange(POINTS, 'custom', NOW, from, to)).toEqual(
      filterByRange(POINTS, 'custom', NOW, undefined, undefined),
    )
  })

  it('verlässt sich nicht auf eine sortierte Liste', () => {
    const shuffled = [P('2026-07-04'), P('2026-01-09'), P('2026-03-22')]
    expect(fullSpan(shuffled)).toEqual({ from: '2026-01-09', to: '2026-07-04' })
  })

  it('kommt mit einer einzigen Ablesung zurecht', () => {
    expect(fullSpan([P('2026-04-01')])).toEqual({ from: '2026-04-01', to: '2026-04-01' })
  })

  it('lässt beide Grenzen leer, wenn es nichts vorzubelegen gibt', () => {
    expect(fullSpan([])).toEqual({ from: '', to: '' })
    expect(fullSpan([{ date: 'kaputt' }])).toEqual({ from: '', to: '' })
  })
})
