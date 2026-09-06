import { describe, it, expect } from 'vitest'
import {
  baseLoadShare,
  calcBaseLoad,
  baseLoadChange,
  plausibleWatts,
  rateBaseLoad,
  readableOvernight,
  readingsQuality,
  recommendedWaitMs,
  wattsFromImpulses,
  wattsFromTimed,
} from '@/features/measurements/base_load/baseLoad'
import { stats } from '@/features/monitoring/readings'
import type { MeterReading } from '@/store/readingsStore'

/** Ablesungen als (Datum, Zählerstand)-Paare. */
function readings(...pairs: [string, number][]): MeterReading[] {
  return pairs.map(([date, value], i) => ({ id: String(i), date, value }))
}

describe('baseLoadShare', () => {
  it('setzt die Grundlast ins Verhältnis zum gemessenen Jahresverbrauch', () => {
    // 3000 kWh über volle 365 Tage.
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 3000]))
    // 100 W Grundlast ≈ 876 kWh/Jahr → knapp 29 %.
    const share = baseLoadShare(calcBaseLoad(100, 30).annualKwh, s)
    expect(share).toBeDefined()
    expect(share!.share).toBeCloseTo(876 / 3000, 2)
    expect(share!.totalYearKwh).toBe(3000)
    expect(share!.implausible).toBe(false)
  })

  it('meldet einen unmöglich hohen Anteil als unplausibel', () => {
    // Sparsamer Haushalt, 800 kWh/Jahr – gegen eine Grundlast von 300 W (2628 kWh).
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 800]))
    const share = baseLoadShare(calcBaseLoad(300, 30).annualKwh, s)
    expect(share!.share).toBeGreaterThan(1)
    expect(share!.implausible).toBe(true)
  })

  it('liefert undefined ohne belastbare Ableshistorie', () => {
    // Eine einzelne Ablesung ergibt keinen Verbrauch …
    expect(baseLoadShare(876, stats(readings(['2024-01-01', 0])))).toBeUndefined()
    // … und zwei Ablesungen mit wenigen Tagen Abstand werden nicht hochgerechnet.
    expect(
      baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-01-05', 40]))),
    ).toBeUndefined()
  })

  it('liefert undefined ohne verwertbare Grundlast', () => {
    const s = stats(readings(['2024-01-01', 0], ['2024-12-31', 3000]))
    expect(baseLoadShare(0, s)).toBeUndefined()
    expect(baseLoadShare(Number.NaN, s)).toBeUndefined()
  })

  it('reicht durch, worauf der Jahreswert beruht', () => {
    const full = baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-12-31', 3000])))
    expect(full!.basis).toBe('fullYear')

    // Nur ein Quartal gemessen → linear gestreckt, Anteil bezieht sich darauf.
    const partial = baseLoadShare(876, stats(readings(['2024-01-01', 0], ['2024-04-01', 750])))
    expect(partial!.basis).toBe('linear')
    expect(partial!.measuredDays).toBe(91)
  })
})

const HOUR = 3_600_000

describe('wattsFromTimed', () => {
  it('rechnet zwei Zählerstände in Dauerleistung um', () => {
    // 0,8 kWh in 8 Stunden = 100 W.
    expect(wattsFromTimed(1000, 1000.8, 8 * HOUR)).toBeCloseTo(100, 6)
  })
})

