// Prüfungen am Raumklima-Check.
//
// Kernpunkt: Bewertung und Sparhinweis dürfen sich nicht widersprechen. Ein Raum
// im Komfortband wird als „optimal" bewertet – dann darf die App nicht
// gleichzeitig zum Absenken raten. Das prüft hier ein Test, statt sich auf die
// Abstimmung zweier getrennter Konstanten zu verlassen.

import { describe, expect, it } from 'vitest'
import {
  calcRoomClimate,
  calcRoomTempSaving,
  displaySavingEur,
  rateTemperature,
  MIN_DISPLAY_EUR,
  SAVING_REFERENCE_TEMP,
} from '@/features/measurements/room_temperature/roomClimate'

describe('Raumklima – Bewertung vs. Ersparnis', () => {
  it('weist im Komfortband kein Sparpotenzial aus', () => {
    for (const temp of [20, 20.5, 21, 21.5, 22]) {
      const rating = calcRoomClimate({ temperature: temp, draft: 'none' })
      const saving = calcRoomTempSaving({
        temp,
        roomAreaSqm: 14,
        areaEstimated: true,
        livingArea: 80,
        heatingOnlyCostEur: 1200,
      })
      expect(rateTemperature(temp), `${temp} °C`).toBe('optimal')
      expect(rating.rating, `${temp} °C`).toBe('good')
      expect(saving.deltaT, `${temp} °C`).toBe(0)
      expect(saving.yearlySaving, `${temp} °C`).toBeUndefined()
    }
  })

  it('rechnet ΔT gegen die Komfort-Obergrenze, nicht gegen die Untergrenze', () => {
    const saving = calcRoomTempSaving({
      temp: 24,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 80,
    })
    expect(saving.referenceTemp).toBe(SAVING_REFERENCE_TEMP)
    expect(saving.deltaT).toBe(24 - SAVING_REFERENCE_TEMP)
  })

  it('bewertet oberhalb des Bands als zu warm und liefert dann eine Ersparnis', () => {
    const temp = 24
    expect(rateTemperature(temp)).toBe('tooWarm')
    const saving = calcRoomTempSaving({
      temp,
      roomAreaSqm: 20,
      areaEstimated: false,
      livingArea: 100,
      heatingOnlyCostEur: 1500,
    })
    // 1500 € × 0,2 Flächenanteil × 6 % × 2 K = 36 €
    expect(saving.yearlySaving).toBeCloseTo(36, 6)
  })
})

describe('Raumklima – Darstellung der Ersparnis', () => {
  it('unterdrückt Kleinbeträge unterhalb der Mindestschwelle', () => {
    expect(displaySavingEur(undefined)).toBeUndefined()
    expect(displaySavingEur(0)).toBeUndefined()
    expect(displaySavingEur(MIN_DISPLAY_EUR - 0.01)).toBeUndefined()
    expect(displaySavingEur(Number.NaN)).toBeUndefined()
  })

  it('rundet auf 5-€-Schritte, um Schein-Genauigkeit zu vermeiden', () => {
    expect(displaySavingEur(36)).toBe(35)
    expect(displaySavingEur(38)).toBe(40)
    expect(displaySavingEur(MIN_DISPLAY_EUR)).toBe(20)
  })
})

describe('Raumklima – Einsparformel', () => {
  it('liefert ohne Heizkosten nur die %-Aussage', () => {
    const saving = calcRoomTempSaving({
      temp: 25,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 80,
    })
    expect(saving.percent).toBeCloseTo(0.18, 6)
    expect(saving.yearlySaving).toBeUndefined()
  })

  it('liefert ohne bekannte Wohnfläche keinen €-Wert', () => {
    const saving = calcRoomTempSaving({
      temp: 25,
      roomAreaSqm: 14,
      areaEstimated: true,
      livingArea: 0,
      heatingOnlyCostEur: 1200,
    })
    expect(saving.share).toBe(0)
    expect(saving.yearlySaving).toBeUndefined()
  })
})
