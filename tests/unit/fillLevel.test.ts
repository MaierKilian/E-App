// Abnahme Etappe 2 des Tank-Umbaus: Füllstand, Prozent und die Vorbelegung
// des Stands nach einer Lieferung.
import { describe, expect, it } from 'vitest'
import { estimateLevelAt, fromPercent, toPercent } from '@/features/monitoring/fillLevel'
import { defaultMeterMode, isTankType, meterMode } from '@/features/monitoring/counterSeries'

describe('toPercent / fromPercent', () => {
  it('rechnet mit Fassungsvermögen in beide Richtungen', () => {
    expect(toPercent(1860, 3000)).toBeCloseTo(62, 6)
    expect(fromPercent(62, 3000)).toBe(1860)
  })

  it('nimmt den Wert ohne Fassungsvermögen als Prozent', () => {
    // Der Tank ohne hinterlegte Größe ist voll bedienbar – er rechnet in
    // Prozent, siehe Konzept Abschnitt 4.
    expect(toPercent(62, undefined)).toBe(62)
    expect(fromPercent(62, undefined)).toBe(62)
  })

  it('behandelt eine unsinnige Kapazität wie gar keine', () => {
    expect(toPercent(40, 0)).toBe(40)
    expect(toPercent(40, Number.NaN)).toBe(40)
    expect(fromPercent(40, -100)).toBe(40)
  })

  it('begrenzt auf 0 bis 100 und bleibt NaN-frei', () => {
    // Ein Stand über der Kapazität kommt vor (Tank randvoll, Angabe knapp) –
    // die Anzeige darf davon nicht über den Rand laufen.
    expect(toPercent(3200, 3000)).toBe(100)
    expect(toPercent(-50, 3000)).toBe(0)
    expect(toPercent(Number.NaN, 3000)).toBe(0)
  })

  it('überlebt den Rundlauf Prozent → Menge → Prozent', () => {
    for (const percent of [0, 13, 37, 62, 88, 100]) {
      expect(Math.round(toPercent(fromPercent(percent, 3000), 3000))).toBe(percent)
    }
  })
})

describe('estimateLevelAt', () => {
  it('rechnet den Verbrauch bis zum Liefertag heraus', () => {
    // 30 Tage à 12 l: Der Stand am Liefertag liegt 360 l unter der letzten
    // Ablesung. Genau dieser Verbrauch fiele bei „letzter Stand + Menge"
    // unter den Tisch.
    expect(estimateLevelAt(2000, '2026-01-01', '2026-01-31', 12)).toBe(1640)
  })

  it('bleibt beim letzten Stand, wenn es keine belastbare Rate gibt', () => {
    expect(estimateLevelAt(2000, '2026-01-01', '2026-01-31', undefined)).toBe(2000)
    expect(estimateLevelAt(2000, '2026-01-01', '2026-01-31', 0)).toBe(2000)
    expect(estimateLevelAt(2000, '2026-01-01', '2026-01-31', Number.NaN)).toBe(2000)
  })

  it('wird nicht negativ, wenn die Hochrechnung über den Tank hinausschießt', () => {
    expect(estimateLevelAt(200, '2026-01-01', '2026-06-01', 12)).toBe(0)
  })

  it('geht bei gleichem oder rückwärtigem Datum nicht nach oben', () => {
    expect(estimateLevelAt(2000, '2026-01-01', '2026-01-01', 12)).toBe(2000)
    expect(estimateLevelAt(2000, '2026-02-01', '2026-01-01', 12)).toBe(2000)
  })

  it('kommt mit unlesbaren Daten und Werten zurecht', () => {
    expect(estimateLevelAt(2000, 'kaputt', '2026-01-31', 12)).toBe(2000)
    expect(estimateLevelAt(Number.NaN, '2026-01-01', '2026-01-31', 12)).toBe(0)
  })
})

describe('Wann ein Zähler eingerichtet wird', () => {
  /**
   * Spiegelt die Bedingung aus `MeterDetailPage` und `MonitoringPage`. Sie
   * steht bewusst als Regel hier und nicht nur im JSX: Wird sie gelockert,
   * bekommt ein Bestandsnutzer die Modus-Wahl mit „Vorrat" vorbelegt
   * vorgesetzt und deutet seinen Verlauf mit einem Tipp auf Speichern um.
   */
  function needsSetup(
    type: Parameters<typeof isTankType>[0],
    hasConfig: boolean,
    count: number,
  ): boolean {
    return isTankType(type) && !hasConfig && count === 0
  }

  it('fragt beim ersten Öl-Zähler nach – und schlägt den Vorrat vor', () => {
    expect(needsSetup('oil', false, 0)).toBe(true)
    expect(defaultMeterMode('oil')).toBe('level')
  })

  it('lässt einen bereits geführten Öl-Zähler in Ruhe', () => {
    expect(needsSetup('oil', false, 2)).toBe(false)
    // Und er bleibt dabei ein Zählwerk, solange nichts hinterlegt ist.
    expect(meterMode(undefined)).toBe('counter')
  })

  it('fragt nicht mehr, wenn der Modus einmal gewählt wurde', () => {
    expect(needsSetup('oil', true, 0)).toBe(false)
  })

  it('fragt bei Strom und Wasser nie', () => {
    expect(needsSetup('electricity', false, 0)).toBe(false)
    expect(needsSetup('water', false, 0)).toBe(false)
  })
})