describe('readingsQuality', () => {
  it('bewertet eine Nachtmessung auf grobem Zähler als belastbar', () => {
    // 0,1-kWh-Zähler, 0,9 kWh über 9 Stunden → ±11 % … knapp daneben,
    // mit 1,2 kWh über 12 h sind es ±8 %.
    const q = readingsQuality(1000, 1001.2, 12 * HOUR, 0.1)
    expect(q.usable).toBe(true)
    expect(q.longEnough).toBe(true)
    expect(q.uncertainty).toBeCloseTo(0.1 / 1.2, 6)
    expect(q.level).toBe('good')
  })

  it('verwirft die frühere Stoppuhr-Messung als zu früh', () => {
    // Genau der alte Fall: 0,1-kWh-Zähler, fünf Minuten, ein Ziffernsprung.
    const q = readingsQuality(1000, 1000.1, 5 * 60_000, 0.1)
    expect(q.usable).toBe(false)
    expect(q.level).toBe('poor')
  })

  it('verwirft kurze Messungen auch bei feiner Anzeige', () => {
    // Feiner Zähler, aber 20 Minuten decken keinen Kühlschrank-Zyklus ab: Die
    // Anzeige ist genau, gemessen wird trotzdem nur, ob der Kompressor lief.
    // Wer eine Momentaufnahme will, hat dafür 'instant' und 'impulse'.
    const q = readingsQuality(1000, 1000.05, 20 * 60_000, 0.001)
    expect(q.usable).toBe(false)
    expect(q.longEnough).toBe(false)
    expect(q.problem).toBe('tooShort')
    expect(q.level).toBe('poor')
  })

  it('verwirft eine zweite Ablesung Sekunden nach der ersten', () => {
    // Der reale Fall aus dem Live-Test: 0,5 kWh Differenz, zwölf Sekunden
    // Abstand. Ergibt 150 kW – die Auflösung allein (±20 %) hielt das früher
    // für brauchbar, gespeichert wurde es auch.
    const q = readingsQuality(5751, 5751.5, 12_000, 0.1)
    expect(q.uncertainty).toBeCloseTo(0.2, 6)
    expect(q.usable).toBe(false)
    expect(q.problem).toBe('implausible')
  })

  it('bescheinigt dem Zähler ohne Nachkommastelle seine echte Genauigkeit', () => {
    // Kilians Messung: 5751 → 5756 kWh über 14 Std. 4 Min. Mit der zuvor
    // einzig wählbaren Auflösung 0,1 kWh stand dort „±2 % genau"; die Anzeige
    // springt aber in ganzen kWh, also sind es ±20 %.
    const elapsed = 14 * HOUR + 4 * 60_000
    expect(readingsQuality(5751, 5756, elapsed, 0.1).uncertainty).toBeCloseTo(0.02, 6)

    const q = readingsQuality(5751, 5756, elapsed, 1)
    expect(q.uncertainty).toBeCloseTo(0.2, 6)
    expect(q.usable).toBe(true)
    expect(q.level).toBe('fair')
  })

  it('ist robust gegen unbrauchbare Eingaben', () => {
    for (const q of [
      readingsQuality(1000, 1000, HOUR, 0.1), // kein Verbrauch
      readingsQuality(1000, 999, HOUR, 0.1), // rückwärts
      readingsQuality(1000, 1001, 0, 0.1), // keine Zeit
      readingsQuality(1000, 1001, HOUR, 0), // keine Auflösung
    ]) {
      expect(q.usable).toBe(false)
      expect(q.level).toBe('poor')
    }
  })
})

describe('recommendedWaitMs', () => {
  it('verlangt beim groben Zähler eine Nachtmessung', () => {
    // 0,1 kWh → zehn Schritte bei 100 W = 1 kWh = 10 Stunden.
    expect(recommendedWaitMs(0.1)).toBe(10 * HOUR)
  })

  it('unterschreitet auch bei feiner Anzeige nie die Kühlschrank-Taktung', () => {
    expect(recommendedWaitMs(0.01)).toBe(3 * HOUR)
    expect(recommendedWaitMs(0.001)).toBe(3 * HOUR)
    expect(recommendedWaitMs(0)).toBe(3 * HOUR)
  })
})

describe('readableOvernight', () => {
  it('erklärt den Zähler ohne Nachkommastelle für ungeeignet', () => {
    // 1 kWh → zehn Schritte bei 100 W = 10 kWh = 100 Stunden. Über vier Tage
    // misst man den Haushalt, nicht seine Grundlast.
    expect(recommendedWaitMs(1)).toBe(100 * HOUR)
    expect(readableOvernight(1)).toBe(false)
  })

  it('lässt jede Anzeige mit Nachkommastelle zu', () => {
    for (const r of [0.1, 0.01, 0.001]) expect(readableOvernight(r)).toBe(true)
  })
})

describe('wattsFromImpulses', () => {
  it('rechnet gezählte Impulse in Leistung um', () => {
    // 1000 imp/kWh: zehn Impulse sind 0,01 kWh. In 101 s ergibt das ~356 W.
    expect(wattsFromImpulses(10, 101, 1000)).toBeCloseTo(356.4, 1)
    // Ferraris-Scheibe mit 75 U/kWh: eine Umdrehung in 96 s sind 500 W.
    expect(wattsFromImpulses(1, 96, 75)).toBeCloseTo(500, 0)
  })

  it('liefert 0 statt Unsinn bei fehlenden Angaben', () => {
    expect(wattsFromImpulses(0, 101, 1000)).toBe(0)
    expect(wattsFromImpulses(10, 0, 1000)).toBe(0)
    expect(wattsFromImpulses(10, 101, 0)).toBe(0)
  })
})

describe('plausibleWatts', () => {
  it('lässt jede Haushaltsleistung zu und weist Unmögliches ab', () => {
    expect(plausibleWatts(355)).toBe(true)
    // Ein Hausanschluss mit 3 × 63 A gibt rund 43 kW her – die Grenze selbst
    // gilt noch als möglich, alles darüber nicht.
    expect(plausibleWatts(43_000)).toBe(true)
    expect(plausibleWatts(43_001)).toBe(false)
    expect(plausibleWatts(145_703)).toBe(false)
    expect(plausibleWatts(0)).toBe(false)
    expect(plausibleWatts(Number.NaN)).toBe(false)
  })
})

