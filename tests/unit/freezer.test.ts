// Gefrierschrank-Check: Stufen statt "leicht/stark", Empfehlung statt Zahl,
// kein Euro-Betrag.

import { describe, expect, it } from 'vitest'
import {
  calcFreezerSaving,
  defrostAdvice,
  rateFrost,
  readFrostStage,
  stageCode,
  FROST_STAGES,
} from '@/features/measurements/freezer/freezer'

describe('Vereisungsgrad – Stufen', () => {
  it('bietet drei Stufen an (vorher nur leicht/stark)', () => {
    expect(FROST_STAGES).toEqual(['spots', 'thin', 'thick'])
  })

  it('bewertet jede Stufe eine Klasse strenger', () => {
    expect(rateFrost('none')).toBe('good')
    expect(rateFrost('spots')).toBe('medium')
    expect(rateFrost('thin')).toBe('elevated')
    expect(rateFrost('thick')).toBe('high')
  })

  it('macht aus jeder Stufe eine Handlungsempfehlung', () => {
    expect(defrostAdvice('none')).toBe('notNeeded')
    expect(defrostAdvice('spots')).toBe('canWait')
    expect(defrostAdvice('thin')).toBe('worthwhile')
    expect(defrostAdvice('thick')).toBe('now')
  })
})

describe('readFrostStage – gespeicherte Ergebnisse bleiben lesbar', () => {
  it('liest das aktuelle Format', () => {
    expect(readFrostStage({ frostStage: stageCode('spots') })).toBe('spots')
    expect(readFrostStage({ frostStage: stageCode('thick') })).toBe('thick')
  })

  it('liest Altergebnisse mit dem alten Index', () => {
    // Alt: frost war ein Index in ['none', 'light', 'heavy'].
    expect(readFrostStage({ frost: 0 })).toBe('none')
    expect(readFrostStage({ frost: 1 })).toBe('thin')
    expect(readFrostStage({ frost: 2 })).toBe('thick')
  })

  it('bevorzugt das aktuelle Format, wenn beide dastehen', () => {
    // Der alte Index 2 hieß "stark"; die neue 1 heißt "ein paar Stellen".
    // Ohne Vorrang läse man hier das Gegenteil.
    expect(readFrostStage({ frost: 2, frostStage: 1 })).toBe('spots')
  })

  it('bleibt bei fehlenden oder unsinnigen Werten bei eisfrei', () => {
    expect(readFrostStage(undefined)).toBe('none')
    expect(readFrostStage({})).toBe('none')
    expect(readFrostStage({ frostStage: 99 })).toBe('none')
  })
})

describe('calcFreezerSaving', () => {
  it('empfiehlt bei eisfrei nichts und beziffert nichts', () => {
    const c = calcFreezerSaving({ stage: 'none' })
    expect(c.advice).toBe('notNeeded')
    expect(c.method).toBe('none')
    expect(c.extraPercent).toBe(0)
  })

  it('schätzt die Wirkung als Anteil, nicht als Euro-Betrag', () => {
    // Der frühere Euro-Betrag beruhte auf einem angenommenen Jahresverbrauch
    // mal einem angenommenen Preis – beim Standardpreis kam für alle dasselbe
    // heraus (8 € bzw. 21 €). Ein Anteil braucht beide Annahmen nicht.
    const thin = calcFreezerSaving({ stage: 'thin' })
    expect(thin.method).toBe('estimate')
    expect(thin.extraPercent).toBe(12)

    const thick = calcFreezerSaving({ stage: 'thick' })
    expect(thick.extraPercent).toBe(30)
  })

  it('staffelt die geschätzte Wirkung nach Stufe', () => {
    const percent = (s: 'spots' | 'thin' | 'thick') =>
      calcFreezerSaving({ stage: s }).extraPercent
    expect(percent('spots')).toBeLessThan(percent('thin'))
    expect(percent('thin')).toBeLessThan(percent('thick'))
  })

  it('liefert bei jeder Stufe eine Schätzung – der Check misst nicht mehr', () => {
    // Die optionale Vorher/Nachher-Messung mit dem Energiekostenmessgerät ist
    // entfallen; es gibt keinen Weg mehr, der 'measured' ergäbe.
    for (const s of FROST_STAGES) {
      expect(calcFreezerSaving({ stage: s }).method).toBe('estimate')
    }
  })
})
