// Standby-Check: Bewertung, Rechnung und der Zwischenstand der Geraeteliste.
//
// Zwei Dinge haelt diese Datei fest. Erstens die Grenzen der Bewertung, an
// denen der Ergebnis-Schirm seine Aussage aufhaengt. Zweitens den Entwurf: Die
// Liste entsteht ueber Minuten, sie muss ein Verlassen des Checks ueberleben –
// aber ein bloss geoeffneter Check darf keinen Zwischenstand hinterlassen.

import { describe, expect, it } from 'vitest'
import {
  annualCost,
  annualKwh,
  calcStandby,
  rateStandby,
  GOOD_MAX,
  MEDIUM_MAX,
} from '@/features/measurements/standby/standby'
import {
  decodeStandbyDraft,
  encodeStandbyDraft,
} from '@/features/measurements/standby/draft'
import { buildDemoSnapshot } from '@/features/demo/demoProfile'
import type { MeasurementResult } from '@/features/measurements/types'

describe('Bewertung', () => {
  it('bewertet bis zur guten Grenze gut und darueber mittel', () => {
    expect(rateStandby(0)).toBe('good')
    expect(rateStandby(GOOD_MAX)).toBe('good')
    expect(rateStandby(GOOD_MAX + 0.5)).toBe('medium')
  })

  it('bewertet erst oberhalb der mittleren Grenze hoch', () => {
    expect(rateStandby(MEDIUM_MAX)).toBe('medium')
    expect(rateStandby(MEDIUM_MAX + 0.5)).toBe('high')
  })
})

describe('Rechnung', () => {
  it('summiert, sortiert und verwirft Zeilen ohne Leistung', () => {
    const r = calcStandby({
      devices: [
        { name: 'Router', watts: 6.5 },
        { name: 'Leer', watts: 0 },
        { name: 'Fernseher', watts: 8.5 },
      ],
      workPriceCt: 35,
    })

    expect(r.totalWatts).toBe(15)
    expect(r.devices.map((d) => d.name)).toEqual(['Fernseher', 'Router'])
  })

  it('rechnet Verbrauch und Kosten aus der Gesamtleistung', () => {
    const r = calcStandby({ devices: [{ name: 'PC', watts: 10 }], workPriceCt: 35 })

    expect(r.annualKwh).toBe(Math.round(annualKwh(10)))
    expect(r.annualCost).toBe(Math.round(annualCost(annualKwh(10), 35)))
  })

  it('weist nur oberhalb der guten Grenze vermeidbare Kosten aus', () => {
    const good = calcStandby({ devices: [{ name: 'A', watts: GOOD_MAX }], workPriceCt: 35 })
    const medium = calcStandby({
      devices: [{ name: 'A', watts: GOOD_MAX + 0.5 }],
      workPriceCt: 35,
    })

    expect(good.avoidableCost).toBe(0)
    expect(medium.avoidableCost).toBe(medium.annualCost)
  })
})

describe('Zwischenstand der Geraeteliste', () => {
  it('gibt die Liste unveraendert zurueck', () => {
    const devices = [
      { name: 'Fernseher', watts: 8.5 },
      { name: 'Router', watts: 6.5 },
    ]
    const { values, labels } = encodeStandbyDraft(devices)

    expect(decodeStandbyDraft(values, labels)).toEqual(devices)
  })

  it('haelt eine benannte Zeile ohne Wattzahl fest', () => {
    const { values, labels } = encodeStandbyDraft([{ name: 'Mikrowelle', watts: 0 }])

    expect(decodeStandbyDraft(values, labels)).toEqual([{ name: 'Mikrowelle', watts: 0 }])
  })

  it('hinterlaesst bei einem leeren Formular keinen Zwischenstand', () => {
    // Sonst zaehlte der Runner ihn als angefangene Messung und uebersprange
    // beim naechsten Oeffnen die Erklaerseite – ohne dass etwas erfasst wurde.
    const { values } = encodeStandbyDraft([{ name: '', watts: 0 }])

    expect(values).toEqual({})
  })

  it('liest die Reihenfolge aus dem Index, nicht aus der Schluesselfolge', () => {
    const decoded = decodeStandbyDraft({ dev10: 1, dev2: 2 }, { dev10: 'Zehn', dev2: 'Zwei' })

    expect(decoded.map((d) => d.name)).toEqual(['Zwei', 'Zehn'])
  })

  it('uebergeht fremde Felder desselben Entwurfs', () => {
    const decoded = decodeStandbyDraft({ totalWatts: 31, dev0: 8.5 }, {})

    expect(decoded).toEqual([{ name: '', watts: 8.5 }])
  })
})

describe('Demo-Profil', () => {
  it('traegt den Standby-Eintrag im aktuellen Ergebnisformat', () => {
    const snapshot = buildDemoSnapshot()
    const results = (snapshot.measurements as { results: Record<string, MeasurementResult> })
      .results
    const tariff = snapshot.tariff as { electricityWorkPrice: number }
    const standby = results.standby

    // Aus dem Eintrag selbst nachgerechnet: Die Geraeteliste im Ergebnis muss
    // genau die Kennzahlen daneben ergeben. Frueher stand hier eine Wattzahl,
    // die der Ergebnis-Schirm als Jahreskosten las.
    const devices = decodeStandbyDraft(standby.details ?? {}, standby.labels ?? {})
    const expected = calcStandby({ devices, workPriceCt: tariff.electricityWorkPrice })

    expect(standby.unit).toBe('€/Jahr')
    expect(standby.primaryValue).toBe(expected.annualCost)
    expect(standby.rating).toBe(expected.rating)
    expect(standby.details?.totalWatts).toBe(expected.totalWatts)
    expect(standby.details?.annualKwh).toBe(expected.annualKwh)
    expect(standby.details?.annualCost).toBe(expected.annualCost)
    expect(standby.details?.avoidableCost).toBe(expected.avoidableCost)
  })
})