describe('rateBaseLoad', () => {
  it('faellt ohne Anteil auf die absoluten Watt-Schwellen zurueck', () => {
    expect(rateBaseLoad(60)).toBe('good')
    expect(rateBaseLoad(120)).toBe('medium')
    expect(rateBaseLoad(200)).toBe('elevated')
    expect(rateBaseLoad(400)).toBe('high')
  })

  it('bewertet am Anteil, sobald der Jahresverbrauch bekannt ist', () => {
    expect(rateBaseLoad(400, 0.2)).toBe('good')
    expect(rateBaseLoad(400, 0.3)).toBe('medium')
    expect(rateBaseLoad(400, 0.45)).toBe('elevated')
    expect(rateBaseLoad(400, 0.7)).toBe('high')
  })

  it('macht die Bewertung von der Haushaltsgroesse unabhaengig', () => {
    // Dieselben 150 W: fuer die Familie im Haus wenig, fuer die Einzelperson viel.
    const annualKwh = calcBaseLoad(150, 30).annualKwh
    expect(calcBaseLoad(150, 30, 6000).rating).toBe('good')
    expect(calcBaseLoad(150, 30, 1800).rating).toBe('high')
    // Ohne Monitoring-Daten bleibt es bei der alten, absoluten Einstufung.
    expect(calcBaseLoad(150, 30).rating).toBe('medium')
    expect(annualKwh).toBe(1314)
  })

  it('ignoriert einen unbrauchbaren Jahresverbrauch', () => {
    expect(calcBaseLoad(60, 30, 0).rating).toBe('good')
    expect(calcBaseLoad(400, 30, Number.NaN).rating).toBe('high')
  })
})

describe('baseLoadChange', () => {
  const NIGHT = { uncertainty: 0.09 }

  it('belegt eine deutliche Senkung und beziffert sie', () => {
    const c = baseLoadChange({ watts: 180, ...NIGHT }, { watts: 138, ...NIGHT }, 35)
    expect(c!.direction).toBe('down')
    expect(c!.significant).toBe(true)
    expect(c!.deltaWatts).toBe(42)
    // Unsicherheiten quadratisch addiert: sqrt((0,09*180)^2 + (0,09*138)^2).
    expect(c!.toleranceWatts).toBeCloseTo(20.4, 1)
    // 42 W ueber ein Jahr bei 35 ct/kWh.
    expect(c!.annualEur).toBe(129)
  })

  it('weist eine Aenderung unterhalb der Messgenauigkeit nicht aus', () => {
    const c = baseLoadChange({ watts: 180, ...NIGHT }, { watts: 172, ...NIGHT }, 35)
    expect(c!.significant).toBe(false)
    // Ohne Beleg auch kein Euro-Betrag.
    expect(c!.annualEur).toBe(0)
  })

  it('kann mit zwei Momentaufnahmen kaum etwas belegen', () => {
    // Ohne bekannte Genauigkeit gilt die grobe Annahme fuer Momentaufnahmen –
    // dieselben 42 W reichen dann nicht.
    const c = baseLoadChange({ watts: 180 }, { watts: 138 }, 35)
    expect(c!.significant).toBe(false)
  })

  it('erkennt einen Anstieg', () => {
    const c = baseLoadChange({ watts: 120, ...NIGHT }, { watts: 190, ...NIGHT }, 35)
    expect(c!.direction).toBe('up')
    expect(c!.significant).toBe(true)
    expect(c!.deltaWatts).toBe(70)
    // Ein Anstieg ist keine Ersparnis.
    expect(c!.annualEur).toBe(0)
  })

  it('liefert undefined ohne verwertbare Messungen', () => {
    expect(baseLoadChange({ watts: 0 }, { watts: 138 }, 35)).toBeUndefined()
    expect(baseLoadChange({ watts: 180 }, { watts: 0 }, 35)).toBeUndefined()
  })

  it('vergleicht nicht gegen einen unmöglichen Altbestand', () => {
    // Ergebnisse werden nicht migriert: Vor der Schranke in readingsQuality
    // entstandene Unsinnswerte liegen weiter im Store. Aus 145.703 W wurde so
    // eine belegte Ersparnis von 381.209 € im Jahr.
    expect(
      baseLoadChange({ watts: 145_703, uncertainty: 0.2 }, { watts: 355, ...NIGHT }, 30),
    ).toBeUndefined()
  })
})
